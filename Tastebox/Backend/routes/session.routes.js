const router = require('express').Router();
const dao = require('../dao/user.dao');

router.post('/', dao.login);

module.exports = router;
