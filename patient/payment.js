let currentRating = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Character counter listener
    const reviewText = document.getElementById('review_text');
    if (reviewText) {
        reviewText.addEventListener('input', function() {
            const count = this.value.length;
            document.getElementById('char_count').textContent = count;
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Outside click listener
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
            document.body.style.overflow = 'auto';

            // Reset rating if it was the review modal
            if(event.target.id === 'reviewModal') {
                currentRating = 0;
            }
        }
    }

    // Auto-show pending payment notification if exists
    showPendingPaymentNotification();
});

// Show Pending Payment Notification
function showPendingPaymentNotification() {
    const pendingSection = document.querySelector('.pending-payments-section');
    if (pendingSection) {
        const count = pendingSection.dataset.count;
        if (count && parseInt(count) > 0) {
            const message = parseInt(count) === 1
                ? 'You have 1 pending payment to complete'
                : `You have ${count} pending payments to complete`;

            showNotification(message, 'warning', 8000);

            // Scroll to pending section smoothly after a brief delay
            setTimeout(() => {
                pendingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);
        }
    }
}

// Modal Management
function closeAllModals() {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
    currentRating = 0;
}

// Pending List Modal
function openPendingListModal() {
    const modal = document.getElementById('pendingListModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closePendingListModal() {
    const modal = document.getElementById('pendingListModal');
    if (modal) {
        modal.classList.remove('active');
        // Only restore scrolling if no other modal is open
        if (!document.getElementById('reviewModal').classList.contains('active')) {
            document.body.style.overflow = 'auto';
        }
    }
}

// Review Form Modal
function openReviewModal(appointmentId, doctorId, doctorName, specialization) {
    // Close the list modal first if it's open
    closePendingListModal();

    if (!appointmentId || !doctorId) {
        showNotification('Cannot open review form - missing data', 'error');
        return;
    }

    const modal = document.getElementById('reviewModal');
    if (!modal) return;

    // Set form values
    document.getElementById('review_appointment_id').value = appointmentId;
    document.getElementById('review_doctor_id').value = doctorId;
    document.getElementById('review_doctor_name').textContent = `Dr. ${doctorName}`;
    document.getElementById('review_specialization').textContent = specialization || 'General Practice';

    // Reset form state
    currentRating = 0;
    document.getElementById('modal_rating').value = 0;
    updateStarDisplay();

    document.getElementById('review_text').value = '';
    document.getElementById('char_count').textContent = '0';
    document.getElementById('rating_error').textContent = '';

    // Remove update flag if exists
    const updateInput = document.getElementById('update_review_flag');
    if (updateInput) updateInput.remove();

    // Update UI text
    const modalTitle = document.querySelector('#reviewModal .modal-header h2');
    if (modalTitle) modalTitle.innerHTML = '⭐ Rate Your Experience';

    const submitButton = document.querySelector('#reviewForm button[type="submit"]');
    if (submitButton) submitButton.innerHTML = '<span>⭐</span> Submit Review';

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editReview(appointmentId, doctorId, doctorName, specialization, rating, reviewText) {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;

    // Set form values
    document.getElementById('review_appointment_id').value = appointmentId;
    document.getElementById('review_doctor_id').value = doctorId;
    document.getElementById('review_doctor_name').textContent = `Dr. ${doctorName}`;
    document.getElementById('review_specialization').textContent = specialization || 'General Practice';

    // Set rating
    currentRating = parseInt(rating) || 0;
    document.getElementById('modal_rating').value = currentRating;
    updateStarDisplay();

    // Set text
    const reviewTextarea = document.getElementById('review_text');
    reviewTextarea.value = reviewText || '';
    document.getElementById('char_count').textContent = (reviewText || '').length;

    // Add update flag
    let updateInput = document.getElementById('update_review_flag');
    if (!updateInput) {
        updateInput = document.createElement('input');
        updateInput.type = 'hidden';
        updateInput.name = 'update_review';
        updateInput.id = 'update_review_flag';
        document.getElementById('reviewForm').appendChild(updateInput);
    }
    updateInput.value = '1';

    // Update UI text
    const modalTitle = document.querySelector('#reviewModal .modal-header h2');
    if (modalTitle) modalTitle.innerHTML = '✏️ Update Your Review';

    const submitButton = document.querySelector('#reviewForm button[type="submit"]');
    if (submitButton) submitButton.innerHTML = '<span>⭐</span> Update Review';

    document.getElementById('rating_error').textContent = '';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        currentRating = 0;
    }
}

// Star Rating Logic
function setRating(rating) {
    currentRating = rating;
    document.getElementById('modal_rating').value = rating;
    updateStarDisplay();
    document.getElementById('rating_error').textContent = '';
}

function updateStarDisplay() {
    const stars = document.querySelectorAll('.star-input');
    stars.forEach((star, index) => {
        if (index < currentRating) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
}

// Validation
function validateReview() {
    const rating = document.getElementById('modal_rating').value;

    if (!rating || rating == 0) {
        document.getElementById('rating_error').textContent = 'Please select a rating';
        showNotification('Please select a star rating', 'error');
        return false;
    }

    const submitButton = document.querySelector('#reviewForm button[type="submit"]');
    const isUpdate = document.getElementById('update_review_flag') &&
                     document.getElementById('update_review_flag').value === '1';

    if (submitButton) {
        submitButton.innerHTML = isUpdate ? '<span>⏳</span> Updating...' : '<span>⏳</span> Submitting...';
        submitButton.disabled = true;
    }

    return true;
}

// Notifications
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        max-width: 400px;
        animation: slideInRight 0.5s ease;
    `;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    notification.innerHTML = `
        <span class="alert-icon">${icons[type]}</span>
        <div class="alert-content"><p>${message}</p></div>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }
    }, duration);
}

