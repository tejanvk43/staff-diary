const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const ctrl    = require('../controllers/adminController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);

// System config
router.get('/config',       ctrl.getConfig); // all roles can read
router.put('/config',       role('Admin'), ctrl.updateConfig);

// Holidays — Admin only
router.get('/holidays',     ctrl.getHolidays);            // all roles can read
router.post('/holidays',    role('Admin'), ctrl.addHoliday);
router.delete('/holidays/:id', role('Admin'), ctrl.deleteHoliday);

// Working Sundays — all authenticated can read, Admin manages
router.get('/working-sundays',     ctrl.getWorkingSundays);
router.post('/working-sundays',    role('Admin'), ctrl.addWorkingSunday);
router.delete('/working-sundays/:id', role('Admin'), ctrl.deleteWorkingSunday);

// Departments — all authenticated
router.get('/departments',        ctrl.getDepartments);
router.post('/departments',       role('Admin'), ctrl.createDepartment);
router.put('/departments/:id',    role('Admin'), ctrl.updateDepartment);
router.delete('/departments/:id', role('Admin'), ctrl.deleteDepartment);

// Subjects
router.get('/subjects',           ctrl.getSubjects);
router.post('/subjects',          role('Admin'), ctrl.createSubject);
router.put('/subjects/:id',       role('Admin'), ctrl.updateSubject);
router.delete('/subjects/:id',    role('Admin'), ctrl.deleteSubject);

// Sections
router.get('/sections',           ctrl.getSections);
router.post('/sections',          role('Admin'), ctrl.createSection);
router.post('/sections/bulk',     role('Admin'), upload.single('file'), ctrl.bulkUploadSections);
router.put('/sections/:id',       role('Admin'), ctrl.updateSection);
router.delete('/sections/:id',    role('Admin'), ctrl.deleteSection);

// Programs
router.get('/programs',           ctrl.getPrograms);
router.get('/programs/details',   ctrl.getAllProgramDetails);
router.post('/programs',          role('Admin'), ctrl.createProgram);
router.put('/programs/:id',       role('Admin'), ctrl.updateProgram);
router.delete('/programs/:id',    role('Admin'), ctrl.deleteProgram);
router.post('/programs/:id/years', role('Admin'), ctrl.addProgramYear);
router.put('/programs/:id/years/:yearId', role('Admin'), ctrl.updateProgramYear);
router.delete('/programs/:id/years/:yearId', role('Admin'), ctrl.deleteProgramYear);
router.post('/programs/:id/branches', role('Admin'), ctrl.addProgramBranch);
router.put('/programs/:id/branches/:branchId', role('Admin'), ctrl.updateProgramBranch);
router.delete('/programs/:id/branches/:branchId', role('Admin'), ctrl.deleteProgramBranch);

// Subject Types — all authenticated can read, Admin manages
router.get('/subject-types',         ctrl.getSubjectTypes);
router.post('/subject-types',        role('Admin'), ctrl.addSubjectType);
router.put('/subject-types/:id',     role('Admin'), ctrl.updateSubjectType);
router.delete('/subject-types/:id',  role('Admin'), ctrl.deleteSubjectType);

module.exports = router;
