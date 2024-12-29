const mongoose = require('mongoose');
const Joi = require('joi');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    data: Buffer,  // Array of buffers to store multiple images
    mimetype: String // Store the mimetype for each image
  }],
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true, // Making category a required field
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  inventory: {
    type: Number,
    required: true,
    min: 0, // Ensure stock can't be negative
    default: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Reference to the user model
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'  // Users who liked the product
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },  // User who commented
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  shares: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },  // User who shared the product
    sharedTo: { type: String, required: true }, // Can be 'profile', 'external', etc.
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Joi validation schema
const productValidation = Joi.object({
  title: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Title is required',
      'any.required': 'Title is a required field',
    }),
  
  description: Joi.string()
    .required()
    .messages({
      'string.empty': 'Description is required',
      'any.required': 'Description is a required field',
    }),

  price: Joi.number()
    .required()
    .positive()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be greater than 0',
      'any.required': 'Price is a required field',
    }),

  category: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Category is required',
      'any.required': 'Category is a required field',
    }),

  subcategory: Joi.string()
    .trim()
    .messages({
      'any.required': 'SubCategory is a required field',
    }),

  inventory: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Inventory must be a number',
      'number.min': 'Inventory cannot be negative',
      'any.required': 'Inventory is a required field',
    }),

  user: Joi.string()
    .required()
    .messages({
      'string.empty': 'User is required',
      'any.required': 'User is a required field',
    })
});

const productModel = mongoose.model('product', productSchema);
module.exports = {
  productModel,
  productValidation
};
