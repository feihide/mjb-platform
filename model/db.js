const mongoPool = require('../connect/dsm').mongoPool
var mongoose = mongoPool.connect
var Schema = mongoPool.schema

var loginSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  pwd: {
    type: String,
    required: true
  },
  ctime: {
    type: Number,
    required: true
  },
  utime: {
    type: Number,
    required: true
  }
});

exports.loginModel = mongoose.model('login', loginSchema);

var orderSchema = new Schema({
  ctime: {
    type: Number,
    required: true
  },
  utime: {
    type: Number,
    required: true
  },
  creator: {
    type: String,
    required: true
  },
  sn: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    required: true
  },
  status: {
    type: Number,
    required: true,
  },

});
exports.orderModel = mongoose.model('order', orderSchema);

var accesslogSchema = new Schema({
  info: {
    type: Schema.Types.Mixed,
    required: true
  },
  ctime: {
    type: Number,
    required: true
  }
});
exports.accesslogModel = mongoose.model('accesslog', accesslogSchema);

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
exports.errorlogModel = mongoose.model('errorlog', errorlogSchema);

var notifylogSchema = new Schema({
  request: {
    type: Schema.Types.Mixed,
    required: true
  },
  response: {
    type: Schema.Types.Mixed,
    required: true
  },
  repeatResponse: {
    type: Schema.Types.Mixed,
    required: false
  },
  status: {
    type: Number,
    required: true,
    default: 0
  },
  ctime: {
    type: Number,
    required: true
  }
});
exports.notifylogModel = mongoose.model('notifylog', notifylogSchema);

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

exports.load = function(data) {
  var configModel = []
  if (data) {
    for (i = 0; i < data.length; i++) {
      if (data[i]['attr']) {
        tmp = JSON.parse(data[i]['attr'])
        tmp.ctime = commonSchema.ctime
        tmp.utime = commonSchema.utime
        tmp.is_del = commonSchema.is_del

        tmpSchema = new Schema(tmp);
        configModel[i] = mongoose.model(data[i]['table'], tmpSchema, '', true);
      }
    }
  }

  return configModel
}

exports.notifyLog = function(request, response) {
  //console.log('save log')
  access = new exports.notifylogModel({
    request: request,
    response: response,
    ctime: parseInt(new Date().getTime() / 1000)
  });

  access.save(function(err, d) {
    console.log(err)
  });
}

exports.repeatRequestLog = function(id, response, cb) {
  exports.notifylogModel.findByIdAndUpdate(id, {
    repeatResponse: response
  }, {
    new: true
  }, function(err, data) {
    if (err) {
      console.log(err)
    } else {

    }
  })
}

exports.repeatRequestSuccess = function(id) {
  exports.notifylogModel.findByIdAndUpdate(id, {
    status: 1
  }, {
    new: true
  }, function(err, data) {
    if (err) {
      console.log(err)
    } else {
      //console.log(data)
    }
  })
}

exports.saveLog = function(data) {
  access = new exports.accesslogModel({
    info: data,
    ctime: parseInt(new Date().getTime() / 1000)
  });

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
