// Global State & Init
let currentPayment = null;
let allPayments = []; // This will be populated from PHP
let appointments = []; // This will be populated from PHP

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Get payments data from PHP (should be set in the HTML)
    if (typeof window.allPaymentsData !== 'undefined') {
        allPayments = window.allPaymentsData;
    }

    if (typeof window.appointmentsData !== 'undefined') {
        appointments = window.appointmentsData;
    }

    console.log('Loaded payments:', allPayments.length); // Debug log
    console.log('Loaded appointments:', appointments.length); // Debug log
});

// Notification System (Toast)
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.toast-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type}`;

    const colors = {
        success: '#66BB6A',
        error: '#EF5350',
        warning: '#F59E0B',
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

// Helper function to get payment by ID
function getPaymentById(id) {
    console.log('Searching for payment_id:', id, 'Type:', typeof id);
    console.log('Available payments:', allPayments);

    // Try both == and === to handle string/number mismatch
    let payment = allPayments.find(p => p.payment_id == id);

    if (!payment) {
        // Try converting to number
        payment = allPayments.find(p => p.payment_id == parseInt(id));
    }

    if (!payment) {
        // Try converting to string
        payment = allPayments.find(p => p.payment_id == String(id));
    }

    if (!payment) {
        console.error('Payment not found:', id);
        console.error('Available payment IDs:', allPayments.map(p => ({id: p.payment_id, type: typeof p.payment_id})));
        showNotification('Payment record not found!', 'error');
    } else {
        console.log('Found payment:', payment);
    }

    return payment;
}

// Export to CSV
function exportPaymentsCSV() {
    showNotification('Preparing CSV export...', 'info');

    const rows = document.querySelectorAll('.payments-table tbody tr');

    if (rows.length === 0) {
        showNotification('No payment records to export', 'warning');
        return;
    }

    // Header
    let csv = 'Receipt No,Patient Name,Patient IC,Appointment ID,Amount,Method,Status,Date\n';

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');

        const receipt = cols[0].innerText.trim();
        const patientName = cols[1].querySelector('strong')?.innerText.trim() || '';
        const patientIC = cols[1].querySelector('small')?.innerText.trim() || '';
        let appt = cols[2].innerText.replace(/[\n\r]+/g, ' ').trim();
        const amount = cols[3].innerText.replace('RM', '').trim();
        const method = cols[4].innerText.trim();
        const status = cols[5].innerText.trim();
        const dateRaw = cols[6].innerText.replace(/[\n\r]+/g, ' ').trim();

        csv += `"${receipt}","${patientName}","${patientIC}","${appt}","${amount}","${method}","${status}","${dateRaw}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('Payments CSV exported successfully!', 'success');
}

