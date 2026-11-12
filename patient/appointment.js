// Global variables
let currentDoctorId = null;
let currentQRCode = null;
let qrCodeInstance = null;
let availableSlotTimes = [];
let appointmentToCancel = null;
let appointmentToReschedule = null; // For reschedule function

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Page loaded - initializing...');
    initializeSearch();
    initializeFilters();
    setMinDate();
    setupEventListeners();
    highlightTodayAppointments();
});

// Search and filter
function initializeSearch() {
    const searchInput = document.getElementById('searchDoctor');
    if (searchInput) {
        searchInput.addEventListener('input', filterDoctors);
    }
}

function initializeFilters() {
    const specializationFilter = document.getElementById('filterSpecialization');
    const sortBy = document.getElementById('sortBy');

    if (specializationFilter) specializationFilter.addEventListener('change', filterDoctors);
    if (sortBy) sortBy.addEventListener('change', sortDoctors);
}

function filterDoctors() {
    const searchTerm = document.getElementById('searchDoctor').value.toLowerCase();
    const selectedSpec = document.getElementById('filterSpecialization').value;
    const doctorCards = document.querySelectorAll('.doctor-card');
    let visibleCount = 0;

    doctorCards.forEach(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const spec = card.getAttribute('data-specialization').toLowerCase();
        const matchesSearch = name.includes(searchTerm) || spec.includes(searchTerm);
        const matchesSpec = !selectedSpec || card.getAttribute('data-specialization') === selectedSpec;

        if (matchesSearch && matchesSpec) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    const grid = document.getElementById('doctorsGrid');
    let noResults = grid.querySelector('.no-results');

    if (visibleCount === 0) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>No doctors found</h3>
                <p>Try adjusting your search or filters</p>
            `;
            grid.appendChild(noResults);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

function sortDoctors() {
    const sortBy = document.getElementById('sortBy').value;
    const grid = document.getElementById('doctorsGrid');
    const cards = Array.from(document.querySelectorAll('.doctor-card'));

    cards.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
            case 'rating':
                return parseFloat(b.getAttribute('data-rating')) - parseFloat(a.getAttribute('data-rating'));
            case 'experience':
                return parseInt(b.getAttribute('data-experience')) - parseInt(a.getAttribute('data-experience'));
            default:
                return 0;
        }
    });

    cards.forEach(card => grid.appendChild(card));
}

// Event Listening
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');

    const dateInput = document.getElementById('appointmentDate');
    const form = document.getElementById('bookingForm');
    const rescheduleDateInput = document.getElementById('rescheduleDate');
    const rescheduleForm = document.getElementById('rescheduleForm');

    if (!dateInput || !form) {
        console.error('❌ Required elements not found!');
        return;
    }

    dateInput.addEventListener('change', function() {
        console.log('📅 Date changed:', this.value);
        if (this.value && currentDoctorId) {
            loadTimeSlots(currentDoctorId, this.value);
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('📤 Form submitted');
        submitBooking();
    });

    // Reschedule form listeners
    if (rescheduleDateInput) {
        rescheduleDateInput.addEventListener('change', function() {
            console.log('📅 Reschedule date changed:', this.value);
            if (this.value && appointmentToReschedule) {
                loadRescheduleTimeSlots(appointmentToReschedule.doctor_id, this.value);
            }
        });
    }

    if (rescheduleForm) {
        rescheduleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📤 Reschedule form submitted');
            submitReschedule();
        });
    }

    console.log('✅ Event listeners set up successfully');
}

// View Medical Record
function viewMedicalRecord(appointmentId) {
    console.log('📄 Viewing medical record for appointment:', appointmentId);

    const modal = document.getElementById('medicalRecordModal');
    const content = document.getElementById('medicalRecordContent');

    if (!modal || !content) {
        console.error('❌ Medical record modal not found');
        showToast('Error displaying medical record', 'error');
        return;
    }

    modal.style.display = 'flex';
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading medical record...</div>';

    const formData = new FormData();
    formData.append('action', 'view_medical_record');
    formData.append('appointment_id', appointmentId);

    fetch('appointment.html', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayMedicalRecord(data);
        } else {
            content.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${data.message}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('❌ Error loading medical record:', error);
        content.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load medical record</p>
            </div>
        `;
    });
}

