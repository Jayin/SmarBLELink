// pages/smartBleLink/index/index.js
const utils = require('../../../smartblelink_lib/commons/utils.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    error: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {

    var systemInfo = wx.getSystemInfoSync();

    if (utils.compareVersion(systemInfo.SDKVersion, '2.9.5') < 0) {

      this.setData({
        error: {
          title: '提示',
          message: '您的微信版本过低，无法正常使用此小程序的服务，请更新微信到最新版本',
        }
      });

      return;
    }

    // if (!utils.isEmpty(systemInfo.system) && /.*ios.*/i.test(systemInfo.system)) {

    //   system = systemInfo.system.toLowerCase();
    //   var index = system.indexOf('ios');
    //   var version = system.substr(index + 3).trim();
    //   if (utils.compareVersion(version, '11') < 0) {

    //     this.setData({
    //       error: {
    //         title: '提示',
    //         message: '您的IOS系统版本过低，无法正常使用此小程序的服务，请更新系统后重试',
    //       }
    //     });

    //     return;
    //   }
    // }

    wx.redirectTo({
      url: '../guide/guide',
      success: function(res) {},
      fail: function(res) {},
      complete: function(res) {},
    });
  }
})