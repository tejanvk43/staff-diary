const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const ctrl    = require('../controllers/approvalsController');

router.use(auth, role('Admin', 'HOD'));

router.get('/pending',            ctrl.getPending);
router.put('/leave/:id',          ctrl.approveLeave);
router.put('/od/:id',             ctrl.approveOD);
router.put('/extra/:id',          ctrl.approveExtra);
router.put('/change-request/:id', ctrl.approveChangeRequest);
router.put('/diary/:id',          ctrl.approveDiary);

module.exports = router;
