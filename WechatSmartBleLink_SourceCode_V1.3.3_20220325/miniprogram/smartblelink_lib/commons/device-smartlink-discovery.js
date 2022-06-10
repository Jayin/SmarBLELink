const Unibabel = require('browserify-unibabel');
const utils = require('./utils.js');
const logger = require('./logger.js');
const Constant = require('./constant.js');

module.exports = function () {

  var TAG = 'smartaplink_lib.commons.device-smartlink-discovery.{0}:'

  var discoveryDeviceStarted = false;
  var socket = null;
  var intervalId = null;

  /**
   * 启动发现设备
   * object: {bleName: string[option], onDeviceFound: function}
   */
  this.startDeviceDiscovery = function (object) {

    if (discoveryDeviceStarted) {
      logger.warn(TAG.format('startDeviceDiscovery'), 'device discovery was already started');
      return;
    }

    logger.info(TAG.format('startDeviceDiscovery'));
    discoveryDeviceStarted = true;
    var macs = [];

    socket = wx.createUDPSocket();
    socket.onMessage(function (res) {

      var uint8Array = new Uint8Array(res['message']);
      var message = Unibabel.utf8ArrToStr(uint8Array).trim();
      res['messageText'] = message;
      logger.log(TAG.format('socket.onMessage:'), JSON.stringify(res));

      var prefix = 'smart_config';
      if (message.startsWith(prefix)) {

        var resultTexts = message.substr(prefix.length).trim();
        var resultItems = resultTexts.split('##');
        var mac = resultItems[0].trim();
        if (utils.isNotBlank(mac) && macs.indexOf(mac) === -1) {

          macs.push(mac);

          var mid = resultItems.length > 1 && utils.isNotBlank(resultItems[1]) ? resultItems[1] : resultItems[0];
          object['onDeviceFound']({
            mid: mid,
            mac: resultItems[0],
            ip: res['remoteInfo']['address']
          });
        }
      } else {

        try {

          var json = JSON.parse(message);
          if (json != null) {

            var mac = json['mac'];
            if (utils.isNotBlank(mac) && macs.indexOf(mac.trim()) === -1) {

              mac = mac.trim();
              macs.push(mac);

              object['onDeviceFound']({
                mid: json['mid'],
                mac: mac,
                ip: json['ip']
              });
            }
          }
        } catch (error) {
          logger.error(TAG.format('socket.onMessage:'), error);
        }
      }
    });
    socket.bind(Constant.smartConfigPort);

    intervalId = setInterval(function () {

      socket.send({
        address: Constant.udpBroadcastIp,
        port: Constant.smartLinkFindPort,
        message: 'smartlinkfind'
      });
    }, 500);
  };


  /**
   * 停止发现设备
   */
  this.stopDeviceDiscovery = function () {

    logger.info(TAG.format('stopDeviceDiscovery'));

    clearInterval(intervalId);
    socket.close();
    discoveryDeviceStarted = false;
  };
};