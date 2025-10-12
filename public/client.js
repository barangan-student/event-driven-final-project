// public/client.js

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let myUsername = '';

    // --- DOM Element References ---
    const joinScreen = document.getElementById('join-screen');
    const chatScreen = document.getElementById('chat-screen');
    const joinForm = document.getElementById('join-form');
    const usernameInput = document.getElementById('username-input');
    const joinErrorMessage = document.getElementById('join-error-message');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const userList = document.getElementById('user-list');
    const statusIndicator = document.getElementById('status-indicator');
    const typingIndicator = document.getElementById('typing-indicator');
    const usersSidebar = document.getElementById('users-sidebar');
    const toggleUsersBtn = document.getElementById('toggle-users-btn');

    // --- Event Handlers ---

    // Handle the user joining the chat
    joinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (username) {
            socket.emit('join', username);
        }
    });

    // Handle sending a chat message
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message && message.length <= 280) {
            socket.emit('message', message);
            messageInput.value = '';
        }
        else if (message.length > 280) {
        // Required action: Display error message when character limit is exceeded [1]
        renderNotification('Message length exceeds the 280-character limit.');
    }
    });

    // Handle keyboard shortcuts in the message input
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            messageInput.value = '';
        }
    });

    // Emit a 'typing' event when the user types in the input field
    let typingTimer;
    messageInput.addEventListener('input', () => {
        socket.emit('typing');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {}, 3000);
    });

    // Toggle the user sidebar visibility on smaller screens
    toggleUsersBtn.addEventListener('click', () => {
        usersSidebar.classList.toggle('visible');
    });

    // --- Socket.IO Event Listeners ---
    
    // Handle successful connection
    socket.on('connect', () => {
        statusIndicator.textContent = 'Connected';
        statusIndicator.className = 'connected';
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        statusIndicator.textContent = 'Disconnected';
        statusIndicator.className = 'disconnected';
    });

    // Handle successful join event from server
    socket.on('join_success', (username) => {
        // Set the username based on the server's confirmation.
        myUsername = username;
        joinScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        joinErrorMessage.textContent = '';
    });
    
    // Handle failed join event from server
    socket.on('join_error', (errorMsg) => {
        joinErrorMessage.textContent = errorMsg;
    });

    // Render message history on connect
    socket.on('history', (messages) => {
        chatMessages.innerHTML = '';
        messages.forEach(msg => renderMessage(msg));
    });

    // Render a new incoming message
    socket.on('message', (data) => {
        renderMessage(data);
    });

    // Render a server notification
    socket.on('notification', (text) => {
        renderNotification(text);
    });

    // Update the list of connected users
    socket.on('user_list', (users) => {
        userList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            userList.appendChild(li);
        });
    });

    // Display the typing indicator
    let typingIndicatorTimer;
    socket.on('typing', (username) => {
        typingIndicator.textContent = `${username} is typing...`;
        clearTimeout(typingIndicatorTimer);
        typingIndicatorTimer = setTimeout(() => {
            typingIndicator.textContent = '';
        }, 2000);
    });

    // --- Helper Functions ---
    
    /**
     * Renders a chat message in the chat window.
     * @param {object} data - The message data object { user, text, timestamp }.
     */
    function renderMessage(data) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        if (data.user === myUsername) {
            messageElement.classList.add('my-message');
        } else {
            messageElement.classList.add('other-message');
        }
        messageElement.innerHTML = `
            <div class="meta">
                <span>${data.user}</span><span class="timestamp">${data.timestamp}</span>
            </div>
            <div class="text">${sanitizeHTML(data.text)}</div>
        `;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }
    
    /**
     * Renders a system notification in the chat window.
     * @param {string} text - The notification text.
     */
    function renderNotification(text) {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('notification');
        notificationElement.textContent = text;
        chatMessages.appendChild(notificationElement);
        scrollToBottom();
    }
    
    /**
     * Automatically scrolls the chat window to the latest message.
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Sanitizes a string to prevent HTML injection (XSS).
     * @param {string} str - The input string.
     * @returns {string} The sanitized string.
     */
    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
});