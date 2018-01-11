const koa = require('koa');
const app = koa();
const Keygrip = require('keygrip');

const router = require('koa-router')();
const views = require('koa-views');
const staticServer = require('koa-static');
const logger = require('koa-logger')
const bodyparser = require('koa-bodyparser');
const json = require('koa-json');
const request = require('koa-request');

const debug = require('debug')('koa');
app.use(bodyparser({
  onerror: function(err, ctx) {
    this.throw('body parse error', 422);
  }
}));
app.use(function*(next) {
  // console.log(this.request)
  // console.log(this.request.body)
  yield next;
  this.body = {
    "code": 200,
    "error": "",
    "data": ""
  }
});

const port = process.env.PORT || 3001
app.listen(port, () => console.log('Server listening on', port));
