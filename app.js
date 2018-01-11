const koa = require('koa');
const app = koa();
const Keygrip = require('keygrip');
var path = require('path')
const router = require('koa-router-super')();
const routes = require('./routes/dsm.js');
const views = require('koa-views');
const staticServer = require('koa-static');
const logger = require('koa-logger')
const bodyparser = require('koa-bodyparser');
const json = require('koa-json');
const request = require('koa-request');
var staticCache = require('koa-static-cache'); //在响应中添加对静态文件缓存的header

const debug = require('debug')('koa');
const passport = require('koa-passport');
const session = require('koa-generic-session')
const rest = require('koa-api-rest');
const mount = require('koa-mount');
const oauthserver = require('dsm-koa-oauth-server');
const cors = require('koa-cors');
const config = require('./config.js');
const utils = require('./utils.js')
// var MemcachedStore = require('koa-memcached');
//
// var memcache = MemcachedStore({
//   host: config.mjb.memcache_host,
//   port: config.mjb.memcache_port
// })

// app.use(staticCache(path.join(__dirname, 'public'), {
//   maxAge: 24 * 60 * 60
// }))

var db = require('./model/db');

// const LocalStrategy = require('passport-local').Strategy;
// trust proxy
app.proxy = true

var user = {
  id: 1,
  username: 'test'
}

app.use(cors());


passport.serializeUser(function(user, done) {
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  done(null, user)
})

var LocalStrategy = require('passport-local').Strategy
passport.use(new LocalStrategy(function(username, password, done) {
  // retrieve user ...
  if (username === 'test' && password === 'test') {
    done(null, user)
  } else {
    done(null, false)
  }
}))

app.keys = new Keygrip(['im a newer secret', 'i like turtle'], 'sha256');

if (!config.dsm.debug) {
  app.on('error', function(err, ctx) {
    console.log('server error', err, ctx);
    //读取上一次报错时间

    db.getErrorTime(function(d) {
      if (parseInt(new Date().getTime() / 1000) - d.ctime < 1800) {
        console.log('半小时重启时间冷却中。。。')
      } else {
        console.log('自动重启修复')
        utils.sendsms(utils.sms(config.system.admin, 'system_notice: ' + config.system.name + '设备的 node-dsm 出错   ' + new Date().toLocaleString()))
        db.saveError(err + JSON.stringify(ctx));
        // 自动重启
        var exec = require('child_process').exec;
        var cmdStr = 'pm2 restart dsm';
        exec(cmdStr, function(err, stdout, stderr) {
          if (err) {
            console.log('error:' + stderr);
          } else {
            console.log('重启成功')
            console.log(stdout);
          }
        })
      }
    })
  });
}
debug('start..........');

app.use(session())

app.use(bodyparser({
  onerror: function(err, ctx) {
    this.throw('body parse error', 422);
  }
}));
app.use(passport.initialize())
app.use(passport.session())

app.use(json());
// logger
app.use(logger())

app.use(views(__dirname + '/views', {
  extension: 'ejs'
}));
app.use(staticServer(__dirname + '/public'));

const authModel = require('./model/oauth');
// See https://github.com/thomseddon/node-oauth2-server for specification.
app.oauth = oauthserver({
  model: authModel,
  grants: ['client_credentials', 'password', 'refresh_token'], //password,authorization_code,refresh_token  client_credentials
  debug: true,
  accessTokenLifetime: 360000,
  refreshTokenLifetime: 3600000
});

// Mount `oauth2` route prefix.
app.use(mount('/oauth2', router.middleware()));

// Register `/token` POST path on oauth router (i.e. `/oauth2/token`).
router.post('/token', app.oauth.grant());
app.use(app.oauth.authorise());

var isLoad = 0;
var transMethod = {
  GET: 'get',
  POST: 'create',
  PUT: 'update',
  DELETE: 'delete'
}
app.use(function*(next) {
  //加载配置资源
  models = db.load(this.request.body.model);
  delete (this.request.body.model)
  if (models) { //&& isLoad == 0) {
    for (i = 0; i < models.length; i++) {
      // console.log(models[i].modelName)
      rest.generateApi(router, models[i], '/api/admin');
      rest.generateApi(router, models[i], '/api/demand');
      rest.generateApi(router, models[i], '/api/dispatch');
      rest.generateApi(router, models[i], '/api/service');
      rest.generateApi(router, models[i], '/api/supply');
    }
    isLoad = 1;
  }
  yield next;
  var reqLog = {}

  reqLog.request = JSON.stringify(this.request)
  reqLog.request_query = this.request.query
  reqLog.request_body = JSON.stringify(this.request.body)
  reqLog.response = JSON.stringify(this.response)
  reqLog.notifyRequest = []
  reqLog.notifyResponse = []
  reqLog.user = this.request.query.cu

  if (this.request.body.targetId) {
    if (this.response.body.code == 200) {
      //推送资源更新通知
      for (var i = 0; i < this.request.body.requestTargetUri.length; i++) {
        if (this.request.body.requestTargetUri[i]) {
          var options = {
            url: this.request.body.requestTargetUri[i],
            headers: {
              'User-Agent': 'request',
              'accept': '*/*',
              'content-type': 'application/x-www-form-urlencoded',
              'cache-control': 'no-cache',
              'pragma': 'no-cache',
            },
            form: {
              resource_id: this.response.body.data.id,
              resource_name: this.request.url.split('/')[3],
              status: transMethod[this.request.method]
            },
            timeout: 5000,
            method: 'POST'
          }
          reqLog.notifyRequest[i] = JSON.stringify(options)

          try {
            var response = yield request.post(options) //Yay, HTTP requests with no callbacks!
          // console.log('remote response')
          } catch (e) {
            var response = {}
            response.body = e
            db.notifyLog(options, response.body)
          }
          if (response.body != '{"code":200,"error":"","data":""}') {
            db.notifyLog(options, response.body)
          }
          reqLog.notifyResponse[i] = response.body

        }
      }

    }
  }
  if (reqLog.user != 'admin') {
    db.saveLog(reqLog)
  }

  reqLog = {}

});

//配置路由
//admin接口
rest.generateApi(router, authModel.OAuthClientsModel, '/api/admin');
rest.generateApi(router, authModel.OAuthUsersModel, '/api/admin');
rest.generateApi(router, authModel.OAuthAccessTokensModel, '/api/admin');
rest.generateApi(router, authModel.OAuthRefreshTokensModel, '/api/admin');
rest.generateApi(router, authModel.ResourceModel, '/api/admin')
rest.generateApi(router, db.loginModel, '/api/admin');
rest.generateApi(router, db.accesslogModel, '/api/admin');
rest.generateApi(router, db.errorlogModel, '/api/admin');
rest.generateApi(router, db.notifylogModel, '/api/admin');

//需求方接口
rest.generateApi(router, db.orderModel, '/api/demand');
//调度方接口
rest.generateApi(router, db.orderModel, '/api/dispatch');


routes(router);
app.use(router.routes());

app.use(function * notFound(next) {
  if (this.status == 404) {
    this.body = utils.notFound()
  } else {
    yield next;
  }
});


module.exports = app;
//
// const port = process.env.PORT || 3000
// app.listen(port, () => console.log('Server listening on', port));
