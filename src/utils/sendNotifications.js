const Notification = require('../models/notification-Model'); // Assuming this is the correct path to your notification model

// Helper function to create and send notifications
const sendNotification = async (recipientId, message, type, senderId, productId = null, io) => {
    try {
        // Create the notification
        const notification = new Notification({
            user: recipientId, // Recipient of the notification
            message,           // Notification message
            type,              // Type of notification (like, comment, etc.)
            sender: senderId,  // Sender of the notification
            product: productId // Optional: Product ID (for product-related notifications)
        });

        // Save the notification to the database
        await notification.save();

        // Emit the notification in real-time to the recipient using Socket.IO
        io.to(recipientId.toString()).emit('new_notification', notification);

        console.log('Notification sent:', notification);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

module.exports = sendNotification;
