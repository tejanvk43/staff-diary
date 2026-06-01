const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/requestController');

router.use(auth);

// Leave
router.post('/leave',  ctrl.createLeave);
router.get('/leave',   ctrl.getLeaves);

// OD
router.post('/od',     ctrl.createOD);
router.get('/od',      ctrl.getODs);

// Extra hours
router.post('/extra',  ctrl.createExtra);
router.get('/extra',   ctrl.getExtras);

// Edit requests (read-only — creation via /api/diary/request-edit)
router.get('/edit-requests', ctrl.getEditRequests);

module.exports = router;
