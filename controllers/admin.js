var db = require('../model/db');
var parse = require('co-body');
var thunkify = require('thunkify');
var co = require('co');
var bParse = require('co-busboy');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('controller:admin');
// const request = require('request');
const request = require('koa-request');

function findOneFun(id, cb) {
  db.loginModel.findOne({
    name: id
  }, function(err, o) {
    cb(err, o);
  })
}

var findOne = thunkify(findOneFun);

exports.login = function*() {
  var r = yield findOne(this.request.body.name);
  if (r) {
    this.body = db.out(r);
  } else {
    this.body = db.err('fails')
  }
};

exports.requestRemote = function*() {
  var ids = this.request.body.ids.split(',')
  var cond = {
    '_id': {
      $in: ids
    }
  }
  var sum = ids.length
  var success = 0

  var o = yield db.notifylogModel.find(cond)
  for (var i in o) {
    if (o[i].request) {
      var options = o[i].request

      try {
        var response = yield request.post(options) //Yay, HTTP requests with no callbacks!
      // console.log('remote response')
      } catch (e) {
        var response = {}
        response.body = e
      }
      //如果请求失败，记录到重复请求结果中
      if (response.body != '{"code":200,"error":"","data":""}') {
        //失败
      } else {
        //如果推送成功,更新状态
        success++
        db.repeatRequestSuccess(o[i].id)
      }
      db.repeatRequestLog(o[i].id, response.body)

    }
  }

  // db.notifylogModel.find(cond, function(err, o) {
  //   for (var i in o) {
  //     //&& o[i].status == 0
  //     if (o[i].request) {
  //       var options = o[i].request
  //       options.request_id = o[i].id
  //       request(options, function(error, response, body) {
  //         if (error) {
  //           console.log(error)
  //         } else {
  //           db.repeatRequestLog(response.request.request_id, body, function() {
  //             finish++
  //           })
  //         }
  //       })
  //     } else {
  //       finish++
  //     }
  //   }
  // })
  // while (1) {
  //   var timeId = setInterval(function() {
  //     console.log(finish)
  //   }, 2000)
  // }
  this.body = db.out('共请求了' + sum + ',成功' + success)


}
