// Phase 1: Project Setup
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data stores
let users = {}; // Stores { socket.id: username }
const messageHistory = []; // Stores the last 50 messages

// Phase 2 & 3: Core Functionality and Enhanced Features
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Send message history to the newly connected user
    socket.emit('message_history', messageHistory);

    // Event: 'join' - When a user sets their username
    socket.on('join', (username) => {
        // Handle duplicate username validation
        if (Object.values(users).includes(username)) {
            socket.emit('error_message', 'This username is already taken. Please choose another.');
            return;
        }

        // Store user
        users[socket.id] = username;

        // Broadcast join notification to all users
        io.emit('message', {
            username: 'System',
            text: `${username} has joined the chat.`,
            timestamp: new Date().toLocaleTimeString()
        });

        // Update the user list for all clients
        io.emit('user_list', Object.values(users));
    });

    // Event: 'message' - When a user sends a message
    socket.on('message', (text) => {
        const username = users[socket.id];
        if (username) {
            const message = {
                username: username,
                text: text, // Basic sanitization can be added here
                timestamp: new Date().toLocaleTimeString()
            };

            // Add to message history and broadcast
            messageHistory.push(message);
            if (messageHistory.length > 50) {
                messageHistory.shift(); // Keep only the last 50 messages
            }

            io.emit('message', message);
        }
    });

    // Event: 'typing' - When a user is typing
    socket.on('typing', () => {
        const username = users[socket.id];
        if (username) {
            socket.broadcast.emit('typing', `${username} is typing...`);
        }
    });

    // Event: 'disconnect' - When a user leaves
    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            console.log(`${username} disconnected.`);
            delete users[socket.id];

            // Broadcast leave notification
            io.emit('message', {
                username: 'System',
                text: `${username} has left the chat.`,
                timestamp: new Date().toLocaleTimeString()
            });

            // Update user list for all clients
            io.emit('user_list', Object.values(users));
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});