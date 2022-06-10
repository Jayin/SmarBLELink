var logger = require('./logger.js');
const DeviceMdnsDiscovery = require('./device-mdns-discovery.js');
const DeviceSmartLinkDiscovery = require('./device-smartlink-discovery.js');

module.exports = function() {

  var self = this;
  var TAG = 'smartaplink_lib.commons.device-discovery.{0}:';
  var deviceMdnsDiscovery = new DeviceMdnsDiscovery();
  var deviceSmartLinkDiscovery = new DeviceSmartLinkDiscovery();
  var discoveries = [deviceMdnsDiscovery, deviceSmartLinkDiscovery];
  var discoveryDeviceStarted = false;

  /**
   * 启动发现设备
   * object: {mac: string, serverKey: string, time: 'YYYY-MM-DDTHH:mm:ssZ', onDeviceFound: function}
   */
  this.startDeviceDiscovery = function (object) {

    if (discoveryDeviceStarted) {
      logger.warn(TAG.format('startDeviceDiscovery'), 'device discovery was already started');
      return;
    }

    discoveryDeviceStarted = true;
    var macs = [];
    var onDeviceFound = object['onDeviceFound'];
    object['onDeviceFound'] = function(device) {

      if (macs.indexOf(device['mac']) === -1) {

        macs.push(device['mac']);

        try {
          onDeviceFound(device);
        } catch (error) {
          logger.error(TAG.format('startDeviceDiscovery'), error); 
        }
      }
    }

    discoveries.forEach(discovery => {
      discovery.startDeviceDiscovery(object);
    });
  }

  this.stopDeviceDiscovery = function () {

    discoveries.forEach(discovery => {
      discovery.stopDeviceDiscovery();
    });

    discoveryDeviceStarted = false;
  }
};