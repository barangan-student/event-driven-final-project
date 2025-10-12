// server.js

const express = require('express');
const http = require('http');
const socketio = require('socket.io');

// Initialize Express app and create an HTTP server
const app = express();
const server = http.createServer(app);

// Integrate Socket.IO with the HTTP server
const io = socketio(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// --- Application State Management ---

// Stores connected user data, mapping socket ID to username
let connectedUsers = {}; 
// Stores the last 50 messages for new users to receive as history
let messageHistory = [];

/**
 * Handles all real-time communication events for connected clients.
 */
io.on('connection', (socket) => {
    console.log(`[LOG] User connected: ${socket.id}`);

    /**
     * Handles a user's attempt to join the chat with a username.
     * Validates that the username is not already in use.
     */
    socket.on('join', (username) => {
        // If the username is found in the values of the connectedUsers object, reject it.
        if (Object.values(connectedUsers).includes(username)) {
            socket.emit('join_error', 'Username is already taken. Please choose another.');
            return;
        }

        // Store the user's data
        connectedUsers[socket.id] = username;
        console.log(`[LOG] User ${socket.id} joined as: ${username}`);
        
        // Now that the user has successfully joined, send them the chat history.
        socket.emit('history', messageHistory);
        
        // Confirm successful join to the client, sending the confirmed username back.
        socket.emit('join_success', username);

        // Notify ALL clients (including the sender) that a new user has joined.
        socket.broadcast.emit('notification', `${username} has joined the chat.`);
        
        // Send the updated user list to all clients
        io.emit('user_list', Object.values(connectedUsers));
    });

    /**
     * Handles incoming chat messages from a client.
     * Adds a server-side timestamp and broadcasts the message to all clients.
     */
    socket.on('message', (msg) => {
        const username = connectedUsers[socket.id];
        if (!username) return; // Ignore messages from users who haven't joined

        const fullMessage = {
            user: username,
            text: msg,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        };

        io.emit('message', fullMessage);

        messageHistory.push(fullMessage);
        if (messageHistory.length > 50) {
            messageHistory.shift();
        }
    });

    /**
     * Handles 'typing' indicators from a client.
     * Broadcasts the typing event to all other clients.
     */
    socket.on('typing', () => {
        const username = connectedUsers[socket.id];
        if (username) {
            socket.broadcast.emit('typing', username);
        }
    });

    /**
     * Handles the disconnection of a client.
     * Removes the user from the list and notifies other clients.
     */
    socket.on('disconnect', () => {
        const username = connectedUsers[socket.id];
        if (username) {
            delete connectedUsers[socket.id];
            
            // Notify ALL clients that the user has left.
            io.emit('notification', `${username} has left the chat.`);
            
            // Send the updated user list to all clients.
            io.emit('user_list', Object.values(connectedUsers));
        }
        console.log(`[LOG] User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});