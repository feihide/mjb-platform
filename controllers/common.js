var mjbdb = require('../model/mjb.js');
var config = require('../config.js');
var utils = require('../utils.js');

const request = require('koa-request');

var qiniu = require("qiniu");
var apiConnect = require('../connect/api')
var memcache = apiConnect.memcachePool
var db = apiConnect.common_db
var platform_db = apiConnect.platform_db


var debug = require('debug')('controller:common');
qiniu.conf.ACCESS_KEY = config.qiniu.ACCESS_KEY;
qiniu.conf.SECRET_KEY = config.qiniu.SECRET_KEY;

var bucket = config.qiniu.bucket

exports.apiList = function*() {
  var trans = {
    'GET': 0,
    'POST': 1,
    'PUT': 2,
    'DELETE': 3
  };
  var rows = yield platform_db.query(
    "select * from api where route=? and type=? and is_delete=?", [this.request
      .query.route, trans[this.request.query.method], 0
    ]);
  if (rows[0]) {
    var list = yield platform_db.query(
      "select * from param where api_id=?  and is_delete=?", [rows[0].id, 0]
    );
    this.body = utils.out({
      'detail': rows[0],
      'param_list': list
    })
  } else {
    this.body = utils.out([])
  }
}

exports.verifyUser = function*() {

  var list = yield db.query("select * from user where mobile=? and pwd=?", [
    this.request.body.mobile, utils.md5(this.request.body.pwd)
  ])
  if (list[0]) {
    this.body = utils.out(list[0])
  } else {
    this.body = utils.err('登入失败')
  }
}

exports.getMysqlTable = function*() {
  return yield db.query(
    "select name  from dict where parent_id=76 and is_del=0")
}

exports.getCacheTable = function*() {
  var re = []
  var list = yield db.query(
    "select name  from dict where parent_id=91 and is_del=0")
  for (var i in list) {
    re[i] = list[i].name
  }
  return re
}

exports.smsVerify = function*() {
  if (this.request.body.mobile && this.request.body.code) {
    code = yield memcache.get('sms_' + this.request.body.mobile)
    if (code == this.request.body.code) {
      this.body = utils.out()
    } else {
      this.body = utils.err('验证码错误')
    }
  } else {
    this.body = utils.err('请求数据不完整')
  }
}

exports.getSmsCode = function*() {
  if (this.request.query.mobile) {
    code = yield memcache.get('sms_' + this.request.query.mobile)
    if (code) {
      this.body = utils.out(code)
    } else {
      this.body = utils.err('验证码不存在')
    }
  } else {
    this.body = utils.err('请求数据不完整')
  }
}


exports.sms = function*() {
  if (this.request.body.mobile) {
    var message = ''
    if (this.request.body.type != 0) {
      message = this.request.body.msg
    } else {
      //设置60秒间隔限制
      limitTime = yield memcache.get('limit_' + this.request.body.mobile)
      if (limitTime == 1) {
        this.body = utils.err('同一个手机号60秒内不能重复调用')
        return false
      }
      var code = utils.randNumber(4)
      message = '您的验证码是：' + code + '，如非本人操作请忽略本短信。'
      yield memcache.set('limit_' + this.request.body.mobile, 1, 60 * 1000)
      yield memcache.set('sms_' + this.request.body.mobile, code, 5 * 60 *
        1000)
    }

    if (!message) {
      this.body = utils.err('内容不能为空')
      return false
    }
    response = yield request.post(utils.sms(this.request.body.mobile, message));
    var state = response.body.split(',')[1];
    var msg = '';
    switch (state) {
      case '0':
        msg = '发送成功!';
        break;
      case '102':
        msg = '用户名密码错误!';
        break;
      default:
        msg = '发送失败，请重试!';
    }
    mjbdb.saveSms(this.request.body.mobile, message, response.body)
      //记录log
    this.body = utils.out(msg);
  } else {
    this.body = utils.err('手机号不能为空')
  }


}


exports.image = function*() {
  content = this.request.body.content

  imageinfo = require('imageinfo')
  var b = new Buffer(content, 'base64')

  info = imageinfo(b)
  if (info.type == 'image') {
    key = md5(content) + '.' + info.format.toLowerCase()
      //生成上传 Token
    token = uptoken(bucket, key);
    //上传到七牛后保存的文件名
    uploadFile(token, key, b);
    this.body = utils.out({
      name: key
    })
  } else {
    this.body = utils.err('上传文件不是图片')
  }

  //构建上传策略函数
  function uptoken(bucket, key) {
    var putPolicy = new qiniu.rs.PutPolicy(bucket + ":" + key);
    return putPolicy.token();
  }

  //构造上传函数
  function uploadFile(uptoken, key, data) {
    var extra = new qiniu.io.PutExtra();

    qiniu.io.put(uptoken, key, data, extra, function(err, ret) {
      if (!err) {
        // 上传成功， 处理返回值
        console.log(ret.hash, ret.key, ret.persistentId);
      } else {
        // 上传失败， 处理返回代码
        console.log(err);
      }
    });
  }

  function md5(data) {
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    var crypto = require("crypto");
    return crypto.createHash("md5").update(str).digest("hex");
  }

};

exports.imageDel = function*() {
  var self = this
    //构建bucketmanager对象
  var client = new qiniu.rs.Client();
  //你要测试的空间， 并且这个key在你空间中存在
  //删除资源

  client.remove(bucket, this.params.id, function(err, ret) {
    if (!err) {
      console.log('ok')
        // ok
    } else {
      console.log(err)

    }
  });
  self.body = utils.out('ok')
}
