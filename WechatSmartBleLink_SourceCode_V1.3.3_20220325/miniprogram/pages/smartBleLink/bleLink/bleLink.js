// miniprogram/pages/smartBleLink/bleLink/bleLink.js
const aesjs = require('aes-js');
const BleLinker = require('../../../smartblelink_lib/commons/ble-linker.js');
const logger = require('../../../smartblelink_lib/commons/logger.js');
const utils = require('../../../smartblelink_lib/commons/utils.js');
var bleLinker = new BleLinker();
var TAG = 'pages.smartBleLink.bleLink.bleLink.{0}:'

Page({

  global: {

    topTipsDismissTimer: -1,
    bleLinkOptions: {},
    inited: false
  },

  data: {
    bleName: '',
    wifiSsid: '',
    wifiPassword: '',
    hideBleInfoInputs: false,
    showWifiPassword: false,
    wifiPasswordIcon: 'icon-eye_closed',
    wifiConnected: true,
    bluetoothEnabled: true,
    error: false,
    tips: false,
    loading: false,
    isIos: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {

    this.global.bleLinkOptions = getApp().getBleLinkOptions();
    this.init(this.listenConnectivityChange);
    this.setData({
      isIos: getApp().globalData.isIos
    });
  },


  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

    this.unlistenConnectivityChange();
    bleLinker.destroy();
  },

  /**
   * 生命周期函数--监听页面Ready
   */
  onReady: function() {

    this.setData({
      bleName: this.global.bleLinkOptions['bleName']
    });

    var hideBleInfoInputs = this.global.bleLinkOptions['hideBleInfoInputs'];
    if (new String(hideBleInfoInputs).toLowerCase() === 'true') {
      this.setData({
        hideBleInfoInputs: true
      });
    }
  },

  onShow: function() {

    if (this.global.inited) {
      this.listenConnectivityChange();
    }
  },

  onHide: function() {

    this.unlistenConnectivityChange();
  },

  init: function(successCallback) {

    bleLinker.init()
      .then(result => {

        if (result) {

          successCallback();
        } else {

          this.setData({
            error: {
              title: '初始化失败',
              message: '请退出当前页面后再重试',
              retry: false
            }
          });
        }

        this.global.inited = result;
        logger.info(TAG.format('init'), 'init bleLinker', result ? 'succeed' : 'failed');
      });
  },

  getConnectedWifi: function() {

    var self = this;

    bleLinker.getConnectedWifi(function(result) {

      logger.log(TAG.format('getConnectedWifi'), JSON.stringify(result));

      if (result['success']) {

        if (result['res']['wifi']['SSID'].length) {

          var ssid = result['res']['wifi']['SSID'];
          self.setData({
            wifiSsid: ssid,
            wifiPassword: getApp().getStorageValue('wifiPassword.' + ssid, ''),
            error: false
          })
        } else {

          self.setData({
            error: {
              title: '获取Wi-Fi连接信息失败',
              message: '请稍后重试',
              retry: 'getConnectedWifi'
            }
          });
        }
      } else {

        var errorCode = result['res']['errCode'];
        if (errorCode == 12005) {

          self.setData({
            error: {
              title: 'Wi-Fi已关闭',
              message: '请打开Wi-Fi后重试',
              retry: 'getConnectedWifi'
            }
          });
        } else if (errorCode == 12006) {

          self.setData({
            error: {
              title: '获取Wi-Fi连接信息失败',
              message: '请打开手机GPS位置服务后重试',
              retry: 'getConnectedWifi'
            }
          });
        } else {

          self.setData({
            error: {
              title: '获取Wi-Fi连接信息失败',
              message: '请关闭并再次打开Wi-Fi后重试',
              retry: 'getConnectedWifi'
            }
          });
        }
      }
    });
  },

  retry: function(e) {

    var type = e.target.dataset.type;
    if (type === 'getConnectedWifi') {
      this.getConnectedWifi();
    }
  },

  showWifiPassword: function() {
    this.setData({
      showWifiPassword: !this.data.showWifiPassword,
      wifiPasswordIcon: this.data.showWifiPassword ? 'icon-eye_closed' : 'icon-eye_open'
    })
  },

  bindInput: function(e) {

    var data = {};
    data[e.target.dataset.key] = e.detail.value;
    this.setData(data);
  },

  startBleLink: function() {

    if (!this.validateForm()) {
      return;
    }

    var self = this;
    var app = getApp();

    if (this.data.bleName !== this.global.bleLinkOptions['bleName']) {
      app.setStorageValue('bleName', this.data.bleName);
    }
    app.setStorageValue('wifiPassword.' + this.data.wifiSsid, this.data.wifiPassword);

    bleLinker.start({

      wifiSsid: this.data.wifiSsid,
      wifiPassword: this.data.wifiPassword,
      bleName: this.data.bleName,
      strictMatching: self.global.bleLinkOptions['strictMatching'],
      userData: self.global.bleLinkOptions['userData'],
      success: function(res) {
        logger.info(TAG.format('startBleLink'), 'success');

        self.hideLoading();

        wx.redirectTo({
          url: '../deviceList/deviceList',
        });
      },
      fail: function(res) {
        logger.warn(TAG.format('startBleLink'), 'fail', JSON.stringify(res));

        self.hideLoading();

        var content = '{0}：(Code: {1})'.format(res['msg'], res['code']);
        wx.showModal({
          title: '配置设备上网失败',
          content: content,
          showCancel: false,
          success: function(res) {}
        });
      },
      progress: function(res) {
        logger.log(TAG.format('startBleLink'), 'progress', JSON.stringify(res));

        self.showLoading(res['description']);
      }
    });
  },

  stopBleLink: function() {

    bleLinker.stop();
    this.hideLoading();
  },

  validateForm: function() {

    if (utils.isEmpty(this.data.bleName) || !this.data.bleName.length) {

      this.showTopTips('BLE名称不能为空');
      return false;
    }

    var bleNameByteLength = aesjs.utils.utf8.toBytes(this.data.bleName).length;
    if (bleNameByteLength > 26) {
      this.showTopTips('BLE名称过长');
      return false;
    }

    if (utils.isEmpty(this.data.wifiSsid) || !this.data.wifiSsid.length) {

      this.showTopTips('未获得当前连接的Wi-Fi SSID');
      return false;
    }

    var wifiPasswordByteLength = aesjs.utils.utf8.toBytes(this.data.wifiPassword).length;
    if ((wifiPasswordByteLength >= 1 && wifiPasswordByteLength <= 4) || (wifiPasswordByteLength >= 6 && wifiPasswordByteLength <= 7)
      || wifiPasswordByteLength > 64) {
      this.showTopTips('Wi-Fi密码格式错误');
      return false;
    }

    return true;
  },

  showTopTips: function(tips) {

    if (this.global.topTipsDismissTimer != -1) {
      clearTimeout(topTipsDismissTimer);
    }

    this.setData({
      tips: tips
    });

    var self = this;
    topTipsDismissTimer = setTimeout(function() {

      self.setData({
        tips: false
      });
    }, 1000);
  },

  listenConnectivityChange: function() {

    var self = this;

    bleLinker.listenBluetoothAdapterStateChange(function(connected) {

      logger.log(TAG.format('listenConnectivityChange'), 'onBluetoothAdapterStateChange', connected);

      self.setData({
        bluetoothEnabled: connected
      });

      if (!connected) {
        self.stopBleLink();
      }
    });

    bleLinker.listenWifiStateChange(function(connected, info) {

      logger.log(TAG.format('listenConnectivityChange'), 'onWifiStateChange', JSON.stringify(connected));

      self.setData({
        wifiConnected: connected
      });

      if (connected) {
        self.getConnectedWifi();
      } else {
        self.stopBleLink();
      }
    });
  },

  unlistenConnectivityChange: function() {

    bleLinker.unlistenBluetoothAdapterStateChange();
    bleLinker.unlistenWifiStateChange();
  },

  showLoading: function(text) {
    this.setData({
      loading: text
    });
  },

  hideLoading: function() {
    this.setData({
      loading: false
    });
  }
});