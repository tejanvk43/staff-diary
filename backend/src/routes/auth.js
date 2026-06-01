const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { login, changePassword, me } = require('../controllers/authController');

router.post('/login', login);
router.post('/change-password', auth, changePassword);
router.get('/me', auth, me);

module.exports = router;
