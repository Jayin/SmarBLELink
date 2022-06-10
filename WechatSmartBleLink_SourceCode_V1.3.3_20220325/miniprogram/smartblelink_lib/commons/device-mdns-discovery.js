const logger = require('./logger.js');
const utils = require('./utils.js');

module.exports = function () {

  var TAG = 'smartaplink_lib.commons.device-mDNS-discovery.{0}:'

  var discoveryDeviceStarted = false;
  var onLocalServiceFoundCallback = null;
  var onLocalServiceDiscoveryStopCallback = null;

  /**
   * 启动发现设备
   * object: {bleName: string[option], onDeviceFound: function}
   */
  this.startDeviceDiscovery = function (object) {

    if (discoveryDeviceStarted) {
      logger.warn(TAG.format('startDeviceDiscovery'), 'device discovery was already started');
      return;
    }
    discoveryDeviceStarted = true;
    var macs = [];

    if (onLocalServiceFoundCallback != null) {
      wx.offLocalServiceFound(onLocalServiceFoundCallback);
    }
    onLocalServiceFoundCallback = function (res) {

      logger.info(TAG.format('onLocalServiceFound'), JSON.stringify(res));

      if (object && typeof object['onDeviceFound'] === 'function') {

        var deviceInfos = res['serviceName'].split('`');;
        if (deviceInfos.length < 3) {
          return;
        }

        var mac = deviceInfos[0];
        var mid = deviceInfos[1];
        var bleName = deviceInfos[2];
        var ip = res['ip'];

        if (macs.indexOf(mac) === -1 && utils.isStrictMatched(bleName, object['bleName'], object['strictMatching'])) {

          macs.push(mac);
          object['onDeviceFound']({
            mid: mid,
            mac: mac,
            bleName: bleName,
            ip: ip
          });
        }
      }
    };
    wx.onLocalServiceFound(onLocalServiceFoundCallback);

    if (onLocalServiceDiscoveryStopCallback != null) {
      wx.offLocalServiceDiscoveryStop(onLocalServiceDiscoveryStopCallback);
    }
    onLocalServiceDiscoveryStopCallback = function (res) {

      logger.info(TAG.format('onLocalServiceDiscoveryStop'), JSON.stringify(res));
      if (discoveryDeviceStarted) {
        localServiceDiscovery();
      } else {
        wx.offLocalServiceDiscoveryStop(onLocalServiceDiscoveryStopCallback);
        onLocalServiceDiscoveryStopCallback = null;
      }
    };
    wx.onLocalServiceDiscoveryStop(onLocalServiceDiscoveryStopCallback);

    var localServiceDiscovery = function () {

      if (!discoveryDeviceStarted) {
        return;
      }

      wx.startLocalServiceDiscovery({
        serviceType: '_hf._tcp.',
        success: function (res) {
          logger.log(TAG.format('findDevice'), 'startLocalServiceDiscovery success', JSON.stringify(res));
        },
        fail: function (res) {
          logger.warn(TAG.format('findDevice'), 'startLocalServiceDiscovery fail', JSON.stringify(res));

          if (res['errMsg'].indexOf('scan task already exist') == -1) {
            setTimeout(localServiceDiscovery, 3000);
          }
        }
      });
    };

    localServiceDiscovery();
  }

  /**
   * 停止发现设备
   */
  this.stopDeviceDiscovery = function () {

    discoveryDeviceStarted = false;

    wx.stopLocalServiceDiscovery({
      serviceType: '_hf._tcp.',
      complete: function (res) {
        logger.log(TAG.format('stopDeviceDiscovery'), 'stopLocalServiceDiscovery complete', JSON.stringify(res));

        if (onLocalServiceFoundCallback != null) {
          wx.offLocalServiceFound(onLocalServiceFoundCallback);
          onLocalServiceFoundCallback = null;
        }
      }
    });
  }
};