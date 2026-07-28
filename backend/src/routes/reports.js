const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/reportsController');

router.use(auth);

router.get('/diary',       ctrl.diaryReport);
router.get('/leave',       ctrl.leaveReport);
router.get('/conflicts',   ctrl.conflictReport);
router.get('/unassigned',  ctrl.unassignedReport);
router.get('/adjustments', ctrl.adjustmentsReport);

module.exports = router;
