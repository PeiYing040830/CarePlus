// Live Clock
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
    });
    const clockElement = document.getElementById('live-clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    }
}

// Welcome message based on time of day
function updateWelcomeMessage() {
    const hour = new Date().getHours();
    const welcomeText = document.querySelector('.welcome-text h1');

    if (welcomeText) {
        let greeting = "Welcome back";

        if (hour < 12) {
            greeting = "Good morning";
        } else if (hour < 18) {
            greeting = "Good afternoon";
        } else {
            greeting = "Good evening";
        }

        // Get patient name from data attribute
        const patientName = welcomeText.getAttribute('data-patient-name') || '';
        if (patientName) {
            welcomeText.innerHTML = `${greeting}, ${patientName}! 👋`;
        }
    }
}

// Check for today's appointments and show reminders
function checkTodaysAppointments() {
    const todayAppointmentsElement = document.getElementById('today-appointments-data');

    if (todayAppointmentsElement) {
        try {
            const todayAppointments = JSON.parse(todayAppointmentsElement.textContent);

            if (todayAppointments && todayAppointments.length > 0) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                todayAppointments.forEach(appointment => {
                    const appointmentTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
                    const appointmentHour = appointmentTime.getHours();
                    const appointmentMinute = appointmentTime.getMinutes();
                    const appointmentTotalMinutes = appointmentHour * 60 + appointmentMinute;

                    // If appointment is within the next hour
                    if (appointmentTotalMinutes > currentTime && appointmentTotalMinutes <= currentTime + 60) {
                        const minutesUntil = appointmentTotalMinutes - currentTime;
                        const doctorName = `Dr. ${appointment.doctor_fname} ${appointment.doctor_lname}`;

                        // Show gentle reminder
                        if (minutesUntil <= 30 && minutesUntil > 0) {
                            showAppointmentReminder(doctorName, minutesUntil);
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing today appointments:', e);
        }
    }
}

// Show appointment reminder notification
function showAppointmentReminder(doctorName, minutesUntil) {
    // Check if we already showed this reminder
    const reminderKey = `reminder_${doctorName}_${minutesUntil}`;
    if (sessionStorage.getItem(reminderKey)) {
        return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'appointment-reminder';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #fff8e1, #ffecb3);
        border: 2px solid var(--warning-orange);
        border-radius: 10px;
        padding: 1rem;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 300px;
        animation: slideInRight 0.5s ease;
    `;

    notification.innerHTML = `
        <h4 style="color: #e65100; margin-bottom: 0.5rem;">📅 Appointment Reminder</h4>
        <p style="margin-bottom: 0.5rem;">You have an appointment with <strong>${doctorName}</strong></p>
        <p style="color: #666; font-size: 0.9rem;">Starting in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 0.5rem; padding: 0.3rem 0.8rem; background: var(--warning-orange); color: white; border: none; border-radius: 5px; cursor: pointer;">
            Dismiss
        </button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 10000);

    // Mark as shown
    sessionStorage.setItem(reminderKey, 'true');
}

// Initialize smooth animations
function initAnimations() {
    // Add animation delays for cards
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Initialize click handlers
function initClickHandlers() {
    // Add click handlers for doctor cards
    document.querySelectorAll('.doctor-card').forEach(card => {
        card.addEventListener('click', function() {
            const doctorId = this.getAttribute('data-doctor-id');
            if (doctorId) {
                window.location.href = `appointment.html?doctor=${doctorId}`;
            }
        });
    });

    // Add notification click handlers
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            // Mark as read (visual only - in production, make AJAX call)
            this.classList.remove('unread');
            const badge = this.querySelector('.notification-badge');
            if (badge) {
                badge.style.display = 'none';
            }
        });
    });

    // Add click handlers for stat cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target) {
                window.location.href = target;
            }
        });
    });
}

// Add keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Don't trigger shortcuts if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + B for booking
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            window.location.href = 'appointment.html';
        }

        // Ctrl/Cmd + P for profile
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            window.location.href = 'profile.html';
        }

        // Ctrl/Cmd + M for medical records
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            window.location.href = 'medicalRecords.html';
        }

        // F5 to refresh dashboard data (simulated)
        if (e.key === 'F5') {
            e.preventDefault();
            console.log('Refreshing dashboard data...');
            // In production, you would fetch new data via AJAX
        }
    });
}

// Refresh dashboard data periodically
function initAutoRefresh() {
    // Auto-refresh appointments every 2 minutes
    setInterval(function() {
        console.log('Auto-refreshing dashboard...');
        // In a real application, you would fetch new data via AJAX
        // Example:
        // fetch('api/dashboard-data.html')
        //     .then(response => response.json())
        //     .then(data => updateDashboard(data));
    }, 120000);
}

// Update dashboard with new data (example function)
function updateDashboard(data) {
    // This is a template for updating the dashboard with new data
    console.log('Updating dashboard with new data:', data);
    // You would update specific elements here
}

// Initialize all functionality
function initDashboard() {
    console.log('Patient dashboard initialized');

    // Start live clock
    updateClock();
    setInterval(updateClock, 1000);

    // Update welcome message
    updateWelcomeMessage();

    // Initialize animations
    initAnimations();

    // Initialize click handlers
    initClickHandlers();

    // Initialize keyboard shortcuts
    initKeyboardShortcuts();

    // Initialize auto-refresh
    initAutoRefresh();

    // Check for appointment reminders
    checkTodaysAppointments();
    setInterval(checkTodaysAppointments, 60000); // Check every minute

    // Add CSS for slide in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Export functions for testing or modular use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateClock,
        updateWelcomeMessage,
        checkTodaysAppointments,
        showAppointmentReminder,
        initDashboard
    };
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);
