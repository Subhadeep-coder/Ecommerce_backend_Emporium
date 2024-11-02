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
        default: null,
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
    },
    storeName: {
        type: String,
        trim: true,
        default: null,
        required: function() { return this.isSeller; }  // Store name required if user is a seller
    },
    storeDescription: {
        type: String,
        maxlength: 1000,
        trim: true,
        default: null,
    },
    wishlist: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'product'  // Referencing the Product model
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'  // Users who follow this user
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'  // Users this user is following (sellers, influencers, etc.)
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'  // Products liked by the user
    }],
    comments: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },  // Product commented on
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    shares: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },  // Products shared by the user
        sharedTo: { type: String, required: true }, // Can be 'profile', 'external', etc.
        createdAt: { type: Date, default: Date.now }
    }],
    activityFeed: [{
        type: {
            type: String, enum: ['new_product', 'sale', 'comment', 'like', 'share', 'follow'] // Types of activities
        },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, // The user who initiated the activity
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product' }, // The product related to the activity
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true      // Automatically handles createdAt and updatedAt fields
});

// Custom validation function for interests array
function arrayLimit(val) {
    return val.length <= 5;  // Limit the array length to 5 tags
}

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
        storeName: Joi.string().optional().when('isSeller', { is: true, then: Joi.required() }), // Store name required if user is a seller
        storeDescription: Joi.string().max(1000).optional(),
        interests: Joi.array().items(Joi.string().max(30)).max(5).optional(),  // Limit to 5 items
    });

    return schema.validate(user);
};

const User = mongoose.model('user', userSchema);

module.exports = {
    User,
    validateUser
};
