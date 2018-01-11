var config = require('../config.js');
var utils = require('../utils.js');

var debug = require('debug')('controller:api_resource');

var apiConnect = require('../connect/api')
var memcache = apiConnect.memcachePool
var db = apiConnect.common_db

exports.village_by_designer = function*() {
  var rows = yield db.query("select count(*) as num from village where find_in_set(?,designer_list) and is_del=0", [this.request.query.designer_id]);
  if (rows[0]['num'] > 0) {
    var list = yield db.query("select * from village where find_in_set(?,designer_list) and is_del=0 limit ?,?", [this.request.query.designer_id, parseInt(this.request.query.skip), parseInt(this.request.query.limit)]);
    this.body = utils.out({
      'num': rows[0]['num'],
      'list': list
    })
  } else {
    this.body = utils.out({
      'num': 0,
      'list': []
    })
  }
}

exports.region_by_domain = function*() {
  var list = yield db.query("select * from region where find_in_set(?,domain) and is_del=0 limit ?,?", [this.request.query.domain, 0, 1]);
  if (list[0]) {
    this.body = utils.out({
      'data': list[0]
    })
  } else {
    this.body = utils.out({
      'data': []
    })
  }
}
