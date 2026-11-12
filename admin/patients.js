// Modal Management - Edit Only
function editPatient(patient) {
    document.getElementById('modalTitle').textContent = '✏️ Edit Patient Profile';
    document.getElementById('formAction').value = 'edit';

    // Populate form fields
    document.getElementById('patientId').value = patient.patient_id;
    document.getElementById('userId').value = patient.user_id;
    document.getElementById('firstName').value = patient.first_name;
    document.getElementById('lastName').value = patient.last_name;
    document.getElementById('email').value = patient.email;
    document.getElementById('icNumber').value = patient.ic_number;
    document.getElementById('dob').value = patient.date_of_birth;
    document.getElementById('gender').value = patient.gender;
    document.getElementById('phone').value = patient.phone;
    document.getElementById('address').value = patient.address || '';
    document.getElementById('bloodType').value = patient.blood_type || '';
    document.getElementById('allergies').value = patient.allergies || '';
    document.getElementById('emergencyContact').value = patient.emergency_contact || '';

    // Preview Current Image
    const preview = document.getElementById('imagePreview');
    if (patient.profile_picture) {
        preview.innerHTML = `<img src="${window.CarePlusViewPHP.photoUrl(patient.profile_picture)}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    } else {
        preview.innerHTML = `<span>${patient.first_name.charAt(0)}</span>`;
    }

    // Hide password field when editing
    document.getElementById('passGroup').style.display = 'none';
    document.getElementById('password').required = false;

    const modal = document.getElementById('patientModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('patientModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Form Validation & Submission
function submitPatientForm() {
    const action = document.getElementById('formAction').value;

    // Basic Validation
    const firstName = document.getElementById('firstName').value.trim();
    const email = document.getElementById('email').value.trim();
    const icNumber = document.getElementById('icNumber').value.trim();
    const dob = document.getElementById('dob').value;

    if (!firstName || !email || !icNumber || !dob) {
        showNotification('Please fill in all required fields.', 'warning');
        return;
    }

    // If valid, submit the form
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    document.getElementById('patientForm').submit();
}

// UI Helpers
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// IC Number formatting
document.getElementById('icNumber').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 6) value = value.slice(0, 6) + '-' + value.slice(6);
    if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
    e.target.value = value.slice(0, 14);
});

// Phone Format
document.getElementById('phone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3) + '-' + value.slice(3);
    e.target.value = value;
});

// System Actions
function deletePatient(userId, patientName) {
    if (confirm(`Are you sure you want to deactivate ${patientName}?`)) {
        document.getElementById('delUserId').value = userId;
        document.getElementById('deleteForm').submit();
    }
}

function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (confirm(`Change status to ${newStatus}?`)) {
        document.getElementById('statUserId').value = userId;
        document.getElementById('statNewVal').value = newStatus;
        document.getElementById('statusForm').submit();
    }
}

// Close on background click
window.addEventListener('click', function(e) {
    const modal = document.getElementById('patientModal');
    if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
        closeModal();
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
});

// Date of Birth validation - must be in the past
document.getElementById('dob').addEventListener('change', function(e) {
    const selectedDate = new Date(e.target.value);
    const today = new Date();

    if (selectedDate > today) {
        alert('Date of birth cannot be in the future!');
        e.target.value = '';
    }

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 1);

    if (selectedDate > minDate) {
        alert('Please enter a valid date of birth.');
        e.target.value = '';
    }
});

// Email validation
document.getElementById('email').addEventListener('blur', function(e) {
    const email = e.target.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        e.target.focus();
    }
});

// File upload preview and validation
document.getElementById('profilePicture').addEventListener('change', function(e) {
    const file = e.target.files[0];

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB!');
            e.target.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only JPG, PNG, and WEBP files are allowed!');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            console.log('Image preview loaded');
        };
        reader.readAsDataURL(file);
    }
});

// Form validation before submit
document.getElementById('patientForm').addEventListener('submit', function(e) {
    const action = document.getElementById('formAction').value;

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const icNumber = document.getElementById('icNumber').value.trim();
    const dob = document.getElementById('dob').value;
    const phone = document.getElementById('phone').value.trim();

    if (!firstName || !lastName || !email || !icNumber || !dob || !phone) {
        alert('Please fill in all required fields marked with *');
        e.preventDefault();
        return;
    }

    const icRegex = /^\d{6}-\d{2}-\d{4}$/;
    if (!icRegex.test(icNumber)) {
        alert('IC Number must be in format: XXXXXX-XX-XXXX');
        e.preventDefault();
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Search box auto-focus
document.addEventListener('DOMContentLoaded', function() {
    const searchBox = document.querySelector('.search-box input');
    if (searchBox && !searchBox.value) {
        if (window.innerWidth > 768) {
            searchBox.focus();
        }
    }
});

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

// Export patients to CSV
function exportPatientsCSV() {
    showNotification('Preparing CSV export...', 'info');

    const rows = document.querySelectorAll('.patients-table tbody tr');

    if (rows.length === 0) {
        showNotification('No patients to export', 'warning');
        return;
    }

    let csv = 'Name,IC Number,Age,Gender,Blood Type,Phone,Email,Status\n';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const name = cells[1].querySelector('strong').textContent.trim();
        const email = cells[1].querySelector('small').textContent.trim();
        const ic = cells[2].textContent.trim();
        const ageGender = cells[3].textContent.trim();
        const [age, gender] = ageGender.split(' / ');
        const bloodType = cells[4].textContent.trim();
        const phone = cells[5].textContent.trim();
        const status = cells[6].textContent.trim();

        csv += `"${name}","${ic}","${age}","${gender}","${bloodType}","${phone}","${email}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('Patients CSV exported successfully!', 'success');
}

// Export patients to PDF
function exportPatientsPDF() {
    showNotification('Preparing professional patient report...', 'info');

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

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('CarePlus', 15, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Patient Records & Demographic Directory Report', 15, 26);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 15, { align: 'right' });
    doc.text('Patient Administration Module', 195, 20, { align: 'right' });

    const statsCards = document.querySelectorAll('.stat-card');
    let totalPatients = statsCards[0]?.querySelector('h3')?.textContent || '0';
    let activePatients = statsCards[1]?.querySelector('h3')?.textContent || '0';
    let maleCount = statsCards[2]?.querySelector('h3')?.textContent || '0';
    let femaleCount = statsCards[3]?.querySelector('h3')?.textContent || '0';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');

    doc.text('TOTAL PATIENTS', 20, 52);
    doc.text('ACTIVE STATUS', 65, 52);
    doc.text('MALE PATIENTS', 110, 52);
    doc.text('FEMALE PATIENTS', 155, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(totalPatients, 20, 60);
    doc.text(activePatients, 65, 60);
    doc.text(maleCount, 110, 60);
    doc.text(femaleCount, 155, 60);

    const rows = document.querySelectorAll('.patients-table tbody tr');
    const tableBody = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const name = cells[1].querySelector('strong').textContent.trim();

            tableBody.push([
                name,
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim(),
                cells[6].textContent.trim().toUpperCase()
            ]);
        }
    });

    if (tableBody.length === 0) {
        showNotification('No patients found to export', 'warning');
        return;
    }

    doc.autoTable({
        startY: 75,
        head: [['Patient Name', 'IC Number', 'Age/Gender', 'Blood', 'Phone', 'Status']],
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
            0: { cellWidth: 40 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 15 },
            4: { cellWidth: 35 },
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

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('CarePlus Smart Clinic Management Portal - Professional Patient Report', 15, pageHeight - 15);
        doc.text('Confidential: Authorized Medical Staff Access Only.', 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_Patients_Report_${timestamp}.pdf`);

    showNotification('Patients report downloaded successfully!', 'success');
}

// Add animation styles for notifications
window.addEventListener('load', function() {
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
});
