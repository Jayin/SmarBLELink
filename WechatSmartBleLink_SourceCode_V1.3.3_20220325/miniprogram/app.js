//app.js
const utils = require('./smartblelink_lib/commons/utils.js');
App({

  globalData: {
    bleName: 'AZ',
    strictMatching: true,
    hideBleInfoInputs: false,
    guide: {
      android: [
        '按配网键进入小程序配网',
        '打开手机蓝牙、Wi-Fi、GPS位置服务',
        '输入Ble名称、Wi-Fi密码后连接'
      ],
      ios: [
        '按配网键进入小程序配网',
        '打开手机蓝牙、Wi-Fi',
        '输入Ble名称、Wi-Fi密码后连接'
      ]
    },
    userData: null,
    isIos: false
  },

  referrerInfo: null,

  __genStorageKey: function(key) {

    var appId = this.referrerInfo && this.referrerInfo['appId'] ? this.referrerInfo['appId'] : 'default';
    return 'smartaplink.{0}.{1}'.format(appId, key);
  },

  setStorageValue: function(key, value) {

    if (utils.isBlank(key)) {
      return false;
    }

    wx.setStorageSync(this.__genStorageKey(key), value);

    return true;
  },

  getStorageValue: function(key, defaultValue) {

    if (utils.isEmpty(key)) {
      return null;
    }

    key = this.__genStorageKey(key);
    var keys = wx.getStorageInfoSync()['keys'];
    if (keys.indexOf(key) == -1) {
      return defaultValue === undefined ? null : defaultValue;
    }

    return wx.getStorageSync(key);
  },

  getReferrerInfoValue: function(key) {

    if (this.referrerInfo && this.referrerInfo['extraData'] && this.referrerInfo['extraData'].hasOwnProperty(key)) {
      return this.referrerInfo['extraData'][key];
    }

    return null;
  },

  _getBleLinkOption: function(key) {

    var value = this.getStorageValue(key);
    if (!utils.isEmpty(value)) {
      return value;
    }

    value = this.getReferrerInfoValue(key);
    if (!utils.isEmpty(value)) {
      return value;
    }

    return this.globalData[key];
  },

  getBleLinkOptions: function() {

    var bleName = this._getBleLinkOption('bleName');
    var strictMatching = true; //this._getBleLinkOption('strictMatching');
    var hideBleInfoInputs = this._getBleLinkOption('hideBleInfoInputs');
    var guide = this._getBleLinkOption('guide');
    var userData = this._getBleLinkOption('userData');

    return {
      bleName: bleName,
      strictMatching: strictMatching,
      hideBleInfoInputs: hideBleInfoInputs,
      guide: guide,
      userData: userData
    };
  },

  onLaunch: function(data) {

    var systemInfo = wx.getSystemInfoSync();
    if (!utils.isEmpty(systemInfo['system']) && /.*ios.*/i.test(systemInfo['system'])) {
      this.globalData.isIos = true;
    }
  },

  onShow: function (data) {

    if (data && data['scene'] == 1037 && data['referrerInfo']) {
      this.referrerInfo = data['referrerInfo'];
    }

    // if (data && data['scene'] == 1038 && data['referrerInfo'] && 
    //   data['referrerInfo']['appId'] === 'wx4beabf3f3ca2bb43') {

    //   var device = data['referrerInfo']['extraData'];
    //   console.log(JSON.stringify(device));
    // }
  },

  onHide: function() {
    this.referrerInfo = null;
  }
})