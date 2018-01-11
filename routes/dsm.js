/**
 * Created by lonso on 14-3-19.
 * liusc@polyvi.com
 */
const fs = require('fs')

var blog = require('../controllers/blog.js');
var admin = require('../controllers/admin.js');

var demand = require('../controllers/demand.js');

const passport = require('koa-passport');

module.exports = routes;
function routes(_) {
  _.get('/login', function*() {
    this.type = 'html'
    this.body = fs.createReadStream('views/login.html');
  })
  _.post('/login',
    passport.authenticate('local', {
      successRedirect: '/auth_success',
      failureRedirect: '/'
    })
  )

  _.post('/api/admin/loginverify', admin.login);
  _.get('/blog/list', blog.list);
  _.get('/blog/all', blog.blogList);
  _.get('/blog/new', blog.new);
  _.post('/blog', blog.create);
  _.get('/blog/:id', blog.read);
  _.post('/api/admin/requestRemote', admin.requestRemote);

  //demand
  //_.get('/demand/new', demand.new);
  // _.all('*', function*(next) {
  //   if (this.req.isAuthenticated()) {
  //     yield next
  //   } else {
  //     this.redirect('/')
  //   }
  // });
  _.get('/auth_success', function*() {
    this.body = 'success';
  })
  _.get('/logout', function*() {
    this.logout()
    this.redirect('/')
  })




}
