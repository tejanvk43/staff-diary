const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const ctrl    = require('../controllers/approvalsController');

router.use(auth);

router.get('/pending',            role('Admin', 'HOD'), ctrl.getPending);
router.put('/leave/:id',          role('Admin'), ctrl.approveLeave);
router.put('/od/:id',             role('Admin'), ctrl.approveOD);
router.put('/extra/:id',          role('Admin'), ctrl.approveExtra);
router.put('/change-request/:id', role('Admin'), ctrl.approveChangeRequest);
router.put('/diary/:id',          role('Admin'), ctrl.approveDiary);

module.exports = router;
