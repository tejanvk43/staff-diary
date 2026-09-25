const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/messagingController');

router.use(auth);

router.get('/participants', ctrl.listMessageParticipants);
router.get('/conversations', ctrl.listConversations);
router.post('/conversations', ctrl.createConversation);
router.get('/conversations/:id/messages', ctrl.getConversationMessages);
router.post('/conversations/:id/messages', ctrl.appendMessage);
router.put('/conversations/:id/participants', ctrl.updateDepartmentGroupParticipants);

module.exports = router;
