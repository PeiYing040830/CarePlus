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

        // Use full name from data attribute
        const doctorName = welcomeText.getAttribute('data-doctor-name') || '';
        if (doctorName) {
            welcomeText.innerHTML = `${greeting}, Dr. ${doctorName}! 👋`;
        }
    }
}

function highlightCurrentAppointment() {
    const now = new Date();
    const timelineItems = document.querySelectorAll('.timeline-item');

    timelineItems.forEach(item => {
        const timeStr = item.getAttribute('data-appointment-time'); // 你可以在 HTML 加这个属性
        if (!timeStr) return;

        const apptTime = new Date(`${new Date().toISOString().split('T')[0]}T${timeStr}`);
        const diff = Math.abs(apptTime - now);

        if (diff <= 30 * 60 * 1000) {
            item.classList.add('current');
        } else {
            item.classList.remove('current');
        }
    });
}

// Check for upcoming appointments and show reminders
function checkUpcomingAppointments() {
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

                    // If appointment is within the next 15 minutes
                    if (appointmentTotalMinutes > currentTime && appointmentTotalMinutes <= currentTime + 15) {
                        const minutesUntil = appointmentTotalMinutes - currentTime;
                        const patientName = `${appointment.patient_fname} ${appointment.patient_lname}`;

                        showAppointmentReminder(patientName, minutesUntil, appointment.appointment_id);
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing today appointments:', e);
        }
    }
}

