const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/reportsController');

router.use(auth);

router.get('/diary',       ctrl.diaryReport);
router.get('/attendance',  ctrl.attendanceReport);
router.get('/leave',       ctrl.leaveReport);
router.get('/conflicts',   ctrl.conflictReport);

module.exports = router;
