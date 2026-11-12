// Session configuration
const sessionId = typeof session_id_php !== 'undefined' ? session_id_php : 'demo_session';
const patientId = typeof patient_id_php !== 'undefined' ? patient_id_php : null;
const isLoggedIn = typeof is_logged_in !== 'undefined' ? is_logged_in : false;

/* Send message function */
function sendMessage() {
    const input = document.getElementById("userMessage");
    const sendBtn = document.getElementById("sendBtn");
    const text = input.value.trim();

    if (!text) return;

    // Disable input while processing
    input.disabled = true;
    sendBtn.disabled = true;

    // Display user message
    appendUserMessage(text);

    // Clear input
    input.value = "";

    // Show typing indicator
    showTypingIndicator();

    console.log("Sending message:", text);

    // Set timeout for long requests
    const requestTimeout = setTimeout(() => {
        hideTypingIndicator();
        appendBotMessage("⚠️ Request timed out. Please try again.", "error-message");
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }, 30000);

    // Send to API
    fetch("chatbot_api.html", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            message: text,
            session_id: sessionId,
            patient_id: patientId,
            user_type: typeof userType !== 'undefined' ? userType : 'guest'
        })
    })
    .then(res => {
        console.log("Response status:", res.status);
        clearTimeout(requestTimeout);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text();
    })
    .then(text => {
        console.log("Raw response:", text.substring(0, 200));
        hideTypingIndicator();

        if (!text || text.trim() === '') {
            throw new Error("Empty response from server");
        }

        let data;
        try {
            data = JSON.parse(text);
            console.log("Parsed JSON:", data);
        } catch (e) {
            console.error("JSON parse error:", e);
            throw new Error("Invalid response from server");
        }

        // Handle response
        if (data.error) {
            console.error("API error:", data.error);

            let errorMsg = "Sorry, I encountered an error. Please try again.";

            if (data.error === 'rate_limit') {
                errorMsg = "⏳ Too many requests. Please wait a moment and try again.";
            } else if (data.reply) {
                errorMsg = data.reply;
            } else {
                errorMsg = "⚠️ " + data.error;
            }

            appendBotMessage(errorMsg, "error-message");
        }
        else if (data.reply) {
            console.log("Bot reply:", data.reply.substring(0, 100));
            console.log("Chatbot ID:", data.chatbot_id);
            console.log("Knowledge ID:", data.knowledge_id);

            if (!data.reply || data.reply.trim() === '') {
                appendBotMessage("⚠️ I couldn't generate a proper response. Please try rephrasing your question.", "error-message");
                return;
            }

            // Check if restricted
            if (data.is_restricted) {
                appendBotMessage("⚠️ " + data.reply, "restricted-message");
            } else {
                appendBotMessage(data.reply, "");
            }

            // Log scope info
            if (data.matched_scope) {
                console.log("Matched scope:", data.matched_scope);
                console.log("Category:", data.scope_category);
            }
        }
        else {
            console.error("No reply or error in response:", data);
            appendBotMessage("⚠️ Sorry, I couldn't generate a response. Please try again.", "error-message");
        }
    })
    .catch(error => {
        clearTimeout(requestTimeout);
        hideTypingIndicator();

        console.error("Fetch error:", error);

        let errorMsg = "⚠️ Connection error. Please check your internet and try again.";
        if (error.message.includes('timeout')) {
            errorMsg = "⚠️ Request timed out. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMsg = "⚠️ Cannot connect to server. Please check your connection.";
        }

        appendBotMessage(errorMsg, "error-message");
    })
    .finally(() => {
        // Always re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
        console.log("Request completed");
    });
}

/* Send quick action message */
function sendQuickMessage(message) {
    document.getElementById("userMessage").value = message;
    sendMessage();
}

/* Append user message to chatbox */
function appendUserMessage(text) {
    const chatbox = document.getElementById("chatbox");
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper user";
    wrapper.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <div class="message-bubble">${escapeHtml(text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    chatbox.appendChild(wrapper);
    scrollToBottom();
}

/* Append bot message to chatbox */
function appendBotMessage(text, messageClass = "") {
    const chatbox = document.getElementById("chatbox");
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // Format message with line breaks
    const formattedText = escapeHtml(text).replace(/\n/g, '<br>');

    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper bot ${messageClass}`;

    wrapper.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble">${formattedText}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    chatbox.appendChild(wrapper);
    scrollToBottom();
}

/* Show typing indicator */
function showTypingIndicator() {
    const chatbox = document.getElementById("chatbox");
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper bot";
    wrapper.id = "typing-indicator";
    wrapper.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content"><br>
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
    scrollToBottom();
}

/* Hide typing indicator */
function hideTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
        indicator.remove();
    }
}

/* Scroll chatbox to bottom */
function scrollToBottom() {
    const chatbox = document.getElementById("chatbox");
    chatbox.scrollTop = chatbox.scrollHeight;
}

/* Escape HTML to prevent XSS */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* Close chat */
function closeChat() {
    if (confirm("Are you sure you want to close the chat?")) {
        window.location.href = "index.html";
    }
}

/* Initialize on page load */
document.addEventListener("DOMContentLoaded", function() {
    const input = document.getElementById("userMessage");
    const sendBtn = document.getElementById("sendBtn");

    // Enter key to send message
    if (input) {
        input.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Focus on input
        input.focus();
    }

    console.log("Chatbot initialized successfully");
    console.log("Session ID:", sessionId);
    console.log("Patient ID:", patientId);
    console.log("Logged in:", isLoggedIn);
});

/* Handle page visibility changes */
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        console.log("Page visible - chatbot ready");
        const input = document.getElementById("userMessage");
        if (input && !input.disabled) {
            input.focus();
        }
    }
});
