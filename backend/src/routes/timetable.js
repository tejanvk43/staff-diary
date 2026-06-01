const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/timetableController');
const role    = require('../middleware/role');

router.use(auth);

router.get('/mine', ctrl.getMine);
router.get('/',    role('Admin','HOD'), ctrl.getAll);
router.post('/',   ctrl.createSlot);
router.put('/:id', ctrl.updateSlot);
router.delete('/reset-all', role('Admin'), ctrl.resetAllTimetable);
router.delete('/:id', ctrl.deleteSlot);

module.exports = router;
