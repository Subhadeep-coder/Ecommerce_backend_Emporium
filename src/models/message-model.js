const mongoose = require('mongoose');
const Joi = require('joi');

// Mongoose Message Schema
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'user',
  },
  message: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Create the Message model
const Message = mongoose.model('message', messageSchema);

// Validation function for messages
const validateMessage = (message) => {
  const schema = Joi.object({
    roomId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    sender: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    message: Joi.string().required(),
  });
  
  return schema.validate(message);
};

module.exports = { Message, validateMessage };
