(function() {
    'use strict';

    // State management
    let currentView = 'grid'; // 'grid' or 'list'
    let currentFilter = {
        search: '',
        bloodType: 'all',
        gender: 'all'
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        initializeSearch();
        initializeFilters();
        initializeViewToggle();
        initializePatientCards();
        initializeModals();
    });

    // Initialize search functionality
    function initializeSearch() {
        const searchInput = document.getElementById('searchInput');

        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                currentFilter.search = this.value.toLowerCase();
                filterPatients();
            }, 300));
        }
    }

    // Initialize filter controls
    function initializeFilters() {
        const bloodTypeFilter = document.getElementById('bloodTypeFilter');
        const genderFilter = document.getElementById('genderFilter');

        if (bloodTypeFilter) {
            bloodTypeFilter.addEventListener('change', function() {
                currentFilter.bloodType = this.value;
                filterPatients();
            });
        }

        if (genderFilter) {
            genderFilter.addEventListener('change', function() {
                currentFilter.gender = this.value;
                filterPatients();
            });
        }
    }

    // Initialize view toggle (grid/list)
    function initializeViewToggle() {
        const viewBtns = document.querySelectorAll('.view-btn');
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');

        viewBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const view = this.dataset.view;
                currentView = view; // Update state

                // Update active button UI
                viewBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Toggle Container visibility
                gridView.style.display = (view === 'grid') ? 'grid' : 'none';
                listView.style.display = (view === 'list') ? 'flex' : 'none';

                // CRITICAL: Re-run filter to update individual item display styles
                filterPatients();
            });
        });
    }

    // Filter patients
    function filterPatients() {
        // Select items based on current view to avoid confusion
        const cards = document.querySelectorAll('.patient-card, .patient-list-item');
        let visibleCount = 0;

        cards.forEach(card => {
            const patientName = card.dataset.patientName?.toLowerCase() || '';
            const bloodType = card.dataset.bloodType || '';
            const gender = card.dataset.gender || '';

            // Check if this item belongs to the view we are currently looking at
            const isGridItem = card.classList.contains('patient-card');
            const isListItem = card.classList.contains('patient-list-item');

            let shouldShow = true;

            // Search filter
            if (currentFilter.search && !patientName.includes(currentFilter.search)) {
                shouldShow = false;
            }
            // Blood type filter
            if (currentFilter.bloodType !== 'all' && bloodType !== currentFilter.bloodType) {
                shouldShow = false;
            }
            // Gender filter
            if (currentFilter.gender !== 'all' && gender !== currentFilter.gender) {
                shouldShow = false;
            }

            // Also hide if the item doesn't match the current view mode
            if ((currentView === 'grid' && !isGridItem) || (currentView === 'list' && !isListItem)) {
                card.style.display = 'none';
                return;
            }

            if (shouldShow) {
                // Apply correct display type based on item class
                card.style.display = isGridItem ? 'block' : 'flex';

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

        updateEmptyState(visibleCount);
    }

    // Update empty state
    function updateEmptyState(count) {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = count === 0 ? 'block' : 'none';
        }
    }

    // Initialize patient card clicks
    function initializePatientCards() {
        // Grid view cards
        document.querySelectorAll('.patient-card').forEach(card => {
            card.addEventListener('click', function() {
                const patientId = this.dataset.patientId;
                viewPatientDetails(patientId);
            });
        });

        // List view items
        document.querySelectorAll('.patient-list-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Don't trigger if clicking on action buttons
                if (!e.target.closest('.list-actions')) {
                    const patientId = this.dataset.patientId;
                    viewPatientDetails(patientId);
                }
            });
        });

        // View detail buttons in list view
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const patientId = this.dataset.patientId;
                viewPatientDetails(patientId);
            });
        });

        // Medical Records buttons (List View)
        document.querySelectorAll('.btn-view-medical-records').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const patientId = this.dataset.patientId;
                viewMedicalRecords(patientId);
            });
        });
    }

    // View patient details from data attributes
    function viewPatientDetails(patientId) {
        const card = document.querySelector(`[data-patient-id="${patientId}"]`);
        if (!card) return;

        // Get data from card attributes
        const patient = {
            patient_id: patientId,
            name: card.dataset.patientName,
            profile_picture: card.dataset.profilePicture,
            email: card.dataset.email,
            phone: card.dataset.phone,
            gender: card.dataset.gender,
            blood_type: card.dataset.bloodType,
            date_of_birth: card.dataset.dateOfBirth,
            age: card.dataset.age,
            address: card.dataset.address,
            total_visits: card.dataset.totalVisits,
            last_visit: card.dataset.lastVisit,
            medical_conditions: card.dataset.medicalConditions,
            last_diagnosis: card.dataset.lastDiagnosis,
            last_prescription: card.dataset.lastPrescription
        };

        populateModal(patient);

        const modal = document.getElementById('patientModal');
        if (modal) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Populate modal with patient data
    function populateModal(patient) {
        // Profile section
        const initials = getInitials(patient.name);

        // Handle Avatar (Image vs Initials)
        const avatarContainer = document.getElementById('modalAvatar');
        if (patient.profile_picture && patient.profile_picture !== '') {
            avatarContainer.innerHTML = `<img src="../${patient.profile_picture}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            avatarContainer.textContent = initials;
        }

        // Fill Text Data
        document.getElementById('modalPatientName').textContent = toTitleCase(patient.name); // Capitalize name nicely
        document.getElementById('modalPatientId').textContent = `ID: ${patient.patient_id}`;
        document.getElementById('modalAge').textContent = patient.age ? `${patient.age} years old` : 'N/A';
        document.getElementById('modalGender').textContent = patient.gender ? toTitleCase(patient.gender) : 'N/A';

        // Personal Information
        document.getElementById('modalEmail').textContent = patient.email || 'N/A';
        document.getElementById('modalPhone').textContent = patient.phone || 'N/A';
        document.getElementById('modalBloodType').textContent = patient.blood_type || 'N/A';
        document.getElementById('modalDOB').textContent = patient.date_of_birth ? formatDate(patient.date_of_birth) : 'N/A';
        document.getElementById('modalAddress').textContent = patient.address || 'N/A';

        const diagnosisEl = document.getElementById('modalDiagnosis');
        if (diagnosisEl) {
            diagnosisEl.textContent = patient.last_diagnosis || 'No diagnosis recorded';
        }
        const prescriptionEl = document.getElementById('modalPrescription');
        if (prescriptionEl) {
            prescriptionEl.textContent = patient.last_prescription || 'No prescription recorded';
        }

        // Visit Statistics
        document.getElementById('modalTotalVisits').textContent = patient.total_visits || '0';
        document.getElementById('modalLastVisit').textContent = patient.last_visit ? formatDate(patient.last_visit) : 'Never';

        // Link the patient ID to the 'Medical Records' button in the footer
        const modalBtn = document.getElementById('btnMedicalRecordsModal');
        if (modalBtn) {
            modalBtn.dataset.patientId = patient.patient_id;
        }
    }

    // Initialize modals
    function initializeModals() {
        const modal = document.getElementById('patientModal');
        const headerCloseBtn = document.querySelector('.modal-close'); // The X in the header
        const footerCloseBtn = document.querySelector('.btn-close'); // The Close button in the footer

        // Close on Header X click
        if (headerCloseBtn) {
            headerCloseBtn.addEventListener('click', closeModal);
        }

        // Close on Footer Button click (NEW)
        if (footerCloseBtn) {
            footerCloseBtn.addEventListener('click', closeModal);
        }

        // Close on Background click
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // Medical Records navigation from modal button
        const medicalBtn = document.getElementById('btnMedicalRecordsModal');
        if (medicalBtn) {
            medicalBtn.addEventListener('click', function() {
                const patientId = this.dataset.patientId;
                if (patientId) {
                    window.location.href = `medicalRecords.html?patient_id=${patientId}`;
                }
            });
        }
    }

    // Close modal
    function closeModal() {
        const modal = document.getElementById('patientModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Re-enable background scrolling
        }
    }

    // View medical records for patient
    function viewMedicalRecords(patientId) {
        if (!patientId) return;
        window.location.href = `medicalRecords.html?patient_id=${patientId}`;
    }

    // Utility functions
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function toTitleCase(str) {
        if (!str) return '';
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Export functions for global access
    window.viewPatientDetails = viewPatientDetails;
    window.viewMedicalRecords = viewMedicalRecords;

})();
