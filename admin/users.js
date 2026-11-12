function editUser(user) {
    // Populate with correct database keys
    document.getElementById('edit_user_id').value = user.user_id;
    document.getElementById('edit_email').value = user.email;
    document.getElementById('edit_first_name').value = user.first_name || '';
    document.getElementById('edit_last_name').value = user.last_name || '';
    document.getElementById('edit_phone').value = user.phone || '';
    document.getElementById('edit_role').value = user.user_type;

    const modal = document.getElementById('editModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openAddModal() {
    document.getElementById('addModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

function deleteUser(userId, email) {
    if (confirm(`Deactivate user ${email}?`)) {
        document.getElementById('delete_user_id').value = userId;
        document.getElementById('deleteForm').submit();
    }
}

function toggleStatus(userId, current) {
    const next = current === 'active' ? 'inactive' : 'active';
    if (confirm(`Change status to ${next}?`)) {
        document.getElementById('toggle_user_id').value = userId;
        document.getElementById('toggle_new_status').value = next;
        document.getElementById('toggleForm').submit();
    }
}

// Close on clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = 'auto';
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
        z-index: 10000;
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

// Export users to CSV
function exportUsersCSV() {
    showNotification('Preparing CSV export...', 'info');

    const rows = document.querySelectorAll('.users-table tbody tr');

    if (rows.length === 0) {
        showNotification('No users to export', 'warning');
        return;
    }

    // Prepare CSV data
    let csv = 'ID,Email,Name,Phone,Role,Status,Created\n';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const id = cells[0].textContent.trim();
        const email = cells[1].textContent.trim();
        const name = cells[2].textContent.trim();
        const phone = cells[3].textContent.trim();
        const role = cells[4].textContent.trim();
        const status = cells[5].textContent.trim();
        const created = cells[6].textContent.trim();

        csv += `"${id}","${email}","${name}","${phone}","${role}","${status}","${created}"\n`;
    });

    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('Users CSV exported successfully!', 'success');
}

// Export users to a professional PDF report (Direct Download - Portrait)
function exportUsersPDF() {
    showNotification('Preparing professional PDF report...', 'info');

    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh the page.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // 'p' for Portrait (Vertical)

    // Colors & Styling
    const primaryColor = [255, 140, 66]; // CarePlus Orange
    const secondaryColor = [44, 62, 80]; // Dark Navy
    const lightGray = [245, 245, 245];
    const white = [255, 255, 255];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('CarePlus', 15, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('User Management & System Access Report', 15, 26);

    // Metadata (Right aligned at 195mm)
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 15, { align: 'right' });
    doc.text('CarePlus Administration Module', 195, 20, { align: 'right' });

    // Statistics Summary Box
    const statsCards = document.querySelectorAll('.stat-card');
    let totalUsers = statsCards[0]?.querySelector('h3')?.textContent || '0';
    let patientCount = statsCards[1]?.querySelector('h3')?.textContent || '0';
    let doctorCount = statsCards[2]?.querySelector('h3')?.textContent || '0';
    let activeCount = statsCards[3]?.querySelector('h3')?.textContent || '0';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');

    // Position labels
    doc.text('TOTAL USERS', 20, 52);
    doc.text('PATIENTS', 65, 52);
    doc.text('DOCTORS', 110, 52);
    doc.text('ACTIVE USERS', 155, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(totalUsers, 20, 60);
    doc.text(patientCount, 65, 60);
    doc.text(doctorCount, 110, 60);
    doc.text(activeCount, 155, 60);

    // Prepare Table Data
    const rows = document.querySelectorAll('.users-table tbody tr');
    const tableBody = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            tableBody.push([
                cells[0].textContent.trim(), // ID
                cells[1].textContent.trim(), // Email
                cells[2].textContent.trim(), // Name
                cells[3].textContent.trim(), // Phone
                cells[4].textContent.trim().toUpperCase(), // Role
                cells[5].textContent.trim().toUpperCase()  // Status
            ]);
        }
    });

    if (tableBody.length === 0) {
        showNotification('No data found in the table to export', 'warning');
        return;
    }

    // Generate Table
    doc.autoTable({
        startY: 75,
        head: [['ID', 'Email Address', 'Full Name', 'Phone', 'Role', 'Status']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
            fillColor: primaryColor,
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 50 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 },
            4: { cellWidth: 24, fontStyle: 'bold' },
            5: { cellWidth: 24, fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            // Apply color coding to the Status column (Index 5)
            if (data.section === 'body' && data.column.index === 5) {
                const status = data.cell.raw;
                if (status === 'ACTIVE') {
                    data.cell.styles.textColor = [22, 101, 52]; // Green
                } else if (status === 'INACTIVE') {
                    data.cell.styles.textColor = [178, 34, 34]; // Red
                }
            }
        },
        margin: { left: 15, right: 15 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('CarePlus Smart Clinic Management Portal - Confidential User Report', 15, pageHeight - 15);
        doc.text('This document is intended for authorized administrative use only.', 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
    }

    // Direct Download
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_User_Report_${timestamp}.pdf`);

    showNotification('Users report downloaded successfully!', 'success');
}

// Modal Management
function openAddModal() {
    document.getElementById('addModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Generic close modal function (for cancel buttons)
function closeModal() {
    closeAddModal();
    closeEditModal();
}

function editUser(user) {
    // Populate with correct database keys
    document.getElementById('edit_user_id').value = user.user_id;
    document.getElementById('edit_email').value = user.email;
    document.getElementById('edit_first_name').value = user.first_name || '';
    document.getElementById('edit_last_name').value = user.last_name || '';
    document.getElementById('edit_phone').value = user.phone || '';
    document.getElementById('edit_role').value = user.user_type;

    const modal = document.getElementById('editModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function deleteUser(userId, email) {
    if (confirm(`Are you sure you want to deactivate user "${email}"? The account will be disabled; its visit and payment history will be preserved.`)) {
        document.getElementById('delete_user_id').value = userId;
        document.getElementById('deleteForm').submit();
    }
}

function toggleStatus(userId, current) {
    const next = current === 'active' ? 'inactive' : 'active';
    const action = next === 'active' ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} this user?`)) {
        document.getElementById('toggle_user_id').value = userId;
        document.getElementById('toggle_new_status').value = next;
        document.getElementById('toggleForm').submit();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAddModal();
        closeEditModal();
    }

    // Open add modal with Ctrl+N
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openAddModal();
    }

    // Export CSV with Ctrl+E
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportUsersCSV();
    }

    // Export PDF with Ctrl+Shift+E
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        exportUsersPDF();
    }
});

// Auto-hide alerts after 5 seconds
window.addEventListener('load', function() {
    const alert = document.querySelector('.alert');
    if (alert) {
        setTimeout(function() {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-20px)';
            setTimeout(function() {
                alert.remove();
            }, 300);
        }, 5000);
    }

    // Add animation styles for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .toast-notification {
            animation: slideInRight 0.5s ease;
        }
    `;
    document.head.appendChild(style);

    // Log keyboard shortcuts
    console.log('Keyboard shortcuts:');
    console.log('- Ctrl/Cmd + N: New user');
    console.log('- Ctrl/Cmd + E: Export CSV');
    console.log('- Ctrl/Cmd + Shift + E: Export PDF');
    console.log('- Ctrl/Cmd + P: Print');
    console.log('- Escape: Close modals');
});

// Search box auto-focus
document.addEventListener('DOMContentLoaded', function() {
    const searchBox = document.querySelector('.search-box input');
    if (searchBox && !searchBox.value) {
        // Don't auto-focus on mobile devices
        if (window.innerWidth > 768) {
            searchBox.focus();
        }
    }
});
