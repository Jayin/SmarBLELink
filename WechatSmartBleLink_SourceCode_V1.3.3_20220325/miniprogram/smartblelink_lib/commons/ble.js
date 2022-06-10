const pipe = require('pipe-functions');
const hexarray = require('hex-array');
const logger = require('./logger.js');
const utils = require('./utils.js');
const RetryPromise = require('./retry-promise.js');
const States = require('./states.js');

module.exports = function() {

  const TAG = 'smartblelink_lib.commons.ble.{0}:'
  const MAX_TIMES_SCAN_BLE = 6;
  const MAX_TIMES_CONNECT_BLE = 6;
  const self = this;

  var bleName;
  var strictMatching;
  var bleServiceUuid;
  var onBLECharacteristicValueChange;
  var serviceUuid;
  var writeCharacteristicUuid;
  var notifyCharacteristicUuid;
  var bleDeviceId;

  var progressCallback;
  var scanBleStarted = false;
  var connectBleStarted = false;

  var scanBle = function() {

    scanBleStarted = true;
    progress(States.SCAN_BLE);

    return new Promise(function(resolve, reject) {

      var state = States.SCAN_BLE;
      var deviceInfo = null;
      var times = 0;

      wx.onBluetoothDeviceFound(function(res) {

        logger.log(TAG.format('scanBle'), 'wx.onBluetoothDeviceFound:', JSON.stringify(res));

        if (!res || !res['devices'] || !res['devices'].length) {

          logger.warn(TAG.format('scanBle'), 'wx.onBluetoothDeviceFound: empty device list');
          return;
        }

        var devices = res['devices'];
        var index = -1;
        for (var i = 0; i < devices.length; i++) {
          if (utils.isStrictMatched(devices[i]['name'], bleName, strictMatching)) {
            index = i;
            break;
          }
        }

        if (index != -1) {
          deviceInfo = devices[index];
        }
      });

      var retryOrTerminateScanBleDevice = function() {

        logger.log(TAG.format('scanBle'), 'wx.startBluetoothDevicesDiscovery (NO.{0} times): not find ble "{1}"'.format(times, bleName));

        if (times >= MAX_TIMES_SCAN_BLE) {

          logger.warn(TAG.format('scanBle'), 'scanBle failed: not find ble "{0}" in {1} times'.format(bleName, times));
          reject(state);
        } else {

          logger.log(TAG.format('scanBle'), 'it will retry to wx.scanBleDevice');
          scanBleDevice();
        }
      }

      var findBle = function() {

        var count = 0;
        var checkDeviceInfoInterval = setInterval(function() {

          if (!scanBleStarted || deviceInfo != null || ++count >= 1200) {

            clearInterval(checkDeviceInfoInterval);

            wx.stopBluetoothDevicesDiscovery({
              complete: function(res) {
                logger.info(TAG.format('scanBle'), 'wx.stopBluetoothDevicesDiscovery', JSON.stringify(res));
              },
            })

            if (!scanBleStarted) {

              logger.info(TAG.format('scanBle'), 'ble link task is stoped');
              reject(States.CANCEL);
            } else if (deviceInfo != null) {

              logger.info(TAG.format('scanBle'), 'find ble "{0}" at NO.{1} times'.format(bleName, times));
              resolve(deviceInfo);
            } else {

              reject(state);
            }
          }
        }, 50);
      };

      var scanBleDevice = function() {

        times++;
        logger.log(TAG.format('scanBle'), 'wx.startBluetoothDevicesDiscovery (NO.{0} times).'.format(times));

        var stopBluetoothDevicesDiscovery = function() {

          return new Promise(function(_resolve, _reject) {

            wx.stopBluetoothDevicesDiscovery({
              complete: function(res) {
                _resolve('stopBluetoothDevicesDiscovery');
              },
            })
          });
        }

        var startBluetoothDevicesDiscovery = function() {

          return new Promise(function(_resolve, _reject) {

            wx.startBluetoothDevicesDiscovery({
              // services: [bleServiceUuid],
              allowDuplicatesKey: true,
              interval: 0,
              powerLevel: 'high',
              success: function(res) {
                logger.log(TAG.format('scanBle'), 'wx.startBluetoothDevicesDiscovery (NO.{0} times) success:'.format(times), JSON.stringify(res));
                _resolve('startBluetoothDevicesDiscovery');
              },
              fail: function(res) {
                logger.warn(TAG.format('scanBle'), 'wx.startBluetoothDevicesDiscovery (NO.{0} times) failed:'.format(times), JSON.stringify(res));
                _reject('startBluetoothDevicesDiscovery');
              }
            });
          });
        }

        pipe(stopBluetoothDevicesDiscovery, startBluetoothDevicesDiscovery)
          .then(result => {
            findBle();
          })
          .catch(result => {

            if (scanBleStarted) {

              retryOrTerminateScanBleDevice();
            } else {

              logger.info(TAG.format('scanBle'), 'scaning ble is stoped');
              reject(States.CANCEL);
            }
          });
      };

      scanBleDevice();
    });
  };

  var connectBle = function(deviceId) {

    serviceUuid = null;
    writeCharacteristicUuid = null;
    notifyCharacteristicUuid = null;
    connectBleStarted = true;
    bleDeviceId = deviceId;

    return new Promise(function(resolve, reject) {

      logger.log(TAG.format('connectBle'), 'start to connect ble', JSON.stringify(deviceId));

      var createBLEConnection = function() {

        progress(States.CREATE_BLE_CONNECTION);

        return new RetryPromise((_resolve, retry, cancel, times) => {

          wx.createBLEConnection({
            deviceId: deviceId,
            success: function(res) {

              logger.log(TAG.format('connectBle'), 'wx.createBLEConnection (NO.{0} times) success:'.format(times), JSON.stringify(res));
              _resolve();
            },
            fail: function(res) {

              logger.warn(TAG.format('connectBle'), 'wx.createBLEConnection (NO.{0} times) failed:'.format(times), JSON.stringify(res));
              if (connectBleStarted) {
                retry(States.CREATE_BLE_CONNECTION);
              } else {
                cancel();
              }
            }
          });
        });
      };

      var getBLEDeviceServices = function() {

        progress(States.GET_BLE_DEVICE_SERVICES);

        return new RetryPromise((_resolve, retry, cancel, times) => {

          wx.getBLEDeviceServices({
            deviceId: deviceId,
            success: function(res) {

              logger.log(TAG.format('connectBle'), 'wx.getBLEDeviceServices (NO.{0} times) success:'.format(times), JSON.stringify(res));

              var pattern = bleServiceUuid.length == 36 ? ('^' + bleServiceUuid) : ('^0{0,8}' + bleServiceUuid + '-[0-9a-f].*');
              var reg = new RegExp(pattern, 'i')
              var services = res.services;
              for (var i = 0; i < services.length; i++) {

                if (services[i].isPrimary && reg.test(services[i].uuid)) {
                  serviceUuid = services[i].uuid;
                  _resolve(serviceUuid);
                  return;
                }
              }

              if (connectBleStarted) {
                retry(States.GET_BLE_DEVICE_SERVICES);
              } else {
                cancel();
              }
            },
            fail: function(res) {
              logger.warn(TAG.format('connectBle'), 'wx.getBLEDeviceServices (NO.{0} times) failed:'.format(times), JSON.stringify(res));

              if (connectBleStarted) {
                retry(States.GET_BLE_DEVICE_SERVICES);
              } else {
                cancel();
              }
            }
          });
        });
      };

      var getBLEDeviceCharacteristics = function() {

        progress(States.GET_BLE_DEVICE_CHARACTERISTICS);

        return new RetryPromise((_resolve, retry, cancel, times) => {

          wx.getBLEDeviceCharacteristics({
            deviceId: deviceId,
            serviceId: serviceUuid,
            success: function(res) {
              logger.log(TAG.format('connectBle'), 'wx.getBLEDeviceCharacteristics (NO.{0} times) success:'.format(times), JSON.stringify(res));

              var characteristics = res.characteristics;
              for (var i = 0; i < characteristics.length; i++) {

                var characteristic = characteristics[i];
                if (characteristic.properties.write && utils.isBlank(writeCharacteristicUuid)) {
                  writeCharacteristicUuid = characteristic.uuid;
                }

                if ((characteristic.properties.notify || characteristic.properties.indicate) && utils.isBlank(notifyCharacteristicUuid)) {
                  notifyCharacteristicUuid = characteristic.uuid;
                }
              }

              if (utils.isBlank(writeCharacteristicUuid) || utils.isBlank(notifyCharacteristicUuid)) {
                if (connectBleStarted) {
                  retry(States.GET_BLE_DEVICE_CHARACTERISTICS);
                } else {
                  cancel();
                }
              } else {
                _resolve(notifyCharacteristicUuid, writeCharacteristicUuid);
              }
            },
            fail: function(res) {
              logger.warn(TAG.format('connectBle'), 'wx.getBLEDeviceCharacteristics (NO.{0} times) failed:'.format(times), JSON.stringify(res));

              if (connectBleStarted) {
                retry(States.GET_BLE_DEVICE_CHARACTERISTICS);
              } else {
                cancel();
              }
            }
          })
        });
      };

      var notifyBLECharacteristicValueChange = function() {

        progress(States.ENABLE_NOTIFY_BLE_CHARACTERISTIC);

        wx.onBLECharacteristicValueChange(function(res) {
          logger.log(TAG.format('connectBle'), 'wx.onBLECharacteristicValueChange', JSON.stringify(res));
        })

        return new RetryPromise((_resolve, retry, cancel, times) => {

          wx.notifyBLECharacteristicValueChange({
            deviceId: deviceId,
            serviceId: serviceUuid,
            characteristicId: notifyCharacteristicUuid,
            state: true,
            success: function(res) {
              logger.log(TAG.format('connectBle'), 'wx.notifyBLECharacteristicValueChange (NO.{0} times) success:'.format(times), JSON.stringify(res));

              wx.onBLECharacteristicValueChange(function(res) {

                logger.log(TAG.format('onBLECharacteristicValueChange'), JSON.stringify(res));
                if (typeof onBLECharacteristicValueChange === 'function') {

                  try {

                    if (bleDeviceId === res.deviceId && serviceUuid === res.serviceId && notifyCharacteristicUuid === res.characteristicId) {
                      onBLECharacteristicValueChange(new Uint8Array(res.value));
                    }
                  } catch (e) {}
                }
              });
              _resolve();
            },
            fail: function(res) {
              logger.warn(TAG.format('connectBle'), 'wx.notifyBLECharacteristicValueChange (NO.{0} times) failed:'.format(times), JSON.stringify(res));
              if (connectBleStarted) {
                retry(States.ENABLE_NOTIFY_BLE_CHARACTERISTIC);
              } else {
                cancel();
              }
            }
          })
        });
      };

      pipe(createBLEConnection, getBLEDeviceServices, getBLEDeviceCharacteristics, notifyBLECharacteristicValueChange)
        .then(() => {
          resolve();
        }).catch(error => {
          reject(error);
        });
    });
  };

  var progress = function(state) {

    if (typeof progressCallback === 'function') {

      try {
        progressCallback({
          name: state['name'],
          description: state['description']
        });
      } catch (e) {}
    }
  };

  /**
   * options: {
   *  bleName: string, 
   *  strictMatching: boolean, 
   *  bleServiceUuid: string,
   *  progressCallback: function,
   *  onBLECharacteristicValueChange: function
   * }
   */
  this.setOptions = function(options) {

    if (!options) {
      return;
    }

    bleName = utils.isEmpty(options.bleName) ? '' : options.bleName;
    strictMatching = options.strictMatching ? true : false;
    bleServiceUuid = utils.isEmpty(options.bleServiceUuid) ? '' : options.bleServiceUuid;
    progressCallback = options.progressCallback;
    onBLECharacteristicValueChange = options.onBLECharacteristicValueChange;
  };

  this.init = function() {

    return new Promise(function(resolve, reject) {

      wx.openBluetoothAdapter({

        success: function(res) {

          logger.log(TAG.format('init'), 'wx.openBluetoothAdapter success -', JSON.stringify(res));
          resolve('openBluetoothAdapter');
        },

        fail: function(res) {

          logger.warn(TAG.format('init'), 'wx.openBluetoothAdapter fail -', JSON.stringify(res));
          if (res.errCode === 10001) {
            resolve('openBluetoothAdapter');
          } else {
            reject('openBluetoothAdapter');
          }
        }
      });
    });
  };

  this.destroy = function() {

    return new Promise(function(resolve, reject) {

      wx.closeBluetoothAdapter({

        complete: function(res) {
          logger.log(TAG.format('destroy'), 'wx.closeBluetoothAdapter complete -', JSON.stringify(res));
          resolve();
        }
      });
    });
  };

  this.scanBle = scanBle;

  this.stopScanBle = function() {
    scanBleStarted = false;

    return new Promise(function(resolve, reject) {

      wx.stopBluetoothDevicesDiscovery({
        complete: function(res) {
          logger.log(TAG.format('destroy'), 'wx.stopBluetoothDevicesDiscovery complete -', JSON.stringify(res));
          resolve('stopScanBle');
        },
      })
    });
  };

  this.connectBle = connectBle;

  this.disconnectBle = function() {

    connectBleStarted = false;

    if (utils.isBlank(bleDeviceId)) {
      return Promise.resolve();
    }

    return new RetryPromise((resolve, retry, cancel, times) => {

      wx.closeBLEConnection({
        deviceId: bleDeviceId,
        success: function(res) {

          logger.log(TAG.format('disconnectBle'), 'wx.closeBLEConnection (NO.{0} times) success:'.format(times), JSON.stringify(res));
          resolve();
        },
        fail: function(res) {

          logger.warn(TAG.format('disconnectBle'), 'wx.closeBLEConnection (NO.{0} times) failed:'.format(times), JSON.stringify(res));

          if (res.errCode === 10006) {
            resolve();
          } else {
            retry('disconnectBle');
          }
        }
      });
    }, null, true);
  };

  this.writeData = function(arrayBuffer) {

    return new RetryPromise((resolve, retry, cancel, times) => {

      var hex = hexarray.toString(new Uint8Array(arrayBuffer), {
        grouping: 1
      });

      wx.writeBLECharacteristicValue({
        deviceId: bleDeviceId,
        serviceId: serviceUuid,
        characteristicId: writeCharacteristicUuid,
        value: arrayBuffer,
        success: function(res) {
          logger.log(TAG.format('writeData'), 'wx.writeBLECharacteristicValue (NO.{0} times) success, data: {1} res: {2}'.format(times, hex, JSON.stringify(res)));

          resolve();
        },
        fail: function(res) {
          logger.warn(TAG.format('writeData'), 'wx.writeBLECharacteristicValue (NO.{0} times) failed, data: {1} res: {2}'.format(times, hex, JSON.stringify(res)));

          if (connectBleStarted) {
            retry();
          } else {
            cancel();
          }
        },
      });
    }, 3);
  };

  this.listenBluetoothAdapterStateChange = function(callback) {

    wx.getBluetoothAdapterState({
      success: function(res) {

        logger.log(TAG.format('getBluetoothAdapterState'), JSON.stringify(res));

        if (callback) {
          callback(res.available);
        }
      },
      fail: function(res) {

        logger.log(TAG.format('getBluetoothAdapterState'), JSON.stringify(res));

        if (callback) {
          callback(false);
        }
      }
    });

    wx.onBluetoothAdapterStateChange(function(res) {

      if (callback) {
        callback(res.available);
      }
    });
  };

  this.unlistenBluetoothAdapterStateChange = function() {

    wx.onBluetoothAdapterStateChange(function(res) {});
  };
};