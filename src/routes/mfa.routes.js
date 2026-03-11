const router = require('express').Router();
const ctrl = require('../controllers/mfa.controller');

router.get('/status', ctrl.getStatus);
router.get('/generate', ctrl.generate);
router.post('/verify', ctrl.verify);

module.exports = router;