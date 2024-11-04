const { Message, validateMessage } = require('../models/message-model');
const { User } = require('../models/userModel');
const { Product } = require('../models/productModel'); // Assuming Product model exists
const { catchAsyncErrors } = require('../middlewares/catchAsyncError');
const sendNotification = require('../utils/sendNotifications'); // Assuming you have a helper for notifications

function setupSocket(io) {
    io.on('connection', (socket) => {
        console.log('New client connected');

        // Send private message
        socket.on('sendPrivateMessage', catchAsyncErrors(async ({ senderId, receiverId, message }) => {
            const { error } = validateMessage({ sender: senderId, receiver: receiverId, message });
            if (error) {
                return socket.emit('error', { message: error.details[0].message });
            }

            const sender = await User.findById(senderId);
            const receiver = await User.findById(receiverId);

            if (!sender || !receiver || sender.isSeller === receiver.isSeller) {
                return socket.emit('error', { message: 'Invalid message. One user must be a seller and the other a regular user.' });
            }

            const newMessage = new Message({ sender: senderId, receiver: receiverId, message });
            await newMessage.save();

            // Emit message to the receiver
            socket.to(receiverId).emit('privateMessage', {
                sender: senderId,
                message: newMessage.message,
                createdAt: newMessage.createdAt,
            });

            // Acknowledge sender
            socket.emit('messageSent', { message: 'Message sent successfully', data: newMessage });
        }));

        // Retrieve messages between sender and receiver
        socket.on('getMessages', catchAsyncErrors(async ({ userId, sellerId }) => {
            const user = await User.findById(userId);
            const seller = await User.findById(sellerId);

            if (!user || !seller || user.isSeller === seller.isSeller) {
                return socket.emit('error', { message: 'Invalid request. One user must be a seller and the other a regular user.' });
            }

            const messages = await Message.find({
                $or: [
                    { sender: userId, receiver: sellerId },
                    { sender: sellerId, receiver: userId }
                ]
            }).sort({ createdAt: 1 });

            socket.emit('messagesFetched', messages);
        }));

        // Like product event
        socket.on('likeProduct', catchAsyncErrors(async ({ productId, userId }) => {
            const product = await Product.findById(productId);
            const productOwner = await User.findById(product.user);

            if (!product || !productOwner) {
                return socket.emit('error', { message: 'Product or owner not found' });
            }

            if (product.likes.includes(userId)) {
                return socket.emit('error', { message: 'You have already liked this product' });
            }

            product.likes.push(userId);
            await product.save();

            productOwner.activityFeed.push({
                type: 'like',
                user: userId,
                product: productId
            });
            await productOwner.save();

            // Emit like notification
            await sendNotification(productOwner._id, `${userId} liked your product.`, 'like', userId, productId, io);

            socket.emit('likeSuccess', { message: 'Product liked successfully' });
            socket.to(productOwner._id).emit('newLike', { message: `${userId} liked your product.` });
        }));

        // Comment on product event
        socket.on('commentProduct', catchAsyncErrors(async ({ productId, userId, comment }) => {
            const product = await Product.findById(productId);
            const productOwner = await User.findById(product.user);

            if (!product || !productOwner) {
                return socket.emit('error', { message: 'Product or owner not found' });
            }

            product.comments.push({ user: userId, comment });
            await product.save();

            productOwner.activityFeed.push({
                type: 'comment',
                user: userId,
                product: productId
            });
            await productOwner.save();

            // Emit comment notification
            await sendNotification(productOwner._id, `${userId} commented on your product.`, 'comment', userId, productId, io);

            socket.emit('commentSuccess', { message: 'Comment added successfully' });
            socket.to(productOwner._id).emit('newComment', { message: `${userId} commented on your product.` });
        }));

        // Share product event
        socket.on('shareProduct', catchAsyncErrors(async ({ productId, userId, sharedTo }) => {
            const product = await Product.findById(productId);
            const productOwner = await User.findById(product.user);

            if (!product || !productOwner) {
                return socket.emit('error', { message: 'Product or owner not found' });
            }

            product.shares.push({ user: userId, sharedTo });
            await product.save();

            productOwner.activityFeed.push({
                type: 'share',
                user: userId,
                product: productId
            });
            await productOwner.save();

            // Emit share notification
            await sendNotification(productOwner._id, `${userId} shared your product.`, 'share', userId, productId, io);

            socket.emit('shareSuccess', { message: 'Product shared successfully' });
            socket.to(productOwner._id).emit('newShare', { message: `${userId} shared your product.` });
        }));


        // Follow a seller event
socket.on('followSeller', catchAsyncErrors(async ({ sellerId, userId }) => {
    const seller = await User.findById(sellerId);
    const user = await User.findById(userId);

    if (!seller || !user) {
        return socket.emit('error', { message: 'Invalid follow request: User or seller not found' });
    }

    // Check if the user is already following the seller
    if (seller.followers.includes(userId)) {
        return socket.emit('error', { message: 'You are already following this seller' });
    }

    // Add user to seller's followers and seller to user's following list
    seller.followers.push(userId);
    await seller.save();

    user.following.push(sellerId);
    await user.save();

    // Emit notification for follow action
    await sendNotification(sellerId, `${user.id} started following you.`, 'follow', userId, null, io);

    socket.emit('followSuccess', { message: 'Seller followed successfully' });
    socket.to(sellerId).emit('newFollower', { message: `${user.id} is now following you.` });
}));

// Unfollow a seller event
socket.on('unfollowSeller', catchAsyncErrors(async ({ sellerId, userId }) => {
    const seller = await User.findById(sellerId);
    const user = await User.findById(userId);

    if (!seller || !user) {
        return socket.emit('error', { message: 'Invalid unfollow request: User or seller not found' });
    }

    // Check if the user is actually following the seller
    if (!seller.followers.includes(userId)) {
        return socket.emit('error', { message: 'You are not following this seller' });
    }

    // Remove user from seller's followers and seller from user's following list
    seller.followers = seller.followers.filter(follower => follower.toString() !== userId);
    await seller.save();

    user.following = user.following.filter(following => following.toString() !== sellerId);
    await user.save();

    socket.emit('unfollowSuccess', { message: 'Seller unfollowed successfully' });
}));

        // Disconnect event
        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    
}

module.exports = { setupSocket };
