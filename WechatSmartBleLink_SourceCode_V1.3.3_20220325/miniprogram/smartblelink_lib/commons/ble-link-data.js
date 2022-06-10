const utils = require('./utils.js');
const logger = require('./logger.js');
const Unibabel = require('browserify-unibabel');
const hexarray = require('hex-array');
const CRC = require('crc-full').CRC;

module.exports = function() {

  var TAG = 'smartblelink_lib.commons.ble-link-data.{0}:';
  var TEA_KEY = 'hiflying12345678';

  var getOriginalData = function(ssid, password, userData) {

    var ssidArray = Unibabel.strToUtf8Arr(ssid);
    var passwordArray = Unibabel.strToUtf8Arr(password);
    var userDataArray = Unibabel.strToUtf8Arr(userData);
    var length = ssidArray.length + passwordArray.length + userDataArray.length + 4;
    var buffer = new Uint8Array(length);
    var offset = 0;

    buffer.set([ssidArray.length], offset);
    offset += 1;
    buffer.set(ssidArray, offset);
    offset += ssidArray.length;

    buffer.set([passwordArray.length], offset);
    offset += 1;
    buffer.set(passwordArray, offset);
    offset += passwordArray.length;

    buffer.set([userDataArray.length], offset);
    offset += 1;
    buffer.set(userDataArray, offset);
    offset += userDataArray.length;

    var toCrc = buffer.subarray(0, -1);
    var crc = CRC.default("CRC8_MAXIM").compute(toCrc);
    buffer.set([crc], offset);

    return buffer;
  };

  var uint8Array2Uint32Array = function(uint8Array) {

    var buffer = new ArrayBuffer(uint8Array.length);
    var tempArray = new Uint8Array(buffer);
    tempArray.set(uint8Array);

    var dataView = new DataView(buffer);
    var uint32Array = new Uint32Array(dataView.byteLength / 4);
    for (var i = 0; i < uint32Array.length; i++) {
      uint32Array[i] = dataView.getUint32(4 * i);
    }

    return uint32Array;
  };

  var uint32Array2Uint8Array = function(uint32Array) {

    var buffer = new ArrayBuffer(4);
    var dataView = new DataView(buffer);
    var uint8Array = new Uint8Array(uint32Array.length * 4);
    for (var i = 0; i < uint32Array.length; i++) {

      dataView.setUint32(0, uint32Array[i]);
      uint8Array.set(new Uint8Array(buffer), 4 * i);
    }

    return uint8Array;
  };

  var uint32 = function(value) {

    var dataView = new DataView(new ArrayBuffer(4));
    dataView.setUint32(0, value);
    return dataView.getUint32();
  }

  var teaEncrypt = function(plainArray) {

    var keyUint8Array = Unibabel.strToUtf8Arr(TEA_KEY);
    var keyUint32Array = uint8Array2Uint32Array(keyUint8Array);
    var plainLength = plainArray.length;
    var plain2Uint32Array = plainArray.subarray(0, Math.floor(plainLength / 8) * 8);
    var plainUint32Array = uint8Array2Uint32Array(plain2Uint32Array);
    var encryptedUint32Array = new Uint32Array(plainUint32Array.length);

    for (var i = 0; i < plainUint32Array.length; i += 2) {

      var delta = uint32(0x9e3779b9);
      var sum = uint32(0);
      var a = plainUint32Array[i];
      var b = plainUint32Array[i + 1];

      for (var j = 0; j < 8; j++) {

        sum += delta;
        a += ((b << 4) + keyUint32Array[0]) ^ (b + sum) ^ ((b >>> 5) + keyUint32Array[1]);
        b += ((a << 4) + keyUint32Array[2]) ^ (a + sum) ^ ((a >>> 5) + keyUint32Array[3]);
      }

      encryptedUint32Array[i] = a;
      encryptedUint32Array[i + 1] = b;
    }

    var encryptedUint8Array = new Uint8Array(plainLength);
    encryptedUint8Array.set(uint32Array2Uint8Array(encryptedUint32Array));
    encryptedUint8Array.set(plainArray.subarray(plain2Uint32Array.byteLength), encryptedUint32Array.byteLength);

    return encryptedUint8Array;
  };

  var getFrames = function(ssid, password, userData) {

    ssid = utils.isEmpty(ssid) ? '' : ssid;
    password = utils.isEmpty(password) ? '' : password;
    userData = utils.isEmpty(userData) ? '' : userData;

    logger.log(TAG.format('getFrames'), 'ssid-"{0}" password-"{1}" userData-"{2}"'.format(ssid, password, userData));

    var originalArray = getOriginalData(ssid, password, userData);
    logger.log(TAG.format('getFrames'), 'get original data-"{0}"'.format(
      hexarray.toString(originalArray, {
        grouping: 1
      })));

    var encryptedArray = teaEncrypt(originalArray);
    logger.log(TAG.format('getFrames'), 'encrypted data-"{0}"'.format(
      hexarray.toString(encryptedArray, {
        grouping: 1
      })));

    var dataLength = encryptedArray.length;
    var frameCount = Math.ceil(dataLength / 17);
    var position = 0;
    var frames = [];
    for (var i = 0; i < frameCount; i++) {

      var frameDataLength = Math.min(dataLength - position, 17);
      var frame = new Uint8Array(frameDataLength + 3);
      frame[0] = i + 1;
      frame[1] = frameCount;
      frame[2] = frameDataLength;
      frame.set(encryptedArray.subarray(position, position + frameDataLength), 3)
      
      frames.push(frame);

      logger.log(TAG.format('getFrames'), 'frames NO.{0}->{1}'.format(i + 1,
        hexarray.toString(frame, {
          grouping: 1
        })));

      position += frameDataLength;
    }

    return frames;
  };

  this.getFrames = getFrames;
};