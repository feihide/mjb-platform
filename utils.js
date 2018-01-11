const request = require('request');

exports.sendsms = function(opt) {
  request(opt, function(error, response, body) {
    if (error) {
      console.log(error)
    }
  // console.log(response)
  })
}

exports.err = function(_error) {
  return {
    code: 400,
    error: JSON.stringify(_error)
  };
}

exports.out = function(result) {
  if (!result) {
    result = []
  }
  return {
    code: 200,
    data: result
  };
}

exports.notFound = function() {
  return {
    code: 404,
    error: '请求地址不存在'
  };
}

exports.randNumber = function(len) {
  var Num = "";
  for (var i = 0; i < len; i++) {
    Num += Math.floor(Math.random() * 10);
  }
  return Num
}

exports.sms = function(mobile, message) {
  return {
    url: 'http://222.73.117.156/msg/HttpBatchSendSM',
    headers: {
      'User-Agent': 'request',
      'accept': '*/*',
      'content-type': 'application/x-www-form-urlencoded',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
    },
    'form': {
      account: 'mjbang',
      pswd: 'Tch764679',
      mobile: mobile,
      msg: message
    },
    'method': 'POST'
  };
}

exports.md5 = function(data) {
  var buf = new Buffer(data);
  var str = buf.toString("binary");
  var crypto = require("crypto");
  return crypto.createHash("md5").update(str).digest("hex");
}
