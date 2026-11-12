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

        // Get admin name from data attribute
        let adminName = welcomeText.getAttribute('data-admin-name');

        // Only update if we have a valid admin name
        if (adminName && adminName.trim() !== '') {
            welcomeText.innerHTML = `${greeting}, ${adminName}! ⚡`;
        } else {
            // Fallback: keep existing text but update greeting only
            const currentText = welcomeText.textContent;
            const nameMatch = currentText.match(/,\s*(.+?)!/);
            if (nameMatch && nameMatch[1]) {
                welcomeText.innerHTML = `${greeting}, ${nameMatch[1]}! ⚡`;
            } else {
                welcomeText.innerHTML = `${greeting}! ⚡`;
            }
        }
    }
}

// Show notification toast
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.toast-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type}`;

    const colors = {
        success: '#66BB6A',
        error: '#EF5350',
        warning: '#FF9800',
        info: '#42A5F5'
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

// Confirm dialog with custom styling
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Approve doctor registration
function approveDoctor(doctorId) {
    confirmAction('Are you sure you want to approve this doctor?', () => {
        showNotification('Processing...', 'info');

        fetch('ajax/approve_doctor.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                doctor_id: doctorId,
                action: 'approve'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Doctor approved successfully!', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(data.message || 'Failed to approve doctor', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    });
}

// Reject doctor registration
function rejectDoctor(doctorId) {
    const reason = prompt('Please provide a reason for rejection (optional):');

    if (reason !== null) {
        showNotification('Processing...', 'info');

        fetch('ajax/reject_doctor.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                doctor_id: doctorId,
                action: 'reject',
                reason: reason
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Doctor registration rejected', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(data.message || 'Failed to reject doctor', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    }
}

// Toggle user status (activate/suspend)
function toggleUserStatus(userId, userType, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'suspend';

    confirmAction(`Are you sure you want to ${action} this ${userType}?`, () => {
        showNotification('Processing...', 'info');

        fetch('ajax/toggle_user_status.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                user_type: userType,
                new_status: newStatus
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`${userType} ${action}d successfully!`, 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(data.message || `Failed to ${action} ${userType}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    });
}

// Delete user
function deleteUser(userId, userType) {
    confirmAction(`Are you sure you want to delete this ${userType}? This action cannot be undone.`, () => {
        showNotification('Processing...', 'info');

        fetch('ajax/delete_user.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                user_type: userType
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`${userType} deleted successfully!`, 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(data.message || `Failed to delete ${userType}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    });
}

// View user details
function viewUser(userId, userType) {
    window.location.href = `user_details.html?id=${userId}&type=${userType}`;
}

// Initialize smooth animations
function initAnimations() {
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Initialize click handlers
function initClickHandlers() {
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target) {
                window.location.href = target;
            }
        });
    });

    document.querySelectorAll('.activity-item').forEach(item => {
        const buttons = item.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        item.addEventListener('click', function() {
            const link = this.getAttribute('data-link');
            if (link) {
                window.location.href = link;
            }
        });
    });

    document.querySelectorAll('.list-item').forEach(item => {
        const buttons = item.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        item.addEventListener('click', function() {
            const link = this.getAttribute('data-link');
            if (link) {
                window.location.href = link;
            }
        });
    });
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            window.location.href = 'doctors.html';
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            window.location.href = 'patients.html';
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            window.location.href = 'appointments.html';
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            window.location.href = 'reports.html';
        }

        if (e.key === 'F5') {
            e.preventDefault();
            console.log('Refreshing dashboard...');
            window.location.reload();
        }
    });
}

// Refresh dashboard data periodically
function initAutoRefresh() {
    setInterval(function() {
        console.log('Auto-checking for updates...');
        checkForAlerts();
    }, 300000);
}

// Check for system alerts
function checkForAlerts() {
    console.log('Checking for system alerts...');

    const pendingCount = document.querySelector('[data-pending-count]');
    if (pendingCount) {
        const count = parseInt(pendingCount.textContent);
        if (count > 0) {
            console.log(`${count} pending doctor approval(s)`);
        }
    }
}

// Update dashboard with new data
function updateDashboard(data) {
    console.log('Updating dashboard with new data:', data);

    if (data.stats) {
        const statsCards = document.querySelectorAll('.stat-card');
        if (data.stats.doctors !== undefined) {
            const doctorCard = statsCards[0];
            if (doctorCard) {
                doctorCard.querySelector('.stat-info h3').textContent = data.stats.doctors;
            }
        }
    }

    if (data.alerts && data.alerts.length > 0) {
        showNotification(`${data.alerts.length} new alert(s)`, 'warning');
    }
}

// Generate sample chart (placeholder)
function initCharts() {
    const chartContainers = document.querySelectorAll('.chart-container');

    chartContainers.forEach(container => {
        const chartType = container.getAttribute('data-chart-type');
        console.log(`Initializing ${chartType} chart...`);
    });
}

// Export data functionality
function exportData(dataType) {
    showNotification(`Exporting ${dataType} data...`, 'info');

    setTimeout(() => {
        showNotification('Export completed!', 'success');
    }, 2000);
}

// Search functionality
function initSearch() {
    const searchInputs = document.querySelectorAll('input[type="search"]');

    searchInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const targetList = this.getAttribute('data-search-target');

            if (targetList) {
                const items = document.querySelectorAll(`.${targetList} .list-item, .${targetList} .activity-item`);

                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
}

// System health check
function checkSystemHealth() {
    console.log('Checking system health...');

    const healthIndicator = document.getElementById('system-health');
    if (healthIndicator) {
        healthIndicator.className = 'status-indicator status-healthy';
        healthIndicator.title = 'System operating normally';
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize all functionality
function initDashboard() {
    console.log('Admin dashboard initialized');

    updateClock();
    setInterval(updateClock, 1000);

    updateWelcomeMessage();

    initAnimations();
    initClickHandlers();
    initKeyboardShortcuts();
    initAutoRefresh();
    initSearch();
    initCharts();
    checkSystemHealth();
    checkForAlerts();

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .toast-notification {
            animation: slideInRight 0.5s ease;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }

        .status-healthy {
            background: #66BB6A;
            box-shadow: 0 0 0 3px rgba(102, 187, 106, 0.3);
        }

        .status-warning {
            background: #FF9800;
            box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.3);
        }

        .status-critical {
            background: #EF5350;
            box-shadow: 0 0 0 3px rgba(239, 83, 80, 0.3);
            animation: pulse 1s infinite;
        }

        @media print {
            .toast-notification,
            .btn-action {
                display: none;
            }
        }
    `;
    document.head.appendChild(style);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateClock,
        updateWelcomeMessage,
        showNotification,
        approveDoctor,
        rejectDoctor,
        toggleUserStatus,
        deleteUser,
        viewUser,
        initDashboard
    };
}

document.addEventListener('DOMContentLoaded', initDashboard);
