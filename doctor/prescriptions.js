(function() {
    'use strict';

    let medicationCount = 0;
    let pendingWarnings = null;

    document.addEventListener('DOMContentLoaded', function() {
        initializeSearch();
        initializeModals();
        initializeButtons();
        initializeFilters();
        initializePatientSelection();
        animateCards();
    });

    // Initialize
    function initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                const searchTerm = this.value.toLowerCase();
                filterPrescriptions(searchTerm);
            }, 300));
        }
    }

    function initializeFilters() {
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                filterPrescriptionsByStatus(this.value);
            });
        }
    }

    function initializePatientSelection() {
        const patientSelect = document.getElementById('patientSelect');
        const previewDiv = document.getElementById('selectedPatientPreview');
        const previewPhoto = document.getElementById('previewPhoto');
        const previewName = document.getElementById('previewName');

        if (patientSelect) {
            patientSelect.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];

                // Reset if no patient selected
                if (!this.value) {
                    if (previewDiv) previewDiv.style.display = 'none';
                    return;
                }

                // Get Data
                const photo = selectedOption.getAttribute('data-photo');
                const name = selectedOption.getAttribute('data-name');
                const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                // Update UI
                if (previewDiv) {
                    previewDiv.style.display = 'flex';
                    previewName.textContent = name;

                    // Check if photo exists and is not just ".."
                    if (photo && photo.trim() !== '' && photo !== '../') {
                        previewPhoto.innerHTML = `
                            <img src="${photo}"
                                alt="${name}"
                                style="width: 100%; height: 100%; object-fit: cover;"
                                onerror="this.style.display='none'; this.parentNode.innerHTML='${initials}';">
                        `;
                        previewPhoto.style.backgroundColor = 'transparent';
                        previewPhoto.style.color = 'inherit';
                    } else {
                        previewPhoto.innerHTML = initials;
                        previewPhoto.style.backgroundColor = '#e2e8f0';
                        previewPhoto.style.color = '#64748b';
                    }
                }
            });
        }
    }

    function initializeModals() {
        const modalElements = document.querySelectorAll('.modal');
        const headerCloseBtns = document.querySelectorAll('.modal-close');
        const footerCloseBtns = document.querySelectorAll('.modal-close-btn');

        headerCloseBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
        footerCloseBtns.forEach(btn => btn.addEventListener('click', closeAllModals));

        modalElements.forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeAllModals();
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeAllModals();
        });
    }

    function initializeButtons() {
        const btnNewPrescription = document.getElementById('btnNewPrescription');
        if (btnNewPrescription) {
            btnNewPrescription.addEventListener('click', openNewPrescriptionModal);
        }

        const btnAddMedication = document.getElementById('btnAddMedication');
        if (btnAddMedication) {
            btnAddMedication.addEventListener('click', addMedicationField);
        }

        const prescriptionForm = document.getElementById('prescriptionForm');
        if (prescriptionForm) {
            prescriptionForm.addEventListener('submit', handlePrescriptionSubmit);
        }

        const btnSubmit = document.getElementById('btnSubmitPrescription');
        if (btnSubmit) {
            btnSubmit.addEventListener('click', function() {
                const form = document.getElementById('prescriptionForm');
                if (form) form.requestSubmit();
            });
        }

        const btnModalDownload = document.getElementById('btnModalDownload');
        if (btnModalDownload) {
            btnModalDownload.addEventListener('click', function() {
                const modal = document.getElementById('viewPrescriptionModal');
                const id = modal.dataset.currentPrescriptionId;
                if (id) downloadPrescriptionPDF(id);
            });
        }

        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                viewPrescriptionDetails(this.dataset.prescriptionId);
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                editPrescription(this.dataset.prescriptionId);
            });
        });

        document.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                downloadPrescriptionPDF(this.dataset.prescriptionId);
            });
        });

        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                cancelPrescription(this.dataset.prescriptionId);
            });
        });
    }

    function animateCards() {
        const cards = document.querySelectorAll('.prescription-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Filtering
    function filterPrescriptions(searchTerm) {
        const cards = document.querySelectorAll('.prescription-card');
        cards.forEach(card => {
            const patientName = card.dataset.patientName || '';
            const diagnosis = card.dataset.diagnosis || '';
            const shouldShow = patientName.includes(searchTerm) || diagnosis.includes(searchTerm);

            if (shouldShow) {
                card.style.display = 'block';
                setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 10);
            } else {
                card.style.opacity = '0'; card.style.transform = 'translateY(20px)';
                setTimeout(() => { card.style.display = 'none'; }, 300);
            }
        });
    }

    function filterPrescriptionsByStatus(status) {
        const cards = document.querySelectorAll('.prescription-card');
        cards.forEach(card => {
            const cardStatus = card.dataset.status;
            if (status === 'all' || cardStatus === status) {
                card.style.display = 'block';
                setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 10);
            } else {
                card.style.opacity = '0'; card.style.transform = 'translateY(20px)';
                setTimeout(() => { card.style.display = 'none'; }, 300);
            }
        });
    }

    // Modal Logic
    function openNewPrescriptionModal() {
        const modal = document.getElementById('newPrescriptionModal');
        if (modal) {
            document.getElementById('prescriptionForm').reset();
            document.getElementById('medicationsContainer').innerHTML = '';

            if(document.getElementById('selectedPatientPreview')) {
                document.getElementById('selectedPatientPreview').style.display = 'none';
            }

            medicationCount = 0;
            pendingWarnings = null;

            addMedicationField();

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
        pendingWarnings = null;

        const form = document.getElementById('prescriptionForm');
        if (form) {
            delete form.dataset.prescriptionId;
            delete form.dataset.editMode;

            const modalHeader = document.querySelector('#newPrescriptionModal .modal-header h2');
            if (modalHeader) modalHeader.textContent = '➕ Create New Prescription';

            const submitBtn = document.getElementById('btnSubmitPrescription');
            if (submitBtn) submitBtn.innerHTML = '✓ Create Prescription';

            const patientSelect = document.getElementById('patientSelect');
            if (patientSelect) {
                patientSelect.style.pointerEvents = '';
                patientSelect.style.opacity = '';
                patientSelect.style.backgroundColor = '';
            }

            const hiddenPatientInput = document.getElementById('hiddenPatientId');
            if (hiddenPatientInput) hiddenPatientInput.remove();
        }
    }

    // Medication Fields
    function addMedicationField() {
        medicationCount++;
        const container = document.getElementById('medicationsContainer');
        const medicationItem = document.createElement('div');
        medicationItem.className = 'medication-item';
        medicationItem.dataset.medicationId = medicationCount;

        medicationItem.innerHTML = `
            <div class="medication-header">
                <span class="medication-number">💊 Medication ${medicationCount}</span>
                ${medicationCount > 1 ? '<button type="button" class="btn-remove-medication">❌ Remove</button>' : ''}
            </div>
            <div class="medication-fields">
                <div class="form-group">
                    <label>Medication Name *</label>
                    <input type="text" name="med_name_${medicationCount}" placeholder="e.g., Amoxicillin" required>
                </div>
                <div class="form-group">
                    <label>Dosage *</label>
                    <input type="text" name="med_dosage_${medicationCount}" placeholder="e.g., 500mg" required>
                </div>
                <div class="form-group">
                    <label>Frequency *</label>
                    <input type="text" name="med_frequency_${medicationCount}" placeholder="e.g., 3 times daily" required>
                </div>
                <div class="form-group">
                    <label>Duration *</label>
                    <input type="text" name="med_duration_${medicationCount}" placeholder="e.g., 7 days" required>
                </div>
                <div class="form-group">
                    <label>Quantity *</label>
                    <input type="number" name="med_quantity_${medicationCount}" placeholder="e.g., 21" min="1" value="1" required>
                </div>
                <div class="form-group full-width">
                    <label>Instructions (Optional)</label>
                    <input type="text" name="med_instructions_${medicationCount}" placeholder="e.g., Take after meals">
                </div>
            </div>
        `;

        container.appendChild(medicationItem);

        medicationItem.style.opacity = '0';
        medicationItem.style.transform = 'translateY(20px)';
        setTimeout(() => {
            medicationItem.style.transition = 'all 0.3s ease';
            medicationItem.style.opacity = '1';
            medicationItem.style.transform = 'translateY(0)';
        }, 10);

        const removeBtn = medicationItem.querySelector('.btn-remove-medication');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeMedicationField(medicationCount);
            });
        }
    }

    function removeMedicationField(id) {
        const item = document.querySelector(`[data-medication-id="${id}"]`);
        if (item) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                item.remove();
                renumberMedications();
            }, 300);
        }
    }

    function renumberMedications() {
        const items = document.querySelectorAll('.medication-item');
        items.forEach((item, index) => {
            const number = index + 1;
            const numberSpan = item.querySelector('.medication-number');
            if (numberSpan) numberSpan.textContent = `💊 Medication ${number}`;
        });
    }

    // Submission
    async function handlePrescriptionSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const isEditMode = form.dataset.editMode === 'true';
        const prescriptionId = form.dataset.prescriptionId;

        const medications = [];
        document.querySelectorAll('.medication-item').forEach((item) => {
            const id = item.dataset.medicationId;
            const medication = {
                name: formData.get(`med_name_${id}`),
                dosage: formData.get(`med_dosage_${id}`),
                frequency: formData.get(`med_frequency_${id}`),
                duration: formData.get(`med_duration_${id}`),
                quantity: formData.get(`med_quantity_${id}`) || 1,
                instructions: formData.get(`med_instructions_${id}`) || ''
            };
            if (medication.name && medication.dosage) medications.push(medication);
        });

        if (medications.length === 0) {
            showNotification('Please add at least one medication', 'error');
            return;
        }

        let patientId = formData.get('patient_id');
        if (!patientId || patientId === '') patientId = formData.get('patient_id_backup');

        if (!patientId) {
            showNotification('Patient selection is required', 'error');
            return;
        }

        const submitData = new FormData();
        submitData.append('action', isEditMode ? 'update_prescription' : 'create_prescription');
        if (isEditMode) submitData.append('prescription_id', prescriptionId);
        submitData.append('patient_id', patientId);
        submitData.append('diagnosis', formData.get('diagnosis'));
        submitData.append('notes', formData.get('notes') || '');
        submitData.append('medications', JSON.stringify(medications));

        if (pendingWarnings) submitData.append('override_warnings', 'true');

        try {
            showLoadingOverlay(isEditMode ? 'Updating...' : 'Creating...');
            const response = await fetch('prescriptions.html', { method: 'POST', body: submitData });
            const result = await response.json();
            hideLoadingOverlay();

            if (result.success) {
                showNotification(isEditMode ? '✓ Updated successfully!' : `✓ Created! Code: ${result.verification_code}`, 'success');
                closeAllModals();
                setTimeout(() => window.location.reload(), 2000);
            } else if (result.requires_confirmation) {
                pendingWarnings = result.warnings;
                showWarningModal(result.warnings);
            } else {
                showNotification(result.message || 'Operation failed', 'error');
            }
        } catch (error) {
            hideLoadingOverlay();
            console.error('Error:', error);
            showNotification('An error occurred.', 'error');
        }
    }

    function showWarningModal(warnings) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'warningModal';

        const criticalWarnings = warnings.filter(w => w.severity === 'high');
        const otherWarnings = warnings.filter(w => w.severity !== 'high');

        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header" style="background: var(--gradient-danger);">
                    <h2>⚠️ Safety Warnings Detected</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="warning-content">
                        ${criticalWarnings.length > 0 ? `
                            <div class="critical-warnings">
                                <h3 style="color: #dc2626; margin-bottom: 1rem;">🚨 Critical Warnings</h3>
                                ${criticalWarnings.map(w => `<div class="warning-item critical"><strong>${w.type === 'allergy' ? '🚫 Allergy Alert' : '⚠️ Drug Interaction'}</strong><p>${w.message}</p></div>`).join('')}
                            </div>
                        ` : ''}
                        ${otherWarnings.length > 0 ? `
                            <div class="other-warnings">
                                <h3 style="color: #f59e0b; margin-bottom: 1rem;">⚠️ Other Warnings</h3>
                                ${otherWarnings.map(w => `<div class="warning-item"><strong>${w.type === 'allergy' ? 'Allergy Alert' : 'Drug Interaction'}</strong><p>${w.message}</p></div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer" style="justify-content: center; gap: 1rem;">
                    <button class="btn btn-outline" id="btnCancelWarning">❌ Cancel</button>
                    <button class="btn btn-danger" id="btnProceedWarning">✓ Acknowledge & Proceed</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => { modal.remove(); pendingWarnings = null; });
        modal.querySelector('#btnCancelWarning').addEventListener('click', () => { modal.remove(); pendingWarnings = null; });
        modal.querySelector('#btnProceedWarning').addEventListener('click', () => {
            modal.remove();
            document.getElementById('prescriptionForm').requestSubmit();
        });
    }

    // View / Edit
    async function viewPrescriptionDetails(prescriptionId) {
        const modal = document.getElementById('viewPrescriptionModal');
        const detailsContainer = document.getElementById('prescriptionDetails');

        if (!modal || !detailsContainer) return;

        // Store ID for the footer download button
        modal.dataset.currentPrescriptionId = prescriptionId;

        detailsContainer.innerHTML = '<div style="text-align: center; padding: 4rem;"><div class="spinner" style="margin: 0 auto 1rem; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-blue); border-radius: 50%; animation: spin 1s linear infinite;"></div><p>Loading details...</p></div>';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        try {
            await logAction('view', prescriptionId);
            const response = await fetch(`get_prescription.html?id=${prescriptionId}`);
            const data = await response.json();

            if (data.success) {
                displayPrescriptionDetails(data.prescription);
            } else {
                detailsContainer.innerHTML = '<div style="text-align: center; padding: 4rem;"><p style="color: var(--danger-red);">Failed to load.</p></div>';
            }
        } catch (error) {
            console.error('Error:', error);
            detailsContainer.innerHTML = '<div style="text-align: center; padding: 4rem;"><p style="color: var(--danger-red);">Error loading prescription.</p></div>';
        }
    }

    function displayPrescriptionDetails(prescription) {
        const detailsContainer = document.getElementById('prescriptionDetails');

        //Prepare Avatar Content
        let avatarContent;

        if (prescription.profile_picture && prescription.profile_picture.trim() !== '') {
            const imgPath = prescription.profile_picture.startsWith('../')
                ? prescription.profile_picture
                : '../' + prescription.profile_picture;

            // Helper for fallback to initials if image fails to load
            const initials = getInitials(prescription.patient_name);
            avatarContent = `<img src="${imgPath}" alt="${prescription.patient_name}" onerror="this.parentNode.innerHTML='${initials}'">`;
        } else {
            avatarContent = getInitials(prescription.patient_name);
        }

        const statusClass = prescription.status ? prescription.status.toLowerCase() : 'active';

        // Build HTML
        const html = `
            <div class="modal-patient-header">
                <div class="modal-patient-avatar">
                    ${avatarContent}
                </div>
                <div class="modal-patient-info">
                    <h2>${prescription.patient_name}</h2>
                    <p>${prescription.patient_age} years • ${prescription.patient_gender}</p>
                </div>
                <div class="modal-status ${statusClass}">
                    ${prescription.status}
                </div>
            </div>

            <div class="form-section">
                <h3 style="display:flex; align-items:center; gap:8px;">📋 Prescription Info</h3>
                <div class="prescription-meta">
                    <div class="meta-item">
                        <span class="meta-label">PRESCRIPTION ID</span>
                        <span class="meta-value">#${prescription.prescription_id}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">VERIFICATION CODE</span>
                        <span class="meta-value verification-code">${prescription.verification_code}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">DATE PRESCRIBED</span>
                        <span class="meta-value">${formatDate(prescription.prescription_date)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">VALID UNTIL</span>
                        <span class="meta-value">${formatDate(prescription.valid_until)}</span>
                    </div>
                </div>
            </div>

            ${prescription.diagnosis ? `
            <div class="form-section">
                <h3>🩺 Diagnosis</h3>
                <p style="margin-top:0.5rem; font-weight:600; color:#2d3748; background:#F7FAFC; padding:15px; border-radius:12px; border:1px solid #EDF2F7;">
                    ${prescription.diagnosis}
                </p>
            </div>` : ''}

            <div class="form-section">
                <h3>💊 Medications Prescribed</h3>
                <div style="overflow-x:auto;">
                    <table class="medications-table">
                        <thead>
                            <tr>
                                <th>Medication</th>
                                <th>Dosage</th>
                                <th>Frequency</th>
                                <th>Duration</th>
                                <th>Qty</th>
                                <th>Instructions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prescription.medications.map(med => `
                                <tr>
                                    <td style="font-weight:700; color:#2d3748;">${med.medication_name}</td>
                                    <td>${med.dosage}</td>
                                    <td>${med.frequency}</td>
                                    <td>${med.duration}</td>
                                    <td>${med.quantity_prescribed || 1}</td>
                                    <td>${med.instructions || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            ${prescription.notes ? `
            <div class="form-section">
                <h3>📝 Notes</h3>
                <p style="margin-top:0.5rem; color:#2d3748; background:#F7FAFC; padding:15px; border-radius:12px; border:1px solid #EDF2F7; white-space: pre-wrap; text-align: left;">${prescription.notes}</p>
            </div>` : ''}
        `;

        detailsContainer.innerHTML = html;
    }

    // Helper function
    function getInitials(name) {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    async function editPrescription(prescriptionId) {
        try {
            showLoadingOverlay('Loading prescription...');
            const response = await fetch(`get_prescription.html?id=${prescriptionId}`);
            const data = await response.json();
            hideLoadingOverlay();

            if (!data.success) { showNotification('Failed to load', 'error'); return; }

            const prescription = data.prescription;

            // Now converts to string, lowercase, and trims before checking
            const status = (prescription.status || '').toLowerCase().trim();

            if (status !== 'active') {
                showNotification(`Only active prescriptions can be edited. Current status: ${prescription.status}`, 'warning');
                return;
            }

            openEditPrescriptionModal(prescription);
        } catch (error) {
            hideLoadingOverlay();
            console.error('Error:', error);
            showNotification('Error checking prescription status.', 'error');
        }
    }

    function openEditPrescriptionModal(prescription) {
        const modal = document.getElementById('newPrescriptionModal');
        if (!modal) return;

        // Reset Form
        document.getElementById('prescriptionForm').reset();
        document.getElementById('medicationsContainer').innerHTML = '';
        medicationCount = 0;
        pendingWarnings = null;

        // Update Header & Mode
        const modalHeader = modal.querySelector('.modal-header h2');
        modalHeader.textContent = '✏️ Edit Prescription';

        const form = document.getElementById('prescriptionForm');
        form.dataset.prescriptionId = prescription.prescription_id;
        form.dataset.editMode = 'true';

        // Handle Patient Selection (Visual & Hidden Input)
        const patientSelect = document.getElementById('patientSelect');
        if (patientSelect) {
            patientSelect.value = prescription.patient_id;

            // Lock patient selection during edit
            patientSelect.style.pointerEvents = 'none';
            patientSelect.style.opacity = '0.6';
            patientSelect.style.backgroundColor = '#f3f4f6';

            // Trigger visual update for patient preview
            const event = new Event('change');
            patientSelect.dispatchEvent(event);
        }

        // Ensure backend gets the patient ID even if select is disabled/reset
        let hiddenPatientInput = document.getElementById('hiddenPatientId');
        if (!hiddenPatientInput) {
            hiddenPatientInput = document.createElement('input');
            hiddenPatientInput.type = 'hidden';
            hiddenPatientInput.id = 'hiddenPatientId';
            hiddenPatientInput.name = 'patient_id_backup';
            form.appendChild(hiddenPatientInput);
        }
        hiddenPatientInput.value = prescription.patient_id;

        // Populate Diagnosis
        const diagnosisInput = document.getElementById('diagnosis');
        if (diagnosisInput) {
            diagnosisInput.value = prescription.diagnosis;
            const counter = document.querySelector('.char-counter');
            if (counter) counter.textContent = `${prescription.diagnosis.length} / 500`;
        }

        // Populate Medications
        if (prescription.medications && prescription.medications.length > 0) {
            prescription.medications.forEach(med => {
                addMedicationField(); // Adds HTML inputs
                const currentId = medicationCount;

                const nameInput = document.querySelector(`input[name="med_name_${currentId}"]`);
                if (nameInput) nameInput.value = med.medication_name || '';

                const dosageInput = document.querySelector(`input[name="med_dosage_${currentId}"]`);
                if (dosageInput) dosageInput.value = med.dosage || '';

                const freqInput = document.querySelector(`input[name="med_frequency_${currentId}"]`);
                if (freqInput) freqInput.value = med.frequency || '';

                const durInput = document.querySelector(`input[name="med_duration_${currentId}"]`);
                if (durInput) durInput.value = med.duration || '';

                const qtyInput = document.querySelector(`input[name="med_quantity_${currentId}"]`);
                if (qtyInput) qtyInput.value = med.quantity_prescribed || med.quantity || 1;

                const instrInput = document.querySelector(`input[name="med_instructions_${currentId}"]`);
                if (instrInput) instrInput.value = med.instructions || '';
            });
        } else {
            addMedicationField();
        }

        // Update Button Text
        const submitBtn = document.getElementById('btnSubmitPrescription');
        if (submitBtn) submitBtn.innerHTML = '✓ Update Prescription';

        // Show Modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async function cancelPrescription(prescriptionId) {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;

        try {
            showLoadingOverlay('Cancelling...');
            const formData = new FormData();
            formData.append('action', 'cancel_prescription');
            formData.append('prescription_id', prescriptionId);
            formData.append('reason', reason);

            const response = await fetch('prescriptions.html', { method: 'POST', body: formData });
            const result = await response.json();
            hideLoadingOverlay();

            if (result.success) {
                showNotification('✓ Cancelled successfully', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(result.message || 'Failed to cancel', 'error');
            }
        } catch (error) {
            hideLoadingOverlay();
            console.error('Error:', error);
        }
    }

    async function logAction(action, prescriptionId) {
        try {
            const formData = new FormData();
            formData.append('log_action', action);
            formData.append('prescription_id', prescriptionId);
            await fetch('prescriptions.html', { method: 'POST', body: formData });
        } catch (error) { console.error('Failed to log action:', error); }
    }

    // Utilities
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColors = {
            success: 'var(--gradient-success)',
            error: 'var(--gradient-danger)',
            info: 'var(--gradient-cyan)',
            warning: 'var(--gradient-warm)'
        };

        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            padding: 1.25rem 1.75rem; background: ${bgColors[type] || bgColors.info};
            color: white; border-radius: 20px; box-shadow: var(--shadow-xl);
            z-index: 10000; font-weight: 600; animation: slideInRight 0.3s ease;
            max-width: 450px; font-size: 0.95rem;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'fadeInUp 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function showLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; z-index: 10000;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 2.5rem 3.5rem; border-radius: 28px; text-align: center;">
                <div class="spinner" style="margin: 0 auto 1.5rem; width: 60px; height: 60px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-blue); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: #2D3748; font-weight: 600; font-size: 1.05rem;">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.remove();
    }

})();
