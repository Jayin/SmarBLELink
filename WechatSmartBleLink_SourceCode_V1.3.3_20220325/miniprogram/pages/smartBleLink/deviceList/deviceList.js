// miniprogram/pages/smartBleLink/deviceList/deviceList.js
const BleLinker = require('../../../smartblelink_lib/commons/ble-linker.js');
const utils = require('../../../smartblelink_lib/commons/utils.js');
const logger = require('../../../smartblelink_lib/commons/logger.js');
var bleLinker = new BleLinker();
var TAG = 'page.smartBleLink/deviceList/deviceList.{0}:'

Page({

  options: null,

  /**
   * 页面的初始数据
   */
  data: {
    devices: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    this.options = options;
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

    var options = getApp().getBleLinkOptions();

    var bleName = options['bleName'];
    if (utils.isBlank(bleName)) {
      bleName = null;
    }
    var strictMatching = options['strictMatching'];
    if (utils.isBlank(strictMatching)) {
      strictMatching = null;
    }
    logger.log(TAG.format('startDeviceDiscovery'), 'bleName-', bleName, 'strictMatching-', strictMatching);

    var self = this;
    bleLinker.startDeviceDiscovery({
      bleName: bleName,
      strictMatching: strictMatching,
      onDeviceFound: function(device) {

        logger.log(TAG.format('startDeviceDiscovery'), 'onDeviceFound', JSON.stringify(device));

        var devices = self.data.devices;
        for (var i = 0; i < devices.length; i++) {
          if (device['mac'] === devices[i]['mac']) {
            return;
          }
        }

        devices.push(device);
        self.setData({
          devices: devices
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {
    bleLinker.stopDeviceDiscovery();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    bleLinker.stopDeviceDiscovery();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  },

  go2BleLink: function() {

    logger.info(TAG.format('go2BleLink'));

    wx.redirectTo({
      url: '../bleLink/bleLink',
      complete: res => {
        logger.info('redirectTo bleLink/bleLink', JSON.stringify(res))
      }
    });
  },

  goBack2ReferrenMinApp(e) {

    var device = e.currentTarget.dataset.device;
    var referrerAppInfo = getApp().referrerInfo;
    if (referrerAppInfo && referrerAppInfo['appId']) {

      wx.navigateBackMiniProgram({
        extraData: {
          mid: device['mid'],
          mac: device['mac'],
          ip: device['ip']
        },
        complete: function(res) {
          logger.log(TAG.format('goBack2ReferrenMinApp'), 'wx.navigateBackMiniProgram complete', JSON.stringify(res));
        },
      })
    }
  }
})