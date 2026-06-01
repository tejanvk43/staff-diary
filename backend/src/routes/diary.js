const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/diaryController');

router.use(auth);

router.get('/today',         ctrl.getToday);
router.get('/',              ctrl.getByDate);
router.post('/',             ctrl.createEntry);
router.post('/submit-day',   ctrl.submitDay);
router.post('/request-edit', ctrl.requestEdit);
router.put('/:id',           ctrl.updateEntry);
router.post('/:id/submit',   ctrl.submitEntry);
router.delete('/:id',        ctrl.deleteEntry);

module.exports = router;
