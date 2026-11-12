(function() {
    'use strict';

    // State management
    let currentFilter = {
        status: 'all',
        date: '',
        search: ''
    };

    let videoStream = null;
    let isScanning = false;

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        initializeFilters();
        initializeQRScanner();
        initializeAppointmentActions();
        initializeModal();
        replaceIconsWithEmojis();
    });

    // UI helper
    function replaceIconsWithEmojis() {
        document.querySelectorAll('[data-lucide="user-circle"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">👤</span>'; });
        document.querySelectorAll('[data-lucide="phone"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">📞</span>'; });
        document.querySelectorAll('[data-lucide="activity"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">💓</span>'; });
        document.querySelectorAll('[data-lucide="check-circle"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">✅</span>'; });
        document.querySelectorAll('[data-lucide="clock"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">⏰</span>'; });
        document.querySelectorAll('[data-lucide="x-circle"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">❌</span>'; });
        document.querySelectorAll('[data-lucide="chevron-right"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">➡️</span>'; });
        document.querySelectorAll('[data-lucide="calendar"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">📅</span>'; });
        document.querySelectorAll('[data-lucide="clipboard"]').forEach(el => { el.outerHTML = '<span class="emoji-icon">📋</span>'; });
    }

    // QR scan
    function initializeQRScanner() {
        const qrScanBtn = document.getElementById('qrScanBtn');
        const qrScannerSection = document.getElementById('qrScannerSection');
        const qrCloseBtn = document.getElementById('qrCloseBtn');
        const startCameraBtn = document.querySelector('.btn-start-camera');

        if (qrScanBtn) {
            qrScanBtn.addEventListener('click', function() {
                if (qrScannerSection.style.display === 'none') {
                    qrScannerSection.style.display = 'block';
                    qrScannerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    qrScannerSection.style.display = 'none';
                    stopCamera();
                }
            });
        }

        if (qrCloseBtn) {
            qrCloseBtn.addEventListener('click', function() {
                qrScannerSection.style.display = 'none';
                stopCamera();
            });
        }

        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', function() {
                if (videoStream) {
                    stopCamera();
                } else {
                    startCamera();
                }
            });
        }
    }

    async function startCamera() {
        const placeholder = document.querySelector('.qr-scanner-placeholder');
        const startBtn = document.querySelector('.btn-start-camera');
        const instruction = document.querySelector('.qr-instruction');

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showNotification('Camera access is not supported in this browser', 'error');
                return;
            }

            videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            const video = document.createElement('video');
            video.id = 'qr-video';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.borderRadius = '24px';
            video.autoplay = true;
            video.playsInline = true;

            placeholder.innerHTML = '';
            placeholder.style.border = 'none';
            placeholder.appendChild(video);

            video.srcObject = videoStream;

            // Update Button State
            startBtn.innerHTML = '⏹️ Stop Camera';
            startBtn.classList.add('btn-stop');
            instruction.textContent = 'Scanning... Position QR code within frame';

            isScanning = true;
            startQRScanning(video);
            showNotification('Camera started successfully', 'success');

        } catch (error) {
            console.error('Camera error:', error);
            showNotification('Camera access denied or error occurred.', 'error');
        }
    }

    function stopCamera() {
        const placeholder = document.querySelector('.qr-scanner-placeholder');
        const startBtn = document.querySelector('.btn-start-camera');
        const instruction = document.querySelector('.qr-instruction');
        const video = document.getElementById('qr-video');

        //  Stop Video Tracks (Hardware)
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }

        // Remove Video Element & Clear Src
        if (video) {
            video.pause();
            video.srcObject = null;
            video.remove();
        }

        // Reset UI
        placeholder.innerHTML = '<i data-lucide="qr-code" class="qr-icon-large"></i>';
        placeholder.style.border = '3px dashed var(--primary-blue)';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        startBtn.innerHTML = '📷 Start Camera';
        startBtn.classList.remove('btn-stop');
        instruction.textContent = 'Point camera at patient\'s QR code to check them in';
        isScanning = false;
    }

    function startQRScanning(video) {
        if (typeof jsQR === 'undefined') {
            showNotification('QR scanning library not available', 'warning');
            return;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        function scan() {
            if (!isScanning || !video.videoWidth) {
                if (isScanning) requestAnimationFrame(scan);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                if(code.data && code.data.trim() !== "") {
                    handleQRCode(code.data);
                } else {
                    requestAnimationFrame(scan);
                }
            } else {
                requestAnimationFrame(scan);
            }
        }

        video.addEventListener('loadedmetadata', () => {
            scan();
        });
    }

    // QR code Handler
    async function handleQRCode(qrData) {
        const cleanedQrData = qrData.trim();

        // Pause scanning to prevent multiple triggers
        isScanning = false;
        playBeep();

        // Try to find the card in the loaded DOM first (Fast check)
        const allCards = Array.from(document.querySelectorAll('.appointment-card-new'));
        const appointmentCard = allCards.find(card => card.dataset.qrCode === cleanedQrData);

        if (appointmentCard) {
            const status = appointmentCard.dataset.status;
            const apptDateStr = appointmentCard.dataset.date; // YYYY-MM-DD
            const patientId = appointmentCard.dataset.patientId;
            const patientName = appointmentCard.dataset.patientName;

            // Completed
            if (status === 'completed') {
                showNotification('ℹ️ Appointment already completed.', 'info');

                // Allow user to choose redirection
                setTimeout(() => {
                    if (confirm(`Appointment for ${patientName} is already completed.\n\nGo to Medical Records?`)) {
                        window.location.href = `medicalRecords.html?patient_id=${patientId}`;
                    } else {
                        // User cancelled, resume scanning
                        resumeScanning();
                    }
                }, 500);
                return;
            }

            // Data Validate
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison

            const apptDate = new Date(apptDateStr);
            apptDate.setHours(0, 0, 0, 0);

            // Check if Past (Expired)
            if (apptDate < today && status !== 'completed') {
                showNotification('❌ QR Code Expired', 'error');
                stopCamera(); // Stop camera to force user attention

                setTimeout(() => {
                    alert(`⚠️ EXPIRED APPOINTMENT\n\nThis appointment was scheduled for ${formatDate(apptDateStr)}.\n\nPlease ask the patient to book a new appointment.`);
                }, 500);
                return;
            }

            // Check if Future (Not Today)
            if (apptDate > today) {
                showNotification('⚠️ Invalid Date', 'warning');
                stopCamera(); // Stop camera to force user attention

                setTimeout(() => {
                    alert(`📅 NOT TODAY\n\nThis appointment is scheduled for ${formatDate(apptDateStr)}.\nIt cannot be checked in today.`);
                }, 500);
                return;
            }
        }

        // If valid (or card not found in DOM), proceed to Server Check-in
        try {
            showLoading();

            const response = await fetch('checkin_qr.html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_code: cleanedQrData })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const result = await response.json();
            hideLoading();

            if (result.success) {
                showNotification(`✅ ${result.message}`, 'success');

                // Visual feedback if card exists
                if (appointmentCard) {
                    appointmentCard.style.border = '3px solid var(--success-green)';
                    appointmentCard.style.backgroundColor = '#f0fff4';
                    appointmentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Reload page to update UI
                setTimeout(() => { location.reload(); }, 1500);

            } else {
                // Handle Backend Errors (e.g. Appointment cancelled in DB but not updated on UI yet)
                showNotification(`⚠️ ${result.message}`, 'warning');
                setTimeout(() => { resumeScanning(); }, 2000);
            }

        } catch (error) {
            hideLoading();
            console.error('Check-in error:', error);
            showNotification('❌ Network error. Please try again.', 'error');
            setTimeout(() => { resumeScanning(); }, 2000);
        }
    }

    function resumeScanning() {
        isScanning = true;
        const video = document.getElementById('qr-video');
        if (video) {
            startQRScanning(video);
        }
    }

    function playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Audio not supported in some contexts
        }
    }

    // Filtering
    function initializeFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        const searchInput = document.getElementById('searchInput');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                currentFilter.status = this.value;
                filterAppointments();
                updateClearButton();
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', function() {
                currentFilter.date = this.value;
                filterAppointments();
                updateClearButton();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                currentFilter.search = this.value.toLowerCase();
                filterAppointments();
                updateClearButton();
            }, 300));
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function() {
                currentFilter = { status: 'all', date: '', search: '' };
                if (statusFilter) statusFilter.value = 'all';
                if (dateFilter) dateFilter.value = '';
                if (searchInput) searchInput.value = '';
                filterAppointments();
                updateClearButton();
            });
        }
    }

    function updateClearButton() {
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (!clearBtn) return;
        const hasFilters = currentFilter.status !== 'all' || currentFilter.date !== '' || currentFilter.search !== '';
        clearBtn.style.display = hasFilters ? 'block' : 'none';
    }

    function filterAppointments() {
        const cards = document.querySelectorAll('.appointment-card-new');
        const emptyState = document.getElementById('emptyState');
        let visibleCount = 0;

        cards.forEach(card => {
            const status = card.dataset.status;
            const date = card.dataset.date;
            const patientName = card.dataset.patientName?.toLowerCase() || '';
            const phone = card.dataset.phone?.toLowerCase() || '';

            let shouldShow = true;

            if (currentFilter.status !== 'all' && status !== currentFilter.status) shouldShow = false;
            if (currentFilter.date && date !== currentFilter.date) shouldShow = false;
            if (currentFilter.search && !patientName.includes(currentFilter.search) && !phone.includes(currentFilter.search)) shouldShow = false;

            if (shouldShow) {
                card.style.display = 'flex';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 10);
                visibleCount++;
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });

        if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // Action Button
    function initializeAppointmentActions() {
        document.querySelectorAll('.btn-confirm').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                confirmAppointment(this.dataset.appointmentId);
            });
        });

        document.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                completeAppointment(this.dataset.appointmentId);
            });
        });

        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                cancelAppointment(this.dataset.appointmentId);
            });
        });

        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                viewAppointmentDetails(this.dataset.appointmentId);
            });
        });

        // Add Card Click Listener
        document.querySelectorAll('.appointment-card-new').forEach(card => {
            card.addEventListener('click', function(e) {
                // Prevent opening if clicking on buttons
                if (e.target.closest('button')) return;
                viewAppointmentDetails(this.dataset.appointmentId);
            });
        });
    }

    function confirmAppointment(appointmentId) {
        if (!confirm('Are you sure you want to confirm this appointment?')) return;
        updateStatus(appointmentId, 'confirmed', 'Appointment confirmed manually');
    }

    function completeAppointment(appointmentId) {
        if (!confirm('Mark this appointment as completed?')) return;
        updateStatus(appointmentId, 'completed', 'Appointment completed manually');
    }

    function cancelAppointment(appointmentId) {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;
        updateStatus(appointmentId, 'cancelled', reason);
    }

    function updateStatus(appointmentId, status, notes) {
        showLoading();
        fetch('update_appointment.html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment_id: appointmentId, status: status, notes: notes })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                showNotification(`✅ ${status.charAt(0).toUpperCase() + status.slice(1)} successfully!`, 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                showNotification(data.message || 'Failed to update', 'error');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            showNotification('An error occurred.', 'error');
        });
    }

    // Modal
    function initializeModal() {
        const modal = document.getElementById('appointmentModal');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalBackdrop = document.getElementById('modalBackdrop');

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
        if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    function viewAppointmentDetails(appointmentId) {
        const card = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (!card) return;

        const appointment = {
            id: appointmentId,
            patient_id: card.dataset.patientId,
            patient_name: card.dataset.patientFname + ' ' + card.dataset.patientLname,
            ic_number: card.dataset.icNumber,
            phone: card.dataset.phone,
            email: card.dataset.email,
            blood_type: card.dataset.bloodType,
            age: card.dataset.age,
            appointment_date: card.dataset.date,
            appointment_time: card.dataset.appointmentTime,
            status: card.dataset.status,
            symptoms: card.dataset.symptoms,
            notes: card.dataset.notes,
            qr_code: card.querySelector('.qr-code-text')?.textContent || 'N/A'
        };

        populateModal(appointment);
        openModal();
    }

    function populateModal(appointment) {
        document.getElementById('modalAppointmentId').textContent = '#' + (appointment.id || 'N/A');
        document.getElementById('modalPatientName').textContent = appointment.patient_name || 'N/A';
        document.getElementById('modalIcNumber').textContent = appointment.ic_number || 'N/A';
        document.getElementById('modalPhone').textContent = appointment.phone || 'N/A';
        document.getElementById('modalEmail').textContent = appointment.email || 'N/A';
        document.getElementById('modalAge').textContent = (appointment.age || 'N/A') + (appointment.age !== 'N/A' ? ' years' : '');
        document.getElementById('modalBloodType').textContent = appointment.blood_type || 'N/A';
        document.getElementById('modalDate').textContent = formatDate(appointment.appointment_date);
        document.getElementById('modalTime').textContent = formatTime(appointment.appointment_time);

        const statusBadge = document.getElementById('modalStatus');
        if (statusBadge) {
            statusBadge.textContent = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
            statusBadge.className = `status-badge-new status-${appointment.status}`;
        }

        document.getElementById('modalQrCode').textContent = appointment.qr_code || 'N/A';
        document.getElementById('modalSymptoms').textContent = appointment.symptoms || 'No symptoms recorded';

        const modalActions = document.getElementById('modalActions');
        modalActions.innerHTML = ''; // Clear existing actions

        if (appointment.status === 'pending') {
            modalActions.innerHTML = `
                <button class="btn-action btn-confirm" onclick="window.confirmAppointmentFromModal(${appointment.id})">
                    <span class="emoji-icon">✅</span> Confirm Appointment
                </button>
                <button class="btn-action btn-cancel" onclick="window.cancelAppointmentFromModal(${appointment.id})">
                    <span class="emoji-icon">❌</span> Cancel Appointment
                </button>
            `;
        } else if (appointment.status === 'confirmed') {
            modalActions.innerHTML = `
                <button class="btn-action btn-complete" onclick="window.completeAppointmentFromModal(${appointment.id})">
                    <span class="emoji-icon">✅</span> Mark as Completed
                </button>
                <button class="btn-action btn-cancel" onclick="window.cancelAppointmentFromModal(${appointment.id})">
                    <span class="emoji-icon">❌</span> Cancel Appointment
                </button>
            `;
        } else if (appointment.status === 'completed') {
            modalActions.innerHTML = `
                <button class="btn-action btn-medical-records" onclick="window.viewMedicalRecords(${appointment.patient_id})">
                    <span class="emoji-icon">📋</span> View Medical Records
                </button>
            `;
        }
    }

    function openModal() {
        const modal = document.getElementById('appointmentModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        const modal = document.getElementById('appointmentModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Expose Functions to Window for HTML Onclick attributes
    window.confirmAppointmentFromModal = function(id) { closeModal(); confirmAppointment(id); };
    window.completeAppointmentFromModal = function(id) { closeModal(); completeAppointment(id); };
    window.cancelAppointmentFromModal = function(id) { closeModal(); cancelAppointment(id); };
    window.viewMedicalRecords = function(id) { window.location.href = `medicalRecords.html?patient_id=${id}`; };

    // Utilities
    function showLoading() {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'loading-overlay';
            loader.innerHTML = '<div class="loading-spinner"></div><p>⏳ Processing...</p>';
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    function hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.style.display = 'none';
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // Export functions to global scope
    window.confirmAppointment = confirmAppointment;
    window.completeAppointment = completeAppointment;
    window.cancelAppointment = cancelAppointment;
    window.viewAppointmentDetails = viewAppointmentDetails;

})();
