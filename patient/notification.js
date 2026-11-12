// Filter notifications
function filterNotifications() {
    const filterType = document.getElementById('filterType').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const notificationCards = document.querySelectorAll('.notification-card');

    let visibleCount = 0;

    notificationCards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        const cardStatus = card.getAttribute('data-status');

        let showCard = true;

        // Filter by type
        if (filterType !== 'all' && cardType !== filterType) {
            showCard = false;
        }

        // Filter by status
        if (filterStatus !== 'all' && cardStatus !== filterStatus) {
            showCard = false;
        }

        if (showCard) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Handle date labels
    const dateGroups = document.querySelectorAll('.notification-date-group');
    dateGroups.forEach(group => {
        const visibleCardsInGroup = group.querySelectorAll('.notification-card[style=""], .notification-card:not([style*="display: none"])');
        if (visibleCardsInGroup.length === 0) {
            group.style.display = 'none';
        } else {
            group.style.display = '';
        }
    });

    // Show empty state if no results
    const container = document.querySelector('.notifications-container');
    let emptyState = container.querySelector('.empty-state-filter');

    if (visibleCount === 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-state empty-state-filter';
            emptyState.innerHTML = `
                <div class="empty-icon">🔍</div>
                <h3>No Notifications Found</h3>
                <p>Try adjusting your filters to see more results</p>
            `;
            container.appendChild(emptyState);
        }
        emptyState.style.display = 'block';
    } else if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        const formData = new FormData();
        formData.append('action', 'mark_read');
        formData.append('notification_id', notificationId);

        const response = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const notificationCard = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationCard) {
                notificationCard.classList.remove('unread');
                notificationCard.classList.add('read');
                notificationCard.setAttribute('data-status', 'read');

                // Remove unread badge
                const unreadBadge = notificationCard.querySelector('.unread-badge');
                if (unreadBadge) {
                    unreadBadge.remove();
                }

                // Remove mark as read button
                const markReadBtn = notificationCard.querySelector('.notification-actions .btn-action:not(.delete)');
                if (markReadBtn) {
                    markReadBtn.remove();
                }

                // Update stats
                updateStats();
            }

            showNotification('Notification marked as read', 'success');
        } else {
            showNotification('Failed to mark notification as read', 'error');
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showNotification('An error occurred', 'error');
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    if (!confirm('Mark all notifications as read?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'mark_all_read');

        const response = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Update all unread cards
            const unreadCards = document.querySelectorAll('.notification-card.unread');
            unreadCards.forEach(card => {
                card.classList.remove('unread');
                card.classList.add('read');
                card.setAttribute('data-status', 'read');

                // Remove unread badge
                const unreadBadge = card.querySelector('.unread-badge');
                if (unreadBadge) {
                    unreadBadge.remove();
                }

                // Remove mark as read button
                const markReadBtn = card.querySelector('.notification-actions .btn-action:not(.delete)');
                if (markReadBtn) {
                    markReadBtn.remove();
                }
            });

            // Update stats
            updateStats();

            // Remove "Mark All as Read" button
            const markAllBtn = document.querySelector('.header-actions .btn-primary');
            if (markAllBtn && markAllBtn.textContent.includes('Mark All')) {
                markAllBtn.remove();
            }

            showNotification('All notifications marked as read', 'success');
        } else {
            showNotification('Failed to mark all notifications as read', 'error');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showNotification('An error occurred', 'error');
    }
}

// Delete notification
async function deleteNotification(notificationId) {
    if (!confirm('Are you sure you want to delete this notification?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('notification_id', notificationId);

        const response = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const notificationCard = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationCard) {
                // Add removing animation
                notificationCard.classList.add('removing');

                // Remove after animation
                setTimeout(() => {
                    const parentGroup = notificationCard.closest('.notification-date-group');
                    notificationCard.remove();

                    // Check if date group is now empty
                    if (parentGroup) {
                        const remainingCards = parentGroup.querySelectorAll('.notification-card');
                        if (remainingCards.length === 0) {
                            parentGroup.remove();
                        }
                    }

                    // Check if all notifications are gone
                    const allCards = document.querySelectorAll('.notification-card');
                    if (allCards.length === 0) {
                        showEmptyState();
                    }

                    // Update stats
                    updateStats();
                }, 400);
            }

            showNotification('Notification deleted successfully', 'success');
        } else {
            showNotification('Failed to delete notification', 'error');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showNotification('An error occurred', 'error');
    }
}

// Update statistics
function updateStats() {
    const allCards = document.querySelectorAll('.notification-card');
    const unreadCards = document.querySelectorAll('.notification-card.unread');
    const appointmentCards = document.querySelectorAll('.notification-card[data-type="appointment"]');
    const reminderCards = document.querySelectorAll('.notification-card[data-type="reminder"]');

    // Update stat cards
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards[0]) {
        statCards[0].querySelector('h3').textContent = allCards.length;
    }
    if (statCards[1]) {
        statCards[1].querySelector('h3').textContent = unreadCards.length;
    }
    if (statCards[2]) {
        statCards[2].querySelector('h3').textContent = appointmentCards.length;
    }
    if (statCards[3]) {
        statCards[3].querySelector('h3').textContent = reminderCards.length;
    }
}

// Show empty state
function showEmptyState() {
    const container = document.querySelector('.notifications-container');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🔔</div>
            <h3>No Notifications Yet</h3>
            <p>You're all caught up! New notifications will appear here.</p>
        </div>
    `;
}

// Show notification toast
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        min-width: 300px;
    `;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">${icons[type] || icons.info}</span>
            <span style="font-weight: 500;">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize animations
function initAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
    });

    // Animate notification cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeIn 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.notification-card').forEach(card => {
        observer.observe(card);
    });
}

// Auto-refresh notifications (check for new notifications every 30 seconds)
let autoRefreshInterval;

function startAutoRefresh() {
    autoRefreshInterval = setInterval(async () => {
        try {
            const response = await fetch(window.location.href);
            const html = await response.text();

            // Parse the response to check for new notifications
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const currentCount = document.querySelectorAll('.notification-card').length;
            const newCount = doc.querySelectorAll('.notification-card').length;

            // If there are new notifications, show a subtle indicator
            if (newCount > currentCount) {
                showNewNotificationIndicator();
            }
        } catch (error) {
            console.error('Error checking for new notifications:', error);
        }
    }, 30000); // Check every 30 seconds
}

function showNewNotificationIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'new-notification-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1999;
        background: var(--gradient-primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
    `;

    indicator.innerHTML = `
        <span style="font-size: 1.25rem;">🔔</span>
        <span>New notifications available</span>
        <button style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            margin-left: 0.5rem;
        ">Refresh</button>
    `;

    indicator.onclick = () => {
        window.location.reload();
    };

    document.body.appendChild(indicator);

    setTimeout(() => {
        indicator.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => indicator.remove(), 300);
    }, 10000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + A to mark all as read
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.querySelectorAll('.notification-card.unread').length > 0) {
        e.preventDefault();
        markAllAsRead();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Notification management initialized');
    initAnimations();
    startAutoRefresh();

    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    });
});
