const mongoose = require('mongoose');

// Socket setup function
exports.setupSockets = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Join Public Room
        socket.on('joinPublicRoom', async ({ roomId, userId }) => {
            if (!roomId || !userId) {
                return handleError(socket, 'Room ID and User ID are required');
            }

            try {
                const room = await roomModel.findById(roomId);

                if (!room) {
                    return handleError(socket, 'Room not found');
                }

                if (room.isPrivate) {
                    return handleError(socket, 'Cannot join a private room directly');
                }

                if (!isUserInRoom(room, userId)) {
                    room.users.push(userId);
                    await room.save();
                }

                socket.join(roomId);
                io.to(roomId).emit('userJoined', { userId, roomId });
            } catch (err) {
                console.error(err);
                handleError(socket, 'Error joining public room');
            }
        });

        // Add User to Private Room
        socket.on('addUserToPrivateRoom', async ({ roomId, userId, creatorId }) => {
            if (!roomId || !userId || !creatorId) {
                return handleError(socket, 'Room ID, User ID, and Creator ID are required');
            }

            try {
                const room = await roomModel.findById(roomId);

                if (!room) {
                    return handleError(socket, 'Room not found');
                }

                if (String(room.roomCreator) !== String(creatorId)) {
                    return handleError(socket, 'Only the room creator can add users');
                }

                if (room.users.length >= 7) {
                    return handleError(socket, 'Room already has 7 users, cannot add more');
                }

                if (!isUserInRoom(room, userId)) {
                    room.users.push(userId);
                    await room.save();
                }

                socket.join(roomId);
                io.to(userId).emit('addedToPrivateRoom', { roomId });
                io.to(roomId).emit('userAdded', { userId });
            } catch (err) {
                console.error(err);
                handleError(socket, 'Error adding user to private room');
            }
        });

        // Leave Room
        socket.on('leaveRoom', async ({ roomId, userId }) => {
            if (!roomId || !userId) {
                return handleError(socket, 'Room ID and User ID are required');
            }

            try {
                const room = await roomModel.findById(roomId);

                if (!room) {
                    return handleError(socket, 'Room not found');
                }

                room.users = room.users.filter(id => String(id) !== String(userId));
                await room.save();

                socket.leave(roomId);
                io.to(roomId).emit('userLeft', { userId });
            } catch (err) {
                console.error(err);
                handleError(socket, 'Error leaving room');
            }
        });

        // Send Public Message
        socket.on('sendPublicMessage', async ({ roomId, sender, message }) => {
            const { error } = validateMessage({ roomId, sender, message });
            if (error) return handleError(socket, error.details[0].message);

            try {
                const room = await roomModel.findById(roomId);

                if (!room) {
                    return handleError(socket, 'Room not found');
                }

                if (room.isPrivate) {
                    return handleError(socket, 'Cannot send a public message in a private room.');
                }

                if (!isUserInRoom(room, sender)) {
                    return handleError(socket, 'You are not allowed to send messages in this room.');
                }

                const newMessage = new Message({ roomId, sender, message });
                await newMessage.save();

                room.messages.push(newMessage._id);
                await room.save();

                io.to(roomId).emit('publicMessage', { sender, message });
                socket.emit('messageSent', { message: 'Public message sent successfully', data: newMessage });
            } catch (err) {
                console.error(err);
                handleError(socket, 'Failed to send public message');
            }
        });

        // Send Private Message
        socket.on('sendPrivateMessage', async ({ roomId, sender, receiver, message }) => {
            const { error } = validateMessage({ roomId, sender, message });
            if (error) return handleError(socket, error.details[0].message);

            try {
                const room = await roomModel.findById(roomId);

                if (!room) {
                    return handleError(socket, 'Room not found');
                }

                if (!isUserInRoom(room, sender) || !isUserInRoom(room, receiver)) {
                    return handleError(socket, 'Sender or receiver is not a part of this room.');
                }

                const newMessage = new Message({ roomId, sender, message });
                await newMessage.save();

                room.messages.push(newMessage._id);
                await room.save();

                io.to(receiver).emit('privateMessage', { sender, message });
                socket.emit('messageSent', { message: 'Private message sent successfully', data: newMessage });
            } catch (err) {
                console.error(err);
                handleError(socket, 'Failed to send private message');
            }
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