// View Payment Receipt Details
async function viewReceipt(paymentId) {
    const modal = document.getElementById('receiptModal');
    const modalBody = document.getElementById('receiptModalBody');

    if (!modal || !modalBody) {
        createReceiptModal();
        return viewReceipt(paymentId);
    }

    modalBody.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p>Loading receipt...</p></div>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        // Updated to use your specific PHP file and parameter name
        const response = await fetch(`get_payment_receipt.html?payment_id=${paymentId}`);
        const data = await response.json();

        if (data.success) {
            const p = data.payment;

            // Build the Fee Breakdown table rows dynamically
            let itemsHtml = '';
            if (p.items && p.items.length > 0) {
                p.items.forEach(item => {
                    itemsHtml += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="text-align: left; padding: 10px;">
                                <div style="font-weight: 600;">${escapeHtml(item.item_name)}</div>
                                <small style="color: #6b7280; text-transform: uppercase; font-size: 0.7rem;">${item.item_type}</small>
                            </td>
                            <td style="padding: 10px;">${item.quantity}</td>
                            <td style="padding: 10px;">RM ${parseFloat(item.unit_price).toFixed(2)}</td>
                            <td style="padding: 10px; font-weight: 600;">RM ${parseFloat(item.total_price).toFixed(2)}</td>
                        </tr>
                    `;
                });
            } else {
                itemsHtml = '<tr><td colspan="4" style="padding: 20px; color: #666;">No itemized data available.</td></tr>';
            }

            // Kept your exact design layout
            modalBody.innerHTML = `
                <div class="receipt-container">
                    <div class="receipt-header">
                        <h2>💳 Payment Receipt</h2>
                        <div class="receipt-id">Receipt #${p.receipt_number}</div>
                    </div>

                    <div class="receipt-status">
                        <span class="status-badge status-paid">✓ Payment Completed</span>
                        <span class="receipt-date">📅 ${formatDateTime(p.payment_date)}</span>
                    </div>

                    <div class="receipt-section">
                        <h3>Patient Information</h3>
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Name:</span><span class="info-value">${escapeHtml(p.patient_name)}</span></div>
                            <div class="info-item"><span class="info-label">Email:</span><span class="info-value">${escapeHtml(p.patient_email)}</span></div>
                            <div class="info-item"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(p.patient_phone || 'N/A')}</span></div>
                        </div>
                    </div>

                    <div class="receipt-section">
                        <h3>Appointment Details</h3>
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Doctor:</span><span class="info-value">Dr. ${escapeHtml(p.doctor_name)}</span></div>
                            <div class="info-item"><span class="info-label">Specialization:</span><span class="info-value">${escapeHtml(p.specialization)}</span></div>
                            <div class="info-item"><span class="info-label">Date:</span><span class="info-value">${formatDate(p.appointment_date)}</span></div>
                            <div class="info-item"><span class="info-label">Time:</span><span class="info-value">${formatTime(p.appointment_time)}</span></div>
                            <div class="info-item"><span class="info-label">Appointment ID:</span><span class="info-value">#${String(p.appointment_id).padStart(6, '0')}</span></div>
                        </div>
                    </div>

                    <div class="receipt-section">
                        <h3>Fee Breakdown</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem;">
                            <thead>
                                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                                    <th style="text-align: left; padding: 10px;">Item Description</th>
                                    <th style="padding: 10px;">Qty</th>
                                    <th style="padding: 10px;">Unit</th>
                                    <th style="padding: 10px;">Total</th>
                                </tr>
                            </thead>
                            <tbody style="text-align: center;">
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div class="receipt-total">
                        <div class="total-row total-final">
                            <span>Grand Total Paid:</span>
                            <span>RM ${parseFloat(p.amount).toFixed(2)}</span>
                        </div>
                        <div style="text-align: right; font-size: 0.75rem; color: #666; margin-top: 5px;">
                            Payment Method: ${p.payment_method.toUpperCase()}
                        </div>
                    </div>

                    <div class="receipt-footer">
                        <p>Thank you for choosing CarePlus Healthcare System</p>
                        <p class="receipt-note">This is an official receipt for your payment. Please keep it for your records.</p>
                    </div>

                    <div class="receipt-actions">
                        <button class="btn btn-primary" id="btn-download-receipt" onclick="downloadReceiptPDF(${p.payment_id})">
                            <span>📄</span> Download Receipt
                        </button>
                    </div>
                </div>
            `;
        } else {
            modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;"><p>⚠️ ${escapeHtml(data.message)}</p></div>`;
        }
    } catch (error) {
        modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;"><p>❌ Network Error</p></div>`;
    }
}

// Download Receipt PDF
async function downloadReceiptPDF(paymentId) {
    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded. Please refresh the page.', 'error');
        return;
    }

    const btn = document.getElementById('btn-download-receipt');
    if (btn) {
        btn.innerHTML = '<span>⏳</span> Generating...';
        btn.disabled = true;
    }

    try {
        const response = await fetch(`get_payment_receipt.html?payment_id=${paymentId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        const p = data.payment;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Styles
        const brandColor = [0, 166, 126];
        const lightGray = [240, 242, 245];
        const darkText = [40, 40, 40];

        // 1. Header
        doc.setFillColor(...brandColor);
        doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24); doc.setFont("helvetica", "bold");
        doc.text('CarePlus', 15, 20);
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text('Healthcare System - Payment Receipt', 15, 28);
        doc.setFontSize(10);
        doc.text(`Receipt #${p.receipt_number}`, 195, 20, { align: 'right' });
        doc.text(`Date: ${new Date(p.payment_date).toLocaleDateString()}`, 195, 27, { align: 'right' });

        // 2. Info Tables (Patient & Appointment)
        doc.autoTable({
            startY: 60,
            head: [['Patient Information', 'Appointment Details']],
            body: [[
                `Name: ${p.patient_name}\nEmail: ${p.patient_email}\nPhone: ${p.patient_phone || 'N/A'}`,
                `Doctor: Dr. ${p.doctor_name}\nDate: ${formatDate(p.appointment_date)}\nID: #${p.appointment_id}`
            ]],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: brandColor }
        });

        // 3. Dynamic Fee Breakdown Table (Handles 1 or 55+ items)
        doc.setFontSize(12); doc.setTextColor(...brandColor); doc.setFont("helvetica", "bold");
        doc.text('Fee Breakdown', 15, doc.lastAutoTable.finalY + 10);

        const itemRows = p.items.map(item => [
            item.item_name + ' (' + item.item_type.toUpperCase() + ')',
            item.quantity,
            'RM ' + parseFloat(item.unit_price).toFixed(2),
            'RM ' + parseFloat(item.total_price).toFixed(2)
        ]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 13,
            head: [['Description', 'Qty', 'Unit Price', 'Total']],
            body: itemRows,
            theme: 'striped',
            headStyles: { fillColor: brandColor },
            styles: { fontSize: 9 },
            columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
        });

        // 4. Grand Total
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(...lightGray);
        doc.roundedRect(130, finalY, 65, 15, 2, 2, 'F');
        doc.setTextColor(...darkText);
        doc.setFontSize(11);
        doc.text('Grand Total:', 135, finalY + 9);
        doc.text('RM ' + parseFloat(p.amount).toFixed(2), 190, finalY + 9, { align: 'right' });

        // 5. Footer
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text('Thank you for choosing CarePlus. This is an official computer-generated receipt.', 105, 285, { align: 'center' });

        doc.save(`CarePlus_Receipt_${p.receipt_number}.pdf`);
        showNotification('✓ Receipt downloaded successfully!', 'success');

    } catch (error) {
        console.error(error);
        showNotification('Error generating PDF.', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = '<span>📄</span> Download Receipt';
            btn.disabled = false;
        }
    }
}

