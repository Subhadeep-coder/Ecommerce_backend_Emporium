const mongoose = require('mongoose');
const Joi = require('joi');

// Main Admin Schema
const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    unique: true
  },
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true
  },
  password: {
    type: String,
    minlength: 6,
    select: false // Password is not selected by default for security
  },
  googleId: {           // For social sign-in (Google)
    type: String,
    default: null,
  },
  facebookId: {         // For social sign-in (Facebook)
    type: String,
    default: null,
  },
  profilePic: {
    type: Buffer,
    default:
      "https://images.unsplash.com/photo-1515041219749-89347f83291a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2FydG9vbnxlbnwwfHwwfHx8MA%3D%3D",
    trim: true,
  },
  imageMimeType: {
    type: String,
  },
isAdmin:{
    type:Boolean,
    default:true
}
}, { timestamps: true });

const adminModel = mongoose.model('admin', AdminSchema);
// Joi Validation for Admin
const adminValidator = (admin) => {
    const schema = Joi.object({
      username: Joi.string().min(3).max(50).required(),
      name: Joi.string().min(3).max(50).required(),
      email: Joi.string().email().min(5).max(255).required(),
      password: Joi.string().min(6).max(1024).required(),  // Password validation with min 6 characters
      bio: Joi.string().max(500),  // Bio should be max 500 characters
      profilePic: Joi.string().trim(),  // Profile pic should be a valid URL
      isAdmin: Joi.boolean(),  // Optional boolean for isAdmin
    });
    let { error } = schema.validate(admin);
    return error;
  };
  
  module.exports = { adminModel, adminValidator };
  
