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

// Export activities to CSV
function exportActivities() {
    showNotification('Preparing CSV export...', 'info');

    // Get all activity cards
    const activities = document.querySelectorAll('.activity-card');

    if (activities.length === 0) {
        showNotification('No activities to export', 'warning');
        return;
    }

    // Prepare CSV data
    let csv = 'Type,Title,Details,Status,Date\n';

    activities.forEach(activity => {
        const type = activity.classList.contains('appointment') ? 'Appointment' :
                    activity.classList.contains('doctor') ? 'Doctor' : 'Patient';

        const title = activity.querySelector('.activity-title')?.textContent.trim() || '';

        const details = Array.from(activity.querySelectorAll('.activity-detail'))
            .map(d => d.textContent.trim().replace(/,/g, ';'))
            .join(' | ');

        const status = activity.querySelector('.activity-status')?.textContent.trim() || '';
        const date = activity.querySelector('.activity-time')?.textContent.trim() || '';

        csv += `"${type}","${title}","${details}","${status}","${date}"\n`;
    });

    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_activity_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('CSV exported successfully!', 'success');
}

// Export activities to a professional PDF report (Direct Download - Portrait)
function exportToPDF() {
    showNotification('Preparing professional activity report...', 'info');

    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh the page.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait orientation

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
    doc.text('System Activity & Audit Log Report', 15, 26);

    // Metadata (Right aligned)
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 15, { align: 'right' });
    doc.text('System Administration Module', 195, 20, { align: 'right' });

    // Statistics Summary Box
    // Scrape stats from the activity-stats items
    const statsItems = document.querySelectorAll('.activity-stats .stat-item');
    let appts = statsItems[0]?.querySelector('h3')?.textContent || '0';
    let docsCount = statsItems[1]?.querySelector('h3')?.textContent || '0';
    let patsCount = statsItems[2]?.querySelector('h3')?.textContent || '0';
    let totalAct = statsItems[3]?.querySelector('h3')?.textContent || '0';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('APPOINTMENTS', 20, 52);
    doc.text('DR REGISTRATIONS', 65, 52);
    doc.text('PT REGISTRATIONS', 110, 52);
    doc.text('TOTAL ACTIVITIES', 155, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(appts, 20, 60);
    doc.text(docsCount, 65, 60);
    doc.text(patsCount, 110, 60);
    doc.text(totalAct, 155, 60);

    // Prepare Table Data
    const activities = document.querySelectorAll('.activity-card');
    const tableBody = [];

    activities.forEach(activity => {
        const type = activity.classList.contains('appointment') ? 'Appointment' :
                    activity.classList.contains('doctor') ? 'Doctor' : 'Patient';

        const title = activity.querySelector('.activity-title')?.textContent.trim() || '';

        const details = Array.from(activity.querySelectorAll('.activity-detail'))
            .map(d => d.textContent.trim().replace(/^(Patient|Doctor|Date):\s*/, ''))
            .join(', ');

        const status = activity.querySelector('.activity-status')?.textContent.trim().toUpperCase() || '';
        const date = activity.querySelector('.activity-time')?.textContent.trim() || '';

        tableBody.push([type, title, details, status, date]);
    });

    if (tableBody.length === 0) {
        showNotification('No activities found to export', 'warning');
        return;
    }

    // Generate Table
    doc.autoTable({
        startY: 75,
        head: [['Type', 'Activity Title', 'Details', 'Status', 'Timestamp']],
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
            0: { cellWidth: 22 },
            1: { cellWidth: 38 },
            2: { cellWidth: 60 },
            3: { cellWidth: 25, fontStyle: 'bold' },
            4: { cellWidth: 35 }
        },
        didParseCell: function(data) {
            // Apply color coding for Status (Column Index 3)
            if (data.section === 'body' && data.column.index === 3) {
                const status = data.cell.raw;
                if (status.includes('COMPLETED') || status.includes('SUCCESS') || status.includes('ACTIVE')) {
                    data.cell.styles.textColor = [22, 101, 52]; // Green
                } else if (status.includes('CANCELLED') || status.includes('FAILED')) {
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
        doc.text('CarePlus Smart Clinic Management Portal - System Activity Report', 15, pageHeight - 15);
        doc.text('Confidential: Authorized Administrative Access Only.', 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
    }

    // Direct Download
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_Activity_Log_${timestamp}.pdf`);

    showNotification('Activity report downloaded successfully!', 'success');
}

// Auto-submit filter form on type change
function initFilterAutoSubmit() {
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            this.form.submit();
        });
    }
}

// Search with debounce
let searchTimeout;
function initSearchWithDebounce() {
    const searchInput = document.getElementById('search');
    if (searchInput) {
        // Add a search button if not exists
        if (!searchInput.nextElementSibling || !searchInput.nextElementSibling.classList.contains('search-btn')) {
            const searchBtn = document.createElement('button');
            searchBtn.type = 'button';
            searchBtn.className = 'search-clear-btn';
            searchBtn.innerHTML = '✕';
            searchBtn.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0.25rem;
                display: none;
            `;

            searchInput.parentElement.style.position = 'relative';
            searchInput.parentElement.appendChild(searchBtn);

            searchInput.addEventListener('input', function() {
                if (this.value.length > 0) {
                    searchBtn.style.display = 'block';
                } else {
                    searchBtn.style.display = 'none';
                }
            });

            searchBtn.addEventListener('click', function() {
                searchInput.value = '';
                searchBtn.style.display = 'none';
                searchInput.focus();
            });
        }

        // Initialize clear button visibility
        if (searchInput.value.length > 0) {
            const clearBtn = searchInput.nextElementSibling;
            if (clearBtn) clearBtn.style.display = 'block';
        }
    }
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ignore if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        // Ctrl/Cmd + E: Export CSV
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportActivities();
        }

        // Ctrl/Cmd + Shift + E: Export PDF
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            exportToPDF();
        }

        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Escape: Clear search
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('search');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                const clearBtn = searchInput.nextElementSibling;
                if (clearBtn) clearBtn.style.display = 'none';
            }
        }
    });
}

