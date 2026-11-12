// CarePlus Password Reset Enhancement Script
document.addEventListener('DOMContentLoaded', function() {

    // OTP Input Auto-Focus & Navigation
    const otpInputs = document.querySelectorAll('.otp-input');
    if (otpInputs.length > 0) {
        otpInputs.forEach((input, index) => {
            // Auto-focus next input
            input.addEventListener('input', function(e) {
                const value = this.value;

                // Only allow digits
                if (value && !/^\d$/.test(value)) {
                    this.value = '';
                    return;
                }

                // Move to next input
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            // Handle backspace
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            // Handle paste
            input.addEventListener('paste', function(e) {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').trim();
                const digits = pastedData.replace(/\D/g, '').slice(0, 6);

                digits.split('').forEach((digit, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = digit;
                    }
                });

                if (otpInputs[digits.length - 1]) {
                    otpInputs[digits.length - 1].focus();
                }
            });
        });

        // Focus first OTP input on load
        otpInputs[0].focus();
    }

    // Password Strength Indicator
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm_password');
    const strengthIndicator = document.getElementById('strengthIndicator');

    if (passwordInput && strengthIndicator) {
        let strengthTimeout;

        passwordInput.addEventListener('input', function() {
            clearTimeout(strengthTimeout);
            const password = this.value;

            if (password.length < 4) {
                strengthIndicator.className = 'strength-indicator';
                strengthIndicator.innerHTML = `
                    <div class="strength-header">
                        <span>🔒</span>
                        <span class="strength-label">PASSWORD STRENGTH</span>
                    </div>
                    <p class="strength-text">Analysis active...</p>
                `;
                return;
            }

            // Show loading state
            strengthIndicator.style.opacity = '0.6';

            strengthTimeout = setTimeout(() => {
                const strength = analyzePasswordStrength(password);
                updateStrengthUI(strength);
                strengthIndicator.style.opacity = '1';
            }, 500);
        });

        // Password match validation
        if (confirmInput) {
            confirmInput.addEventListener('input', function() {
                const password = passwordInput.value;
                const confirm = this.value;

                if (confirm && password !== confirm) {
                    this.classList.add('input-error');
                    const errorMsg = document.getElementById('confirm-error');
                    if (errorMsg) {
                        errorMsg.textContent = 'Passwords do not match';
                        errorMsg.style.display = 'block';
                    }
                } else {
                    this.classList.remove('input-error');
                    const errorMsg = document.getElementById('confirm-error');
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                }
            });
        }
    }

    function analyzePasswordStrength(password) {
        let score = 0;
        let feedback = '';
        let strength = 'weak';

        // Length check
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;

        // Determine strength
        if (score <= 2) {
            strength = 'weak';
            feedback = 'This password needs more complexity to protect patient data securely.';
        } else if (score <= 4) {
            strength = 'moderate';
            feedback = 'A decent choice, but consider adding more character variety for enhanced security.';
        } else if (score <= 5) {
            strength = 'strong';
            feedback = 'Strong password! Your account will be well-protected against unauthorized access.';
        } else {
            strength = 'excellent';
            feedback = 'Excellent security choice! This password meets all recommended healthcare standards.';
        }

        return { strength, feedback, score };
    }

    function updateStrengthUI(analysis) {
        const barCount = analysis.strength === 'weak' ? 1 :
                        analysis.strength === 'moderate' ? 2 :
                        analysis.strength === 'strong' ? 3 : 4;

        const colors = {
            weak: '#ef4444',
            moderate: '#f59e0b',
            strong: '#10b981',
            excellent: '#3b82f6'
        };

        strengthIndicator.className = `strength-indicator ${analysis.strength}`;
        strengthIndicator.style.color = colors[analysis.strength];

        strengthIndicator.innerHTML = `
            <div class="strength-header">
                <span>🔒</span>
                <span class="strength-label">PASSWORD STRENGTH</span>
            </div>
            <p class="strength-text" style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem; text-transform: capitalize;">
                ${analysis.strength}
            </p>
            <p class="strength-text" style="font-style: italic; font-size: 0.8rem;">
                "${analysis.feedback}"
            </p>
            <div class="strength-bars">
                ${[1, 2, 3, 4].map(i => `
                    <div class="strength-bar ${i <= barCount ? 'active' : ''}"></div>
                `).join('')}
            </div>
        `;
    }

    // Email Validation
    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput) {
        const emailError = document.getElementById('email-error');

        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (email && !emailRegex.test(email)) {
                this.classList.add('input-error');
                if (emailError) {
                    emailError.textContent = 'Please enter a valid email address';
                    emailError.style.display = 'block';
                }
            } else {
                this.classList.remove('input-error');
                if (emailError) {
                    emailError.style.display = 'none';
                }
            }
        });

        // Email domain suggestions
        const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'qiu.edu.my'];
        let suggestionDiv = null;

        emailInput.addEventListener('input', function() {
            const value = this.value.trim();
            const atIndex = value.indexOf('@');

            // Remove existing suggestion
            if (suggestionDiv) {
                suggestionDiv.remove();
                suggestionDiv = null;
            }

            // Clear error on input
            if (this.classList.contains('input-error')) {
                this.classList.remove('input-error');
                const errorMsg = document.getElementById('email-error');
                if (errorMsg) errorMsg.style.display = 'none';
            }

            // Show suggestion if @ is typed but domain is incomplete
            if (atIndex !== -1 && atIndex < value.length - 1) {
                const domain = value.substring(atIndex + 1);
                const matchedDomain = commonDomains.find(d => d.startsWith(domain) && d !== domain);

                if (matchedDomain) {
                    suggestionDiv = document.createElement('div');
                    suggestionDiv.style.cssText = `
                        margin-top: 0.5rem;
                        font-size: 0.875rem;
                        color: #64748b;
                        cursor: pointer;
                        transition: color 0.3s ease;
                    `;
                    suggestionDiv.textContent = `Did you mean ${value.substring(0, atIndex + 1)}${matchedDomain}?`;

                    suggestionDiv.addEventListener('mouseenter', function() {
                        this.style.color = '#f59e0b';
                    });

                    suggestionDiv.addEventListener('mouseleave', function() {
                        this.style.color = '#64748b';
                    });

                    suggestionDiv.addEventListener('click', function() {
                        emailInput.value = value.substring(0, atIndex + 1) + matchedDomain;
                        this.remove();
                        suggestionDiv = null;
                        emailInput.focus();
                    });

                    emailInput.parentElement.appendChild(suggestionDiv);
                }
            }
        });
    }

    // Form Loading States
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.disabled = true;
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '⏳ Processing...';

                // Re-enable if there are validation errors (handled by browser)
                setTimeout(() => {
                    if (!form.checkValidity()) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }, 100);
            }
        });
    });

    //  Auto-dismiss Alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close alert');
        closeBtn.style.cssText = `
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: inherit;
            opacity: 0.6;
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
            this.style.opacity = '0.6';
        });

        closeBtn.addEventListener('click', function() {
            alert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        });

        alert.appendChild(closeBtn);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 500);
        }, 10000);
    });

    //  Resend Timer
    const resendLink = document.getElementById('resendLink');
    if (resendLink && resendLink.href.includes('resend=1')) {
        let countdown = 60;
        const originalHref = resendLink.href;
        const originalText = resendLink.textContent;

        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';

        const timer = setInterval(() => {
            countdown--;
            resendLink.textContent = `Resend available in ${countdown}s`;

            if (countdown <= 0) {
                clearInterval(timer);
                resendLink.textContent = originalText;
                resendLink.href = originalHref;
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
            }
        }, 1000);
    }

    // Smooth scroll to alerts
    if (alerts.length > 0) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Button Ripple Effect
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
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

            setTimeout(() => ripple.remove(), 600);
        });
    });

});

// Forgot Password Page - Floating Chatbot Integration
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
                        👋 <strong>Hi! I'm here to help with password recovery.</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>🔐 Password reset help</li>
                            <li>🔒 Account security tips</li>
                            <li>📧 Login assistance</li>
                            <li>💡 General questions</li>
                        </ul>
                    </div>
                    <div class="message-time">Just now</div>
                </div>
            </div>

            <div class="quick-actions">
                <button class="quick-action-btn" data-message="I forgot my password, what should I do?">
                    🔐 Password Help
                </button>
                <button class="quick-action-btn" data-message="How do I reset my password?">
                    🔄 Reset Guide
                </button>
                <button class="quick-action-btn" data-message="I can't access my account">
                    🚪 Access Issues
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

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
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
