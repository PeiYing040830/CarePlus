(function () {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('mobileToggle');
    const overlay = document.getElementById('mobileOverlay');
    const body = document.body;

    let lastNotifId = null;

    if (!menu || !toggle || !overlay) return;

    const openMenu = () => {
        menu.classList.add('active');
        overlay.classList.add('active');
        toggle.classList.add('active');
        body.classList.add('menu-open');
    };

    const closeMenu = () => {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        toggle.classList.remove('active');
        body.classList.remove('menu-open');
    };

    toggle.addEventListener('click', () => {
        menu.classList.contains('active') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    document.querySelectorAll('.nav-link:not(.logout-link)').forEach(link => {
        link.addEventListener('click', () => setTimeout(closeMenu, 200));
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 968) closeMenu();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMenu();
    });

    // Google Translate Language
    function syncTranslateLanguage() {
        const desktopSelect = document.querySelector('#google_translate_element select');
        const mobileSelect = document.querySelector('#google_translate_element_mobile select');

        if (desktopSelect && mobileSelect) {
            desktopSelect.addEventListener('change', function() {
                mobileSelect.value = this.value;
                localStorage.setItem('selectedLanguage', this.value);
            });

            mobileSelect.addEventListener('change', function() {
                desktopSelect.value = this.value;
                localStorage.setItem('selectedLanguage', this.value);
            });

            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage) {
                desktopSelect.value = savedLanguage;
                mobileSelect.value = savedLanguage;
            }
        }
    }

    setTimeout(syncTranslateLanguage, 1500);

    const observer = new MutationObserver(syncTranslateLanguage);
    const translateElements = [
        document.getElementById('google_translate_element'),
        document.getElementById('google_translate_element_mobile')
    ];

    translateElements.forEach(el => {
        if (el) {
            observer.observe(el, { childList: true, subtree: true });
        }
    });

    console.log('✅ Google Translate sync initialized');

    // Chatbot
    let isChatOpen = false;

    // Get session info from PHP or generate fallback
    function getSessionId() {
        if (typeof session_id_php !== 'undefined' && session_id_php) {
            return session_id_php;
        }
        // Generate a session ID based on timestamp
        let sessionId = localStorage.getItem('chatbot_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatbot_session_id', sessionId);
        }
        return sessionId;
    }

    function getPatientId() {
        if (typeof patient_id_php !== 'undefined' && patient_id_php) {
            return patient_id_php;
        }
        return null;
    }

    function getUserType() {
        if (typeof userType !== 'undefined' && userType) {
            return userType;
        }
        return 'guest';
    }

    const sessionId = getSessionId();
    const patientId = getPatientId();

    console.log('Chatbot Session ID:', sessionId);
    console.log('Patient ID:', patientId);

    // Create floating chat button
    const chatButton = document.createElement('button');
    chatButton.id = 'floating-chat-btn';
    chatButton.className = 'floating-chat-btn';
    chatButton.innerHTML = '💬';
    chatButton.setAttribute('aria-label', 'Open chat');
    chatButton.title = 'Chat with CarePlus Assistant';

    // Create floating chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'floating-chat-window';
    chatWindow.className = 'floating-chat-window';
    chatWindow.innerHTML = `
        <div class="floating-chat-header">
            <div class="chat-header-content">
                <div class="chat-bot-avatar">🤖</div>
                <div class="chat-header-text">
                    <h3>CarePlus Assistant</h3>
                    <span class="chat-status">
                        <span class="status-dot"></span>
                        Online
                    </span>
                </div>
            </div>
            <button class="chat-close-btn" id="close-chat-btn" aria-label="Close chat">×</button>
        </div>

        <div class="floating-chatbox" id="floating-chatbox">
            <div class="message-wrapper bot welcome-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-bubble">
                        👋 <strong>Hi! I'm your CarePlus assistant.</strong> How can I help you today?
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>📅 Book appointments</li>
                            <li>🏥 Clinic information</li>
                            <li>👨‍⚕️ Find doctors</li>
                            <li>💡 Health tips</li>
                        </ul>
                    </div>
                    <div class="message-time">Just now</div>
                </div>
            </div>

            <div class="quick-actions">
                <button class="quick-action-btn" data-message="How do I book appointment?">
                    📅 Book
                </button>
                <button class="quick-action-btn" data-message="What are your clinic hours?">
                    🕐 Hours
                </button>
                <button class="quick-action-btn" data-message="How can I find doctor?">
                    👨‍⚕️ Doctors
                </button>
                <button class="quick-action-btn" data-message="How can I contact the clinic?">
                    📞 Contact
                </button><br>
            </div>
        </div>

        <div class="floating-chat-input-wrapper">
            <div class="floating-chat-input">
                <input
                    type="text"
                    id="floating-user-message"
                    placeholder="Ask me anything..."
                    autocomplete="off"
                    aria-label="Type your message"
                >
                <button class="floating-send-btn" id="floating-send-btn" aria-label="Send message">
                    ➤
                </button>
            </div>
        </div>

        <div class="floating-chat-footer">
            <small><span style="color: #ef4444;">⚠️ For emergencies, call 999</span></small>
        </div>
    `;

    // Append to body
    document.body.appendChild(chatButton);
    document.body.appendChild(chatWindow);

    // Toggle chat window
    function toggleChat() {
        isChatOpen = !isChatOpen;

        if (isChatOpen) {
            chatWindow.classList.add('active');
            chatButton.classList.add('hidden');
            setTimeout(() => {
                const input = document.getElementById('floating-user-message');
                if (input) input.focus();
            }, 300);
        } else {
            chatWindow.classList.remove('active');
            chatButton.classList.remove('hidden');
        }
    }

    // Event listeners
    chatButton.addEventListener('click', toggleChat);
    document.getElementById('close-chat-btn').addEventListener('click', toggleChat);

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Scroll to bottom
    function scrollFloatingToBottom() {
        const chatbox = document.getElementById('floating-chatbox');
        if (chatbox) {
            chatbox.scrollTop = chatbox.scrollHeight;
        }
    }

    // Append user message
    function appendFloatingUserMessage(text) {
        const chatbox = document.getElementById('floating-chatbox');
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper user';
        wrapper.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">
                <div class="message-bubble">${escapeHtml(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        chatbox.appendChild(wrapper);
        scrollFloatingToBottom();
    }

    // Append bot message
    function appendFloatingBotMessage(text, messageClass = '') {
        const chatbox = document.getElementById('floating-chatbox');
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const formattedText = escapeHtml(text).replace(/\n/g, '<br>');

        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper bot ${messageClass}`;
        wrapper.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-bubble">${formattedText}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        chatbox.appendChild(wrapper);
        scrollFloatingToBottom();
    }

    // Show typing indicator
    function showFloatingTypingIndicator() {
        const chatbox = document.getElementById('floating-chatbox');
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot';
        wrapper.id = 'floating-typing-indicator';
        wrapper.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        chatbox.appendChild(wrapper);
        scrollFloatingToBottom();
    }

    // Hide typing indicator
    function hideFloatingTypingIndicator() {
        const indicator = document.getElementById('floating-typing-indicator');
        if (indicator) indicator.remove();
    }

    // Send message function
    function sendFloatingMessage() {
        const input = document.getElementById('floating-user-message');
        const sendBtn = document.getElementById('floating-send-btn');
        const text = input.value.trim();

        if (!text) return;

        console.log('Sending message:', text);

        input.disabled = true;
        sendBtn.disabled = true;

        appendFloatingUserMessage(text);
        input.value = '';
        showFloatingTypingIndicator();

        // Prepare request data
        const requestData = {
            message: text,
            session_id: sessionId,
            patient_id: patientId,
            user_type: getUserType()
        };

        console.log('Request data:', requestData);

        // Set timeout for long requests
        const requestTimeout = setTimeout(() => {
            hideFloatingTypingIndicator();
            appendFloatingBotMessage('⚠️ Request timed out. Please try again.', 'error-message');
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }, 30000);

        // Send to API
        fetch('chatbot_api.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(res => {
            console.log('Response status:', res.status);
            clearTimeout(requestTimeout);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.text();
        })
        .then(text => {
            console.log('Raw response:', text.substring(0, 200));
            hideFloatingTypingIndicator();

            if (!text || text.trim() === '') {
                throw new Error('Empty response from server');
            }

            let data;
            try {
                data = JSON.parse(text);
                console.log('Parsed JSON:', data);
            } catch (e) {
                console.error('JSON parse error:', e);
                console.error('Response text:', text);
                throw new Error('Invalid response from server');
            }

            // Handle response
            if (data.error) {
                console.error('API error:', data.error);

                let errorMsg = '⚠️ Sorry, I encountered an error. Please try again.';

                if (data.error === 'rate_limit') {
                    errorMsg = '⏳ Too many requests. Please wait a moment and try again.';
                } else if (data.reply) {
                    errorMsg = data.reply;
                } else if (data.debug_message) {
                    errorMsg = '⚠️ ' + data.debug_message;
                }

                appendFloatingBotMessage(errorMsg, 'error-message');
            }
            else if (data.reply) {
                console.log('Bot reply:', data.reply.substring(0, 100));

                if (!data.reply || data.reply.trim() === '') {
                    appendFloatingBotMessage('⚠️ I couldn\'t generate a proper response. Please try rephrasing your question.', 'error-message');
                    return;
                }

                // Check if restricted
                if (data.is_restricted) {
                    appendFloatingBotMessage('⚠️ ' + data.reply, 'restricted-message');
                } else {
                    appendFloatingBotMessage(data.reply);
                }
            }
            else {
                console.error('No reply or error in response:', data);
                appendFloatingBotMessage('⚠️ Sorry, I couldn\'t generate a response. Please try again.', 'error-message');
            }
        })
        .catch(error => {
            clearTimeout(requestTimeout);
            hideFloatingTypingIndicator();

            console.error('Fetch error:', error);

            let errorMsg = '⚠️ Connection error. Please check your internet and try again.';
            if (error.message.includes('timeout')) {
                errorMsg = '⚠️ Request timed out. Please try again.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMsg = '⚠️ Cannot connect to server. Please check your connection.';
            } else if (error.message.includes('Invalid response')) {
                errorMsg = '⚠️ Server returned invalid response. Please try again.';
            }

            appendFloatingBotMessage(errorMsg, 'error-message');
        })
        .finally(() => {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
            console.log('Request completed');
        });
    }

    // Quick action buttons
    function setupQuickActions() {
        const quickButtons = document.querySelectorAll('.quick-action-btn');
        quickButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const message = this.getAttribute('data-message');
                if (message) {
                    document.getElementById('floating-user-message').value = message;
                    sendFloatingMessage();
                }
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }

    function initChatbot() {
        const input = document.getElementById('floating-user-message');
        const sendBtn = document.getElementById('floating-send-btn');

        // Enter key to send
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendFloatingMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', sendFloatingMessage);
        }

        // Setup quick action buttons
        setupQuickActions();

        console.log('✅ Floating chatbot initialized');
        console.log('Session ID:', sessionId);
        console.log('Patient ID:', patientId || 'guest');
    }

})();
