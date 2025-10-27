let currentSessionId = null;

async function loadAISessions() {
    const token = getAuthToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE}/ai/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // For now, we'll just clear the messages and start fresh
        document.getElementById('aiMessages').innerHTML = `
            <div class="message ai-message">
                <div class="message-sender">AI Tutor:</div>
                <div class="message-content ai-response">
                    <p>Hello! I'm your AI learning assistant. How can I help you today? You can ask me to explain concepts, create exercises, review code, or help with your career goals.</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('AI sessions loading error:', error);
    }
}

async function createNewAISession() {
    const token = getAuthToken();
    const sessionType = document.getElementById('sessionType').value;
    
    try {
        const response = await fetch(`${API_BASE}/ai/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sessionType: sessionType,
                title: `${sessionType} Session`,
                contextData: {}
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSessionId = data.sessionId;
            document.getElementById('aiMessages').innerHTML = `
                <div class="message ai-message">
                    <div class="message-sender">AI Tutor:</div>
                    <div class="message-content ai-response">
                        <p>New session started! How can I assist you?</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Session creation error:', error);
    }
}

async function sendAIQuery() {
    const queryInput = document.getElementById('aiQueryInput');
    const query = queryInput.value.trim();
    
    if (!query) return;
    
    // Add user message to chat
    addMessageToChat('user', query);
    queryInput.value = '';
    
    try {
        const data = await apiCall('/ai/query', {
            method: 'POST',
            body: JSON.stringify({
                query: query,
                sessionType: document.getElementById('sessionType').value
            })
        });
        
        addMessageToChat('ai', data.response);
    } catch (error) {
        console.error('AI query error:', error);
        addMessageToChat('ai', 'Sorry, I am temporarily unavailable. Please try again in a moment.');
    }
}

function addMessageToChat(role, content) {
    const messagesContainer = document.getElementById('aiMessages');
    const messageClass = role === 'user' ? 'user-message' : 'ai-message';
    const sender = role === 'user' ? 'You' : 'AI Tutor';
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageClass}`;
    
    if (role === 'user') {
        // User messages: plain text
        messageElement.innerHTML = `
            <div class="message-sender">${sender}:</div>
            <div class="message-content">${escapeHtml(content)}</div>
        `;
    } else {
        // AI messages: parse Markdown to HTML
        const htmlContent = marked.parse(content);
        messageElement.innerHTML = `
            <div class="message-sender">${sender}:</div>
            <div class="message-content ai-response">${htmlContent}</div>
        `;
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Utility function to escape HTML (for user messages)
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Allow sending message with Enter key (with Shift+Enter for new line)
document.getElementById('aiQueryInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIQuery();
    }
});
