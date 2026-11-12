function lockScroll() {
    document.body.style.overflow = 'hidden';
}

function unlockScroll() {
    document.body.style.overflow = 'auto';
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

// Export appointments to CSV
function exportAppointmentsCSV() {
    showNotification('Preparing CSV export...', 'info');

    const rows = document.querySelectorAll('.appointments-table tbody tr');

    if (rows.length === 0) {
        showNotification('No appointments to export', 'warning');
        return;
    }

    let csv = 'ID,Patient Name,Patient IC,Doctor Name,Specialization,Date,Time,Reason,Status,QR Code\n';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const id = cells[0].textContent.trim().replace('#', '');
        const patientName = cells[1].querySelector('strong').textContent.trim();
        const patientIC = cells[1].querySelector('small').textContent.trim();
        const doctorName = cells[2].querySelector('strong').textContent.trim().replace('Dr. ', '');
        const specialization = cells[2].querySelector('small').textContent.trim();
        const date = cells[3].querySelector('strong').textContent.trim();
        const time = cells[3].querySelector('small').textContent.trim();
        const reason = cells[4].textContent.trim();
        const status = cells[5].textContent.trim();
        const qrCode = cells[6].getAttribute('title') || cells[6].textContent.trim();

        csv += `"${id}","${patientName}","${patientIC}","${doctorName}","${specialization}","${date}","${time}","${reason}","${status}","${qrCode}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('Appointments CSV exported successfully!', 'success');
}

// Export all appointments to PDF
function exportAppointmentsPDF() {
    showNotification('Preparing professional appointment report...', 'info');

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
    doc.text('Patient Appointments & Scheduling Directory Report', 15, 26);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 15, { align: 'right' });
    doc.text('Appointments Management Module', 195, 20, { align: 'right' });

    const statsCards = document.querySelectorAll('.stat-card');
    let totalApts = statsCards[0]?.querySelector('h3')?.textContent || '0';
    let pendingApts = statsCards[1]?.querySelector('h3')?.textContent || '0';
    let confirmedApts = statsCards[2]?.querySelector('h3')?.textContent || '0';
    let todayApts = statsCards[3]?.querySelector('h3')?.textContent || '0';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');

    doc.text('TOTAL APPOINTMENTS', 20, 52);
    doc.text('PENDING', 70, 52);
    doc.text('CONFIRMED', 115, 52);
    doc.text('TODAY', 160, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(totalApts, 20, 60);
    doc.text(pendingApts, 70, 60);
    doc.text(confirmedApts, 115, 60);
    doc.text(todayApts, 160, 60);

    const rows = document.querySelectorAll('.appointments-table tbody tr');
    const tableBody = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const id = cells[0].textContent.trim();
            const patientName = cells[1].querySelector('strong').textContent.trim();
            const doctorName = cells[2].querySelector('strong').textContent.trim();
            const dateTime = cells[3].querySelector('strong').textContent.trim() + ' ' + cells[3].querySelector('small').textContent.trim();
            const reason = cells[4].textContent.trim();
            const status = cells[5].textContent.trim().toUpperCase();

            tableBody.push([id, patientName, doctorName, dateTime, reason, status]);
        }
    });

    if (tableBody.length === 0) {
        showNotification('No appointments found to export', 'warning');
        return;
    }

    doc.autoTable({
        startY: 75,
        head: [['ID', 'Patient Name', 'Doctor Name', 'Date & Time', 'Reason', 'Status']],
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
            valign: 'middle',
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
            5: { cellWidth: 25, fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 5) {
                const status = data.cell.raw;
                if (status === 'CONFIRMED' || status === 'COMPLETED') {
                    data.cell.styles.textColor = [22, 101, 52];
                } else if (status === 'PENDING') {
                    data.cell.styles.textColor = [184, 134, 11];
                } else if (status === 'CANCELLED') {
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
        doc.text('CarePlus Smart Clinic Management Portal - Professional Appointment Report', 15, pageHeight - 15);
        doc.text('Confidential: Authorized Personnel Access Only.', 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_Appointments_Report_${timestamp}.pdf`);

    showNotification('Appointment report downloaded successfully!', 'success');
}

