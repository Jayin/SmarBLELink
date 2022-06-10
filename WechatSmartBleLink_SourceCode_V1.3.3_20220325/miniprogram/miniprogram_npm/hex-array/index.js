module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1606907660468, function(require, module, exports) {


var lc = ["0", "1", "2", "3", "4", "5", "6", "7",
          "8", "9", "a", "b", "c", "d", "e", "f"];
var uc = ["0", "1", "2", "3", "4", "5", "6", "7",
          "8", "9", "A", "B", "C", "D", "E", "F"];

function toHex(val, uppercase) {
  var set = uppercase ? uc : lc;
  return set[Math.floor(val / 16)] + set[val % 16];
}

function extend(obj, source) {
  for (var key in source) {
    if (obj[key] == undefined)
      obj[key] = source[key];
  }

  return obj;
}

function toString(arr, opts) {
  var defaultOpts = {
    grouping: 0,
    rowlength: 0,
    uppercase: true,
  };

  if (opts == undefined)
    opts = {}

  opts = extend(opts, defaultOpts);

  var str = "";
  var group = 0, column = 0;
  for (var i = 0; i < arr.length; ++i) {
    str += toHex(arr[i], opts.uppercase);

    if (i === arr.length - 1)
      break;

    if (opts.grouping > 0 && ++group === opts.grouping) {
      group = 0;

      if (opts.rowlength > 0 && ++column === opts.rowlength) {
        column = 0;
        str += "\n";
      }
      else
        str += " ";
    }
  }

  return str;
}

function fromString(str) {
  str = str.toLowerCase().replace(/\s/g, "");
  if (str.length % 2 == 1)
    str = "0" + str;

  var len = Math.floor(str.length / 2);
  var buffer = new Uint8Array(len);

  var curr = -1;
  for (var i = 0; i < str.length; ++i) {
    var c = str[i];
    var val = lc.indexOf(c);
    if (val == -1)
        throw Error("unexpected character")

    if (curr === -1) {
      curr = 16 * val;
    } else {
      buffer[Math.floor(i / 2)] = curr + val;
      curr = -1;
    }
  }

  return buffer;
}

exports.toString = toString;
exports.fromString = fromString;

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1606907660468);
})()
//# sourceMappingURL=index.js.map