// Helper function to clean text
function cleanText(text) {
    if (!text) return '';
    let clean = text.replace(/^[#*\-\s]+/, '');
    clean = clean.replace(/\*\*/g, '');
    clean = clean.replace(/[^a-zA-Z0-9\s.,!?:;()'"\/\-%\+°@]/g, '');
    return clean.trim();
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Helper function to format time
function formatTime(timeString) {
    const time = new Date('2000-01-01 ' + timeString);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Helper function to format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Create receipt modal
function createReceiptModal() {
    const modalHTML = `
        <div id="receiptModal" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>💳 Payment Receipt</h2>
                    <button class="modal-close" onclick="closeReceiptModal()">&times;</button>
                </div>
                <div class="modal-body" id="receiptModalBody">
                    <div style="text-align: center; padding: 40px;">
                        <div class="spinner"></div>
                        <p>Loading receipt...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close receipt modal
function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Add spinner styles if not present
if (!document.getElementById('receipt-spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'receipt-spinner-styles';
    style.textContent = `
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #00a67e;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .receipt-container {
            padding: 20px;
        }

        .receipt-header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            margin-bottom: 20px;
        }

        .receipt-header h2 {
            margin: 0 0 10px 0;
            color: #00a67e;
        }

        .receipt-id {
            font-size: 0.9rem;
            color: #6b7280;
        }

        .receipt-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
        }

        .receipt-date {
            color: #6b7280;
            font-size: 0.9rem;
        }

        .receipt-section {
            margin-bottom: 25px;
            padding: 20px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }

        .receipt-section h3 {
            margin: 0 0 15px 0;
            font-size: 1.1rem;
            color: #00a67e;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
        }

        .info-grid {
            display: grid;
            gap: 12px;
        }

        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
        }

        .info-label {
            font-weight: 600;
            color: #4b5563;
        }

        .info-value {
            color: #1f2937;
            text-align: right;
        }

        .receipt-total {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 1rem;
        }

        .total-final {
            border-top: 2px solid #00a67e;
            padding-top: 15px;
            margin-top: 10px;
            font-size: 1.2rem;
            font-weight: bold;
            color: #00a67e;
        }

        .receipt-footer {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .receipt-footer p {
            margin: 5px 0;
        }

        .receipt-note {
            font-size: 0.9rem;
            color: #6b7280;
            font-style: italic;
        }

        .receipt-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .receipt-actions .btn {
            flex: 1;
            max-width: 250px;
        }
    `;
    document.head.appendChild(style);
}

// Export functions for global access
window.viewReceipt = viewReceipt;
window.downloadReceiptPDF = downloadReceiptPDF;
window.closeReceiptModal = closeReceiptModal;

// Simple localhost payment message function
function showLocalhostPaymentMessage() {
    alert(
        "⚠️ Payment Notice\n\n" +
        "Online payment is not available in this system.\n\n" +
        "Please proceed to the payment counter to make payment and collect your medication.\n\n" +
        "📍 Counter Location: Ground Floor, Main Building\n" +
        "🕐 Operating Hours:\n" +
        "📅 Mon–Sat: 9:00 AM – 8:00 PM\n" +
        "🚫 Sun: Closed\n\n" +
        "💡 Remember to bring your Appointment ID!"
    );
}

function closePaymentNoticeModal() {
    const modal = document.getElementById('paymentNoticeModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Keep these for backward compatibility
function showCounterPaymentInfo() {
    showLocalhostPaymentMessage();
}

function viewPaymentDetails(appointmentId, doctorName, specialization, date, time, amount) {
    const modal = document.getElementById('paymentDetailsModal');
    const body = document.getElementById('paymentDetailsBody');
    if (!modal || !body) return;

    body.innerHTML = `
        <div class="payment-details-container">
            <div class="details-section">
                <h3>📋 Appointment Details</h3>
                <div class="detail-row"><span class="detail-label">Doctor:</span><span class="detail-value">Dr. ${escapeHtml(doctorName)}</span></div>
                <div class="detail-row"><span class="detail-label">Specialization:</span><span class="detail-value">${escapeHtml(specialization)}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${escapeHtml(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Time:</span><span class="detail-value">${escapeHtml(time)}</span></div>
            </div>

            <div class="details-section">
                <h3>💰 Payment Summary</h3>
                <div class="detail-row"><span class="detail-label">Amount Due:</span><span class="detail-value">RM ${parseFloat(amount).toFixed(2)}</span></div>
                <div class="detail-row"><span class="detail-label">Payment Method:</span><span class="detail-value">Pay at Counter</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">Pending</span></div>
            </div>
        </div>
    `;

    const modalBody = document.querySelector('#paymentDetailsModal .modal-body');
    if (modalBody) modalBody.scrollTop = 0;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePaymentDetailsModal() {
    const modal = document.getElementById('paymentDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

window.closePaymentDetailsModal = closePaymentDetailsModal;
