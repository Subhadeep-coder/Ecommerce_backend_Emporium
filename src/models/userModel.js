const mongoose = require('mongoose');
const Joi = require('joi');

// Main User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    username: {
        type: String,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        minlength: 6,
        select: false,  // Password will not be selected by default for security
    },
    interests: {
        type: [String],   // Array of strings to store product interests/tags
        validate: [arrayLimit, '{PATH} exceeds the limit of 5'],  // Limit array size
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
    bio: {
        type: String,
        maxlength: 500,
        trim: true,
        default: null,
    },
    isSeller: {
        type: Boolean,
        default: false,    // To indicate if the user is a seller
    }
}, {
    timestamps: true      // Automatically handles createdAt and updatedAt fields
});

// Custom validation function for interests array
function arrayLimit(val) {
    return val.length <= 5;  // Limit the array length to 5 tags
}

const User = mongoose.model('User', userSchema);

// Joi Validation Schema
const validateUser = (user) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
        username: Joi.string().min(3).max(50).optional(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).optional(),
        googleId: Joi.string().optional(),
        facebookId: Joi.string().optional(),
        profilePic: Joi.string().optional().allow(null, ''),
        bio: Joi.string().max(500).optional(),
        isSeller: Joi.boolean().optional(),
        interests: Joi.array().items(Joi.string().max(30)).max(5).optional(),  // Limit to 5 items
    });

    return schema.validate(user);
};

module.exports = {
    User,
    validateUser
};
