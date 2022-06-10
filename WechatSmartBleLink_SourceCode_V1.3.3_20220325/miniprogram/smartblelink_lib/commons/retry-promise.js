const States = require('./states.js');

module.exports = function(action, retryTimes, noReject) {

  const MAX_RETRY_TIMES = 10;

  return new Promise((resolve, reject) => {

    var maxTimes = isNaN(retryTimes) ? MAX_RETRY_TIMES : retryTimes;
    var times = 0;
    var retry = function(data) {

      if (times < maxTimes) {
        _action();
      } else if (noReject){
        resolve();
      }else {
        reject(data);
      }
    };

    var cancel = function (data) {

      reject(States.CANCEL);
    };

    var _action = function() {

      times++;
      action(resolve, retry, cancel, times)
    };

    _action();
  });
};