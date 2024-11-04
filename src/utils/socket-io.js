const { Message, validateMessage } = require('../models/message-model');
const { User } = require('../models/userModel');
const { catchAsyncErrors } = require('../middlewares/catchAsyncError');

function setupSocket(io) {
    io.on('connection', (socket) => {
        console.log('New client connected');

        // Event to send a private message
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

            socket.to(receiverId).emit('privateMessage', {
                sender: senderId,
                message: newMessage.message,
                createdAt: newMessage.createdAt,
            });

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

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
}

module.exports = { setupSocket };
