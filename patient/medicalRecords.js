document.addEventListener('DOMContentLoaded', function() {
    initializeMedicalRecords();
    setupViewRecordButtons();
});

function initializeMedicalRecords() {
    const filterSelects = document.querySelectorAll('.filters-form select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            // document.getElementById('filtersForm').submit();
        });
    });

    const searchInput = document.querySelector('input[name="search"]');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('filtersForm').submit();
            }
        });
    }
}

// Setup event listeners for all view buttons
function setupViewRecordButtons() {
    // Remove any existing listeners first
    const oldButtons = document.querySelectorAll('.view-record-btn');
    oldButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    // Add new listeners using event delegation
    document.body.addEventListener('click', handleViewRecordClick);
}

// Handle view record button clicks
function handleViewRecordClick(e) {
    // Check if clicked element or its parent is a view-record-btn
    const btn = e.target.closest('.view-record-btn');

    if (btn) {
        // Stop all event propagation immediately
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const recordId = btn.getAttribute('data-record-id');

        if (recordId) {
            console.log('Opening record:', recordId); // Debug log
            viewRecord(parseInt(recordId));
        }

        return false; // Extra safety
    }
}

// View record details - NO event parameter
async function viewRecord(recordId) {
    console.log('viewRecord called with ID:', recordId); // Debug log

    const modal = document.getElementById('recordModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) {
        console.error('Modal elements not found');
        return;
    }

    // Show loading state
    modalBody.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading record details...</p>
        </div>
    `;
    modal.classList.add('show');

    try {
        const formData = new FormData();
        formData.append('action', 'view_record');
        formData.append('record_id', recordId);

        const response = await fetch('medicalRecords.html', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log

        if (data.success) {
            displayRecordDetails(data.record);
        } else {
            showError(data.message || 'Error loading record details');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Unable to connect to the server. Please try again.');
    }
}

// Display record details in modal
function displayRecordDetails(record) {
    const modalBody = document.getElementById('modalBody');

    if (!modalBody) return;

    const html = `
        <div class="record-modal-container">
            <!-- Quick Info Banner -->
            <div class="quick-info-banner">
                <div class="quick-info-item">
                    <span class="quick-info-icon">📅</span>
                    <div>
                        <div class="quick-info-label">Visit Date</div>
                        <div class="quick-info-value">${formatDate(record.appointment_date || record.visit_date)}</div>
                    </div>
                </div>
                <div class="quick-info-item">
                    <span class="quick-info-icon">👨‍⚕️</span>
                    <div>
                        <div class="quick-info-label">Doctor</div>
                        <div class="quick-info-value">Dr. ${escapeHtml(record.doctor_fname)} ${escapeHtml(record.doctor_lname)}</div>
                    </div>
                </div>
                <div class="quick-info-item">
                    <span class="quick-info-icon">🩺</span>
                    <div>
                        <div class="quick-info-label">Specialty</div>
                        <div class="quick-info-value">${escapeHtml(record.specialization || 'General Practice')}</div>
                    </div>
                </div>
            </div>

            <!-- TOP SECTION -->
            <div class="modal-content-grid">
                <!-- Left Column: Diagnosis & Symptoms -->
                <div class="modal-column">
                    <div class="info-card diagnosis-card">
                        <div class="info-card-header">
                            <span class="card-icon">💉</span>
                            <h4>Diagnosis</h4>
                        </div>
                        <div class="info-card-body">
                            <p class="diagnosis-text">${escapeHtml(record.diagnosis || 'No diagnosis provided')}</p>
                        </div>
                    </div>

                    ${record.symptoms ? `
                        <div class="info-card symptoms-card">
                            <div class="info-card-header">
                                <span class="card-icon">🤒</span>
                                <h4>Symptoms Reported</h4>
                            </div>
                            <div class="info-card-body">
                                <div class="symptoms-list">
                                    ${formatSymptomsList(record.symptoms)}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Right Column: Lab Results & ADDITIONAL NOTES -->
                <div class="modal-column">
                    ${record.lab_results ? `
                        <div class="info-card lab-card">
                            <div class="info-card-header">
                                <span class="card-icon">🔬</span>
                                <h4>Laboratory Results</h4>
                            </div>
                            <div class="info-card-body">
                                ${formatLabResults(record.lab_results)}
                            </div>
                        </div>
                    ` : ''}

                    ${record.notes ? `
                        <div class="info-card notes-card">
                            <div class="info-card-header">
                                <span class="card-icon">📝</span>
                                <h4>Additional Notes</h4>
                            </div>
                            <div class="info-card-body">
                                <p>${escapeHtml(record.notes)}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- MIDDLE SECTION: PRESCRIPTION (Full Width) -->
            ${record.prescription ? `
                <div class="info-card prescription-card" style="margin: 0.5rem 0;">
                    <div class="info-card-header">
                        <span class="card-icon">💊</span>
                        <h4>Prescription</h4>
                    </div>
                    <div class="info-card-body">
                        ${formatPrescriptionList(record.prescription)}
                    </div>
                </div>
            ` : ''}

            <!-- BOTTOM SECTION: Treatment (Left) / Follow-up (Right) -->
            <div class="modal-content-grid">
                <div class="modal-column">
                    ${record.treatment_plan ? `
                        <div class="info-card treatment-card">
                            <div class="info-card-header">
                                <span class="card-icon">📋</span>
                                <h4>Treatment Plan</h4>
                            </div>
                            <div class="info-card-body">
                                <p>${escapeHtml(record.treatment_plan)}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="modal-column">
                    ${record.follow_up_notes ? `
                        <div class="info-card followup-card">
                            <div class="info-card-header">
                                <span class="card-icon">📌</span>
                                <h4>Follow-up Notes</h4>
                            </div>
                            <div class="info-card-body">
                                <div class="alert-box">
                                    <span class="alert-icon">⚠️</span>
                                    <p>${escapeHtml(record.follow_up_notes)}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Footer Metadata -->
            <div class="modal-footer-meta">
                <div class="meta-chip">
                    <span class="meta-icon">🆔</span>
                    <span>Record #${record.record_id}</span>
                </div>
                <div class="meta-chip">
                    <span class="meta-icon">📅</span>
                    <span>Created: ${formatDateTime(record.created_at)}</span>
                </div>
                ${record.updated_at !== record.created_at ? `
                    <div class="meta-chip">
                        <span class="meta-icon">🔄</span>
                        <span>Updated: ${formatDateTime(record.updated_at)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
}

// Format symptoms as a list
function formatSymptomsList(symptoms) {
    if (!symptoms) return '';

    const lines = symptoms.split('\n').filter(line => line.trim());

    if (lines.length === 0) return escapeHtml(symptoms);

    return '<ul class="custom-list">' +
        lines.map(line => {
            const cleaned = line.trim().replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
            return `<li><span class="list-bullet">•</span><span>${escapeHtml(cleaned)}</span></li>`;
        }).join('') +
        '</ul>';
}

// Format prescription as structured list
function formatPrescriptionList(prescription) {
    if (!prescription) return '';

    const lines = prescription.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';

    let html = '<div class="prescription-grouped-grid">';
    let currentCard = null;

    lines.forEach(line => {
        const text = line.trim();

        const isDetail = /^[-\u2022*]/.test(text) ||
                         /^(Dosage|Frequency|Duration|Qty|Quantity|Instructions?):/i.test(text);

        if (!isDetail) {
            if (currentCard) {
                html += `
                    <div class="medicine-group-card">
                        <div class="medicine-name">💊 ${currentCard.name}</div>
                        <div class="medicine-details">${currentCard.details}</div>
                    </div>`;
            }

            const cleanName = text.replace(/^\d+[\.)]\s*/, '');
            currentCard = { name: cleanName, details: '' };

        } else {
            if (!currentCard) {
                currentCard = { name: 'General Instructions', details: '' };
            }

            const detailText = text.replace(/^[-\u2022*]\s*/, '');
            currentCard.details += `<div class="detail-row">${escapeHtml(detailText)}</div>`;
        }
    });

    if (currentCard) {
        html += `
            <div class="medicine-group-card">
                <div class="medicine-name">💊 ${currentCard.name}</div>
                <div class="medicine-details">${currentCard.details}</div>
            </div>`;
    }

    html += '</div>';
    return html;
}

// Format lab results
function formatLabResults(labResults) {
    if (!labResults) return '';

    const lines = labResults.split('\n').filter(line => line.trim());

    if (lines.length === 0) return `<p>${escapeHtml(labResults)}</p>`;

    return '<ul class="custom-list lab-list">' +
        lines.map(line => {
            const cleaned = line.trim().replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
            return `<li><span class="list-bullet">✓</span><span>${escapeHtml(cleaned)}</span></li>`;
        }).join('') +
        '</ul>';
}

// Show error message in modal
function showError(message) {
    const modalBody = document.getElementById('modalBody');

    if (!modalBody) return;

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #ef4444;">
            <p style="font-size: 3rem; margin-bottom: 1rem;">⚠️</p>
            <p style="font-size: 1.2rem; font-weight: 600;">${escapeHtml(message)}</p>
            <button class="btn btn-primary" onclick="closeModal()" style="margin-top: 1.5rem;">
                Close
            </button>
        </div>
    `;
}

// Close modal
function closeModal() {
    const modal = document.getElementById('recordModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});


// Show alert message
function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.temp-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `temp-alert`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;

    if (type === 'success') {
        alert.style.background = '#d4edda';
        alert.style.color = '#155724';
        alert.style.borderLeft = '4px solid #28a745';
        alert.textContent = '✓ ' + message;
    } else if (type === 'error') {
        alert.style.background = '#f8d7da';
        alert.style.color = '#721c24';
        alert.style.borderLeft = '4px solid #dc3545';
        alert.textContent = '✖ ' + message;
    } else {
        alert.style.background = '#d1ecf1';
        alert.style.color = '#0c5460';
        alert.style.borderLeft = '4px solid #17a2b8';
        alert.textContent = 'ℹ️ ' + message;
    }

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format date and time
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animation styles
if (!document.getElementById('medical-records-animations')) {
    const style = document.createElement('style');
    style.id = 'medical-records-animations';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Export functions for global access
window.viewRecord = viewRecord;
window.closeModal = closeModal;
