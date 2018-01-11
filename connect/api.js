const config = require('../config').mjb
var mongo = require('mongoose-reload')
var mongoose = {}
for (db in config.mongo_db) {
  mongoose[config.mongo_db[db]] = mongo.createConnection(config.mongo, 'mjb_' + config.mongo_db[db]);
  mongoose[config.mongo_db[db]].on('error', console.error.bind(console, config.mongo + ' mongo连接错误:'));
}

var MemcachedStore = require('koa-memcached');

var mysql = require('koa-mysql');

exports.common_db = mysql.createPool({
  user: config.mysql_user,
  password: config.mysql_pwd,
  database: 'mjb_common',
  host: config.mysql_host
});

exports.platform_db = mysql.createPool({
  user: config.mysql_user,
  password: config.mysql_pwd,
  database: 'mjb_platform',
  host: config.mysql_host
});

exports.memcachePool = MemcachedStore({
  host: config.memcache_host,
  port: config.memcache_port
})

exports.mongoPool = {
  schema: mongo.Schema,
  connect: mongoose
}
