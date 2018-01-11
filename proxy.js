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

// app.use(staticCache(path.join(__dirname, 'public'), {
//   maxAge: 24 * 60 * 60
// }))

var db = require('./model/db');

app.use(cors());

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


app.use(proxy({
  host: 'http://alicdn.com'
}));

app.use(function * notFound(next) {
  if (this.status == 404) {
    this.body = utils.notFound()
  } else {
    yield next;
  }
});


module.exports = app;