// Export to PDF
function exportPaymentsPDF() {
    showNotification('Preparing financial report...', 'info');

    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh.', 'error');
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
    doc.text('Financial & Payment Transaction Report', 15, 26);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 15, { align: 'right' });
    doc.text('Billing Department', 195, 20, { align: 'right' });

    const statsCards = document.querySelectorAll('.stat-card');
    let totalRevenue = statsCards[0]?.querySelector('h3')?.innerText || '0.00';
    let pendingCount = statsCards[1]?.querySelector('h3')?.innerText || '0';
    let paidCount = statsCards[2]?.querySelector('h3')?.innerText || '0';
    let todayRevenue = statsCards[3]?.querySelector('h3')?.innerText || '0.00';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');

    doc.text('TOTAL REVENUE', 20, 52);
    doc.text('PENDING', 75, 52);
    doc.text('COMPLETED', 110, 52);
    doc.text("TODAY'S REVENUE", 150, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(totalRevenue, 20, 60);
    doc.text(pendingCount, 75, 60);
    doc.text(paidCount, 110, 60);
    doc.text(todayRevenue, 150, 60);

    const rows = document.querySelectorAll('.payments-table tbody tr');
    const tableBody = [];

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');

        const receipt = cols[0].innerText.trim();
        const patient = cols[1].querySelector('strong')?.innerText.trim() || 'Unknown';
        const amount = cols[3].innerText.trim();
        const method = cols[4].innerText.trim().toUpperCase();
        const status = cols[5].innerText.trim().toUpperCase();
        const dateParts = cols[6].innerText.split('\n');
        const date = dateParts[0].trim();

        tableBody.push([receipt, patient, amount, method, status, date]);
    });

    if (tableBody.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }

    doc.autoTable({
        startY: 75,
        head: [['Receipt #', 'Patient', 'Amount', 'Method', 'Status', 'Date']],
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
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: 50 },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 20 },
            4: { cellWidth: 25, fontStyle: 'bold' },
            5: { cellWidth: 25 }
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 4) {
                const status = data.cell.raw;
                if (status === 'COMPLETED') {
                    data.cell.styles.textColor = [22, 163, 74];
                } else if (status === 'PENDING') {
                    data.cell.styles.textColor = [217, 119, 6];
                } else if (status === 'FAILED') {
                    data.cell.styles.textColor = [220, 38, 38];
                }
            }
            if (data.section === 'body' && data.column.index === 2) {
                 data.cell.styles.textColor = [44, 62, 80];
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
        doc.text('CarePlus Smart Clinic Management - Financial Confidential', 15, pageHeight - 15);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 15, { align: 'right' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_Finance_Report_${timestamp}.pdf`);

    showNotification('Report downloaded successfully!', 'success');
}

// Bill Items Management
function addBillItem(description = '', price = '') {
    const container = document.getElementById('billItemsContainer');
    const index = container.children.length;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="padding: 5px;">
            <input type="text" name="items[${index}][description]" value="${description}" placeholder="Item name..." class="item-desc" required style="width: 100%; padding: 0.875rem 1rem; border-radius: 12px; border: 2px solid #e0e0e0; background: #fafafa; transition: all 0.3s ease; font-family: inherit;">
        </td>
        <td style="padding: 5px;">
            <input type="number" name="items[${index}][amount]" value="${price}" placeholder="0.00" step="0.01" min="0" class="item-price" required oninput="calculateTotal()" style="width: 100%; padding: 0.875rem 1rem; border-radius: 12px; border: 2px solid #e0e0e0; background: #fafafa; transition: all 0.3s ease; font-family: inherit;">
        </td>
        <td style="padding: 5px; text-align: center;">
            <button type="button" onclick="removeBillItem(this)" style="background: none; border: none; color: red; cursor: pointer; font-size: 1.2em;">&times;</button>
        </td>
    `;
    container.appendChild(row);
    calculateTotal();
}

function removeBillItem(btn) {
    btn.closest('tr').remove();
    calculateTotal();
}

function calculateTotal() {
    let total = 0;
    const prices = document.querySelectorAll('.item-price');

    prices.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) {
            total += val;
        }
    });

    document.getElementById('calculatedTotal').textContent = total.toFixed(2);
    document.getElementById('amount').value = total.toFixed(2);
}

