let currentDoctorId = null;

// View doctor details in modal
async function viewDoctorDetails(doctorId) {
    currentDoctorId = doctorId;
    const modal = document.getElementById('doctorModal');
    const modalBody = document.getElementById('modalBody');

    try {
        // Fetch doctor details
        const response = await fetch(`get_doctor_details.html?doctor_id=${doctorId}`);
        const data = await response.json();

        if (!data.success) {
            showNotification('Failed to load doctor details', 'error');
            return;
        }

        const doctor = data.doctor;

        // Build modal content
        let modalContent = `
            <div class="doctor-profile">
                <!-- Doctor Header -->
                <div class="profile-header">
                    <div class="profile-image">
                        ${doctor.profile_picture ?
                            `<img src="${doctor.profile_picture}" alt="Dr. ${doctor.name}">` :
                            `<div class="profile-placeholder"><span>👨‍⚕️</span></div>`
                        }
                        ${doctor.avg_rating > 0 ?
                            `<div class="rating-badge">
                                <span>⭐</span>
                                <span>${doctor.avg_rating.toFixed(1)}</span>
                                <span class="reviews-count">(${doctor.total_reviews} reviews)</span>
                            </div>` : ''
                        }
                    </div>
                    <div class="profile-info">
                        <h2>Dr. ${doctor.name}</h2>
                        <p class="specialization">
                            <span class="icon">🏥</span>
                            ${doctor.specialization}
                        </p>
                        <p class="license">
                            <span class="icon">🎓</span>
                            License: ${doctor.license_number}
                        </p>
                    </div>
                </div>

                <!-- Quick Info -->
                <div class="quick-info">
                    <div class="info-item">
                        <span class="icon">💼</span>
                        <div>
                            <span class="label">Experience</span>
                            <span class="value">${doctor.experience_years} years</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <span class="icon">💰</span>
                        <div>
                            <span class="label">Consultation Fee</span>
                            <span class="value">RM ${parseFloat(doctor.consultation_fee).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <span class="icon">📞</span>
                        <div>
                            <span class="label">Phone</span>
                            <span class="value">${doctor.phone}</span>
                        </div>
                    </div>
                    ${doctor.total_appointments > 0 ? `
                        <div class="info-item">
                            <span class="icon">📊</span>
                            <div>
                                <span class="label">Total Patients</span>
                                <span class="value">${doctor.total_appointments}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                ${doctor.bio ? `
                    <div class="section">
                        <h3><span>📝</span> About</h3>
                        <p class="bio-text">${doctor.bio}</p>
                    </div>
                ` : ''}

                ${doctor.qualifications ? `
                    <div class="section">
                        <h3><span>🎓</span> Qualifications</h3>
                        <p class="qualifications-text">${doctor.qualifications}</p>
                    </div>
                ` : ''}

                ${doctor.available_days && doctor.available_days.length > 0 ? `
                    <div class="section">
                        <h3><span>📅</span> Available Days</h3>
                        <div class="days-grid">
                            ${doctor.available_days.map(day => `
                                <span class="day-badge">${day}</span>
                            `).join('')}
                        </div>
                        ${doctor.available_hours ? `
                            <p class="hours-text">
                                <span class="icon">🕒</span>
                                Available Hours: ${doctor.available_hours}
                            </p>
                        ` : ''}
                    </div>
                ` : ''}

                ${doctor.reviews && doctor.reviews.length > 0 ? `
                    <div class="section">
                        <h3><span>⭐</span> Patient Reviews</h3>
                        <div class="reviews-container">
                            ${doctor.reviews.map(review => `
                                <div class="review-card">
                                    <div class="review-header">
                                        <div class="review-avatar">
                                            <span>👤</span>
                                        </div>
                                        <div class="review-info">
                                            <h4>${review.patient_name}</h4>
                                            <div class="review-rating">
                                                ${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                            </div>
                                            <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    ${review.review_text ? `
                                        <p class="review-text">${review.review_text}</p>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modalBody.innerHTML = modalContent;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('Error loading doctor details:', error);
        showNotification('Failed to load doctor details', 'error');
    }
}

// Book appointment from modal
function bookAppointmentFromModal() {
    if (currentDoctorId) {
        window.location.href = `appointment.html?doctor_id=${currentDoctorId}`;
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('doctorModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentDoctorId = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('doctorModal');
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
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    notification.innerHTML = `
        <span style="font-size: 1.5rem;">${icons[type] || icons.info}</span>
        <span style="font-weight: 500;">${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Filter doctors by specialization (client-side)
function filterDoctorsBySpecialization(specialization) {
    const doctorCards = document.querySelectorAll('.doctor-card');

    doctorCards.forEach(card => {
        if (!specialization || specialization === 'all') {
            card.style.display = '';
        } else {
            const cardSpecialization = card.querySelector('.doctor-specialization').textContent.trim();
            if (cardSpecialization.toLowerCase().includes(specialization.toLowerCase())) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// Search doctors (client-side filter)
function searchDoctors(query) {
    const doctorCards = document.querySelectorAll('.doctor-card');
    const lowerQuery = query.toLowerCase();

    doctorCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Add styles for modal content
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .doctor-profile {
        display: grid;
        gap: 2rem;
    }

    .profile-header {
        display: flex;
        gap: 2rem;
        align-items: center;
        padding: 2rem;
        background: linear-gradient(135deg, #d4f1e8 0%, #b8e6da 100%);
        border-radius: 16px;
    }

    .profile-image {
        position: relative;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .profile-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .profile-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #26a69a 0%, #6fd4ca 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
    }

    .profile-info h2 {
        font-size: 2rem;
        color: #1a1a1a;
        margin-bottom: 0.5rem;
    }

    .profile-info .specialization {
        color: var(--primary-green);
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .profile-info .license {
        color: #666;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .quick-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 12px;
    }

    .info-item {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .info-item .icon {
        font-size: 2rem;
    }

    .info-item .label {
        display: block;
        font-size: 0.85rem;
        color: #666;
        margin-bottom: 0.25rem;
    }

    .info-item .value {
        display: block;
        font-size: 1rem;
        font-weight: 700;
        color: #1a1a1a;
    }

    .section {
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 12px;
    }

    .section h3 {
        font-size: 1.25rem;
        color: #1a1a1a;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .bio-text, .qualifications-text {
        color: #666;
        line-height: 1.8;
    }

    .days-grid {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
    }

    .day-badge {
        background: linear-gradient(135deg, #26a69a 0%, #6fd4ca 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .hours-text {
        color: #666;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background: white;
        border-radius: 8px;
    }

    .reviews-container {
        display: grid;
        gap: 1rem;
    }

    .review-card {
        background: white;
        padding: 1.25rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .review-header {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .review-avatar {
        width: 50px;
        height: 50px;
        min-width: 50px;
        background: linear-gradient(135deg, #d4f1e8 0%, #b8e6da 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
    }

    .review-info h4 {
        font-size: 1rem;
        color: #1a1a1a;
        margin-bottom: 0.25rem;
    }

    .review-rating {
        color: #f57c00;
        font-size: 1.1rem;
        margin-bottom: 0.25rem;
    }

    .review-date {
        font-size: 0.85rem;
        color: #999;
    }

    .review-text {
        color: #666;
        line-height: 1.6;
    }

    .rating-badge .reviews-count {
        font-size: 0.85rem;
        opacity: 0.8;
        margin-left: 0.25rem;
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
    console.log('Doctors page initialized');
    initAnimations();

    // Add smooth scroll for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
