const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/facultySetupController');

router.use(auth);

router.get('/setup',                ctrl.getSetup);
router.post('/setup',               ctrl.saveSetup);
router.get('/blocks',               ctrl.getAllBlocks);
router.get('/subjects',             ctrl.getAllSubjects);
router.get('/sections',             ctrl.getAllSections);
router.get('/my-blocks-with-slots', ctrl.getMyBlocksWithSlots);
router.get('/my-subjects',          ctrl.getMySubjects);
router.get('/my-courses',           ctrl.getMyCourses);

module.exports = router;