// Modal Functions
function openAddModal() {
    document.getElementById('modalTitle').textContent = '💳 Record New Payment';
    document.getElementById('formAction').value = 'add';
    document.getElementById('paymentForm').reset();
    document.getElementById('billItemsContainer').innerHTML = '';

    addBillItem('Consultation Fee', '');

    loadPatientAppointments();

    const modal = document.getElementById('paymentModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editPayment(id) {
    console.log('Editing payment:', id); // Debug log
    console.log('All payments:', allPayments); // Debug log

    const payment = getPaymentById(id);
    if (!payment) {
        showNotification('Payment record not found!', 'error');
        console.error('Available payments:', allPayments);
        return;
    }

    const modal = document.getElementById('paymentModal');
    if (!modal) {
        console.error('Payment modal not found!');
        showNotification('Modal not found in page!', 'error');
        return;
    }

    document.getElementById('modalTitle').textContent = '✏️ Edit Payment';
    document.getElementById('formAction').value = 'edit';
    document.getElementById('paymentId').value = payment.payment_id;
    document.getElementById('patientId').value = payment.patient_id;
    document.getElementById('paymentMethod').value = payment.payment_method;
    document.getElementById('paymentStatus').value = payment.payment_status;
    document.getElementById('transactionId').value = payment.transaction_id || '';

    document.getElementById('billItemsContainer').innerHTML = '';

    if (payment.payment_details) {
        try {
            const details = typeof payment.payment_details === 'string'
                            ? JSON.parse(payment.payment_details)
                            : payment.payment_details;

            if (Array.isArray(details) && details.length > 0) {
                details.forEach(item => {
                    addBillItem(item.item, item.price);
                });
            } else {
                addBillItem('Standard Charge', payment.amount);
            }
        } catch (e) {
            console.error("Error parsing items", e);
            addBillItem('Standard Charge', payment.amount);
        }
    } else {
        addBillItem('Standard Charge', payment.amount);
    }

    calculateTotal();
    loadPatientAppointments();

    setTimeout(() => {
        if (payment.appointment_id) {
            const apptSelect = document.getElementById('appointmentId');
            if (apptSelect) {
                apptSelect.value = payment.appointment_id;
            }
        }
    }, 100);

    console.log('Opening edit modal...');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    console.log('Modal should be visible now');
}

function closeModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function viewPayment(id) {
    console.log('Viewing payment:', id); // Debug log
    console.log('All payments:', allPayments); // Debug log
    console.log('Looking for payment_id:', id);
    console.log('Available payment IDs:', allPayments.map(p => p.payment_id));

    const payment = getPaymentById(id);
    if (!payment) {
        showNotification('Payment record not found!', 'error');
        console.error('Available payments:', allPayments);
        return;
    }

    currentPayment = payment;
    const viewModal = document.getElementById('viewModal');
    const viewContent = document.getElementById('viewContent');

    if (!viewModal || !viewContent) {
        console.error('Modal elements not found!');
        showNotification('Modal not found in page!', 'error');
        return;
    }

    const date = new Date(payment.payment_date);
    const formattedAmount = parseFloat(payment.amount || 0).toFixed(2);

    viewContent.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><label>Receipt Number</label><div class="value"><code style="background: #e0f2fe; padding: 5px 10px; border-radius: 4px; color: #0369a1;">${payment.receipt_number || 'N/A'}</code></div></div>
            <div class="detail-item"><label>Status</label><div class="value"><span class="status-badge status-${payment.payment_status}">${payment.payment_status.toUpperCase()}</span></div></div>
            <div class="detail-item"><label>Patient</label><div class="value">${payment.patient_fname || ''} ${payment.patient_lname || ''}</div></div>
            <div class="detail-item"><label>Amount</label><div class="value" style="color: #16A34A; font-weight: bold;">RM ${formattedAmount}</div></div>
            <div class="detail-item"><label>Method</label><div class="value">${payment.payment_method.toUpperCase()}</div></div>
            ${payment.appointment_id ? `<div class="detail-item"><label>Appointment</label><div class="value">#${payment.appointment_id} (${payment.appt_payment_status || 'unknown'})</div></div>` : ''}
            <div class="detail-item"><label>Date</label><div class="value">${date.toLocaleString()}</div></div>
            ${payment.payment_notes ? `<div class="detail-item" style="grid-column:1/-1"><label>Notes</label><div class="value">${payment.payment_notes}</div></div>` : ''}
        </div>
    `;

    console.log('Opening view modal...');
    viewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    console.log('Modal should be visible now');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openConfirmModal(paymentId, action, currentApptStatus = 'unpaid') {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirm_payment_id').value = paymentId;
    document.getElementById('confirm_action_type').value = action;

    const title = document.getElementById('confirmModalTitle');
    const message = document.getElementById('confirmMessage');
    const submitBtn = document.getElementById('confirmSubmitBtn');
    const apptStatusSelect = document.getElementById('confirmAppointmentStatus');

    if (action === 'approve') {
        title.textContent = '✅ Approve Payment';
        message.innerHTML = 'Approving this payment will mark it as <b>COMPLETED</b>.';
        submitBtn.textContent = 'Approve & Update';
        submitBtn.style.background = '#FF8C42';
        submitBtn.style.color = '#ffffff';
        submitBtn.style.border = '2px solid #FF8C42';
        apptStatusSelect.value = 'paid';
    } else {
        title.textContent = '❌ Reject Payment';
        message.innerHTML = 'Rejecting this payment will mark it as <b>FAILED</b>.';
        submitBtn.textContent = 'Reject & Update';
        submitBtn.style.background = '#ffffff';
        submitBtn.style.color = '#FF8C42';
        submitBtn.style.border = '2px solid #FF8C42';
        apptStatusSelect.value = currentApptStatus !== 'paid' ? currentApptStatus : 'unpaid';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function deletePayment(paymentId, receiptNumber) {
    if (confirm(`Delete payment ${receiptNumber}? This cannot be undone.`)) {
        document.getElementById('delPaymentId').value = paymentId;
        document.getElementById('deleteForm').submit();
    }
}

function loadPatientAppointments() {
    const patientId = document.getElementById('patientId').value;
    const appointmentSelect = document.getElementById('appointmentId');
    appointmentSelect.innerHTML = '<option value="">Select or Leave Blank</option>';

    if (!patientId || typeof appointments === 'undefined') return;

    const patientAppointments = appointments.filter(apt => apt.patient_id == patientId);

    patientAppointments.forEach(apt => {
        const date = new Date(apt.appointment_date).toLocaleDateString();
        const option = document.createElement('option');
        option.value = apt.appointment_id;
        option.textContent = `#${apt.appointment_id} - ${date} (${apt.payment_status})`;
        appointmentSelect.appendChild(option);
    });
}

