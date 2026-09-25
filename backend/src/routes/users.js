const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const auth     = require('../middleware/auth');
const role     = require('../middleware/role');
const ctrl     = require('../controllers/userController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);

// Bank details endpoints (Any authenticated user)
router.post('/bank-details',          ctrl.submitBankDetails);
router.post('/bank-details/request',  ctrl.requestBankDetailsChange);

// Admin or HOD endpoints
router.get('/',                    role('Admin', 'HOD'), ctrl.listUsers);
router.post('/',                   role('Admin'), ctrl.createUser);
router.post('/bulk',               role('Admin'), upload.single('file'), ctrl.bulkCreateUsers);
router.put('/bulk-reset-password',          role('Admin'), ctrl.bulkResetPassword);
router.delete('/all',              role('Admin'), ctrl.deleteAllUsers);
router.put('/:employee_id/reset-password', role('Admin'), ctrl.resetPassword);
router.delete('/:employee_id',     role('Admin'), ctrl.deleteUser);

const adminCtrl = require('../controllers/adminController');

// Admin user management enhancements
router.get('/export',               role('Admin'), adminCtrl.exportUsers);
router.get('/:employee_id/full',     role('Admin', 'HOD'), adminCtrl.getUserFullDetails);
router.put('/:employee_id/timetable', role('Admin'), adminCtrl.adminUpdateUserTimetable);

// Self or Admin endpoints (Guarded inside controller)
router.get('/:employee_id',        ctrl.getUser);
router.put('/:employee_id',        ctrl.updateUser);

module.exports = router;
