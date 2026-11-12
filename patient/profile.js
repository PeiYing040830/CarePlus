document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced Profile page: DOM loaded');

    const profileForm = document.getElementById('profileForm');
    const profilePictureInput = document.getElementById('profile_picture');
    const profilePreview = document.getElementById('profilePreview');
    const fileNameDisplay = document.getElementById('fileName');
    const alerts = document.querySelectorAll('.alert');

    // Image Upload Preview
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', function(e) {
            const file = e.target.files[0];

            if (file) {
                // Display file name
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = `Selected: ${file.name}`;
                    fileNameDisplay.style.display = 'inline';
                    fileNameDisplay.style.color = '#26a69a';
                    fileNameDisplay.style.fontWeight = '600';
                    fileNameDisplay.style.marginLeft = '1rem';
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    showError('Invalid file type. Only JPG, PNG, and GIF are allowed.');
                    profilePictureInput.value = '';
                    if (fileNameDisplay) fileNameDisplay.textContent = '';
                    return;
                }

                // Validate file size (5MB max)
                const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (file.size > maxSize) {
                    showError('File size too large. Maximum size is 5MB.');
                    profilePictureInput.value = '';
                    if (fileNameDisplay) fileNameDisplay.textContent = '';
                    return;
                }

                // Create image preview
                const reader = new FileReader();

                reader.onload = function(event) {
                    // Remove placeholder if exists
                    const placeholder = profilePreview.querySelector('.placeholder-icon');
                    if (placeholder) {
                        profilePreview.innerHTML = '';
                        profilePreview.classList.remove('profile-picture-placeholder');
                    }

                    // Check if img already exists
                    let img = profilePreview.querySelector('img');
                    if (!img) {
                        img = document.createElement('img');
                        img.className = 'profile-picture';
                        img.alt = 'Profile Preview';
                        profilePreview.appendChild(img);
                    }

                    img.src = event.target.result;

                    // Add upload animation
                    img.style.animation = 'imageZoomIn 0.5s ease';
                };

                reader.readAsDataURL(file);
            }
        });
    }

    // Auto Hide Alerts
    alerts.forEach(alert => {
        if (alert.classList.contains('alert-success') || alert.classList.contains('alert-error')) {
            setTimeout(() => {
                alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                alert.style.opacity = '0';
                alert.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            }, 5000);
        }
    });

    // Phone Number Validation
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Allow only numbers, spaces, dashes, plus, and parentheses
            this.value = this.value.replace(/[^0-9+\-\s()]/g, '');
        });

        // Format phone number on blur (Malaysian format)
        input.addEventListener('blur', function() {
            const value = this.value.replace(/\D/g, '');
            if (value.length >= 10 && value.length <= 11) {
                if (value.length === 10) {
                    this.value = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                } else if (value.length === 11) {
                    this.value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                }
            }
        });
    });

    // Form Validation
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            const phoneInput = this.querySelector('input[name="phone"]');
            const emergencyInput = this.querySelector('input[name="emergency_contact"]');
            const addressInput = this.querySelector('textarea[name="address"]');

            let isValid = true;
            let errorMessage = '';

            // Phone validation
            if (phoneInput && phoneInput.value.trim() !== '') {
                const phoneRegex = /^[\d\s\-+()]{10,15}$/;
                if (!phoneRegex.test(phoneInput.value.trim())) {
                    isValid = false;
                    errorMessage = 'Please enter a valid phone number (10-15 digits)';
                    phoneInput.focus();
                    phoneInput.style.borderColor = '#f44336';
                    setTimeout(() => {
                        phoneInput.style.borderColor = '';
                    }, 3000);
                }
            }

            // Emergency contact validation
            if (emergencyInput && emergencyInput.value.trim() !== '') {
                const emergencyRegex = /^[\d\s\-+()]{10,15}$/;
                if (!emergencyRegex.test(emergencyInput.value.trim())) {
                    isValid = false;
                    errorMessage = 'Please enter a valid emergency contact number';
                    emergencyInput.focus();
                    emergencyInput.style.borderColor = '#f44336';
                    setTimeout(() => {
                        emergencyInput.style.borderColor = '';
                    }, 3000);
                }
            }

            // Address validation
            if (addressInput && addressInput.value.trim() !== '' && addressInput.value.trim().length < 10) {
                isValid = false;
                errorMessage = 'Please enter a complete address (minimum 10 characters)';
                addressInput.focus();
                addressInput.style.borderColor = '#f44336';
                setTimeout(() => {
                    addressInput.style.borderColor = '';
                }, 3000);
            }

            if (!isValid) {
                e.preventDefault();
                showError(errorMessage);
            } else {
                // Show loading state on button
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '⏳ Saving...';
                    submitBtn.disabled = true;
                }
            }
        });
    }

    // Helper Functions: Show Error
    function showError(message) {
        // Remove existing error alerts
        const existingError = document.querySelector('.alert-error');
        if (existingError) {
            existingError.remove();
        }

        // Show new error alert
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.innerHTML = `<strong>❌ Error:</strong> ${message}`;

        // Insert at the beginning of the form
        if (profileForm) {
            profileForm.insertBefore(errorDiv, profileForm.firstChild);

            // Scroll to error
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Auto-remove error after 5 seconds
            setTimeout(() => {
                errorDiv.style.transition = 'opacity 0.5s ease';
                errorDiv.style.opacity = '0';
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 500);
            }, 5000);
        }
    }

    // Character Counter Functions Textarea
    const textareas = document.querySelectorAll('textarea.form-control');
    textareas.forEach(textarea => {
        const counter = document.createElement('div');
        counter.className = 'char-counter';

        textarea.parentNode.appendChild(counter);

        function updateCounter() {
            const maxLength = textarea.getAttribute('maxlength') || 500;
            const currentLength = textarea.value.length;
            counter.textContent = `${currentLength}/${maxLength} characters`;

            if (currentLength > maxLength * 0.8) {
                counter.style.color = '#ff9800';
            } else {
                counter.style.color = '#666';
            }
        }

        textarea.addEventListener('input', updateCounter);
        updateCounter(); // Initial count
    });

    // Form Change Detection
    let formChanged = false;
    const formInputs = document.querySelectorAll('#profileForm input, #profileForm select, #profileForm textarea');

    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            formChanged = true;
        });

        input.addEventListener('change', () => {
            formChanged = true;
        });
    });

    window.addEventListener('beforeunload', (e) => {
        if (formChanged) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    // Clear form changed flag on submit
    if (profileForm) {
        profileForm.addEventListener('submit', () => {
            formChanged = false;
        });
    }

    // Smooth Focus Transactions
    const formControls = document.querySelectorAll('.form-control');
    formControls.forEach(control => {
        control.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
            this.parentElement.style.transition = 'transform 0.3s ease';
        });

        control.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', function(e) {
        // Don't trigger shortcuts if user is typing
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (profileForm) {
                profileForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
    });

    // Initialize Animations
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    console.log('Enhanced Profile page initialized successfully');
});
