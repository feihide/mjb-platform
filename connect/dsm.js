const config = require('../config')
var mongo = require('mongoose-reload')
var mongoose = mongo.createConnection(config.dsm.mongo, config.dsm.mongo_db);
mongoose.on('error', console.error.bind(console, '连接错误:'));
exports.mongoPool = {
  schema: mongo.Schema,
  connect: mongoose
}
