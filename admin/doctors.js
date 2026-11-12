document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// Edit Doctor Function
function editDoctor(doc) {
    const modal = document.getElementById('doctorModal');
    document.getElementById('modalTitle').innerText = "✏️ Edit Doctor Profile";
    document.getElementById('formAction').value = "edit";

    // Populate Form Fields
    document.getElementById('docId').value = doc.doctor_id;
    document.getElementById('userId').value = doc.user_id;
    document.getElementById('fName').value = doc.first_name;
    document.getElementById('lName').value = doc.last_name;
    document.getElementById('email').value = doc.email;
    document.getElementById('spec').value = doc.specialization;
    document.getElementById('license').value = doc.license_number;
    document.getElementById('ic').value = doc.ic_number;
    document.getElementById('phone').value = doc.phone;
    document.getElementById('fee').value = doc.consultation_fee;

    // Show Image Preview
    const preview = document.getElementById('imagePreview');
    if (doc.profile_picture) {
        preview.innerHTML = `<img src="../${doc.profile_picture}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    } else {
        preview.innerHTML = `<span style="font-size: 2rem;">${doc.first_name.charAt(0)}</span>`;
    }

    // Update button text
    document.getElementById('submitBtn').innerHTML = 'Update Doctor';

    clearAllErrors();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('doctorModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    clearAllErrors();
}

// Form Validation
function validateDoctorForm() {
    let isValid = true;
    clearAllErrors();

    const checks = [
        { id: 'fName', msg: 'First name is required' },
        { id: 'lName', msg: 'Last name is required' },
        { id: 'email', msg: 'Valid email is required', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        { id: 'phone', msg: 'Valid phone is required' },
        { id: 'ic', msg: 'IC Number is required' },
        { id: 'license', msg: 'Medical license is required' },
        { id: 'spec', msg: 'Specialization is required' },
        { id: 'fee', msg: 'Consultation fee is required' }
    ];

    checks.forEach(check => {
        const input = document.getElementById(check.id);
        const val = input.value.trim();
        if (!val || (check.regex && !check.regex.test(val))) {
            showFieldError(check.id, check.msg);
            isValid = false;
        }
    });

    return isValid;
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + '_error');
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
}

function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.modal-body input, .modal-body select').forEach(el => el.classList.remove('error'));
}

// Submit Form
function submitDoctorForm() {
    if (validateDoctorForm()) {
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Saving...';
        document.getElementById('doctorForm').submit();
    } else {
        showNotification('Please fill in all required fields correctly', 'error');
    }
}

// Image Preview
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(n => n.remove());

    const colors = { success: '#66BB6A', error: '#EF5350', warning: '#FF9800', info: '#42A5F5' };
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type}`;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${colors[type]};
        color: white; padding: 1rem 1.5rem; border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 10001;
        font-weight: 600; display: flex; align-items: center; gap: 0.5rem;
        animation: slideInRight 0.5s ease;
    `;

    notification.innerHTML = `<span style="font-size: 1.2rem;">${icons[type]}</span><span>${message}</span>`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Export CSV
function exportDoctorsCSV() {
    showNotification('Preparing CSV export...', 'info');
    const rows = document.querySelectorAll('.doctors-table tbody tr');
    if (rows.length === 0) return showNotification('No doctors to export', 'warning');

    let csv = 'Name,Email,Specialization,License No.,Phone,Status\n';
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const name = cells[1].querySelector('strong').textContent.trim();
        const email = cells[1].querySelector('small').textContent.trim();
        csv += `"${name}","${email}","${cells[2].textContent.trim()}","${cells[3].textContent.trim()}","${cells[4].textContent.trim()}","${cells[5].textContent.trim()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CarePlus_Doctors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Doctors CSV exported successfully!', 'success');
}

// Export PDF
function exportDoctorsPDF() {
    showNotification('Preparing professional doctors report...', 'info');

    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh the page.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const primaryColor = [255, 140, 66];
    const secondaryColor = [44, 62, 80];
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
    doc.text('Medical Staff & Doctor Directory Report', 15, 26);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 15, { align: 'right' });
    doc.text('Doctors Administration Module', 195, 20, { align: 'right' });

    // Statistics
    const statsCards = document.querySelectorAll('.stat-card');
    let totalDocs = statsCards[0]?.querySelector('h3')?.textContent || '0';
    let activeDocs = statsCards[1]?.querySelector('h3')?.textContent || '0';
    let specializationCount = statsCards[2]?.querySelector('h3')?.textContent || '0';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');

    doc.text('TOTAL DOCTORS', 20, 52);
    doc.text('ACTIVE STAFF', 80, 52);
    doc.text('SPECIALIZATIONS', 140, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(totalDocs, 20, 60);
    doc.text(activeDocs, 80, 60);
    doc.text(specializationCount, 140, 60);

    // Table Data
    const rows = document.querySelectorAll('.doctors-table tbody tr');
    const tableBody = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const name = cells[1].querySelector('strong').textContent.trim();
            const email = cells[1].querySelector('small').textContent.trim();

            tableBody.push([
                name,
                email,
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim().toUpperCase()
            ]);
        }
    });

    if (tableBody.length === 0) {
        showNotification('No doctors found to export', 'warning');
        return;
    }

    // Generate Table
    doc.autoTable({
        startY: 75,
        head: [['Doctor Name', 'Email Address', 'Specialization', 'License', 'Phone', 'Status']],
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
            0: { cellWidth: 35 },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 25 },
            5: { cellWidth: 20, fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 5) {
                const status = data.cell.raw;
                if (status === 'ACTIVE') {
                    data.cell.styles.textColor = [22, 101, 52];
                } else if (status === 'INACTIVE') {
                    data.cell.styles.textColor = [178, 34, 34];
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
        doc.text('CarePlus Smart Clinic Management Portal - Professional Staff Report', 15, pageHeight - 15);
        doc.text('Confidential: Internal Use Only.', 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_Doctors_Report_${timestamp}.pdf`);

    showNotification('Doctors report downloaded successfully!', 'success');
}

// Toggle Status
function toggleStatus(doctorId, currentStatus) {
    const next = currentStatus === 'active' ? 'inactive' : 'active';
    const action = next === 'active' ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} this doctor?`)) {
        document.getElementById('statDocId').value = doctorId;
        document.getElementById('statNewVal').value = next;
        document.getElementById('statusForm').submit();
    }
}

// Delete Doctor
function deleteDoctor(userId, doctorName) {
    if (confirm(`Are you sure you want to delete ${doctorName}? This action cannot be undone.`)) {
        document.getElementById('delUserId').value = userId;
        document.getElementById('deleteForm').submit();
    }
}

// Event Listeners
function setupEventListeners() {
    // Close modal on backdrop click
    const modal = document.getElementById('doctorModal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target.classList.contains('modal-backdrop')) {
                closeModal();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            exportDoctorsCSV();
        }
    });

    // Auto-hide alerts
    const alert = document.querySelector('.alert');
    if (alert) {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-20px)';
            alert.style.transition = '0.5s';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    }

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}
