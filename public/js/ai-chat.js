// ============================================
// AKURU MANSALA - AI CHAT ASSISTANT
// ============================================

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const API_BASE = '/api';
    const CHAT_STORAGE_KEY = 'akuru_chat_history';
    const MAX_HISTORY = 20;

    let chatOpen = false;
    let isTyping = false;
    let chatHistory = [];

    // ============================================
    // LOAD CHAT HISTORY
    // ============================================
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem(CHAT_STORAGE_KEY);
            if (saved) {
                chatHistory = JSON.parse(saved);
            }
        } catch (e) {
            chatHistory = [];
        }
    }

    function saveChatHistory() {
        try {
            // Keep only last MAX_HISTORY messages
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            }
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
        } catch (e) {
            console.error('Save history error:', e);
        }
    }

    // ============================================
    // CREATE CHAT WIDGET HTML
    // ============================================
    function createChatWidget() {
        const widget = document.createElement('div');
        widget.id = 'aiChatWidget';
        widget.innerHTML = `
            <!-- Chat Button -->
            <button id="aiChatButton" class="ai-chat-button" onclick="window.AIChat.toggle()" title="AI උදව්කරු">
                <i class="fa-solid fa-robot"></i>
                <span class="ai-chat-pulse"></span>
            </button>

            <!-- Chat Window -->
            <div id="aiChatWindow" class="ai-chat-window">
                <!-- Header -->
                <div class="ai-chat-header">
                    <div class="ai-chat-header-info">
                        <div class="ai-chat-avatar">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div>
                            <h3>අකුරු AI</h3>
                            <p><span class="ai-status-dot"></span> Online</p>
                        </div>
                    </div>
                    <div class="ai-chat-header-actions">
                        <button onclick="window.AIChat.clear()" title="Clear chat">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        <button onclick="window.AIChat.toggle()" title="Close">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages -->
                <div id="aiChatMessages" class="ai-chat-messages"></div>

                <!-- Suggestions -->
                <div id="aiChatSuggestions" class="ai-chat-suggestions">
                    <button onclick="window.AIChat.send('ගණිතය ඉගෙන ගන්න පුළුවන් කොහොමද?')">ගණිතය ඉගෙන ගන්නේ කොහොමද?</button>
                    <button onclick="window.AIChat.send('පාඩම් මතක තියාගන්න උපදෙස් දෙන්න')">පාඩම් මතක තියාගන්න උපදෙස්</button>
                    <button onclick="window.AIChat.send('විභාග බය ගන්නේ කොහොමද?')">විභාග බය ගන්නේ කොහොමද?</button>
                </div>

                <!-- Input -->
                <div class="ai-chat-input-wrap">
                    <input 
                        type="text" 
                        id="aiChatInput" 
                        class="ai-chat-input" 
                        placeholder="ඔබේ ප්‍රශ්නය මෙහි ලියන්න..."
                        onkeypress="if(event.key==='Enter') window.AIChat.send()"
                    >
                    <button onclick="window.AIChat.send()" class="ai-chat-send" id="aiChatSend">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }

    // ============================================
    // CREATE CHAT STYLES
    // ============================================
    function createChatStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* AI Chat Button */
            .ai-chat-button {
                position: fixed;
                bottom: 90px;
                right: 24px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #a855f7, #6366f1);
                color: white;
                border: none;
                cursor: pointer;
                box-shadow: 0 10px 30px rgba(168, 85, 247, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.6rem;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                z-index: 9998;
            }
            .ai-chat-button:hover {
                transform: scale(1.1) rotate(-10deg);
                box-shadow: 0 15px 40px rgba(168, 85, 247, 0.7);
            }
            .ai-chat-pulse {
                position: absolute;
                top: 0;
                right: 0;
                width: 14px;
                height: 14px;
                background: #22c55e;
                border-radius: 50%;
                border: 3px solid white;
                animation: pulseGreen 2s infinite;
            }
            @keyframes pulseGreen {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.7; }
            }

            /* Chat Window */
            .ai-chat-window {
                position: fixed;
                bottom: 160px;
                right: 24px;
                width: 380px;
                max-width: calc(100vw - 48px);
                height: 550px;
                max-height: calc(100vh - 200px);
                background: white;
                border-radius: 1.5rem;
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(0.95);
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .ai-chat-window.active {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }
            body.dark .ai-chat-window {
                background: #1e293b;
                color: #e2e8f0;
            }

            /* Header */
            .ai-chat-header {
                background: linear-gradient(135deg, #a855f7, #6366f1);
                color: white;
                padding: 1.25rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .ai-chat-header-info {
                display: flex;
                align-items: center;
                gap: 0.85rem;
            }
            .ai-chat-avatar {
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.3rem;
                border: 2px solid rgba(255,255,255,0.3);
            }
            .ai-chat-header h3 {
                font-size: 1rem;
                font-weight: 800;
                margin: 0;
            }
            .ai-chat-header p {
                font-size: 0.75rem;
                margin: 0.15rem 0 0 0;
                display: flex;
                align-items: center;
                gap: 0.4rem;
                opacity: 0.9;
            }
            .ai-status-dot {
                width: 8px;
                height: 8px;
                background: #22c55e;
                border-radius: 50%;
                display: inline-block;
                animation: pulseGreen 2s infinite;
            }
            .ai-chat-header-actions {
                display: flex;
                gap: 0.5rem;
            }
            .ai-chat-header-actions button {
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ai-chat-header-actions button:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }

            /* Messages */
            .ai-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                background: #f8fafc;
            }
            body.dark .ai-chat-messages {
                background: #0f172a;
            }
            .ai-chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            .ai-chat-messages::-webkit-scrollbar-thumb {
                background: #a855f7;
                border-radius: 3px;
            }

            /* Message Bubbles */
            .ai-message {
                display: flex;
                gap: 0.6rem;
                max-width: 85%;
                animation: messageIn 0.3s ease-out;
            }
            @keyframes messageIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ai-message.user {
                align-self: flex-end;
                flex-direction: row-reverse;
            }
            .ai-message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                flex-shrink: 0;
            }
            .ai-message.bot .ai-message-avatar {
                background: linear-gradient(135deg, #a855f7, #6366f1);
                color: white;
            }
            .ai-message.user .ai-message-avatar {
                background: linear-gradient(135deg, #D4A017, #E8B923);
                color: #0F2C59;
            }
            .ai-message-content {
                background: white;
                padding: 0.85rem 1.1rem;
                border-radius: 1rem;
                font-size: 0.9rem;
                line-height: 1.5;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                word-wrap: break-word;
            }
            body.dark .ai-message-content {
                background: #334155;
            }
            .ai-message.bot .ai-message-content {
                border-top-left-radius: 0.25rem;
            }
            .ai-message.user .ai-message-content {
                background: linear-gradient(135deg, #D4A017, #E8B923);
                color: #0F2C59;
                border-top-right-radius: 0.25rem;
                font-weight: 600;
            }

            /* Typing Indicator */
            .ai-typing {
                display: flex;
                gap: 0.4rem;
                padding: 0.85rem 1.1rem;
            }
            .ai-typing span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #a855f7;
                animation: typingBounce 1.4s infinite;
            }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typingBounce {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                30% { transform: translateY(-8px); opacity: 1; }
            }

            /* Suggestions */
            .ai-chat-suggestions {
                padding: 0.75rem 1.25rem;
                background: white;
                border-top: 1px solid #e2e8f0;
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                max-height: 100px;
                overflow-y: auto;
            }
            body.dark .ai-chat-suggestions {
                background: #1e293b;
                border-top-color: #334155;
            }
            .ai-chat-suggestions button {
                background: rgba(168, 85, 247, 0.1);
                color: #a855f7;
                border: 1px solid rgba(168, 85, 247, 0.2);
                padding: 0.4rem 0.85rem;
                border-radius: 999px;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                white-space: nowrap;
            }
            .ai-chat-suggestions button:hover {
                background: #a855f7;
                color: white;
                transform: translateY(-2px);
            }

            /* Input */
            .ai-chat-input-wrap {
                padding: 1rem 1.25rem;
                background: white;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 0.5rem;
            }
            body.dark .ai-chat-input-wrap {
                background: #1e293b;
                border-top-color: #334155;
            }
            .ai-chat-input {
                flex: 1;
                padding: 0.75rem 1rem;
                border: 2px solid #e2e8f0;
                border-radius: 0.75rem;
                font-size: 0.9rem;
                font-family: inherit;
                background: white;
                transition: all 0.3s;
            }
            body.dark .ai-chat-input {
                background: #0f172a;
                color: #e2e8f0;
                border-color: #334155;
            }
            .ai-chat-input:focus {
                outline: none;
                border-color: #a855f7;
                box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
            }
            .ai-chat-send {
                width: 46px;
                height: 46px;
                border-radius: 0.75rem;
                background: linear-gradient(135deg, #a855f7, #6366f1);
                color: white;
                border: none;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                flex-shrink: 0;
            }
            .ai-chat-send:hover:not(:disabled) {
                transform: scale(1.1) rotate(-10deg);
                box-shadow: 0 8px 20px rgba(168, 85, 247, 0.5);
            }
            .ai-chat-send:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            /* Mobile */
            @media (max-width: 640px) {
                .ai-chat-button {
                    bottom: 80px;
                    right: 16px;
                    width: 54px;
                    height: 54px;
                    font-size: 1.4rem;
                }
                .ai-chat-window {
                    bottom: 145px;
                    right: 16px;
                    left: 16px;
                    width: auto;
                    max-width: none;
                    height: calc(100vh - 220px);
                    max-height: 500px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // ============================================
    // RENDER MESSAGES
    // ============================================
    function renderMessages() {
        const messagesEl = document.getElementById('aiChatMessages');
        if (!messagesEl) return;

        if (chatHistory.length === 0) {
            // Welcome message
            messagesEl.innerHTML = `
                <div class="ai-message bot">
                    <div class="ai-message-avatar"><i class="fa-solid fa-robot"></i></div>
                    <div class="ai-message-content">
                        ආයුබෝවන්! 👋 මම අකුරු AI. ඔබට ඉගෙනීමට උදව් අවශ්‍යද? ඕනෑම ප්‍රශ්නයක් අහන්න!
                    </div>
                </div>
            `;
            return;
        }

        messagesEl.innerHTML = chatHistory.map(msg => `
            <div class="ai-message ${msg.role}">
                <div class="ai-message-avatar">
                    <i class="fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <div class="ai-message-content">${escapeHtml(msg.content)}</div>
            </div>
        `).join('');

        // Scroll to bottom
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ============================================
    // ESCAPE HTML
    // ============================================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    // ============================================
    // SHOW TYPING INDICATOR
    // ============================================
    function showTyping() {
        const messagesEl = document.getElementById('aiChatMessages');
        if (!messagesEl) return;

        const typingEl = document.createElement('div');
        typingEl.id = 'aiTypingIndicator';
        typingEl.className = 'ai-message bot';
        typingEl.innerHTML = `
            <div class="ai-message-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="ai-message-content ai-typing">
                <span></span><span></span><span></span>
            </div>
        `;
        messagesEl.appendChild(typingEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
        const typingEl = document.getElementById('aiTypingIndicator');
        if (typingEl) typingEl.remove();
    }

    // ============================================
    // SEND MESSAGE
    // ============================================
    async function sendMessage(messageText) {
        if (isTyping) return;

        const input = document.getElementById('aiChatInput');
        const message = messageText || input.value.trim();

        if (!message) return;

        // Clear input
        if (input) input.value = '';

        // Hide suggestions
        const suggestions = document.getElementById('aiChatSuggestions');
        if (suggestions) suggestions.style.display = 'none';

        // Add user message
        chatHistory.push({ role: 'user', content: message });
        renderMessages();
        saveChatHistory();

        // Show typing
        isTyping = true;
        showTyping();

        const sendBtn = document.getElementById('aiChatSend');
        if (sendBtn) sendBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory.slice(-10)
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'AI error');
            }

            hideTyping();

            // Add bot message
            chatHistory.push({ role: 'assistant', content: data.response });
            renderMessages();
            saveChatHistory();

        } catch (err) {
            hideTyping();
            console.error('AI error:', err);
            
            chatHistory.push({ 
                role: 'assistant', 
                content: 'සමාවෙන්න, දැන් ප්‍රතිචාර දැක්වීමට නොහැක. කරුණාකර නැවත උත්සාහ කරන්න.' 
            });
            renderMessages();
            saveChatHistory();
        } finally {
            isTyping = false;
            if (sendBtn) sendBtn.disabled = false;
            if (input) input.focus();
        }
    }

    // ============================================
    // TOGGLE CHAT
    // ============================================
    function toggleChat() {
        const window = document.getElementById('aiChatWindow');
        const button = document.getElementById('aiChatButton');
        
        chatOpen = !chatOpen;
        
        if (chatOpen) {
            window.classList.add('active');
            button.style.transform = 'scale(0.9) rotate(180deg)';
            
            setTimeout(() => {
                const input = document.getElementById('aiChatInput');
                if (input) input.focus();
            }, 300);
        } else {
            window.classList.remove('active');
            button.style.transform = '';
        }
    }

    // ============================================
    // CLEAR CHAT
    // ============================================
    function clearChat() {
        if (!confirm('සියලු chat messages මකා දැමීමට අවශ්‍යද?')) return;
        chatHistory = [];
        localStorage.removeItem(CHAT_STORAGE_KEY);
        renderMessages();
        
        const suggestions = document.getElementById('aiChatSuggestions');
        if (suggestions) suggestions.style.display = 'flex';
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        createChatStyles();
        createChatWidget();
        loadChatHistory();
        renderMessages();
        console.log('✅ AI Chat initialized');
    }

    // ============================================
    // EXPOSE GLOBAL API
    // ============================================
    window.AIChat = {
        toggle: toggleChat,
        send: sendMessage,
        clear: clearChat
    };

    // Init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
