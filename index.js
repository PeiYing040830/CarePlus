// Chatbot Toggle
const chatbotBtn = document.getElementById("chatbot-btn");
const chatbotBox = document.getElementById("chatbot-box");
const chatArea = document.getElementById("chat-area");

if (chatbotBtn) {
    chatbotBtn.onclick = () => {
        chatbotBox.style.display = chatbotBox.style.display === "flex" ? "none" : "flex";

        if (chatArea.children.length === 0) {
            appendBot("👋 Hi! I'm your CarePlus Assistant. How can I help you today?");
        }
    };
}

const closeBtn = document.querySelector(".chatbot-close");
if (closeBtn) {
    closeBtn.onclick = () => {
        chatbotBox.style.display = "none";
    };
}

// Send message
const sendBtn = document.getElementById("chat-send");
const chatInput = document.getElementById("chat-input");

if (sendBtn) {
    sendBtn.onclick = sendMessage;
}

if (chatInput) {
    chatInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") sendMessage();
    });
}

function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    appendUser(text);
    input.value = "";

    const loadingId = appendBot("⏳ Typing...");

    fetch("chatbot_api.html", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            message: text,
            session_id: typeof session_id_php !== 'undefined' ? session_id_php : '',
            patient_id: typeof patient_id_php !== 'undefined' ? patient_id_php : null
        })
    })
        .then(res => {
            console.log("Response status:", res.status);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.text();
        })
        .then(text => {
            console.log("Raw response:", text);

            // Try to parse JSON
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("JSON parse error:", e);
                throw new Error("Invalid response format");
            }

            console.log("Parsed data:", data);

            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) {
                loadingElement.remove();
            }

            // Handle response based on your API structure
            if (data.error) {
                console.error("API Error:", data.error);
                appendBot("⚠️ " + (data.reply || data.debug_message || "Sorry, something went wrong"));
            } else if (data.reply) {
                // Format the reply with line breaks
                const formattedReply = data.reply.replace(/\n/g, '<br>');
                appendBotHTML(formattedReply);

                // Log additional info if available
                if (data.matched_scope) {
                    console.log("Matched scope:", data.matched_scope);
                }
                if (data.scope_category) {
                    console.log("Scope category:", data.scope_category);
                }
            } else {
                appendBot("⚠️ No response received");
            }
        })
        .catch(err => {
            console.error("Fetch error:", err);
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) {
                loadingElement.remove();
            }
            appendBot("⚠️ Connection error: " + err.message);
        });
}

function appendUser(msg) {
    const div = document.createElement("div");
    div.className = "user-message";
    div.textContent = msg;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendBot(msg) {
    const div = document.createElement("div");
    div.className = "bot-message";
    const id = "msg-" + Date.now();
    div.id = id;
    div.textContent = msg;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    return id;
}

function appendBotHTML(msg) {
    const div = document.createElement("div");
    div.className = "bot-message";
    const id = "msg-" + Date.now();
    div.id = id;
    div.innerHTML = msg;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    return id;
}
