/**
 * var template1="I'm {0}，I'm {1} years old";
 * var template2="I'm {name}，I'm {age} years old";
 * var result1=template1.format("loogn",22);
 * var result2=template2.format({name:"loogn",age:22});
 * @param args
 * @returns {String}
 */
String.prototype.format = function (args) {
  var result = this;
  if (arguments.length > 0) {
    if (arguments.length == 1 && typeof (args) == "object") {
      for (var key in args) {
        if (args[key] != undefined) {
          var reg = new RegExp("({" + key + "})", "g");
          result = result.replace(reg, args[key]);
        }
      }
    } else {
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] != undefined) {
          var reg = new RegExp("({)" + i + "(})", "g");
          result = result.replace(reg, arguments[i]);
        }
      }
    }
  }
  return result;
};

module.exports = {

  isEmpty: function (text) {

    return text === undefined || text == null;
  },
  isBlank: function (text) {

    return this.isEmpty(text) || text.toString().trim().length == 0;
  },
  isNotBlank: function (text) {
    return !this.isBlank(text);
  },

  isStrictMatched: function (text2Match, matchingText, strictMatching) {

    if (this.isEmpty(text2Match)) {
      return false;
    }

    if (this.isEmpty(matchingText)) {
      return true;
    }

    if (strictMatching) {
      return text2Match === matchingText;
    } else {
      return new RegExp('.*{0}.*'.format(matchingText)).test(text2Match);
    }
  },

  compareVersion: function (v1, v2) {

    v1 = v1.split('.')
    v2 = v2.split('.')
    const len = Math.max(v1.length, v2.length)

    while (v1.length < len) {
      v1.push('0')
    }
    while (v2.length < len) {
      v2.push('0')
    }

    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1[i])
      const num2 = parseInt(v2[i])

      if (num1 > num2) {
        return 1
      } else if (num1 < num2) {
        return -1
      }
    }

    return 0
  },

  prettySsid: function (ssid) {

    if (this.isBlank(ssid)) {
      return ssid;
    }

    if (ssid.length > 2 && ssid.indexOf('"') === 0 && ssid.lastIndexOf('"') === ssid.length - 1) {
      ssid = ssid.substring(1, ssid.length - 1);
    }

    return ssid;
  }

};