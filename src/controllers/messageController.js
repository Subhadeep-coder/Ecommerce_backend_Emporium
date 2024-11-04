const { Message } = require('../models/message-model');

// Controller to get all messages
const getAllMessages = async (req, res) => {
    try {
        const messages = await Message.find(); // Fetch messages from the database
        res.send(messages);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

module.exports = {
    getAllMessages
};
