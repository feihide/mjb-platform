const koa = require('koa');
const app = koa();

const router = require('koa-router-super')();
const routes = require('./routes/api.js');
const views = require('koa-views');
const staticServer = require('koa-static');
const logger = require('koa-logger')
const bodyparser = require('koa-bodyparser');
const json = require('koa-json');
const request = require('koa-request');

const debug = require('debug')('koa');

const rest = require('koa-api-rest');
const mount = require('koa-mount');
const oauthserver = require('dsm-koa-oauth-server');
const cors = require('koa-cors');
const utils = require('./utils.js')
const config = require('./config.js');
const mysql_config = require('./mysql_config.js')
var memcache = require('./connect/api').memcachePool
var commonContr = require('./controllers/common.js');

var db = require('./model/mjb');
var mysql = require('koa-mysql');
var commonDb = mysql.createPool({
  user: config.mjb.mysql_user,
  password: config.mjb.mysql_pwd,
  database: 'mjb_common',
  host: config.mjb.mysql_host
});

// const LocalStrategy = require('passport-local').Strategy;
// trust proxy
app.proxy = true

app.use(cors());

if (!config.mjb.debug) {
  app.on('error', function(err, ctx) {
    console.log('server error', err, ctx);
    //读取上一次报错时间

    db.getErrorTime(function(d) {
      if (parseInt(new Date().getTime() / 1000) - d.ctime < 1800) {
        console.log('半小时重启时间冷却中。。。')
      } else {
        console.log('自动重启修复')
        utils.sendsms(utils.sms(config.system.admin, 'system_notice: ' + config.system.name + '设备的 node-api 出错   ' + new Date().toLocaleString()))
        db.saveError(err + JSON.stringify(ctx));
        // 自动重启
        var exec = require('child_process').exec;
        var cmdStr = 'pm2 restart api';
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

app.use(bodyparser({
  formLimit: '10mb',
  onerror: function(err, ctx) {
    this.throw('body parse error', 422);
  }
}));

app.use(json())
// logger
app.use(logger())

app.use(views(__dirname + '/views', {
  extension: 'ejs'
}))
var city = ''
var loadCity = []
app.use(staticServer(__dirname + '/public'))

var reloadDb = reloadMysql = reloadCacheTable = ''

var frontOpenCity = null

app.use(function*(next) {
  city = this.request.body ? this.request.body.city : '';

  if (city == undefined) {
    city = this.request.query.city
  }

  if (city == undefined || city == '') {
    city = 'common'
  }

  //默认单库
  city = 'common'
  debug('当前城市:', city)
  //加载配置资源
  if (reloadDb == '' || config.mjb.debug) {
    debug('加载mongo配置资源')
    reloadDb = yield db.getResource()
  }
  if (reloadCacheTable == '' || config.mjb.debug) {
    debug('加载需实例缓存的资源')
    reloadCacheTable = yield commonContr.getCacheTable()
  }

  if (frontOpenCity == null || config.mjb.debug) {
    debug('获取前台开通城市')
    frontOpenCity = yield db.getOpenCity()
  }

  if (reloadMysql == '' || config.mjb.debug) {
    debug('加载mysql配置资源')

    reloadMysql = yield commonContr.getMysqlTable()
    for (var re in reloadMysql) {
      rest.generateMysqlApi(router, commonDb, reloadMysql[re].name, '/api/resource', memcache, reloadCacheTable);
    }
  }

  var apiLog = {}
  var logs = this.request.query.api_log ? this.request.query.api_log : this.request.body.api_log
  if (logs) {
    apiLog = JSON.parse(logs)
    apiLog.request_params = JSON.stringify(apiLog.request_params)
    delete (this.request.query.api_log)
    delete (this.request.body.api_log)
  }

  //获取已前台开通城市
  this.request.openCity = frontOpenCity

  var result = db.load(reloadDb, city)
  if (result) {
    // if (loadCity.indexOf(city) == -1) {
    // loadCity.push(city)
    //对应mongo 表
    if (db.configModel[city]) {
      for (i = 0; i < db.configModel[city].length; i++) {
        rest.generateApi(router, db.configModel[city][i], '/api/resource', memcache, reloadCacheTable);
      }
    }
  // }
  } else {
    this.body = db.err('无效城市')
    return;
  }
  yield next;

  //保存日志
  if (logs) {
    apiLog['response'] = JSON.stringify(this.body)
    apiLog['log_type'] = 'access'
    db.saveLog(apiLog)
  }

  apiLog = {}
});


//只对应/common
for (var re in mysql_config.mysqlApi) {
  mysql_config.mysqlApi[re].forEach(function(table) {
    rest.generateMysqlApi(router, commonDb, table, '/api/' + re, memcache, reloadCacheTable);
  })
}

rest.generateApi(router, db.resourceModel, '/api/admin');
rest.generateApi(router, db.apilogModel, '/api/admin');
rest.generateApi(router, db.smslogModel, '/api/admin');
rest.generateApi(router, db.errorlogModel, '/api/admin');

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
