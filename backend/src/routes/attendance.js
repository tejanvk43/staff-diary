const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const ctrl    = require('../controllers/attendanceController');

router.use(auth);

router.get('/',          ctrl.getAttendance);
router.get('/summary',   ctrl.getAttendanceSummary);
router.post('/',         role('Admin', 'HOD'), ctrl.markAttendance);
router.put('/:id',       role('Admin', 'HOD'), ctrl.updateAttendance);

module.exports = router;
