exports.system = {
  name: 'local',
  admin: '15921709039,17750668797'
}

exports.dsm = {
  mongo: '192.168.1.221',
  mongo_db: 'dsm',
  debug: true,
  port: 3000
}

exports.mjb = {
  mongo: '192.168.1.221',
  mongo_db: ['common', 'xiamen', 'beijing', 'shanghai', 'system'],
  mysql_host: '192.168.1.221',
  mysql_user: 'mjbappadmin',
  mysql_pwd: 'qDLTuXpEDx1VcChsne7n',
  memcache_host: '192.168.1.221',
  memcache_port: 11211,
  debug: true,
  port: 3004,
  port_mirror: 3104
}

exports.qiniu = {
  ACCESS_KEY: 'ox5E8MU4eBfpnB4f97rtrIT_qsAm96zG9MoBshWA',
  SECRET_KEY: 'nmzE1cle3jKvOCMz-ERhMyHpEwdGf3z4hSS--EqH',
  bucket: 'mjbtest'
}
