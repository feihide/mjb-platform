var request = require('supertest')
var should = require('should')

require('../bin/run')

var app = require('../app')
var accessToken = refreshToken = oldAccessToken = '';
var url = '/api/demand/test';

describe('GET /', function() {
  it('respond with 400', function(done) {
    request(app.listen())
      .get(url)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  })
})
describe('oauth', function() {

  describe('get token by client_credentials', function() {
    it('should get token', function(done) {
      request(app.listen())
        .post('/oauth2/token')
        .set('Accept', 'application/json')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          client_id: 'feihide',
          client_secret: 'feihide',
          grant_type: 'client_credentials',
        })
        .expect('Content-Type', /json/)
        .expect(function(res) {
          res.body.code.should.equal(200)
          accessToken = res.body.data.access_token;
          refreshToken = res.body.data.refresh_token;
        })
        .expect(200, done);
    })

    it('should   access by access_token', function(done) {
      request(app.listen())
        .get(url + '?access_token=' + accessToken)
        .set('Accept', 'application/json')
        .expect('Content-Type', /html/)
        .expect(200, done);
    })


  });
  describe('get token by refreshToken', function() {
    it('should get token ', function(done) {
      request(app.listen())
        .post('/oauth2/token')
        .set('Accept', 'application/json')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          client_id: 'feihide',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        })
        .expect('Content-Type', /json/)
        .expect(function(res) {
          console.log(res.body)
          res.body.should.have.property('code', 200);
          oldAccessToken = accessToken;
          accessToken = res.body.data.access_token;
          refreshToken = res.body.data.refresh_token;
        })
        .expect(200, done);
    })

    it('should  not  access by old access_token', function(done) {
      request(app.listen())
        .get(url + '?access_token=' + oldAccessToken)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401, done);
    })

    it('should access by new access_token', function(done) {
      request(app.listen())
        .get(url + '?access_token=' + accessToken)
        .set('Accept', 'application/json')
        .expect('Content-Type', /html/)
        .expect(200, done);
    })

  })
})
