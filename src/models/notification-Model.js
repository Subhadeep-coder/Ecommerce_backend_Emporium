const mongoose = require('mongoose');

// Notification Schema
const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['new_product', 'sale', 'event', 'follow', 'unfollow', 'like', 'comment', 'share'], // Types of notifications
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        default: null // For product-related notifications
    }
});

// Create the Notification model
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
