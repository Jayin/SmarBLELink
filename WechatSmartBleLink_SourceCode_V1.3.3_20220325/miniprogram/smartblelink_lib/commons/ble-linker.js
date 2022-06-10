const logger = require('./logger.js');
const utils = require('./utils.js');
const pipe = require('pipe-functions');
const Unibabel = require('browserify-unibabel');
const hexarray = require('hex-array');
const buffertrim = require('buffertrim');
const Ble = require('./ble.js');
const BleLinkData = require('./ble-link-data.js');
const States = require('./states.js');
const DeviceDiscovery = require('./device-discovery.js');

module.exports = function () {

  var TAG = 'smartblelink_lib.commons.ble-linker.{0}:'
  var BLE_SERVICE_UUID = 'FEE7';
  var BLE_CONFIG_SUCCESS = 'config_success';
  var BLE_CONFIG_FAIL = 'config_fail';
  var BLE_CONFIG_ACK = 'config_ack';

  var self = this;
  var bleName;
  var wifiSsid;
  var wifiPasssword;
  var strictMatching;
  var userData;
  var successCallback;
  var progressCallback;
  var failCallback;
  var getConnectedWifiInterval = -1;
  var started = false;

  var ble = null;
  var bleDataReceived = null;
  var deviceDiscovery = new DeviceDiscovery();

  var success = function () {

    if (typeof successCallback === 'function') {

      try {
        successCallback();
      } catch (e) { }
    }
  };

  var fail = function (code, message, data) {

    if (typeof failCallback === 'function') {

      try {
        failCallback({
          code: code,
          msg: message,
          data: data
        });
      } catch (e) { }
    }
  };

  var progress = function (state) {

    if (typeof progressCallback === 'function') {

      try {
        progressCallback({
          name: state['name'],
          description: state['description']
        });
      } catch (e) { }
    }
  };

  var onBLECharacteristicValueChange = function (uint8Array) {

    bleDataReceived = Unibabel.utf8ArrToStr(buffertrim.trim(uint8Array));

    logger.log(TAG.format('onBLECharacteristicValueChange'), 'data-"{0}" text-"{1}"'.format(
      hexarray.toString(uint8Array, {
        grouping: 1
      }), bleDataReceived));
  };

  var configBle = function () {

    var round = 0;
    var maxRound = 5;

    var config = function () {

      return new Promise(function (_resolve, _reject) {

        bleDataReceived = null;
        var bleLinkData = new BleLinkData();
        var frames = bleLinkData.getFrames(wifiSsid, wifiPasssword, userData);

        var sendFrame = function (index) {

          ble.writeData(frames[index].buffer).then(() => {

            sendNextFrame(index);
          }).catch(error => {

            if (error === States.CANCEL) {
              _reject(States.CANCEL);
            } else {
              sendNextFrame(index);
            }
          });
        };

        var sendNextFrame = function (index) {

          if (!started) {

            _reject(States.CANCEL);
          } else if (bleDataReceived === BLE_CONFIG_SUCCESS) {

            _resolve();
          } else if (bleDataReceived === BLE_CONFIG_FAIL) {

            _reject(States.CONFIG_BLE);
          } else {

            index++;
            if (index == frames.length) {

              round++;
              if (round >= maxRound) {
                _reject(States.CONFIG_BLE);
                return;
              }
              index = 0;
            }

            setTimeout(function () {
              sendFrame(index)
            }, 500)
          }
        }

        sendFrame(0);
      });
    };


    var configAck = function () {

      return new Promise(function (_resolve, _reject) {

        bleDataReceived = null;
        round = 0;

        var uint8Array = Unibabel.strToUtf8Arr(BLE_CONFIG_ACK);
        var buffer = uint8Array.buffer;

        var sendConfigAck = function () {

          round++;

          if (round > maxRound) {

            _reject(States.CONFIG_BLE);
            return;
          }

          ble.writeData(buffer).then(() => {

            _resolve();
          }).catch(error => {

            if (error === States.CANCEL) {

              _reject(States.CANCEL);
            } else {

              setTimeout(function () {

                if (!started) {

                  _reject(States.CANCEL);
                } else {

                  sendConfigAck();
                }
              }, 500)
            }
          });
        };

        sendConfigAck();
      });
    };

    return new Promise(function (resolve, reject) {

      progress(States.CONFIG_BLE);

      pipe(config, configAck).then(() => {
        resolve();
      }).catch(error => {
        reject(error === States.CANCEL ? error : States.CONFIG_BLE);
      });
    });
  }

  /**
   * 启动发现设备
   * object: {bleName: string[option], onDeviceFound: function}
   */
  this.startDeviceDiscovery = function (object) {
    deviceDiscovery.startDeviceDiscovery(object);
  }

  /**
   * 停止发现设备
   */
  this.stopDeviceDiscovery = function () {
    deviceDiscovery.stopDeviceDiscovery();
  }

  /**
   * options: {
   *  wifiSsid: string, the ssid of conected wifi
   *  wifiPassword: string, the password of connected wifi
   *  bleName: string, the ssid of ap
   *  strictMatching: true|false,
   *  userData: [option]
   * }
   */
  this.start = function (options) {

    if (started) {
      fail(States.TASK_ALREADY_EXIST.error.code, States.TASK_ALREADY_EXIST.error.msg);
      return;
    }

    if (typeof options !== 'object') {
      return;
    }

    wifiSsid = options.wifiSsid;
    wifiPasssword = utils.isEmpty(options.wifiPassword) ? '' : options.wifiPassword;
    bleName = options.bleName;
    strictMatching = options.strictMatching;
    userData = utils.isEmpty(options.userData) ? '' : options.userData;
    successCallback = options.success;
    progressCallback = options.progress;
    failCallback = options.fail;

    var paramsError = {};
    if (utils.isEmpty(wifiSsid)) {
      paramsError['wifiSsid'] = 'wifiSsid is empty';
    }

    if (utils.isEmpty(bleName)) {
      paramsError['bleName'] = 'bleName is empty';
    }

    if (Object.keys(paramsError).length) {

      logger.info('abort to start ble link, invalid parameters: ', JSON.stringify(paramsError));
      fail(States.VALIDATE_PARAMS.error.code, States.VALIDATE_PARAMS.error.msg, paramsError);
      return;
    }

    started = true;

    ble.setOptions({
      bleName: bleName,
      strictMatching: strictMatching,
      bleServiceUuid: BLE_SERVICE_UUID,
      progressCallback: progress,
      onBLECharacteristicValueChange: onBLECharacteristicValueChange
    });

    ble.scanBle()
      .then(deviceInfo => {
        return ble.connectBle(deviceInfo.deviceId);
      })
      .then(() => {
        return configBle();
      })
      .then(() => {

        logger.info(TAG.format('start'), 'the whole ble link task is succeed!');
        self.stop();
        success();
      })
      .catch(e => {

        logger.warn(TAG.format('start'), 'catch exception', JSON.stringify(e));
        self.stop();
        if (e && e.error && e.error.code != States.CANCEL.error.code) {
          fail(e.error.code, e.error.msg);
        }
      });
  };

  this.stop = function () {

    started = false;

    return new Promise(function (resolve, reject) {

      pipe(ble.stopScanBle, ble.disconnectBle).then(() => {
        resolve();
      }).catch(() => {
        resolve();
      })
    });
  };

  this.init = function () {

    ble = new Ble();

    return new Promise(function (resolve, reject) {

      var wifiInited = null;
      var bleInited = null;

      wx.startWifi({

        success: function (res) {

          logger.log(TAG.format('init'), 'startWifi success -', JSON.stringify(res));
          wifiInited = true;
        },
        fail: function (res) {

          logger.warn(TAG.format('init'), 'startWifi fail -', JSON.stringify(res));
          wifiInited = false;
        }
      });

      ble.init()
        .then(() => {
          bleInited = true;
        })
        .catch(() => {
          bleInited = false;
        });

      var intervalId = setInterval(function () {

        if (wifiInited != null && bleInited != null) {

          clearInterval(intervalId);
          resolve(wifiInited && bleInited);
        }

      }, 50);
    });
  };

  this.destroy = function () {

    if (getConnectedWifiInterval != -1) {
      clearInterval(getConnectedWifiInterval);
      getConnectedWifiInterval = -1;
    }

    wx.stopWifi({
      complete: function (res) {
        logger.log(TAG.format('destroy'), 'stopWifi complete - ', JSON.stringify(res));
      }
    });

    pipe(self.stop, ble.destroy).catch();
  };

  this.getConnectedWifi = function (callback) {

    wx.getConnectedWifi({
      success: function (res) {

        if (res['wifi'] && res['wifi']['SSID'] && res['wifi']['SSID'].length) {

          var ssid = res['wifi']['SSID'];
          ssid = utils.prettySsid(ssid);
          res['wifi']['SSID'] = ssid;
        }

        callback({
          success: true,
          res: res
        });
      },
      fail: function (res) {
        callback({
          success: false,
          res: res
        });
      }
    });
  };

  this.listenWifiStateChange = function (callback) {

    this.unlistenWifiStateChange();
    var previousWifi = null;
    var wifiNotStarted = 0;

    var wifiInfoCallback = function (result) {

      var wifi = false;

      // logger.log(TAG.format('getConnectedWifiInterval'), JSON.stringify(result));

      if (!result['success'] &&
        (result['res']['errCode'] == 12000 || result['res']['errMsg'].indexOf('开发者工具暂时不支持') != -1)) {

        wifiNotStarted++;

        if (wifiNotStarted >= 10) {

          clearInterval(getConnectedWifiInterval);
          getConnectedWifiInterval = -1;
        }

        return;
      }

      wifiNotStarted = 0;

      if (result['success']) {
        wifi = result['res']['wifi']['SSID'];
      }
      if (wifi != previousWifi) {

        if (typeof callback === 'function') {

          try {
            callback(result['success'], result['res']);
          } catch (e) { }
        }

        previousWifi = wifi;
      }
    }

    var action = function () {
      self.getConnectedWifi(wifiInfoCallback);
    };

    getConnectedWifiInterval = setInterval(action, 1000);

    action();
  };

  this.unlistenWifiStateChange = function () {

    if (getConnectedWifiInterval != -1) {
      clearInterval(getConnectedWifiInterval);
      getConnectedWifiInterval = -1;
    }
  };

  this.listenBluetoothAdapterStateChange = function (callback) {
    ble.listenBluetoothAdapterStateChange(callback);
  };

  this.unlistenBluetoothAdapterStateChange = function () {
    ble.unlistenBluetoothAdapterStateChange();
  };
};