// Initialize animations
function initAnimations() {
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Format relative time
function updateRelativeTimes() {
    const timeElements = document.querySelectorAll('.activity-time');

    timeElements.forEach(element => {
        const timeText = element.textContent.trim();

        // Skip if already relative (contains "ago" or "Just now")
        if (timeText.includes('ago') || timeText === 'Just now') {
            return;
        }

        // Try to parse the date
        const date = new Date(timeText);
        if (isNaN(date.getTime())) {
            return;
        }

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let relativeTime;
        if (seconds < 60) {
            relativeTime = 'Just now';
        } else if (minutes < 60) {
            relativeTime = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (hours < 24) {
            relativeTime = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (days < 7) {
            relativeTime = `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            // Keep the original format for older dates
            return;
        }

        element.textContent = relativeTime;
        element.title = timeText; // Keep original time in tooltip
    });
}

// Highlight search terms
function highlightSearchTerms() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');

    if (!searchTerm) return;

    const activityCards = document.querySelectorAll('.activity-card');

    activityCards.forEach(card => {
        const textElements = card.querySelectorAll('.activity-title, .activity-detail');

        textElements.forEach(element => {
            const text = element.textContent;
            const regex = new RegExp(`(${searchTerm})`, 'gi');

            if (regex.test(text)) {
                element.innerHTML = text.replace(regex, '<mark style="background: #fff59d; padding: 0 2px;">$1</mark>');
            }
        });
    });
}

// Add loading state to filter form
function initFilterLoadingState() {
    const filterForm = document.querySelector('.filter-form');
    if (!filterForm) return;

    filterForm.addEventListener('submit', function() {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳</span> Loading...';
        }
    });
}

// Initialize activity page
function initActivityPage() {
    console.log('Activity page initialized');

    initAnimations();
    initFilterAutoSubmit();
    initSearchWithDebounce();
    initKeyboardShortcuts();
    initFilterLoadingState();
    updateRelativeTimes();
    highlightSearchTerms();

    // Update relative times every minute
    setInterval(updateRelativeTimes, 60000);

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .toast-notification {
            animation: slideInRight 0.5s ease;
        }

        mark {
            background: #fff59d;
            padding: 0 2px;
            border-radius: 2px;
        }

        @media print {
            .toast-notification {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Log keyboard shortcuts for user reference
    console.log('Keyboard shortcuts:');
    console.log('- Ctrl/Cmd + E: Export CSV');
    console.log('- Ctrl/Cmd + Shift + E: Export PDF');
    console.log('- Ctrl/Cmd + P: Print');
    console.log('- Ctrl/Cmd + F: Focus search');
    console.log('- Escape: Clear search');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivityPage);
} else {
    initActivityPage();
}

// Export functions for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        exportActivities,
        exportToPDF,
        scrollToTop,
        initActivityPage
    };
}

// Modal functionality for viewing activity details
function viewActivityDetails(type, id) {
    const modal = document.getElementById('activityModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Set loading state
    modalTitle.innerHTML = '<span>⏳</span> Loading...';
    modalBody.innerHTML = `
        <div class="modal-loading">
            <div class="spinner"></div>
            <p>Loading details...</p>
        </div>
    `;

    // Fetch details via AJAX
    fetch(`get_activity_details.html?type=${type}&id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayActivityDetails(type, data.details);
            } else {
                modalBody.innerHTML = `
                    <div class="alert-box error">
                        <span style="font-size: 1.5rem;">❌</span>
                        <div>
                            <strong>Error</strong><br>
                            ${data.message || 'Failed to load details'}
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            modalBody.innerHTML = `
                <div class="alert-box error">
                    <span style="font-size: 1.5rem;">❌</span>
                    <div>
                        <strong>Connection Error</strong><br>
                        Unable to fetch details. Please try again.
                    </div>
                </div>
            `;
        });
}

function displayActivityDetails(type, details) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (type === 'appointment') {
        displayAppointmentDetails(details);
    } else if (type === 'doctor') {
        displayDoctorDetails(details);
    } else if (type === 'patient') {
        displayPatientDetails(details);
    }
}

function displayAppointmentDetails(apt) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    console.log("Original QR Path from DB:", apt.qr_code);

    modalTitle.innerHTML = '<span>📅</span> Appointment Details';

    const appointment_datetime = new Date(apt.appointment_date + ' ' + apt.appointment_time);
    const now = new Date();
    const cancellation_deadline = new Date(appointment_datetime.getTime() - (24 * 60 * 60 * 1000));
    const can_cancel = (appointment_datetime > now) && (now < cancellation_deadline) && ['pending', 'confirmed'].includes(apt.status);

    // Path Logic
    let qrPath = apt.qr_code || '';

    if (qrPath && !qrPath.startsWith('http') && !qrPath.startsWith('data:')) {
        // Remove leading slashes or ./ if they exist in the DB string
        qrPath = qrPath.replace(/^\/|^\.\//, '');
        qrPath = '../' + qrPath;
    }

    console.log("Resolved QR Path for Browser:", qrPath);

    modalBody.innerHTML = `
        <div class="detail-section">
            <h3><span>👤</span> Patient Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Patient Name</span>
                    <div class="detail-value">${apt.patient_name}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Contact</span>
                    <div class="detail-value">${apt.patient_phone || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3><span>👨‍⚕️</span> Doctor Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Doctor Name</span>
                    <div class="detail-value">Dr. ${apt.doctor_name}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Specialization</span>
                    <div class="detail-value">${apt.specialization || 'General Practice'}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3><span>📋</span> Appointment Details</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Date</span>
                    <div class="detail-value">${formatDate(apt.appointment_date)}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Time</span>
                    <div class="detail-value">${formatTime(apt.appointment_time)}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <div class="detail-value">
                        <span class="status-badge ${apt.status}">${apt.status.toUpperCase()}</span>
                    </div>
                </div>
            </div>
            ${apt.reason ? `<div class="detail-item" style="margin-top: 1rem;"><span class="detail-label">Reason</span><div class="detail-value">${apt.reason}</div></div>` : ''}
        </div>

        ${apt.qr_code && ['confirmed', 'pending'].includes(apt.status) ? `
            <div class="qr-section">
                <h3 style="margin: 0 0 0.5rem 0; color: white;"><span>📱</span> QR Code for Check-in</h3>
                <div class="qr-code-container">
                    <img src="${qrPath}"
                         alt="Check-in QR"
                         style="width: 180px; height: 180px; display: block;"
                         onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${apt.appointment_id}';">
                </div>
                <p style="margin-top: 10px; font-size: 0.8rem; opacity: 0.8;">(Fallback QR generated if file is missing)</p>
            </div>
        ` : ''}

        <div class="modal-actions">
            ${can_cancel ? `<button class="modal-btn modal-btn-danger" onclick="cancelAppointment(${apt.appointment_id})">Cancel</button>` : ''}
            <button class="modal-btn modal-btn-outline" onclick="closeActivityModal()">Close</button>
        </div>
    `;
}

function displayDoctorDetails(doctor) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const fullName = `Dr. ${doctor.first_name} ${doctor.last_name}`;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=FF8C42&color=fff`;

    let imgPath = (doctor.profile_image || doctor.profile_picture)
                  ? '../' + (doctor.profile_image || doctor.profile_picture)
                  : fallback;

    modalTitle.innerHTML = '<span>👨‍⚕️</span> Doctor Profile';
    modalBody.innerHTML = `
        <div class="modal-profile-header">
            <img src="${imgPath}" class="modal-profile-img" onerror="this.src='${fallback}'">
            <div class="profile-header-info">
                <h2>${fullName}</h2>
                <span class="status-badge ${doctor.status}">${doctor.status.toUpperCase()}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3><span>👤</span> Personal Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Full Name</span>
                    <div class="detail-value">Dr. ${doctor.first_name} ${doctor.last_name}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <div class="detail-value">${doctor.email}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone</span>
                    <div class="detail-value">${doctor.phone || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <div class="detail-value">
                        <span class="status-badge ${doctor.status}">${doctor.status.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3><span>🏥</span> Professional Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Specialization</span>
                    <div class="detail-value">${doctor.specialization || 'General Practice'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">License Number</span>
                    <div class="detail-value">${doctor.license_number || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Years of Experience</span>
                    <div class="detail-value">${doctor.years_experience || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Registered</span>
                    <div class="detail-value">${formatDate(doctor.created_at)}</div>
                </div>
            </div>
        </div>

        ${doctor.bio ? `
            <div class="detail-section">
                <h3><span>📝</span> Biography</h3>
                <div class="detail-item">
                    <div class="detail-value">${doctor.bio}</div>
                </div>
            </div>
        ` : ''}

        <div class="modal-actions">
            <button class="modal-btn modal-btn-outline" onclick="closeActivityModal()">
                Close
            </button>
        </div>
    `;
}

function displayPatientDetails(patient) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const imgPath = patient.profile_image ? '../' + patient.profile_image : '../assets/default-patient.png';

    modalTitle.innerHTML = '<span>🤒</span> Patient Profile';
    modalBody.innerHTML = `
        <div class="modal-profile-header">
            <img src="${imgPath}" class="modal-profile-img" onerror="this.src='../assets/default-avatar.png'">
            <div class="profile-header-info">
                <h2>${patient.first_name} ${patient.last_name}</h2>
                <span class="status-badge ${patient.status}">${patient.status}</span>
            </div>
        </div>
        <div class="detail-section">
            <h3><span>👤</span> Personal Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Full Name</span>
                    <div class="detail-value">${patient.first_name} ${patient.last_name}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <div class="detail-value">${patient.email}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone</span>
                    <div class="detail-value">${patient.phone || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <div class="detail-value">
                        <span class="status-badge ${patient.status}">${patient.status.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3><span>🏥</span> Medical Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Date of Birth</span>
                    <div class="detail-value">${patient.date_of_birth ? formatDate(patient.date_of_birth) : 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Gender</span>
                    <div class="detail-value">${patient.gender || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Blood Type</span>
                    <div class="detail-value">${patient.blood_type || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Registered</span>
                    <div class="detail-value">${formatDate(patient.created_at)}</div>
                </div>
            </div>
        </div>

        ${patient.address ? `
            <div class="detail-section">
                <h3><span>📍</span> Address</h3>
                <div class="detail-item">
                    <div class="detail-value">${patient.address}</div>
                </div>
            </div>
        ` : ''}

        ${patient.emergency_contact ? `
            <div class="detail-section">
                <h3><span>🚨</span> Emergency Contact</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Contact Phone</span>
                        <div class="detail-value">${patient.emergency_contact || 'N/A'}</div>
                    </div>
                </div>
            </div>
        ` : ''}

        <div class="modal-actions">
            <button class="modal-btn modal-btn-outline" onclick="closeActivityModal()">
                Close
            </button>
        </div>
    `;
}

function closeActivityModal() {
    const modal = document.getElementById('activityModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('activityModal');
    if (e.target === modal) {
        closeActivityModal();
    }
});

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeActivityModal();
    }
});

// Helper functions for formatting
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const time = new Date('2000-01-01 ' + timeString);
    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Placeholder functions for actions (you'll need to implement these)
function cancelAppointment(appointmentId) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
        showNotification('Canceling appointment...', 'info');

        fetch('ajax/cancel_appointment.html', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ appointment_id: appointmentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Appointment cancelled successfully!', 'success');
                closeActivityModal();
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification(data.message || 'Failed to cancel appointment', 'error');
            }
        })
        .catch(error => {
            showNotification('Error canceling appointment', 'error');
        });
    }
}

function viewMedicalRecord(appointmentId) {
    showNotification('Loading medical record...', 'info');
    // Implement medical record viewing logic
    window.location.href = `medical_record.html?appointment_id=${appointmentId}`;
}
