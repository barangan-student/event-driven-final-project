document.addEventListener('DOMContentLoaded', () => {
    // Phase 1 & 2: Project Setup and Core Functionality
    const socket = io();

    // DOM Elements
    const usernameContainer = document.getElementById('username-container');
    const chatContainer = document.getElementById('chat-container');
    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messages = document.getElementById('messages');
    const userList = document.getElementById('user-list');
    const connectionStatus = document.getElementById('connection-status');
    const typingIndicator = document.getElementById('typing-indicator');
    
    let username = '';

    // Phase 3: Enhanced Features (Client-side Event Handling)
    // Handle username submission
    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission
        const inputUsername = usernameInput.value.trim();
        
        // Input validation
        if (inputUsername) {
            username = inputUsername;
            socket.emit('join', username);
            usernameContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            messageInput.focus();
        }
    });

    // Handle message submission
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();

        // Input validation and sanitization
        if (text) {
            socket.emit('message', text);
            messageInput.value = '';
        }
    });

    // Keyboard shortcuts
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        } else if (e.key === 'Escape') {
            messageInput.value = '';
        }
    });
    
    // --- Socket.IO Event Listeners ---

    // Connection status
    socket.on('connect', () => {
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        updateConnectionStatus(false);
    });
    
    // Listen for incoming messages
    socket.on('message', (message) => {
        displayMessage(message);
    });
    
    // Listen for message history
    socket.on('message_history', (history) => {
        history.forEach(message => displayMessage(message));
    });

    // Update connected users list
    socket.on('user_list', (users) => {
        userList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            userList.appendChild(li);
        });
    });

    // Handle username error
    socket.on('error_message', (errorMessage) => {
        alert(errorMessage);
        usernameContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        username = '';
    });
    
    // Typing indicator logic
    let typingTimer;
    messageInput.addEventListener('input', () => {
        socket.emit('typing');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            socket.emit('stop_typing'); // A corresponding server-side event could be added if needed
        }, 1000); 
    });

    socket.on('typing', (text) => {
        typingIndicator.textContent = text;
        setTimeout(() => {
            typingIndicator.textContent = '';
        }, 2000); // Clear after 2 seconds
    });
    
    // --- Helper Functions ---

    function displayMessage(message) {
        const item = document.createElement('div');
        item.classList.add('message');

        // Add visual distinction for messages
        if (message.username === username) {
            item.classList.add('own');
        } else if (message.username === 'System') {
            item.classList.add('system');
        } else {
            item.classList.add('other');
        }

        // Sanitize text content to prevent HTML injection
        const sanitizedText = document.createElement('p');
        sanitizedText.textContent = message.text;

        item.innerHTML = `
            <div class="info">
                <span class="username">${message.username}</span>
                <span class="timestamp">${message.timestamp}</span>
            </div>
        `;
        item.appendChild(sanitizedText);
        
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight; // Auto-scrolling
    }

    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            connectionStatus.textContent = 'Status: Connected';
            connectionStatus.classList.add('connected');
        } else {
            connectionStatus.textContent = 'Status: Disconnected';
            connectionStatus.classList.remove('connected');
        }
    }
});