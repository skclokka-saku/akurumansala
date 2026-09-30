// ============================================
// e-Akuru-AI v3.1 - AI Chat with Groq (qwen model)
// ============================================

(function() {
    'use strict';
    
    // ============================================
    // CONFIG
    // ============================================
    const CONFIG = {
        apiEndpoint: '/api/ai/chat',
        maxHistory: 10,
        minRequestGap: 3000,        // Min 3 seconds between requests
        rateLimitCooldown: 30000    // 30 seconds cooldown after 429
    };
    
    let chatHistory = [];
    let isWaiting = false;
    let lastRequestTime = 0;
    let rateLimitUntil = 0;

    // ============================================
    // QUICK SUGGESTIONS
    // ============================================
    const quickSuggestions = [
        '2+2 කීයද?',
        'ශ්‍රී ලංකාවේ අගනගරය?',
        'විභාග උපදෙස්',
        'ඉගෙනීමේ ක්‍රම',
        'ගණිතය ගැන',
        'විද්‍යාව ගැන'
    ];

    // ============================================
    // CALL AI API
    // ============================================
    async function callAI(message) {
        // Rate limit check
        const now = Date.now();
        if (now < rateLimitUntil) {
            const remaining = Math.ceil((rateLimitUntil - now) / 1000);
            throw new Error(`RATE_LIMIT:තත්පර ${remaining}ක් ඉන්න`);
        }
        
        // Min gap check
        if (now - lastRequestTime < CONFIG.minRequestGap) {
            const wait = Math.ceil((CONFIG.minRequestGap - (now - lastRequestTime)) / 1000);
            throw new Error(`WAIT:තත්පර ${wait}ක් ඉන්න`);
        }
        
        lastRequestTime = now;
        
        try {
            chatHistory.push({ role: 'user', content: message });
            
            if (chatHistory.length > CONFIG.maxHistory * 2) {
                chatHistory = chatHistory.slice(-CONFIG.maxHistory * 2);
            }
            
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory.slice(0, -1)
                })
            });
            
            if (response.status === 429) {
                rateLimitUntil = Date.now() + CONFIG.rateLimitCooldown;
                throw new Error('RATE_LIMIT:තත්පර 30ක් ඉන්න');
            }
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'AI සේවාව නොමැත');
            }
            
            const data = await response.json();
            const aiResponse = data.response || 'මට උත්තර දෙන්න බැහැ.';
            
            chatHistory.push({ role: 'assistant', content: aiResponse });
            
            return aiResponse;
        } catch (err) {
            // Remove the user message if error
            chatHistory = chatHistory.slice(0, -1);
            throw err;
        }
    }

    // ============================================
    // CREATE CHAT UI
    // ============================================
    function createChatUI() {
        if (document.getElementById('ai-chat-button')) return;
        
        const button = document.createElement('button');
        button.id = 'ai-chat-button';
        button.innerHTML = `<i class="fa-solid fa-robot" style="font-size: 1.5rem;"></i>`;
        button.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 24px;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, #D4A017, #E8B923);
            color: #0F2C59;
            border: none;
            box-shadow: 0 8px 30px rgba(212, 160, 23, 0.5);
            cursor: pointer;
            z-index: 9998;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            animation: aiPulse 2s infinite;
        `;
        
        const chatWindow = document.createElement('div');
        chatWindow.id = 'ai-chat-window';
        chatWindow.style.cssText = `
            position: fixed;
            bottom: 180px;
            right: 24px;
            width: 420px;
            max-width: calc(100vw - 48px);
            height: 680px;
            max-height: calc(100vh - 200px);
            background: white;
            border-radius: 1.5rem;
            box-shadow: 0 20px 60px rgba(15, 44, 89, 0.3);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;
        chatWindow.innerHTML = `
            <div style="background: linear-gradient(135deg, #0F2C59, #1B3A6B); padding: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 48px; height: 48px; border-radius: 1rem; background: linear-gradient(135deg, #D4A017, #E8B923); display: flex; align-items: center; justify-content: center; color: #0F2C59; font-size: 1.5rem;">
                        <i class="fa-solid fa-robot"></i>
                    </div>
                    <div>
                        <h3 style="font-weight: 900; color: white; font-size: 1.125rem; margin: 0; line-height: 1;">e-Akuru-AI</h3>
                        <p style="color: #D4A017; font-size: 0.75rem; font-weight: 700; margin: 4px 0 0 0;">
                            <span style="display: inline-block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; margin-right: 4px;"></span>සක්‍රීය • Powered by AI
                        </p>
                    </div>
                </div>
                <button id="ai-chat-close" style="width: 40px; height: 40px; border-radius: 0.5rem; background: transparent; border: none; color: white; cursor: pointer; font-size: 1.125rem;">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 1.25rem; background: #F8F9FC; display: flex; flex-direction: column; gap: 1rem;">
                <div class="ai-message" style="display: flex; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #D4A017, #E8B923); color: #0F2C59; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.875rem;">
                        <i class="fa-solid fa-robot"></i>
                    </div>
                    <div style="padding: 0.875rem 1.125rem; background: white; border-radius: 1rem; border-top-left-radius: 0.25rem; max-width: 80%; line-height: 1.6; font-size: 0.875rem; color: #1e293b; white-space: pre-line; box-shadow: 0 2px 8px rgba(15, 44, 89, 0.08);">
ආයුබෝවන්! 🙏 මම <strong>e-Akuru-AI</strong>.

ඕනෑම දෙයක් අහන්න පුළුවන්:

🧮 <strong>ගණනය:</strong> "2+2 කීයද?"
📅 <strong>දිනය:</strong> "අද දිනය මොකද?"
🇱🇰 <strong>දැනුම:</strong> "ශ්‍රී ලංකාවේ අගනගරය?"
📚 <strong>අධ්‍යාපනය:</strong> "විභාග උපදෙස්"

⚠️ <strong>සටහන:</strong> එක් ප්‍රශ්නයකට පසු තත්පර 3ක් ඉන්න (rate limit).

ඕනෑම දෙයක් අහන්න!
                    </div>
                </div>
            </div>
            <div id="ai-chat-suggestions" style="padding: 0.75rem 1.25rem; background: white; display: flex; flex-wrap: wrap; gap: 0.5rem; border-top: 1px solid #e5e7eb; max-height: 120px; overflow-y: auto;"></div>
            <div style="padding: 1rem; background: white; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem;">
                <input id="ai-chat-input" type="text" placeholder="ඔබේ ප්‍රශ්නය ලියන්න..." autocomplete="off" style="flex: 1; padding: 0.875rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.875rem; font-family: inherit; outline: none;">
                <button id="ai-chat-send" style="width: 48px; height: 48px; border-radius: 0.75rem; background: linear-gradient(135deg, #D4A017, #E8B923); color: #0F2C59; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(button);
        document.body.appendChild(chatWindow);
        
        addChatStyles();
        renderSuggestions();
        
        button.addEventListener('click', () => {
            const isHidden = chatWindow.style.display === 'none' || !chatWindow.style.display;
            chatWindow.style.display = isHidden ? 'flex' : 'none';
            if (isHidden) document.getElementById('ai-chat-input')?.focus();
        });
        
        document.getElementById('ai-chat-close').addEventListener('click', () => {
            chatWindow.style.display = 'none';
        });
        
        document.getElementById('ai-chat-send').addEventListener('click', sendMessage);
        
        document.getElementById('ai-chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    function addChatStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes aiPulse {
                0%, 100% { box-shadow: 0 8px 30px rgba(212, 160, 23, 0.5); }
                50% { box-shadow: 0 8px 40px rgba(212, 160, 23, 0.8); }
            }
            @keyframes aiFadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes aiTypingDot {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                30% { transform: translateY(-8px); opacity: 1; }
            }
            .ai-message { animation: aiFadeIn 0.3s ease-out; }
            .ai-suggestion-btn {
                padding: 0.5rem 0.875rem;
                background: #F8F9FC;
                border: 1.5px solid #e5e7eb;
                border-radius: 999px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #0F2C59;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.2s;
            }
            .ai-suggestion-btn:hover {
                background: #D4A017;
                color: #0F2C59;
                border-color: #D4A017;
            }
            #ai-chat-button:hover { transform: scale(1.1); }
            #ai-chat-input:focus { border-color: #D4A017 !important; }
            @media (max-width: 640px) {
                #ai-chat-window {
                    width: calc(100vw - 32px) !important;
                    height: calc(100vh - 160px) !important;
                    bottom: 140px !important;
                    right: 16px !important;
                }
                #ai-chat-button {
                    width: 56px !important;
                    height: 56px !important;
                    bottom: 80px !important;
                    right: 16px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function renderSuggestions() {
        const container = document.getElementById('ai-chat-suggestions');
        if (!container) return;
        
        container.innerHTML = quickSuggestions.map(s => `
            <button class="ai-suggestion-btn" onclick="window.sendAISuggestion('${s.replace(/'/g, "\\'")}')">
                ${s}
            </button>
        `).join('');
    }

    async function sendMessage() {
        if (isWaiting) return;
        
        const input = document.getElementById('ai-chat-input');
        const message = input?.value.trim();
        
        if (!message) return;
        
        isWaiting = true;
        addMessage(message, 'user');
        input.value = '';
        showTyping();
        
        try {
            const response = await callAI(message);
            hideTyping();
            addMessage(response, 'bot');
        } catch (err) {
            hideTyping();
            
            let errorMsg = err.message;
            
            // Handle rate limit
            if (errorMsg.startsWith('RATE_LIMIT:')) {
                const waitTime = errorMsg.replace('RATE_LIMIT:', '');
                errorMsg = `⏳ **AI ටිකක් කිරාමත් වැඩ කරනවා**\n\n${waitTime}.\n\n💡 Groq API free tier එකේ තියෙන limit එකට ළඟා වුණා. කරුණාකර ටිකක් ඉන්න.`;
            } else if (errorMsg.startsWith('WAIT:')) {
                const waitTime = errorMsg.replace('WAIT:', '');
                errorMsg = `⏳ **${waitTime}**\n\n💡 Rate limit වළක්වන්න, එක් ප්‍රශ්නයකට පසු තත්පර 3ක් ඉන්න.`;
            } else if (errorMsg.includes('401') || errorMsg.includes('Key')) {
                errorMsg = '🔑 **AI සේවා key ප්‍රශ්නයක්**\n\nපරිපාලක අමතන්න.';
            } else if (errorMsg.includes('Network') || errorMsg.includes('fetch')) {
                errorMsg = '🌐 **අන්තර්ජාල සම්බන්ධතා ප්‍රශ්නයක්**\n\nඔබේ අන්තර්ජාලය පරීක්ෂා කරන්න.';
            } else {
                errorMsg = '❌ **දෝෂයක්**\n\n' + errorMsg + '\n\nනැවත උත්සාහ කරන්න.';
            }
            
            addMessage(errorMsg, 'bot');
        } finally {
            isWaiting = false;
        }
    }

    function addMessage(text, sender) {
        const container = document.getElementById('ai-chat-messages');
        if (!container) return;
        
        const msg = document.createElement('div');
        msg.className = `ai-message ai-message-${sender}`;
        
        const formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        if (sender === 'bot') {
            msg.style.cssText = 'display: flex; gap: 0.75rem;';
            msg.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #D4A017, #E8B923); color: #0F2C59; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.875rem;">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div style="padding: 0.875rem 1.125rem; background: white; border-radius: 1rem; border-top-left-radius: 0.25rem; max-width: 80%; line-height: 1.6; font-size: 0.875rem; color: #1e293b; box-shadow: 0 2px 8px rgba(15, 44, 89, 0.08);">${formatted}</div>
            `;
        } else {
            msg.style.cssText = 'display: flex; gap: 0.75rem; flex-direction: row-reverse;';
            msg.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #0F2C59, #1B3A6B); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.875rem;">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div style="padding: 0.875rem 1.125rem; background: linear-gradient(135deg, #0F2C59, #1B3A6B); color: white; border-radius: 1rem; border-top-right-radius: 0.25rem; max-width: 80%; line-height: 1.6; font-size: 0.875rem;">${escapeHtml(text)}</div>
            `;
        }
        
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    function showTyping() {
        const container = document.getElementById('ai-chat-messages');
        if (!container) return;
        
        const typing = document.createElement('div');
        typing.id = 'ai-typing';
        typing.style.cssText = 'display: flex; gap: 0.75rem;';
        typing.innerHTML = `
            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #D4A017, #E8B923); color: #0F2C59; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div style="padding: 0.875rem 1.125rem; background: white; border-radius: 1rem; border-top-left-radius: 0.25rem; display: flex; gap: 4px; align-items: center;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #D4A017; animation: aiTypingDot 1.4s infinite;"></span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #D4A017; animation: aiTypingDot 1.4s infinite 0.2s;"></span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #D4A017; animation: aiTypingDot 1.4s infinite 0.4s;"></span>
            </div>
        `;
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        document.getElementById('ai-typing')?.remove();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.sendAISuggestion = function(text) {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = text;
            sendMessage();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createChatUI);
    } else {
        createChatUI();
    }
    
    console.log('✅ e-Akuru-AI v3.1 loaded');
})();