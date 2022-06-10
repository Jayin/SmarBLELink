const logger = require('../../../smartblelink_lib/commons/logger.js');
// pages/smartBleLink/guide/guide.js
const utils = require('../../../smartblelink_lib/commons/utils.js');

Page({

  options: {},
  /**
   * 页面的初始数据
   */
  data: {
    guideTexts: ['按配网键进入小程序配网', '打开手机Wi-Fi', '输入Wi-Fi及AP的SSID、密码后连接']
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {

    var guide = getApp().getBleLinkOptions()['guide'];
    if (guide) {

      var platform = 'android';
      var systemInfo = wx.getSystemInfoSync();
      if (!utils.isEmpty(systemInfo['system']) && /.*ios.*/i.test(systemInfo['system'])) {
        platform = 'ios';
      }

      var texts = guide[platform];
      if (!texts) {
        texts = platform === 'android' ? guide['ios'] : guide['android'];
      }
      if (texts) {
        this.setData({
          guideTexts: texts
        })
      }
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

  },

  go2BleLink: function () {

    logger.info('go2BleLink');

    wx.navigateTo({
      url: '../bleLink/bleLink',
      success: function(res) {},
      fail: function(res) {},
      complete: function(res) {
        logger.info('navigateTo bleLink/bleLink', JSON.stringify(res))
      },
    })
  },

  go2DeviceList: function() {

    var bleName = this.options['bleName'];
    if (utils.isEmpty(bleName)) {
      bleName = 'hiflying_softap';
    }
    var strictMatching = this.options['strictMatching'];
    if (utils.isEmpty(strictMatching)) {
      strictMatching = '';
    }

    wx.navigateTo({
      url: '../deviceList/deviceList?bleName={0}&strictMatching={1}'.format(bleName, strictMatching),
      success: function(res) {},
      fail: function(res) {},
      complete: function(res) {},
    })
  }
})