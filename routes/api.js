var common = require('../controllers/common.js');
var resource = require('../controllers/api_resource.js');

module.exports = routes;
function routes(_) {
  _.post('/api/common/image', common.image);
  _.delete('/api/common/image/:id', common.imageDel);
  _.post('/api/common/sms', common.sms)
  _.get('/api/common/sms/getCode', common.getSmsCode)
  _.post('/api/common/sms/verify', common.smsVerify)
  _.get('/api/info', common.apiList);
  _.post('/api/resource/users/verify', common.verifyUser);
  _.get('/api/resource/villages_by_designer', resource.village_by_designer)
  _.get('/api/resource/regions_by_domain', resource.region_by_domain)
}
