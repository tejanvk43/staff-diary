const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const ctrl    = require('../controllers/blockTimetableController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);

// Block timetable CRUD (Admin + HOD can manage)
router.get('/',    ctrl.listBlockTimetables);
router.post('/',   role('Admin', 'HOD'), ctrl.createBlockTimetable);
router.post('/bulk-import', role('Admin', 'HOD'), upload.single('file'), ctrl.bulkImportTimetable);
router.put('/:id', role('Admin', 'HOD'), ctrl.updateBlockTimetable);
router.delete('/:id', role('Admin', 'HOD'), ctrl.deleteBlockTimetable);

// Slot CRUD within a block timetable
router.get('/:id/slots',             ctrl.getSlots);
router.post('/:id/slots',            role('Admin', 'HOD'), ctrl.addSlot);
router.put('/:id/slots/:slotId',     role('Admin', 'HOD'), ctrl.updateSlot);
router.delete('/:id/slots/:slotId',  role('Admin', 'HOD'), ctrl.deleteSlot);

module.exports = router;
