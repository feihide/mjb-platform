const mongoPool = require('../connect/dsm').mongoPool
var mongoose = mongoPool.connect
var Schema = mongoPool.schema

var model = module.exports;
//
// Schemas definitions
//
var OAuthAccessTokensSchema = new Schema({
  accessToken: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  expires: {
    type: Date,
    required: true
  }
});

var OAuthRefreshTokensSchema = new Schema({
  refreshToken: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  expires: {
    type: Date,
    required: true
  }
});

var OAuthClientsSchema = new Schema({
  clientId: {
    type: String,
    required: true
  },
  clientSecret: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  is_del: {
    type: Number,
    required: true,
    default: 0
  },
  requestUri: {
    type: String
  }
});

var OAuthUsersSchema = new Schema({
  username: {
    type: String
  },
  password: {
    type: String
  },
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  email: {
    type: String,
    default: ''
  }
});

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
  desc: {
    type: String
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


mongoose.model('OAuthAccessTokens', OAuthAccessTokensSchema);
mongoose.model('OAuthRefreshTokens', OAuthRefreshTokensSchema);
mongoose.model('OAuthClients', OAuthClientsSchema);
mongoose.model('OAuthUsers', OAuthUsersSchema);
mongoose.model('Resource', resourceSchema);


model.OAuthAccessTokensModel = mongoose.model('OAuthAccessTokens'),
model.OAuthRefreshTokensModel = mongoose.model('OAuthRefreshTokens'),
model.OAuthClientsModel = mongoose.model('OAuthClients'),
model.OAuthUsersModel = mongoose.model('OAuthUsers');
model.ResourceModel = mongoose.model('Resource');

//
// oauth2-server callbacks
//

model.getResource = function(cb) {
  console.log('get resource');
  model.ResourceModel.find({
    is_del: 0
  }, cb);
// model.ResourceModel.findOne({
//   name: 'test'
// }, cb);
}

model.getAccessToken = function(bearerToken, callback) {
  console.log('in getAccessToken (bearerToken: ' + bearerToken + ')');

  model.OAuthAccessTokensModel.findOne({
    accessToken: bearerToken
  }, callback);
};

model.getClientInfo = function(clientId, callback) {
  return model.OAuthClientsModel.findOne({
    clientId: clientId,
    is_del: 0
  }, callback);
};

model.getClient = function(clientId, clientSecret, callback) {
  console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
  if (clientSecret == null) {
    return model.OAuthClientsModel.findOne({
      clientId: clientId,
      is_del: 0
    }, callback);
  }
  model.OAuthClientsModel.findOne({
    clientId: clientId,
    clientSecret: clientSecret,
    is_del: 0
  }, callback);
};

// This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
// it gives an example of how to use the method to resrict certain grant types
var authorizedClientIds = ['s6BhdRkqt3', 'toto'];
model.grantTypeAllowed = function(clientId, grantType, callback) {
  console.log('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');

  if (grantType === 'password') {
    return callback(false, authorizedClientIds.indexOf(clientId) >= 0);
  }

  callback(false, true);
};

model.saveAccessToken = function(token, clientId, expires, userId, callback) {
  console.log('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

  model.OAuthAccessTokensModel.remove({
    clientId: clientId
  }, function() {
    var accessToken = new model.OAuthAccessTokensModel({
      accessToken: token,
      clientId: clientId,
      userId: 'client',
      expires: expires
    });

    accessToken.save(callback);
  })
};

/*
 * Required to support password grant type
 */
model.getUser = function(username, password, callback) {
  console.log('in getUser (username: ' + username + ', password: ' + password + ')');

  model.OAuthUsersModel.findOne({
    username: username,
    password: password
  }, function(err, user) {
    if (err) return callback(err);
    callback(null, user._id);
  });
};

model.getUserFromClient = function(clientId, clientSecret, callback) {
  console.log('in getUserFromClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');

  model.OAuthClientsModel.findOne({
    clientId: clientId,
    clientSecret: clientSecret,
    is_del: 0
  }, callback);
}

/*
 * Required to support refreshToken grant type
 */
model.saveRefreshToken = function(token, clientId, expires, userId, callback) {
  console.log('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');
  model.OAuthRefreshTokensModel.remove({
    clientId: clientId
  }, function() {
    var refreshToken = new model.OAuthRefreshTokensModel({
      refreshToken: token,
      clientId: clientId,
      userId: 'client',
      expires: expires
    });

    refreshToken.save(callback);
  })
};

model.getRefreshToken = function(refreshToken, callback) {
  console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')');

  model.OAuthRefreshTokensModel.findOne({
    refreshToken: refreshToken
  }, callback);
};
