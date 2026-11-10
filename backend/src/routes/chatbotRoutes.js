const express = require('express');
const router = express.Router();
const {chatWithAi} = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

router.post('/message', protect, chatWithAi);

module.exports = router;
