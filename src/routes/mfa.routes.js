const router = require('express').Router();
const ctrl = require('../controllers/mfa.controller');

router.get('/status', ctrl.getStatus);
router.post('/enroll/start', ctrl.startEnrollment);
router.post('/enroll/confirm', ctrl.confirmEnrollment);
router.post('/login/verify', ctrl.verifyLoginToken);

module.exports = router;