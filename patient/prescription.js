let currentPrescriptionId = null;

// Search prescriptions
function searchPrescriptions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const prescriptionCards = document.querySelectorAll('.prescription-card');

    prescriptionCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// View prescription details in modal
async function viewPrescriptionDetails(prescriptionId) {
    currentPrescriptionId = prescriptionId;
    const modal = document.getElementById('prescriptionModal');
    const modalBody = document.getElementById('modalBody');

    try {
        // Fetch prescription details
        const response = await fetch(`get_prescription_details.html?prescription_id=${prescriptionId}`);
        const data = await response.json();

        if (!data.success) {
            showNotification('Failed to load prescription details', 'error');
            return;
        }

        const prescription = data.prescription;

        // Build modal content
        let modalContent = `
            <div class="prescription-details">
                <!-- Prescription Info -->
                <div class="detail-section">
                    <h3>📋 Prescription Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">Prescription #:</span>
                            <span class="value">Rx #${String(prescription.prescription_id).padStart(6, '0')}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Date Issued:</span>
                            <span class="value">${new Date(prescription.prescription_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <!-- Doctor Info -->
                <div class="detail-section">
                    <h3>👨‍⚕️ Prescribing Doctor</h3>
                    <div class="doctor-info-grid">
                        <div class="doctor-image-container">
                            ${prescription.doctor_profile_picture ? `
                                <img src="${window.CarePlusViewPHP.photoUrl(prescription.doctor_profile_picture)}"
                                     alt="Dr. ${window.CarePlusViewPHP.escape(prescription.doctor_name)}"
                                     class="doctor-modal-image"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div class="doctor-fallback-avatar" style="display: none;">
                                    ${prescription.doctor_gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                                </div>
                            ` : `
                                <div class="doctor-fallback-avatar">
                                    ${prescription.doctor_gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                                </div>
                            `}
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Doctor:</span>
                                <span class="value">Dr. ${window.CarePlusViewPHP.escape(prescription.doctor_name)}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Specialization:</span>
                                <span class="value">${prescription.specialization}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Contact:</span>
                                <span class="value">${prescription.doctor_phone || 'Not provided'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Diagnosis -->
                <div class="detail-section diagnosis">
                    <h3>🔍 Diagnosis</h3>
                    <p>${window.CarePlusViewPHP.escape(prescription.diagnosis)}</p>
                </div>

                <!-- Medications -->
                <div class="detail-section medications">
                     <h3>💊 Prescribed Medications</h3>
                        <div class="medications-table">
                            ${prescription.medications.map((med, index) => `
                                <div class="med-card">
                                    <div class="med-number">${index + 1}</div>
                                    <div class="med-content">
                                        <div class="med-header">
                                            <h4>${window.CarePlusViewPHP.escape(med.name || 'N/A')}</h4>
                                            <span class="dosage-badge">${window.CarePlusViewPHP.escape(med.dosage || 'N/A')}</span>
                                        </div>
                                        <div class="med-info">
                                            <div class="med-row">
                                                <span class="icon">⏰</span>
                                                <span class="label">Frequency:</span>
                                                <span class="value">${window.CarePlusViewPHP.escape(med.frequency || 'N/A')}</span>
                                            </div>
                                            <div class="med-row">
                                                <span class="icon">📆</span>
                                                <span class="label">Duration:</span>
                                                <span class="value">${window.CarePlusViewPHP.escape(med.duration || 'N/A')}</span>
                                            </div>
                                            ${med.instructions ? `
                                                <div class="med-row instructions">
                                                    <span class="icon">📝</span>
                                                    <span class="label">Instructions:</span>
                                                    <span class="value">${window.CarePlusViewPHP.escape(med.instructions)}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                ${prescription.notes ? `
                    <div class="detail-section notes">
                        <h3>📌 Additional Notes</h3>
                        <p>${window.CarePlusViewPHP.escape(prescription.notes).replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}
            </div>
        `;

        modalBody.innerHTML = modalContent;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('Error loading prescription:', error);
        showNotification('Failed to load prescription details', 'error');
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('prescriptionModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPrescriptionId = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('prescriptionModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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

    .detail-section {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
    }

    .detail-section h3 {
        font-size: 1.2rem;
        color: #1a1a1a;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .info-item .label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 600;
    }

    .info-item .value {
        font-size: 1rem;
        color: #1a1a1a;
        font-weight: 500;
    }

    .detail-section.diagnosis {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    }

    .detail-section.diagnosis p {
        color: #5d4037;
        line-height: 1.6;
    }

    .detail-section.medications {
        background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
    }

    .medications-table {
        display: grid;
        gap: 1rem;
    }

    .med-card {
        background: white;
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        gap: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .med-number {
        width: 40px;
        height: 40px;
        min-width: 40px;
        background: linear-gradient(135deg, #9c27b0 0%, #ce93d8 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.1rem;
    }

    .med-content {
        flex: 1;
    }

    .med-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #f0f0f0;
    }

    .med-header h4 {
        font-size: 1.1rem;
        color: #1a1a1a;
    }

    .dosage-badge {
        background: linear-gradient(135deg, #26a69a 0%, #6fd4ca 100%);
        color: white;
        padding: 0.4rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .med-info {
        display: grid;
        gap: 0.75rem;
    }

    .med-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .med-row .icon {
        font-size: 1.1rem;
    }

    .med-row .label {
        font-weight: 600;
        color: #666;
        min-width: 100px;
    }

    .med-row .value {
        color: #1a1a1a;
    }

    .med-row.instructions {
        background: #f8f9fa;
        padding: 0.75rem;
        border-radius: 8px;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .detail-section.notes {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    }

    .detail-section.notes p {
        color: #1565c0;
        line-height: 1.6;
    }
`;
document.head.appendChild(style);

// Initialize animations
function initAnimations() {
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Prescription management initialized');
    initAnimations();
});
