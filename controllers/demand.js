const db = require('../model/db');
const fs = require('fs')

const debug = require('debug')('controller:demand');

// path.exists(uploadFolder, function(exists) {
//   if (!exists) {
//     fs.mkdir(uploadFolder)
//   }
//
// });


exports.index = function*() {
  debug('index..............');
  this.state = {
    title: 'koa2 title'
  };

  yield this.render('index', {
  });
};

exports.new = function*() {
  this.type = 'html'
  this.body = fs.createReadStream('views/demandNew.html');
};

exports.list = function*() {
  yield  this.render('demandList');
};
