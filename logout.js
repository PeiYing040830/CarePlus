document.addEventListener('DOMContentLoaded', function() {
    // Start progress bar animation
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.transition = 'width 3s ease-in-out';
        progressFill.style.width = '100%';
    }

    // Animate logout icon
    const logoutIcon = document.querySelector('.logout-icon');
    if (logoutIcon) {
        logoutIcon.style.animation = 'wave 1s ease-in-out 3';
    }

    // Add pulse animation to spinner
    const spinner = document.querySelector('.spinner');
    if (spinner) {
        spinner.style.animation = 'spin 1s linear infinite';
    }
});

// Auto-redirect after 3 seconds
setTimeout(() => {
    window.location.href = 'index.html';
}, 3000);

// Show manual redirect button after 4 seconds if auto-redirect fails
setTimeout(() => {
    const manualRedirect = document.getElementById('manualRedirect');
    if (manualRedirect) {
        manualRedirect.style.display = 'block';
        manualRedirect.style.animation = 'fadeIn 0.5s ease-in-out';
    }
}, 4000);

// Add fade-out effect before redirect
setTimeout(() => {
    const container = document.querySelector('.logout-container');
    if (container) {
        container.style.transition = 'opacity 0.5s ease';
        container.style.opacity = '0';
    }
}, 2500);

// Change redirect text countdown
let countdown = 3;
const redirectText = document.querySelector('.redirect-text');

if (redirectText) {
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            redirectText.textContent = `Redirecting in ${countdown} second${countdown !== 1 ? 's' : ''}...`;
        } else {
            redirectText.textContent = 'Redirecting now...';
            clearInterval(countdownInterval);
        }
    }, 1000);
}

// Prevent back button after logout
window.history.pushState(null, '', window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
};

// Clear any cached data
if ('caches' in window) {
    caches.keys().then(function(names) {
        names.forEach(function(name) {
            caches.delete(name);
        });
    });
}

// Add animation keyframes dynamically if not in CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes wave {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-15deg); }
        75% { transform: rotate(15deg); }
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
