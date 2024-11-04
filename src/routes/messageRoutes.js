const express = require('express');
const router = express.Router();
const { getAllMessages } = require('../controllers/messageController'); // Import the controller

// Route for getting all messages
router.get('/', getAllMessages); // Call the controller function

module.exports = router;