function printReceipt(payment) {
    if (payment) currentPayment = payment;
    if (!currentPayment && window.currentPayment) currentPayment = window.currentPayment;
    if (!currentPayment) return showNotification("No payment selected for printing", "warning");

    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh.', 'error');
        return;
    }

    showNotification('Downloading Receipt PDF...', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const primaryColor = [255, 140, 66];
    const secondaryColor = [44, 62, 80];
    const lightGray = [245, 245, 245];
    const white = [255, 255, 255];
    const headerGray = [230, 230, 230];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('CarePlus', 15, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Official Payment Receipt', 15, 26);

    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 15, { align: 'right' });
    doc.text(`Receipt #: ${currentPayment.receipt_number}`, 195, 20, { align: 'right' });

    const detailsBody = [
        [{ content: 'Patient Details', colSpan: 2, styles: { fillColor: headerGray, fontStyle: 'bold' } }],
        ['Patient Name', `${currentPayment.patient_fname} ${currentPayment.patient_lname}`],
        ['IC / ID Number', currentPayment.patient_ic],
        ['Payment Method', currentPayment.payment_method.toUpperCase()],
        ['Transaction Status', currentPayment.payment_status.toUpperCase()],
    ];

    if (currentPayment.appointment_id) {
        detailsBody.push(['Appointment Ref', `#${currentPayment.appointment_id}`]);
    }

    let lineItems = [];
    if (currentPayment.payment_details) {
        try {
            lineItems = typeof currentPayment.payment_details === 'string'
                ? JSON.parse(currentPayment.payment_details)
                : currentPayment.payment_details;
        } catch (e) {
            console.error("Error parsing items", e);
        }
    }

    detailsBody.push([{
        content: 'Charges Breakdown',
        colSpan: 2,
        styles: { fillColor: headerGray, fontStyle: 'bold', halign: 'left' }
    }]);

    if (Array.isArray(lineItems) && lineItems.length > 0) {
        lineItems.forEach(item => {
            const priceStr = `RM ${parseFloat(item.price).toFixed(2)}`;
            detailsBody.push([
                item.item,
                { content: priceStr, styles: { halign: 'right' } }
            ]);
        });
    } else {
        detailsBody.push([
            'Standard Medical Services',
            { content: `RM ${parseFloat(currentPayment.amount).toFixed(2)}`, styles: { halign: 'right' } }
        ]);
    }

    doc.autoTable({
        startY: 50,
        body: detailsBody,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 4,
            textColor: secondaryColor,
            lineColor: [230, 230, 230],
            lineWidth: 0.1,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 'auto', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.row.index > 0 && data.row.index <= 5 && data.column.index === 0) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [250, 250, 250];
            }
        },
        margin: { left: 15, right: 15 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFillColor(...lightGray);
    doc.roundedRect(120, finalY, 75, 25, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text('TOTAL AMOUNT PAID', 157.5, finalY + 8, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont(undefined, 'bold');
    doc.text(`RM ${parseFloat(currentPayment.amount).toFixed(2)}`, 157.5, finalY + 18, { align: 'center' });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont(undefined, 'normal');

    doc.text('Thank you for choosing CarePlus Clinic.', 105, pageHeight - 20, { align: 'center' });
    doc.text('This receipt is computer generated and requires no signature.', 105, pageHeight - 15, { align: 'center' });

    const filename = `Receipt_${currentPayment.receipt_number}.pdf`;
    doc.save(filename);

    showNotification('Receipt downloaded successfully!', 'success');
}

// Global Click Listener
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
        closeViewModal();
        closeConfirmModal();
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeViewModal();
        closeConfirmModal();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (document.getElementById('viewModal').classList.contains('active') && currentPayment) {
            printReceipt(currentPayment);
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportPaymentsCSV();
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        exportPaymentsPDF();
    }
});

// Inject Animation CSS
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
});
