const mongoose = require('mongoose');

const DeliveryAgentSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
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
        select: false,
    },
    googleId: {           // For social sign-in (Google)
        type: String,
        default: null,
    },
    profilePic: {
        type: Buffer,
        default: null,
        trim: true,
    },
    profilePicMimeType: {
        type: String,
    },
    phoneNumber: {
        type: Number,
        default: null,
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    location: {
        ltd: {
            type: Number,
        },
        lng: {
            type: Number,
        }
    }
}, { timestamps: true });

const DeliveryAgentModel = mongoose.model('deliveryAgent', DeliveryAgentSchema);
module.exports = DeliveryAgentModel;