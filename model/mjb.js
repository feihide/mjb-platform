var thunkify = require('thunkify');
const config = require('../config').mjb
const apiConnect = require('../connect/api')
var mongoose = apiConnect.mongoPool.connect
var Schema = apiConnect.mongoPool.schema
var db = apiConnect.common_db

var resourceSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  table: {
    type: String,
    required: true
  },
  attr: {
    type: Schema.Types.Mixed,
    require: false
  },
  ctime: {
    type: Number,
    required: true
  },
  utime: {
    type: Number,
    required: true
  },
  is_del: {
    type: Number,
    required: true,
    default: 0
  }
});
exports.resourceModel = mongoose['common'].model('resource', resourceSchema);

var commonSchema = {
  ctime: {
    type: Number,
    required: true
  },
  utime: {
    type: Number,
    required: true
  },
  is_del: {
    type: Number,
    required: true,
    default: 0
  }
}


var ApiLogSchema = new Schema({
  log_type: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  request_api: {
    type: String,
    require: true
  },
  host: {
    type: String,
    require: true
  },
  request_uri: {
    type: String,
    require: true
  },
  request_params: {
    type: String,
    require: true
  },

  request_method: {
    type: String,
    require: true
  },
  ctime: {
    type: Number,
    required: true
  },
});

exports.apilogModel = mongoose['system'].model('apilog', ApiLogSchema);

var errorlogSchema = new Schema({
  info: {
    type: String,
    required: true
  },
  ctime: {
    type: Number,
    required: true
  }
});
exports.errorlogModel = mongoose['system'].model('errorlog', errorlogSchema);

var smslogSchema = new Schema({
  mobile: {
    type: Number,
    required: true
  },
  msg: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  ctime: {
    type: Number,
    required: true
  }
});
exports.smslogModel = mongoose['system'].model('smslog', smslogSchema);


function findResource(cb) {
  exports.resourceModel.find({
    is_del: 0
  }, function(err, o) {
    cb(err, o);
  })
}

exports.getResource = thunkify(findResource);

exports.getOpenCity = function*() {
  var city = []
  var list = yield db.query(
    "select en_name from region where region_grade=2 and status=2 and is_del=0"
  )
  for (i in list) {
    city[i] = list[i].en_name
  }
  return city;
}

exports.configModel = []
exports.load = function(data, city) {
  var isExist = config.mongo_db.indexOf(city)
    //城市不存在于配置中
  if (isExist == -1) {
    return false;
  } else {
    if (exports.configModel[city] == undefined || config.debug) {
      if (data.length > 0) {
        exports.configModel[city] = []
        for (i = 0; i < data.length; i++) {
          if (data[i]['attr']) {
            tmp = JSON.parse(data[i]['attr'])
            tmp.ctime = commonSchema.ctime
            tmp.utime = commonSchema.utime
            tmp.is_del = commonSchema.is_del

            tmpSchema = new Schema(tmp);

            exports.configModel[city][i] = mongoose[city].model(data[i][
              'table'
            ], tmpSchema, '', true);
          }
        }
      }
    }
    return true;
  }
}

exports.saveLog = function(data) {
  data.ctime = parseInt(new Date().getTime() / 1000)
  access = new exports.apilogModel(data);

  access.save(function(err, d) {
    // console.log(err)
    // console.log(d)
  });
}

exports.getErrorTime = function(cb) {
  exports.errorlogModel.findOne({}).sort({
    'ctime': -1
  }).exec(function(err, o) {
    cb(o)
  })
}

exports.saveError = function(data) {
  access = new exports.errorlogModel({
    info: data,
    ctime: parseInt(new Date().getTime() / 1000)
  });

  access.save(function(err, d) {
    // console.log(err)
    // console.log(d)
  });
}

exports.saveSms = function(mobile, msg, res) {
  access = new exports.smslogModel({
    mobile: mobile,
    msg: msg,
    response: res,
    ctime: parseInt(new Date().getTime() / 1000)
  });

  access.save(function(err, d) {
    // console.log(err)
    // console.log(d)
  });
}


exports.err = function(_error) {
  return {
    code: 400,
    error: JSON.stringify(_error)
  };
}

exports.out = function(result) {
  return {
    code: 200,
    data: result
  };
}
