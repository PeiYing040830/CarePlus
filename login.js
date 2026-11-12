document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const passwordToggle = document.getElementById('passwordToggle');
    const userTypeInput = document.getElementById('user_type');
    const typeButtons = document.querySelectorAll('.type-btn');
    const logoIcon = document.getElementById('logoIcon');
    const registerLink = document.getElementById('registerLink');
    const errorAlert = document.getElementById('errorAlert');

    // Email validation
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show error message
    function showError(input, errorId, message) {
        const errorElement = document.getElementById(errorId);
        input.classList.add('input-error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    // Clear error message
    function clearError(input, errorId) {
        const errorElement = document.getElementById(errorId);
        input.classList.remove('input-error');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    // Email validation on blur
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();

        if (email === '') {
            showError(this, 'email-error', 'Email address is required');
        } else if (!validateEmail(email)) {
            showError(this, 'email-error', 'Please enter a valid email address');
        } else {
            clearError(this, 'email-error');
        }
    });

    // Clear email error on input
    emailInput.addEventListener('input', function() {
        if (this.classList.contains('input-error')) {
            const email = this.value.trim();
            if (email !== '' && validateEmail(email)) {
                clearError(this, 'email-error');
            }
        }
    });

    // Password validation on blur
    passwordInput.addEventListener('blur', function() {
        const password = this.value;

        if (password === '') {
            showError(this, 'password-error', 'Password is required');
        } else if (password.length < 6) {
            showError(this, 'password-error', 'Password must be at least 6 characters');
        } else {
            clearError(this, 'password-error');
        }
    });

    // Clear password error on input
    passwordInput.addEventListener('input', function() {
        if (this.classList.contains('input-error')) {
            const password = this.value;
            if (password !== '' && password.length >= 6) {
                clearError(this, 'password-error');
            }
        }
    });

    // Toggle password visibility
    passwordToggle.addEventListener('click', function() {
        const toggleIcon = document.getElementById('toggle-icon');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleIcon.textContent = '👁️';
        }
    });

    // User type toggle
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const icon = this.getAttribute('data-icon');

            // Update hidden input
            userTypeInput.value = type;

            // Update active button
            typeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Update logo icon
            logoIcon.textContent = icon;

            // Update logo background for admin
            if (type === 'admin') {
                logoIcon.classList.add('admin');
            } else {
                logoIcon.classList.remove('admin');
            }

            // Update register link
            registerLink.href = `registration.html?type=${type}`;
        });
    });

    // Form submission validation
    loginForm.addEventListener('submit', function(e) {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let isValid = true;

        // Validate email
        if (email === '') {
            showError(emailInput, 'email-error', 'Email address is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError(emailInput, 'email-error', 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(emailInput, 'email-error');
        }

        // Validate password
        if (password === '') {
            showError(passwordInput, 'password-error', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError(passwordInput, 'password-error', 'Password must be at least 6 characters');
            isValid = false;
        } else {
            clearError(passwordInput, 'password-error');
        }

        // Prevent submission if validation fails
        if (!isValid) {
            e.preventDefault();

            // Focus on first error field
            if (emailInput.classList.contains('input-error')) {
                emailInput.focus();
            } else if (passwordInput.classList.contains('input-error')) {
                passwordInput.focus();
            }

            return false;
        }

        // Show loading state
        submitBtn.textContent = '⏳ Logging in...';
        submitBtn.disabled = true;
    });

    // Add ripple effect to button
    submitBtn.addEventListener('click', function(e) {
        if (this.disabled) return;

        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            left: ${x}px;
            top: ${y}px;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // Auto-hide error alert after 8 seconds
    if (errorAlert) {
        // Add close button to alert
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: inherit;
            opacity: 0.7;
            transition: opacity 0.3s;
            line-height: 1;
            padding: 0;
            width: 24px;
            height: 24px;
        `;

        closeBtn.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
        });

        closeBtn.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
        });

        closeBtn.addEventListener('click', function() {
            errorAlert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            errorAlert.style.opacity = '0';
            errorAlert.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                errorAlert.remove();
            }, 300);
        });

        errorAlert.style.position = 'relative';
        errorAlert.appendChild(closeBtn);

        // Auto-hide after 8 seconds
        setTimeout(() => {
            errorAlert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            errorAlert.style.opacity = '0';
            errorAlert.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                errorAlert.remove();
            }, 500);
        }, 8000);
    }

    // Prevent multiple form submissions
    let isSubmitting = false;
    loginForm.addEventListener('submit', function(e) {
        if (isSubmitting) {
            e.preventDefault();
            return false;
        }
        isSubmitting = true;
    });

    // Enter key press on email moves to password
    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });

    // Email auto-completion suggestion
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    let suggestionElement = null;

    emailInput.addEventListener('input', function() {
        const value = this.value.trim();
        const atIndex = value.indexOf('@');

        // Remove existing suggestion
        if (suggestionElement) {
            suggestionElement.remove();
            suggestionElement = null;
        }

        // Show suggestion if @ is typed but domain is incomplete
        if (atIndex !== -1 && atIndex < value.length - 1) {
            const domain = value.substring(atIndex + 1);
            const matchedDomain = commonDomains.find(d => d.startsWith(domain) && d !== domain);

            if (matchedDomain) {
                suggestionElement = document.createElement('div');
                suggestionElement.style.cssText = `
                    color: #64748b;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    cursor: pointer;
                `;
                suggestionElement.textContent = `Did you mean ${value.substring(0, atIndex + 1)}${matchedDomain}?`;
                suggestionElement.addEventListener('click', function() {
                    emailInput.value = value.substring(0, atIndex + 1) + matchedDomain;
                    this.remove();
                    emailInput.focus();
                });
                emailInput.parentElement.appendChild(suggestionElement);
            }
        }
    });

    // Add smooth transitions to user type buttons
    typeButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateY(-2px)';
            }
        });

        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Focus management
    if (emailInput && !emailInput.value) {
        emailInput.focus();
    }
});

// ============================================================================
// FLOATING CHATBOT INTEGRATION (100% Same as Registration & Forgot Password)
// ============================================================================

(function () {
    'use strict';

    console.log('🤖 Floating Chatbot Loading...');

    let isChatOpen = false;

    // Get session info
    const sessionId = window.session_id_php || 'guest_session_' + Date.now();
    const patientId = window.patient_id_php || null;
    const userType = 'guest';

    console.log('📋 Chatbot Config:', {
        session_id: sessionId,
        patient_id: patientId,
        user_type: userType
    });

    // Remove old chatbot elements if they exist
    const oldBtn = document.getElementById('chatbot-btn');
    const oldBox = document.getElementById('chatbot-box');
    if (oldBtn) oldBtn.remove();
    if (oldBox) oldBox.remove();

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
                        👋 <strong>Hi! I'm here to help with login and account access.</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>🔐 Login assistance</li>
                            <li>🔒 Password recovery</li>
                            <li>📝 Registration help</li>
                            <li>❓ General questions</li>
                        </ul>
                    </div>
                    <div class="message-time">Just now</div>
                </div>
            </div>

            <div class="quick-actions">
                <button class="quick-action-btn" data-message="I forgot password">
                    🔐 Forgot Password
                </button>
                <button class="quick-action-btn" data-message="How do I register?">
                    📝 Registration
                </button>
                <button class="quick-action-btn" data-message="I can't login to my account">
                    🚪 Login Issues
                </button>
                <button class="quick-action-btn" data-message="Contact support">
                    📞 Support
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
            <small>
                Need help? I'm here 24/7 •
                <span style="color: #ef4444;">⚠️ For emergencies, call 999</span>
            </small>
        </div>
    `;

    // Append to body when DOM is ready
    function initializeChatbot() {
        document.body.appendChild(chatButton);
        document.body.appendChild(chatWindow);

        console.log('✅ Floating chatbot UI created');

        // Toggle chat window
        chatButton.addEventListener('click', toggleChat);
        document.getElementById('close-chat-btn').addEventListener('click', toggleChat);

        // Setup input handlers
        const input = document.getElementById('floating-user-message');
        const sendBtn = document.getElementById('floating-send-btn');

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
    }

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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function scrollFloatingToBottom() {
        const chatbox = document.getElementById('floating-chatbox');
        if (chatbox) {
            chatbox.scrollTop = chatbox.scrollHeight;
        }
    }

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

    function hideFloatingTypingIndicator() {
        const indicator = document.getElementById('floating-typing-indicator');
        if (indicator) indicator.remove();
    }

    function sendFloatingMessage() {
        const input = document.getElementById('floating-user-message');
        const sendBtn = document.getElementById('floating-send-btn');
        const text = input.value.trim();

        if (!text) return;

        console.log('📤 Sending message:', text.substring(0, 50));

        input.disabled = true;
        sendBtn.disabled = true;

        appendFloatingUserMessage(text);
        input.value = '';
        showFloatingTypingIndicator();

        const requestData = {
            message: text,
            session_id: sessionId,
            patient_id: patientId,
            user_type: userType
        };

        const requestTimeout = setTimeout(() => {
            hideFloatingTypingIndicator();
            appendFloatingBotMessage('⚠️ Request timed out. Please try again.', 'error-message');
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }, 30000);

        fetch('chatbot_api.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(res => {
            console.log('📥 Response status:', res.status);
            clearTimeout(requestTimeout);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.text();
        })
        .then(text => {
            console.log('📄 Raw response:', text.substring(0, 200));
            hideFloatingTypingIndicator();

            if (!text || text.trim() === '') {
                throw new Error('Empty response from server');
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ JSON parse error:', e);
                throw new Error('Invalid response from server');
            }

            if (data.error) {
                console.error('⚠️ API error:', data.error);
                let errorMsg = '⚠️ Sorry, I encountered an error. Please try again.';
                if (data.reply) errorMsg = data.reply;
                appendFloatingBotMessage(errorMsg, 'error-message');
            }
            else if (data.reply) {
                if (data.is_restricted) {
                    appendFloatingBotMessage('⚠️ ' + data.reply, 'restricted-message');
                } else {
                    appendFloatingBotMessage(data.reply);
                }
            }
            else {
                appendFloatingBotMessage('⚠️ Sorry, I couldn\'t generate a response.', 'error-message');
            }
        })
        .catch(error => {
            clearTimeout(requestTimeout);
            hideFloatingTypingIndicator();

            console.error('❌ Error:', error);

            let errorMsg = '⚠️ Connection error. Please check your internet.';
            if (error.message.includes('timeout')) {
                errorMsg = '⚠️ Request timed out. Please try again.';
            }

            appendFloatingBotMessage(errorMsg, 'error-message');
        })
        .finally(() => {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        });
    }

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
        document.addEventListener('DOMContentLoaded', initializeChatbot);
    } else {
        initializeChatbot();
    }

})();

// Add floating chatbot styles dynamically
const floatingChatStyles = document.createElement('style');
floatingChatStyles.textContent = `
/* Floating Chat Button */
.floating-chat-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    z-index: 9998;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.floating-chat-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.floating-chat-btn.hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0);
}

/* Floating Chat Window */
.floating-chat-window {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 380px;
    height: 600px;
    max-height: calc(100vh - 48px);
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.floating-chat-window.active {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: all;
}

.floating-chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 16px 16px 0 0;
}

.chat-header-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.chat-bot-avatar {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.chat-header-text h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: white;
}

.chat-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
}

.status-dot {
    width: 8px;
    height: 8px;
    background: #4ade80;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.chat-close-btn {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    line-height: 1;
}

.chat-close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
}

.floating-chatbox {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f9fafb;
    scroll-behavior: smooth;
}

.floating-chatbox::-webkit-scrollbar {
    width: 6px;
}

.floating-chatbox::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.message-wrapper {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    animation: messageSlideIn 0.3s ease;
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.message-wrapper.user {
    flex-direction: row-reverse;
}

.message-avatar {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 16px;
}

.message-wrapper.user .message-avatar {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.message-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.message-wrapper.user .message-content {
    align-items: flex-end;
}

.message-bubble {
    background: white;
    padding: 12px 16px;
    border-radius: 12px;
    max-width: 85%;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-wrapper.user .message-bubble {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    border-radius: 12px 12px 0 12px;
}

.message-wrapper.bot .message-bubble {
    border-radius: 12px 12px 12px 0;
}

.message-bubble ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
}

.message-bubble li {
    margin: 4px 0;
    font-size: 14px;
}

.message-time {
    font-size: 11px;
    color: #94a3b8;
    padding: 0 4px;
}

.error-message .message-bubble {
    background: #fee2e2;
    border-left: 3px solid #ef4444;
}

.restricted-message .message-bubble {
    background: #fef3c7;
    border-left: 3px solid #f59e0b;
}

.typing-indicator {
    display: flex;
    gap: 4px;
    padding: 8px 0;
}

.typing-dot {
    width: 8px;
    height: 8px;
    background: #667eea;
    border-radius: 50%;
    animation: typingDot 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typingDot {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
    }
    30% {
        transform: translateY(-10px);
        opacity: 1;
    }
}

.quick-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 12px;
}

.quick-action-btn {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    color: #374151;
}

.quick-action-btn:hover {
    background: #f3f4f6;
    border-color: #667eea;
    transform: translateY(-1px);
}

.floating-chat-input-wrapper {
    padding: 12px 16px;
    background: white;
    border-top: 1px solid #e5e7eb;
}

.floating-chat-input {
    display: flex;
    gap: 8px;
    align-items: center;
}

#floating-user-message {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
}

#floating-user-message:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

#floating-user-message:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
}

.floating-send-btn {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.floating-send-btn:hover:not(:disabled) {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.floating-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.floating-chat-footer {
    padding: 8px 16px;
    text-align: center;
    background: white;
    border-top: 1px solid #e5e7eb;
    font-size: 11px;
    color: #64748b;
}

@media (max-width: 768px) {
    .floating-chat-window {
        width: 90%;
        max-width: 420px;
        right: 5%;
        bottom: 16px;
    }

    .floating-chat-btn {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
        font-size: 24px;
    }

    .quick-actions {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 480px) {
    .floating-chat-window {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
    }

    .floating-chat-btn {
        width: 52px;
        height: 52px;
        bottom: 12px;
        right: 12px;
    }
}
`;
document.head.appendChild(floatingChatStyles);
