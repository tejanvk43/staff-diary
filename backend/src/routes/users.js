const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const auth     = require('../middleware/auth');
const role     = require('../middleware/role');
const ctrl     = require('../controllers/userController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth, role('Admin'));

router.get('/',                    ctrl.listUsers);
router.post('/',                   ctrl.createUser);
router.post('/bulk', upload.single('file'), ctrl.bulkCreateUsers);
router.get('/:employee_id',        ctrl.getUser);
router.put('/:employee_id',        ctrl.updateUser);
router.put('/:employee_id/reset-password', ctrl.resetPassword);
router.delete('/:employee_id', ctrl.deleteUser);

module.exports = router;