function viewAppointment(appointment) {
    const viewContent = document.getElementById('viewContent');

    window.currentViewedAppointment = appointment;

    const date = new Date(appointment.appointment_date + 'T' + appointment.appointment_time);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    viewContent.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Appointment ID</label>
                <div class="value">#${appointment.appointment_id}</div>
            </div>
            <div class="detail-item">
                <label>Status</label>
                <div class="value">
                    <span class="status-badge status-${appointment.status}">
                        ${appointment.status.toUpperCase()}
                    </span>
                </div>
            </div>
            <div class="detail-item">
                <label>Patient Name</label>
                <div class="value">${appointment.patient_fname} ${appointment.patient_lname}</div>
            </div>
            <div class="detail-item">
                <label>Patient IC</label>
                <div class="value">${appointment.patient_ic}</div>
            </div>
            <div class="detail-item">
                <label>Doctor</label>
                <div class="value">Dr. ${appointment.doctor_fname} ${appointment.doctor_lname}</div>
            </div>
            <div class="detail-item">
                <label>Specialization</label>
                <div class="value">${appointment.specialization}</div>
            </div>
            <div class="detail-item">
                <label>Date</label>
                <div class="value">${formattedDate}</div>
            </div>
            <div class="detail-item">
                <label>Time</label>
                <div class="value">${formattedTime}</div>
            </div>
            <div class="detail-item">
                <label>Reason</label>
                <div class="value">${appointment.reason || 'General Checkup'}</div>
            </div>
            <div class="detail-item">
                <label>QR Code</label>
                <div class="value"><code style="background: #e0f2fe; padding: 8px 12px; border-radius: 6px; color: #0369a1; font-weight: bold;">${appointment.qr_code}</code></div>
            </div>
        </div>

        ${appointment.symptoms ? `
            <div class="detail-item" style="margin-top: 20px; grid-column: 1/-1;">
                <label>Symptoms</label>
                <div class="value">${appointment.symptoms}</div>
            </div>
        ` : ''}

        ${appointment.notes ? `
            <div class="detail-item" style="margin-top: 20px; grid-column: 1/-1;">
                <label>Notes</label>
                <div class="value">${appointment.notes}</div>
            </div>
        ` : ''}

        ${appointment.checked_in_at ? `
            <div class="detail-item" style="margin-top: 20px; background: #dcfce7; border-left-color: #16a34a;">
                <label>Check-in Time</label>
                <div class="value">${new Date(appointment.checked_in_at).toLocaleString()}</div>
            </div>
        ` : ''}
    `;

    document.getElementById('viewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showStatusModal(appointmentId, currentStatus) {
    document.getElementById('statusAppointmentId').value = appointmentId;
    document.getElementById('newStatus').value = currentStatus;
    document.getElementById('statusModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeStatusModal() {
    document.getElementById('statusModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function deleteAppointment(appointmentId, patientName) {
    if (confirm(`Are you sure you want to delete the appointment for ${patientName}? This action cannot be undone.`)) {
        document.getElementById('delAppointmentId').value = appointmentId;
        document.getElementById('deleteForm').submit();
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const viewModal = document.getElementById('viewModal');
    const statusModal = document.getElementById('statusModal');

    if (event.target === viewModal) {
        closeViewModal();
    }
    if (event.target === statusModal) {
        closeStatusModal();
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

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeViewModal();
        closeStatusModal();
    }

    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportAppointmentsCSV();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        exportAppointmentsPDF();
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

    highlightTodayAppointments();
});

function highlightTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const rows = document.querySelectorAll('.appointments-table tbody tr');

    rows.forEach(row => {
        const dateCell = row.querySelector('td:nth-child(4) strong');
        if (dateCell) {
            const rowDate = dateCell.textContent;
            const rowDateObj = new Date(rowDate);
            const rowDateStr = rowDateObj.toISOString().split('T')[0];

            if (rowDateStr === today) {
                row.style.backgroundColor = '#fef3c7';
                row.style.borderLeft = '4px solid #f59e0b';
            }
        }
    });
}

// Quick Filter Logic
function applyQuickFilter(filterType) {
    const form = document.querySelector('.filters-form');
    const serverDate = document.body?.dataset?.serverDate;
    const today = serverDate || new Date().toISOString().split('T')[0];

    // Reset fields first
    form.querySelector('select[name="status"]').value = '';
    form.querySelector('input[name="date_from"]').value = '';
    form.querySelector('input[name="date_to"]').value = '';

    switch(filterType) {
        case 'today':
            form.querySelector('input[name="date_from"]').value = today;
            form.querySelector('input[name="date_to"]').value = today;
            break;
        case 'pending':
            form.querySelector('select[name="status"]').value = 'pending';
            break;
        case 'confirmed':
            form.querySelector('select[name="status"]').value = 'confirmed';
            break;
        case 'upcoming':
            // Upcoming means from tomorrow onwards
            const tomorrow = serverDate ? new Date(`${serverDate}T00:00:00`) : new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            form.querySelector('select[name="status"]').value = 'upcoming';
            form.querySelector('input[name="date_from"]').value = tomorrowStr;
            break;
    }

    form.submit();
}

window.addEventListener('load', function() {
    const filtersSection = document.querySelector('.filters-section');
    if (filtersSection && window.location.pathname.includes('appointments.html')) {
        const quickFiltersDiv = document.createElement('div');
        quickFiltersDiv.style.cssText = 'display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;';
        quickFiltersDiv.innerHTML = `
            <button type="button" onclick="applyQuickFilter('today')" style="flex: 1; padding: 8px 16px; border-radius: 8px; border: 2px solid #3b82f6; background: #dbeafe; color: #1e40af; font-weight: 600; cursor: pointer; font-size: 14px;">📅 Today</button>
            <button type="button" onclick="applyQuickFilter('pending')" style="flex: 1; padding: 8px 16px; border-radius: 8px; border: 2px solid #f59e0b; background: #fef3c7; color: #92400e; font-weight: 600; cursor: pointer; font-size: 14px;">⏳ Pending</button>
            <button type="button" onclick="applyQuickFilter('confirmed')"style="flex: 1; padding: 8px 16px; border-radius: 8px; border: 2px solid #16a34a; background: #dcfce7; color: #166534; font-weight: 600; cursor: pointer; font-size: 14px;">✅ Confirmed</button>
            <button type="button" onclick="applyQuickFilter('upcoming')" style="flex: 1; padding: 8px 16px; border-radius: 8px; border: 2px solid #413bf6ff; background: #e5dbfeff; color: #361eafff; font-weight: 600; cursor: pointer; font-size: 14px;">🔜 Upcoming</button>
        `;
        filtersSection.appendChild(quickFiltersDiv);
    }
});

function downloadAppointmentPDF() {
    if (!window.currentViewedAppointment) {
        showNotification('No appointment data available', 'error');
        return;
    }

    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh the page.', 'error');
        return;
    }

    showNotification('Generating appointment PDF...', 'info');

    const { jsPDF } = window.jspdf;
    const apt = window.currentViewedAppointment;

    const doc = new jsPDF();

    const primaryColor = [255, 140, 66];
    const secondaryColor = [44, 62, 80];
    const lightGray = [240, 240, 240];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('CarePlus', 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Appointment Details', 14, 28);

    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text(`Appointment #${apt.appointment_id}`, 140, 20);

    const statusColors = {
        pending: [251, 191, 36],
        confirmed: [34, 197, 94],
        completed: [59, 130, 246],
        cancelled: [239, 68, 68]
    };
    const statusColor = statusColors[apt.status] || [156, 163, 175];
    doc.setFillColor(...statusColor);
    doc.roundedRect(140, 24, 30, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(apt.status.toUpperCase(), 155, 29.5, { align: 'center' });

    let yPos = 55;
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, yPos, 182, 10, 2, 2, 'F');
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Patient Information', 20, yPos + 7);

    yPos += 18;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    doc.setFont(undefined, 'bold');
    doc.text('Name:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`${apt.patient_fname} ${apt.patient_lname}`, 50, yPos);

    doc.setFont(undefined, 'bold');
    doc.text('IC Number:', 120, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(apt.patient_ic, 150, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Phone:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(apt.patient_phone || 'N/A', 50, yPos);

    yPos += 15;
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, yPos, 182, 10, 2, 2, 'F');
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Doctor Information', 20, yPos + 7);

    yPos += 18;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    doc.setFont(undefined, 'bold');
    doc.text('Doctor:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`Dr. ${apt.doctor_fname} ${apt.doctor_lname}`, 50, yPos);

    doc.setFont(undefined, 'bold');
    doc.text('Specialization:', 120, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(apt.specialization, 160, yPos);

    yPos += 15;
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, yPos, 182, 10, 2, 2, 'F');
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Appointment Details', 20, yPos + 7);

    yPos += 18;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const date = new Date(apt.appointment_date + 'T' + apt.appointment_time);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    doc.setFont(undefined, 'bold');
    doc.text('Date:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(formattedDate, 50, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Time:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(formattedTime, 50, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Reason:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(apt.reason || 'General Checkup', 50, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('QR Code:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFillColor(224, 242, 254);
    doc.roundedRect(48, yPos - 4, 80, 8, 2, 2, 'F');
    doc.setTextColor(3, 105, 161);
    doc.setFont(undefined, 'bold');
    doc.text(apt.qr_code, 88, yPos + 1, { align: 'center' });
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'normal');

    if (apt.symptoms || apt.notes) {
        yPos += 15;
        doc.setFillColor(...lightGray);
        doc.roundedRect(14, yPos, 182, 10, 2, 2, 'F');
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Additional Information', 20, yPos + 7);

        yPos += 18;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        if (apt.symptoms) {
            doc.setFont(undefined, 'bold');
            doc.text('Symptoms:', 20, yPos);
            doc.setFont(undefined, 'normal');
            const symptomsLines = doc.splitTextToSize(apt.symptoms, 160);
            doc.text(symptomsLines, 20, yPos + 6);
            yPos += (symptomsLines.length * 5) + 8;
        }

        if (apt.notes) {
            doc.setFont(undefined, 'bold');
            doc.text('Notes:', 20, yPos);
            doc.setFont(undefined, 'normal');
            const notesLines = doc.splitTextToSize(apt.notes, 160);
            doc.text(notesLines, 20, yPos + 6);
            yPos += (notesLines.length * 5) + 8;
        }
    }

    if (apt.checked_in_at) {
        yPos += 10;
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(14, yPos, 182, 12, 2, 2, 'F');
        doc.setTextColor(22, 101, 52);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('✓ Check-in Time:', 20, yPos + 8);
        doc.setFont(undefined, 'normal');
        doc.text(new Date(apt.checked_in_at).toLocaleString(), 65, yPos + 8);
        doc.setTextColor(...secondaryColor);
    }

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('CarePlus Clinic - Appointment Confirmation', 105, pageHeight - 15, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, pageHeight - 10, { align: 'center' });

    doc.setDrawColor(255, 140, 66);
    doc.setLineWidth(0.5);
    doc.rect(14, pageHeight - 35, 182, 15);
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text('Please arrive 15 minutes before yourscheduled appointment time.', 105, pageHeight - 28, { align: 'center' });
    doc.text('Bring this document and a valid ID for verification.', 105, pageHeight - 23, { align: 'center' });

    // Save the PDF
    const filename = `appointment_${apt.appointment_id}_${apt.patient_fname}_${apt.patient_lname}.pdf`;
    doc.save(filename);

    showNotification('Appointment PDF downloaded successfully!', 'success');
}