// Show appointment reminder notification
function showAppointmentReminder(patientName, minutesUntil, appointmentId) {
    // Check if we already showed this reminder
    const reminderKey = `reminder_${appointmentId}_${minutesUntil}`;
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
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border: 2px solid var(--primary-blue);
        border-radius: 10px;
        padding: 1rem;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 300px;
        animation: slideInRight 0.5s ease;
    `;

    notification.innerHTML = `
        <h4 style="color: #1565c0; margin-bottom: 0.5rem;">📅 Appointment Reminder</h4>
        <p style="margin-bottom: 0.5rem;">Consultation with <strong>${patientName}</strong></p>
        <p style="color: #666; font-size: 0.9rem;">Starting in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 0.5rem; padding: 0.3rem 0.8rem; background: var(--primary-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
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

// Confirm appointment
function confirmAppointment(appointmentId) {
    if (confirm('Are you sure you want to confirm this appointment?')) {
        // Show loading state
        showNotification('Processing...', 'info');

        // Make AJAX request to confirm appointment
        fetch('ajax/confirm_appointment.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                appointment_id: appointmentId,
                action: 'confirm'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Appointment confirmed successfully!', 'success');
                // Reload page after short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification(data.message || 'Failed to confirm appointment', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    }
}

// Cancel appointment
function cancelAppointment(appointmentId) {
    const reason = prompt('Please provide a reason for cancellation (optional):');

    if (reason !== null) {  // User didn't click cancel on prompt
        // Show loading state
        showNotification('Processing...', 'info');

        // Make AJAX request to cancel appointment
        fetch('ajax/cancel_appointment.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                appointment_id: appointmentId,
                action: 'cancel',
                reason: reason
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Appointment cancelled successfully!', 'success');
                // Reload page after short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification(data.message || 'Failed to cancel appointment', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    }
}

// Show notification toast
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.toast-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type}`;

    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;

    notification.innerHTML = `
        <span style="font-size: 1.2rem;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Initialize smooth animations
function initAnimations() {
    // Add animation delays for cards
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}


// Update Next Appointment Countdown
function updateNextAppointmentCountdown() {
    const countdownElement = document.querySelector('.next-appointment-countdown .countdown-time');
    const todayAppointmentsElement = document.getElementById('today-appointments-data');

    if (!countdownElement || !todayAppointmentsElement) return;

    try {
        const todayAppointments = JSON.parse(todayAppointmentsElement.textContent);
        const now = new Date();
        let nextAppt = null;

        for (const appt of todayAppointments) {
            const apptTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
            if (apptTime > now) {
                nextAppt = apptTime;
                break;
            }
        }

        if (nextAppt) {
            const diffMs = nextAppt - now;
            const diffMinutes = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            countdownElement.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else {
            countdownElement.textContent = 'No upcoming appointments';
        }
    } catch (e) {
        console.error('Error updating countdown:', e);
    }
}

// Initialize click handlers
function initClickHandlers() {
    // Add click handlers for patient cards
    document.querySelectorAll('.patient-card').forEach(card => {
        card.addEventListener('click', function() {
            const patientId = this.getAttribute('data-patient-id');
            if (patientId) {
                window.location.href = `patient_details.html?id=${patientId}`;
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

    // Add click handlers for appointment items
    document.querySelectorAll('.appointment-item').forEach(item => {
        // Prevent event bubbling from buttons
        const buttons = item.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Click on appointment item to view details
        item.addEventListener('click', function() {
            const appointmentId = this.getAttribute('data-appointment-id');
            if (appointmentId) {
                window.location.href = `appointment_details.html?id=${appointmentId}`;
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

        // Ctrl/Cmd + A for appointments
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            window.location.href = 'appointments.html';
        }

        // Ctrl/Cmd + P for patients
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            window.location.href = 'patients.html';
        }

        // Ctrl/Cmd + M for profile
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            window.location.href = 'profile.html';
        }

        // F5 to refresh dashboard data
        if (e.key === 'F5') {
            e.preventDefault();
            console.log('Refreshing dashboard data...');
            // In production, you would fetch new data via AJAX
            window.location.reload();
        }
    });
}

// Refresh dashboard data periodically
function initAutoRefresh() {
    // Auto-refresh appointments every 5 minutes
    setInterval(function() {
        console.log('Auto-checking for updates...');
        checkUpcomingAppointments();
    }, 300000); // 5 minutes
}

// Update dashboard with new data (example function)
function updateDashboard(data) {
    // This is a template for updating the dashboard with new data
    console.log('Updating dashboard with new data:', data);

    // Example: Update appointment counts
    if (data.stats) {
        document.querySelector('.stat-card[data-target="appointments.html"] .stat-info h3').textContent = data.stats.today || 0;
        // Update other stats...
    }
}

// Calculate time until next appointment
function getTimeUntilNextAppointment() {
    const todayAppointmentsElement = document.getElementById('today-appointments-data');

    if (todayAppointmentsElement) {
        try {
            const todayAppointments = JSON.parse(todayAppointmentsElement.textContent);

            if (todayAppointments && todayAppointments.length > 0) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                // Find next appointment
                for (const appointment of todayAppointments) {
                    const appointmentTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
                    const appointmentHour = appointmentTime.getHours();
                    const appointmentMinute = appointmentTime.getMinutes();
                    const appointmentTotalMinutes = appointmentHour * 60 + appointmentMinute;

                    if (appointmentTotalMinutes > currentTime) {
                        const minutesUntil = appointmentTotalMinutes - currentTime;
                        const hours = Math.floor(minutesUntil / 60);
                        const minutes = minutesUntil % 60;

                        const patientName = `${appointment.patient_fname} ${appointment.patient_lname}`;
                        console.log(`Next appointment: ${patientName} in ${hours}h ${minutes}m`);
                        return { patientName, hours, minutes };
                    }
                }
            }
        } catch (e) {
            console.error('Error calculating next appointment time:', e);
        }
    }

    return null;
}

// Initialize all functionality
function initDashboard() {
    console.log('Doctor dashboard initialized');

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
    checkUpcomingAppointments();
    setInterval(checkUpcomingAppointments, 60000); // Check every minute
    setInterval(updateNextAppointmentCountdown, 1000);
    setInterval(highlightCurrentAppointment, 60000);
    highlightCurrentAppointment();

    // Log next appointment
    const nextAppt = getTimeUntilNextAppointment();
    if (nextAppt) {
        console.log(`Next appointment with ${nextAppt.patientName} in ${nextAppt.hours}h ${nextAppt.minutes}m`);
    }

    // Add CSS for slide in animation and toast notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .appointment-reminder,
        .toast-notification {
            animation: slideInRight 0.5s ease;
        }

        @media print {
            .appointment-reminder,
            .toast-notification {
                display: none;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export functions for testing or modular use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateClock,
        updateWelcomeMessage,
        checkUpcomingAppointments,
        showAppointmentReminder,
        confirmAppointment,
        cancelAppointment,
        showNotification,
        getTimeUntilNextAppointment,
        initDashboard
    };
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);