function displayMedicalRecord(data) {
    const content = document.getElementById('medicalRecordContent');
    const apt = data.appointment;
    const record = data.medical_record;
    const prescriptions = data.prescriptions || [];

    let html = `
        <div class="medical-record-container">
            <div class="record-header">
                <h3>Appointment Details</h3>
                <div class="record-grid">
                    <div class="record-item">
                        <span class="record-label">Date</span>
                        <span class="record-value">${formatDate(apt.appointment_date)} at ${formatTime(apt.appointment_time)}</span>
                    </div>
                    <div class="record-item">
                        <span class="record-label">Doctor</span>
                        <span class="record-value">Dr. ${apt.doctor_fname} ${apt.doctor_lname}</span>
                    </div>
                    <div class="record-item">
                        <span class="record-label">Specialization</span>
                        <span class="record-value">${apt.specialization}</span>
                    </div>
                </div>
            </div>
    `;

    if (record) {
        html += `
            <div class="record-section">
                <h3><i class="fas fa-notes-medical"></i> Diagnosis</h3>
                <p>${record.diagnosis || 'No diagnosis recorded'}</p>
            </div>

            <div class="record-section">
                <h3><i class="fas fa-heartbeat"></i> Vital Signs</h3>
                <div class="vitals-grid">
                    ${record.blood_pressure ? `<div class="vital-item"><strong>Blood Pressure</strong><span>${record.blood_pressure}</span></div>` : ''}
                    ${record.heart_rate ? `<div class="vital-item"><strong>Heart Rate</strong><span>${record.heart_rate} bpm</span></div>` : ''}
                    ${record.temperature ? `<div class="vital-item"><strong>Temperature</strong><span>${record.temperature}°C</span></div>` : ''}
                    ${record.weight ? `<div class="vital-item"><strong>Weight</strong><span>${record.weight} kg</span></div>` : ''}
                </div>
            </div>

            ${record.treatment_plan ? `
                <div class="record-section">
                    <h3><i class="fas fa-clipboard-list"></i> Treatment Plan</h3>
                    <p>${record.treatment_plan}</p>
                </div>
            ` : ''}

            ${record.lab_results ? `
                <div class="record-section">
                    <h3><i class="fas fa-flask"></i> Lab Results</h3>
                    <p>${record.lab_results}</p>
                </div>
            ` : ''}
        `;
    }

    if (prescriptions.length > 0) {
        html += `
            <div class="record-section">
                <h3><i class="fas fa-pills"></i> Prescriptions</h3>
                <table class="prescription-table">
                    <thead>
                        <tr>
                            <th>Medication</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                            <th>Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        prescriptions.forEach(rx => {
            if (rx.medication_name) {
                html += `
                    <tr>
                        <td>${rx.medication_name}</td>
                        <td>${rx.dosage || '-'}</td>
                        <td>${rx.frequency || '-'}</td>
                        <td>${rx.duration || '-'}</td>
                        <td>${rx.quantity_prescribed || '-'}</td>
                    </tr>
                `;
            }
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    html += '</div>';
    content.innerHTML = html;
}

function closeMedicalRecordModal() {
    const modal = document.getElementById('medicalRecordModal');
    if (modal) modal.style.display = 'none';
}

function setMinDate() {
    const dateInput = document.getElementById('appointmentDate');
    const rescheduleDateInput = document.getElementById('rescheduleDate');

    if (!dateInput && !rescheduleDateInput) return;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const minDate = tomorrow.toISOString().split('T')[0];

    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 3);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    if (dateInput) {
        dateInput.setAttribute('min', minDate);
        dateInput.setAttribute('max', maxDateStr);
    }

    if (rescheduleDateInput) {
        rescheduleDateInput.setAttribute('min', minDate);
        rescheduleDateInput.setAttribute('max', maxDateStr);
    }
}

// Booking Modal
function openBookingModal(doctorId, doctorName, specialization) {
    console.log('🚪 Opening modal for:', doctorName, '(ID:', doctorId + ')');

    currentDoctorId = doctorId;

    const modal = document.getElementById('bookingModal');
    const summary = document.getElementById('doctorSummary');
    const doctorIdInput = document.getElementById('doctorId');
    const form = document.getElementById('bookingForm');

    if (!modal || !summary || !doctorIdInput) {
        console.error('❌ Modal elements not found!');
        showToast('Error opening booking form', 'error');
        return;
    }

    summary.innerHTML = `
        <div class="summary-card">
            <h3>Dr. ${doctorName}</h3>
            <p><i class="fas fa-stethoscope"></i> ${specialization}</p>
        </div>
    `;

    doctorIdInput.value = doctorId;
    modal.style.display = 'flex';

    if (form) form.reset();

    document.getElementById('timeSlots').innerHTML = '<p class="loading">Select a date to view available slots</p>';
    document.getElementById('selectedTime').value = '';
    availableSlotTimes = [];

    console.log('✅ Modal opened successfully');
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'none';
    currentDoctorId = null;
    console.log('🚪 Modal closed');
}

// Reschedule Modal Functions
function openRescheduleModal(appointmentId, doctorId, doctorName, specialization, currentDate, currentTime) {
    console.log('🔄 Opening reschedule modal for appointment:', appointmentId);

    appointmentToReschedule = {
        appointment_id: appointmentId,
        doctor_id: doctorId,
        doctor_name: doctorName,
        specialization: specialization,
        current_date: currentDate,
        current_time: currentTime
    };

    const modal = document.getElementById('rescheduleModal');
    const summary = document.getElementById('rescheduleSummary');
    const appointmentIdInput = document.getElementById('rescheduleAppointmentId');
    const form = document.getElementById('rescheduleForm');

    if (!modal || !summary || !appointmentIdInput) {
        console.error('❌ Reschedule modal elements not found!');
        showToast('Error opening reschedule form', 'error');
        return;
    }

    summary.innerHTML = `
        <div class="summary-card">
            <h3>Dr. ${doctorName}</h3>
            <p><i class="fas fa-stethoscope"></i> ${specialization}</p>
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0f2f1;">
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
                    <strong>Current Appointment:</strong>
                </p>
                <p style="color: #00897b; font-weight: 700;">
                    <i class="fas fa-calendar"></i> ${formatDate(currentDate)} at ${formatTime(currentTime)}
                </p>
            </div>
        </div>
    `;

    appointmentIdInput.value = appointmentId;
    modal.style.display = 'flex';

    if (form) form.reset();

    document.getElementById('rescheduleTimeSlots').innerHTML = '<p class="loading">Select a new date to view available slots</p>';
    document.getElementById('rescheduleSelectedTime').value = '';

    console.log('✅ Reschedule modal opened successfully');
}

function closeRescheduleModal() {
    const modal = document.getElementById('rescheduleModal');
    if (modal) modal.style.display = 'none';
    appointmentToReschedule = null;
    console.log('🚪 Reschedule modal closed');
}

// Time slot loading
function loadTimeSlots(doctorId, date) {
    console.log('⏰ Loading slots for Doctor ID:', doctorId, 'Date:', date);

    const slotsContainer = document.getElementById('timeSlots');
    if (!slotsContainer) {
        console.error('❌ Slots container not found!');
        return;
    }

    slotsContainer.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Loading available slots...</p>';

    const formData = new FormData();
    formData.append('action', 'get_slots');
    formData.append('doctor_id', doctorId);
    formData.append('date', date);

    fetch('appointment.html', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('📦 Server response:', data);

        if (data.success) {
            availableSlotTimes = data.slot_times || [];
            displayTimeSlots(data.slots, availableSlotTimes, 'timeSlots', 'selectedTime');
        } else {
            slotsContainer.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> ${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('❌ Error loading slots:', error);
        slotsContainer.innerHTML = '<p class="error"><i class="fas fa-exclamation-circle"></i> Failed to load time slots. Please try again.</p>';
        showToast('Failed to load time slots', 'error');
    });
}

// Load reschedule time slots
function loadRescheduleTimeSlots(doctorId, date) {
    console.log('⏰ Loading reschedule slots for Doctor ID:', doctorId, 'Date:', date);

    const slotsContainer = document.getElementById('rescheduleTimeSlots');
    if (!slotsContainer) {
        console.error('❌ Reschedule slots container not found!');
        return;
    }

    // Validate inputs
    if (!doctorId || !date) {
        console.error('❌ Missing doctor ID or date');
        slotsContainer.innerHTML = '<p class="error">Missing required information</p>';
        return;
    }

    slotsContainer.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Loading available slots...</p>';

    const formData = new FormData();
    formData.append('action', 'get_slots');
    formData.append('doctor_id', doctorId);
    formData.append('date', date);

    fetch('appointment.html', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('📦 Reschedule slots response:', data);

        if (data.success) {
            displayTimeSlots(data.slots, data.slot_times || [], 'rescheduleTimeSlots', 'rescheduleSelectedTime');
        } else {
            slotsContainer.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> ${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('❌ Error loading reschedule slots:', error);
        slotsContainer.innerHTML = '<p class="error"><i class="fas fa-exclamation-circle"></i> Failed to load time slots. Please try again.</p>';
        showToast('Failed to load time slots', 'error');
    });
}

function displayTimeSlots(formattedSlots, originalTimes, containerId, inputId) {
    const slotsContainer = document.getElementById(containerId);

    if (!formattedSlots || formattedSlots.length === 0) {
        slotsContainer.innerHTML = '<p class="info"><i class="fas fa-info-circle"></i> No available slots for this date. Please select another date.</p>';
        return;
    }

    slotsContainer.innerHTML = '';
    slotsContainer.style.cssText = '';

    const slotsGrid = document.createElement('div');
    slotsGrid.className = 'time-slots';
    slotsGrid.style.cssText = 'display: grid !important; grid-template-columns: repeat(6, 1fr) !important; gap: 1rem !important;';

    formattedSlots.forEach((slot, index) => {
        const originalTime = originalTimes[index];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot-btn';
        button.setAttribute('data-time', originalTime);
        button.innerHTML = `<i class="fas fa-clock"></i> ${slot}`;
        button.onclick = function() {
            selectTimeSlot(originalTime, this, inputId);
        };
        slotsGrid.appendChild(button);
    });

    slotsContainer.appendChild(slotsGrid);
    console.log('✅ Displayed', formattedSlots.length, 'time slots in 4-column grid');
}

function selectTimeSlot(time, button, inputId) {
    console.log('🕐 Time slot selected:', time);

    // Get the parent container to find all buttons within this specific modal
    const container = button.closest('.time-slots');
    const allButtons = container.querySelectorAll('.time-slot-btn');

    // Remove active class from all buttons in this container
    allButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to clicked button
    button.classList.add('active');

    // Set the hidden input value
    const selectedTimeInput = document.getElementById(inputId);
    if (selectedTimeInput) {
        selectedTimeInput.value = time;
        console.log('✅ Selected time set to', inputId, ':', time);
    } else {
        console.error('❌', inputId, 'input not found!');
    }
}

// Booking Submission
function submitBooking() {
    console.log('📤 Submitting booking...');

    const form = document.getElementById('bookingForm');
    if (!form) {
        console.error('❌ Form not found!');
        showToast('Error: Form not found', 'error');
        return;
    }

    const formData = new FormData(form);

    const selectedTime = document.getElementById('selectedTime').value;
    const date = document.getElementById('appointmentDate').value;
    const reason = formData.get('reason');
    const doctorId = document.getElementById('doctorId').value;

    console.log('Form data:', {
        doctorId: doctorId,
        date: date,
        selectedTime: selectedTime,
        reason: reason
    });

    if (!doctorId) {
        showToast('Doctor information missing. Please try again.', 'error');
        return;
    }

    if (!date) {
        showToast('Please select an appointment date', 'error');
        return;
    }

    if (!selectedTime) {
        showToast('Please select a time slot', 'error');
        return;
    }

    if (!reason || reason.trim() === '') {
        showToast('Please enter a reason for your visit', 'error');
        return;
    }

    document.getElementById('selectedTime').value = selectedTime;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) {
        console.error('❌ Submit button not found!');
        return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';

    console.log('🌐 Sending request to server...');

    fetch('appointment.html', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('📥 Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('✅ Server response:', data);

        if (data.success) {
            showToast(data.message, 'success');
            closeBookingModal();

            setTimeout(() => {
                console.log('🔄 Reloading page...');
                location.reload();
            }, 2000);
        } else {
            showToast(data.message || 'Failed to book appointment', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showToast('Failed to book appointment. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Submit Reschedule
function submitReschedule() {
    console.log('📤 Submitting reschedule...');

    const form = document.getElementById('rescheduleForm');
    if (!form) {
        console.error('❌ Reschedule form not found!');
        showToast('Error: Form not found', 'error');
        return;
    }

    const formData = new FormData(form);

    const appointmentId = document.getElementById('rescheduleAppointmentId').value;
    const selectedTime = document.getElementById('rescheduleSelectedTime').value;
    const date = document.getElementById('rescheduleDate').value;

    console.log('Reschedule data:', {
        appointmentId: appointmentId,
        date: date,
        selectedTime: selectedTime
    });

    if (!appointmentId) {
        showToast('Appointment information missing', 'error');
        return;
    }

    if (!date) {
        showToast('Please select a new appointment date', 'error');
        return;
    }

    if (!selectedTime) {
        showToast('Please select a new time slot', 'error');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) {
        console.error('❌ Submit button not found!');
        return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rescheduling...';

    console.log('🌐 Sending reschedule request to server...');

    fetch('appointment.html', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('📥 Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('✅ Server response:', data);

        if (data.success) {
            showToast(data.message, 'success');
            closeRescheduleModal();

            setTimeout(() => {
                console.log('🔄 Reloading page...');
                location.reload();
            }, 2000);
        } else {
            showToast(data.message || 'Failed to reschedule appointment', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showToast('Failed to reschedule appointment. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Filter Appointments Table
function filterAppointments(status) {
    const rows = document.querySelectorAll('.appointments-table tbody tr');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    let visibleCount = 0;

    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');

        if (!rowStatus) {
            row.style.display = 'none';
            return;
        }

        let shouldShow = false;

        switch(status) {
            case 'all':
                shouldShow = true;
                break;
            case 'pending':
                shouldShow = (rowStatus === 'pending');
                break;
            case 'confirmed':
                shouldShow = (rowStatus === 'confirmed');
                break;
            case 'completed':
                shouldShow = (rowStatus === 'completed');
                break;
            case 'cancelled':
                shouldShow = (rowStatus === 'cancelled');
                break;
            default:
                shouldShow = (rowStatus === status);
        }

        if (shouldShow) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const tbody = document.querySelector('.appointments-table tbody');
    let noResultsRow = tbody.querySelector('.no-appointments-filter');

    if (visibleCount === 0) {
        if (!noResultsRow) {
            noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-appointments-filter';
            noResultsRow.innerHTML = `
                <td colspan="7" class="no-appointments">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No ${status === 'all' ? '' : status} appointments found</h3>
                    <p>Try selecting a different filter</p>
                </td>
            `;
            tbody.appendChild(noResultsRow);
        }
        noResultsRow.style.display = '';
    } else if (noResultsRow) {
        noResultsRow.style.display = 'none';
    }

    console.log(`✅ Filtered to "${status}": ${visibleCount} appointments visible`);
}

// Cancel Appointment
function confirmCancelAppointment(appointmentId) {
    console.log('⚠️ Opening cancel confirmation for appointment:', appointmentId);
    appointmentToCancel = appointmentId;

    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.style.display = 'none';
    }
    appointmentToCancel = null;
}

function executeCancelAppointment() {
    if (!appointmentToCancel) {
        showToast('No appointment selected', 'error');
        return;
    }

    console.log('🗑️ Cancelling appointment:', appointmentToCancel);

    const modal = document.getElementById('cancelModal');
    const cancelBtn = modal.querySelector('.btn-danger');
    const originalText = cancelBtn.innerHTML;

    cancelBtn.disabled = true;
    cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';

    const formData = new FormData();
    formData.append('action', 'cancel_appointment');
    formData.append('appointment_id', appointmentToCancel);

    fetch('appointment.html', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('📦 Cancel response:', data);

        if (data.success) {
            showToast(data.message, 'success');
            closeCancelModal();

            setTimeout(() => {
                console.log('🔄 Reloading page...');
                location.reload();
            }, 1500);
        } else {
            showToast(data.message, 'error');
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('❌ Error cancelling appointment:', error);
        showToast('Failed to cancel appointment. Please try again.', 'error');
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = originalText;
    });
}

// QR code
function viewQRCode(qrCode, appointmentId) {
    console.log('📱 Opening QR Code:', qrCode);

    if (!qrCode) {
        showToast('QR Code not available', 'error');
        return;
    }

    currentQRCode = qrCode;
    const modal = document.getElementById('qrModal');
    const display = document.getElementById('qrCodeDisplay');

    if (!modal || !display) {
        console.error('❌ QR Modal elements not found');
        showToast('Error displaying QR code', 'error');
        return;
    }

    // Clear previous content
    display.innerHTML = '';
    qrCodeInstance = null;

    // Show modal immediately
    modal.style.display = 'flex';

    // Add loading state
    display.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #00695c;"></i><p style="color: #666; margin-top: 1rem;">Generating QR Code...</p></div>';

    // Wait for modal to render, then generate QR
    setTimeout(() => {
        try {
            // Clear loading
            display.innerHTML = '';

            // Check if QRCode library is loaded
            if (typeof QRCode === 'undefined') {
                console.error('❌ QRCode library not loaded');
                display.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 1rem;"></i>
                        <p style="color: #666; margin-bottom: 1rem;">QR Code library failed to load</p>
                        <p style="font-family: 'Courier New', monospace; color: #00695c; font-weight: 700; background: #d4f1e8; padding: 1rem; border-radius: 8px; word-break: break-all;">
                            ${qrCode}
                        </p>
                        <p style="color: #666; font-size: 0.9rem; margin-top: 1rem;">
                            Show this code at the clinic for check-in
                        </p>
                    </div>
                `;
                return;
            }

            // Create wrapper for all content
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'text-align: center; padding: 0.5rem;';

            // Create container for QR code
            const qrContainer = document.createElement('div');
            qrContainer.id = 'qrCodeContainer';
            qrContainer.style.cssText = 'display: inline-block; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0.5rem auto;';

            // Generate QR code (smaller size)
            qrCodeInstance = new QRCode(qrContainer, {
                text: qrCode,
                width: 200,
                height: 200,
                colorDark: "#00695c",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            wrapper.appendChild(qrContainer);

            // Add QR code text below (smaller)
            const qrText = document.createElement('div');
            qrText.style.cssText = `
                margin-top: 1rem;
                padding: 0.75rem;
                background: #d4f1e8;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                color: #00695c;
                font-weight: 700;
                letter-spacing: 1px;
                word-break: break-all;
                text-align: center;
            `;
            qrText.textContent = qrCode;
            wrapper.appendChild(qrText);

            // Add instructions (smaller)
            const instructions = document.createElement('p');
            instructions.style.cssText = 'text-align: center; color: #666; margin-top: 0.75rem; font-size: 0.85rem;';
            instructions.innerHTML = '<i class="fas fa-info-circle"></i> Show this at clinic reception';
            wrapper.appendChild(instructions);

            // Add to display
            display.appendChild(wrapper);

            console.log('✅ QR Code generated and displayed successfully');
            showToast('QR Code ready!', 'success');

        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            display.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 1rem;"></i>
                    <p style="color: #666; margin-bottom: 1rem;">Failed to generate QR code visual</p>
                    <p style="font-family: 'Courier New', monospace; color: #00695c; font-weight: 700; background: #d4f1e8; padding: 1rem; border-radius: 8px; word-break: break-all;">
                        ${qrCode}
                    </p>
                    <p style="color: #666; font-size: 0.9rem; margin-top: 1rem;">
                        Show this code at the clinic for check-in
                    </p>
                </div>
            `;
            showToast('QR visual failed, but code is displayed', 'warning');
        }
    }, 100); // Small delay to ensure modal is fully rendered
}

function closeQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.style.display = 'none';
    currentQRCode = null;
    qrCodeInstance = null;
}

function downloadQR() {
    if (!currentQRCode) {
        showToast('QR Code not available', 'error');
        return;
    }

    // Find the canvas element
    const canvas = document.querySelector('#qrCodeDisplay canvas');

    if (!canvas) {
        console.error('❌ QR Code canvas not found');
        showToast('Cannot download - QR code not generated', 'error');
        return;
    }

    try {
        // Create download link
        const link = document.createElement('a');
        link.download = `appointment_qr_${currentQRCode}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('QR Code downloaded successfully', 'success');
        console.log('✅ QR Code downloaded');

    } catch (error) {
        console.error('❌ Download error:', error);
        showToast('Failed to download QR Code', 'error');
    }
}

// Utilities
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }

    toast.innerHTML = icon + ' ' + message;
    toast.className = `toast toast-${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Highlight Today's Appointments
function highlightTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const rows = document.querySelectorAll('.appointments-table tbody tr');

    rows.forEach(row => {
        const dateCell = row.querySelector('td:nth-child(3) strong');
        if (dateCell) {
            const dateText = dateCell.textContent.trim();
            try {
                const dateObj = new Date(dateText);
                const rowDate = dateObj.toISOString().split('T')[0];

                if (rowDate === today) {
                    row.style.backgroundColor = '#d4f1e8';
                    row.style.borderLeft = '4px solid #26a69a';
                }
            } catch (e) {
                console.log('⚠️ Date parsing error:', e);
            }
        }
    });
}

// Close modals when clicking outside
window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    const qrModal = document.getElementById('qrModal');
    const cancelModal = document.getElementById('cancelModal');
    const rescheduleModal = document.getElementById('rescheduleModal');
    const medicalRecordModal = document.getElementById('medicalRecordModal');

    if (event.target === bookingModal) closeBookingModal();
    if (event.target === qrModal) closeQRModal();
    if (event.target === cancelModal) closeCancelModal();
    if (event.target === rescheduleModal) closeRescheduleModal();
    if (event.target === medicalRecordModal) closeMedicalRecordModal();
};

// Close modals with ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeBookingModal();
        closeQRModal();
        closeCancelModal();
        closeRescheduleModal();
    }
});

/* Confirm Appointment */
function confirmAppointmentAction(appointmentId) {
    console.log('✅ Confirming appointment:', appointmentId);

    // Show confirmation dialog
    if (!confirm('✅ Confirm this appointment?\n\nAfter confirmation, you will receive your QR code for clinic check-in.')) {
        return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('action', 'confirm_appointment');
    formData.append('appointment_id', appointmentId);

    // Find the confirm button and show loading state
    const confirmBtn = document.querySelector(`button.btn-confirm[onclick*="confirmAppointmentAction(${appointmentId})"]`);

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        console.log('🔄 Button disabled, showing spinner');
    } else {
        console.error('❌ Confirm button not found for appointment:', appointmentId);
    }

    console.log('📤 Sending confirmation request...');

    // Send AJAX request
    fetch('appointment.html', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin' // Include cookies for session
    })
    .then(response => {
        console.log('📥 Response received, status:', response.status);

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. You may have been logged out.');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    })
    .then(data => {
        console.log('✅ Server response:', data);

        // Check if session expired
        if (data.redirect) {
            showToast('Your session has expired. Redirecting to login...', 'warning');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 2000);
            return;
        }

        if (data.success) {
            // Show success message
            showToast(data.message || 'Appointment confirmed successfully!', 'success');

            // Wait a bit then reload
            setTimeout(() => {
                console.log('🔄 Reloading page...');
                window.location.reload();
            }, 1500);
        } else {
            // Show error message
            showToast(data.message || 'Failed to confirm appointment', 'error');

            // Re-enable button
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
            }
        }
    })
    .catch(error => {
        console.error('❌ Error confirming appointment:', error);

        // Check if it's a session issue
        if (error.message.includes('logged out') || error.message.includes('session')) {
            showToast('Your session has expired. Please log in again.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast('Failed to confirm appointment. Please try again.', 'error');
        }

        // Re-enable button
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
        }
    });
}

console.log('✅ Confirm appointment function loaded');
/* Calculate time remaining for confirmation */
function calculateTimeRemaining(deadlineStr) {
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
    } else {
        return `${minutes}m remaining`;
    }
}

/* Update confirmation countdown timers*/
function updateConfirmationTimers() {
    const timers = document.querySelectorAll('.confirmation-timer');

    timers.forEach(timer => {
        const deadline = timer.getAttribute('data-deadline');
        if (deadline) {
            const remaining = calculateTimeRemaining(deadline);
            timer.textContent = remaining;

            // Add warning class if less than 6 hours
            const deadlineDate = new Date(deadline);
            const now = new Date();
            const hoursRemaining = (deadlineDate - now) / (1000 * 60 * 60);

            if (hoursRemaining <= 6 && hoursRemaining > 0) {
                timer.classList.add('urgent');
            } else if (hoursRemaining <= 0) {
                timer.classList.add('expired');
            }
        }
    });
}

// Update timers every minute
setInterval(updateConfirmationTimers, 60000);

// Initial update on page load
document.addEventListener('DOMContentLoaded', function() {
    updateConfirmationTimers();
});
