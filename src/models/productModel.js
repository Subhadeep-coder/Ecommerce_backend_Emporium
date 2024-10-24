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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Reference to the user model
    required: true
  }
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

  user: Joi.string()
    .required()
    .messages({
      'string.empty': 'User is required',
      'any.required': 'User is a required field',
    })
});

// Exporting the validation schema



const productModel = mongoose.model('product', productSchema);
module.exports ={
  productModel,
  productValidation
}
