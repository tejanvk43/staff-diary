const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const ctrl    = require('../controllers/counselingController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);

// Student endpoints
router.get('/students', ctrl.listStudents);
router.post('/students', role('Admin'), ctrl.createStudent);
router.delete('/students-reset/all', role('Admin'), ctrl.resetAllStudents);
router.delete('/students/:id', role('Admin'), ctrl.deleteStudent);
router.post('/students/bulk', role('Admin'), upload.single('file'), ctrl.bulkCreateStudents);

// Mapping endpoints
router.put('/students/map', role('HOD'), ctrl.mapStudentsToCounselor);

// Records & sessions endpoints
router.get('/students/:roll_number/records', ctrl.getStudentCounselingRecords);
router.post('/records', ctrl.createCounselingRecord);

// Reports endpoints
router.get('/reports', ctrl.getCounselingReports);

module.exports = router;
