document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced Doctor Profile page: DOM loaded');

    const profileForm = document.getElementById('profileForm');
    const profilePictureInput = document.getElementById('profile_picture');
    const profilePreview = document.getElementById('profilePreview');
    const fileNameDisplay = document.getElementById('fileName');
    const alerts = document.querySelectorAll('.alert');

    //Image Upload Previw
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', function(e) {
            const file = e.target.files[0];

            if (file) {
                // Display file name
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = `Selected: ${file.name}`;
                    fileNameDisplay.style.display = 'inline';
                    fileNameDisplay.style.color = '#6DADE8';
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

    //Auto Hide Alerts
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

    // Numeric Validation for Fee and Experience
    const consultationFeeInput = document.querySelector('input[name="consultation_fee"]');
    const experienceInput = document.querySelector('input[name="experience_years"]');

    if (consultationFeeInput) {
        consultationFeeInput.addEventListener('input', function() {
            // Ensure only numbers and decimal point
            this.value = this.value.replace(/[^0-9.]/g, '');

            // Prevent multiple decimal points
            const parts = this.value.split('.');
            if (parts.length > 2) {
                this.value = parts[0] + '.' + parts.slice(1).join('');
            }

            // Limit to 2 decimal places
            if (parts[1] && parts[1].length > 2) {
                this.value = parts[0] + '.' + parts[1].substring(0, 2);
            }
        });
    }

    if (experienceInput) {
        experienceInput.addEventListener('input', function() {
            // Ensure only positive integers
            this.value = this.value.replace(/[^0-9]/g, '');

            // Limit to reasonable range
            if (parseInt(this.value) > 70) {
                this.value = '70';
            }
        });
    }

    // Form Validations
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            const phoneInput = this.querySelector('input[name="phone"]');
            const addressInput = this.querySelector('textarea[name="address"]');
            const specializationInput = this.querySelector('input[name="specialization"]');
            const licenseInput = this.querySelector('input[name="license_number"]');
            const feeInput = this.querySelector('input[name="consultation_fee"]');
            const experienceInput = this.querySelector('input[name="experience_years"]');
            const bioInput = this.querySelector('textarea[name="bio"]');

            let isValid = true;
            let errorMessage = '';

            // Phone validation
            if (phoneInput && phoneInput.value.trim() !== '') {
                const phoneRegex = /^[\d\s\-+()]{10,15}$/;
                if (!phoneRegex.test(phoneInput.value.trim())) {
                    isValid = false;
                    errorMessage = 'Please enter a valid phone number (10-15 digits)';
                    phoneInput.focus();
                    highlightError(phoneInput);
                }
            }

            // Address validation
            if (addressInput && addressInput.value.trim() !== '' && addressInput.value.trim().length < 10) {
                isValid = false;
                errorMessage = 'Please enter a complete clinic address (minimum 10 characters)';
                addressInput.focus();
                highlightError(addressInput);
            }

            // Specialization validation
            if (specializationInput && specializationInput.value.trim() !== '' && specializationInput.value.trim().length < 3) {
                isValid = false;
                errorMessage = 'Specialization must be at least 3 characters';
                specializationInput.focus();
                highlightError(specializationInput);
            }

            // License number validation (basic format check)
            if (licenseInput && licenseInput.value.trim() !== '') {
                if (licenseInput.value.trim().length < 5) {
                    isValid = false;
                    errorMessage = 'License number must be at least 5 characters';
                    licenseInput.focus();
                    highlightError(licenseInput);
                }
            }

            // Consultation fee validation
            if (feeInput && feeInput.value.trim() !== '') {
                const fee = parseFloat(feeInput.value);
                if (isNaN(fee) || fee < 0) {
                    isValid = false;
                    errorMessage = 'Please enter a valid consultation fee';
                    feeInput.focus();
                    highlightError(feeInput);
                }
            }

            // Experience validation
            if (experienceInput && experienceInput.value.trim() !== '') {
                const exp = parseInt(experienceInput.value);
                if (isNaN(exp) || exp < 0 || exp > 70) {
                    isValid = false;
                    errorMessage = 'Experience years must be between 0 and 70';
                    experienceInput.focus();
                    highlightError(experienceInput);
                }
            }

            // Bio validation
            if (bioInput && bioInput.value.trim() !== '' && bioInput.value.trim().length < 20) {
                isValid = false;
                errorMessage = 'Professional bio should be at least 20 characters';
                bioInput.focus();
                highlightError(bioInput);
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

    // Helper Functions: Highlight Error
    function highlightError(element) {
        element.style.borderColor = '#f44336';
        setTimeout(() => {
            element.style.borderColor = '';
        }, 3000);
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

    // Characters Counters for Textarea
    const textareas = document.querySelectorAll('textarea.form-control');
    textareas.forEach(textarea => {
        const counter = document.createElement('div');
        counter.className = 'char-counter';

        textarea.parentNode.appendChild(counter);

        function updateCounter() {
            const maxLength = textarea.getAttribute('maxlength') || 1000;
            const currentLength = textarea.value.length;
            counter.textContent = `${currentLength}/${maxLength} characters`;

            if (currentLength > maxLength * 0.8) {
                counter.style.color = '#ff9800';
            } else if (currentLength < 20 && textarea.name === 'bio') {
                counter.style.color = '#f44336';
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

    // Smooth Focus Transition
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

    // Real-time Validation Feedback
    const specializationInput = document.querySelector('input[name="specialization"]');
    if (specializationInput) {
        specializationInput.addEventListener('input', function() {
            if (this.value.length > 0 && this.value.length < 3) {
                this.style.borderColor = '#ff9800';
            } else if (this.value.length >= 3) {
                this.style.borderColor = '#4caf50';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    const licenseInput = document.querySelector('input[name="license_number"]');
    if (licenseInput) {
        licenseInput.addEventListener('input', function() {
            if (this.value.length > 0 && this.value.length < 5) {
                this.style.borderColor = '#ff9800';
            } else if (this.value.length >= 5) {
                this.style.borderColor = '#4caf50';
            } else {
                this.style.borderColor = '';
            }
        });
    }

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

    // Tooltip for Consultation Fee
    const feeInput = document.querySelector('input[name="consultation_fee"]');
    if (feeInput) {
        feeInput.addEventListener('focus', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'fee-tooltip';
            tooltip.textContent = '💡 Set your standard consultation fee in Malaysian Ringgit (RM)';
            tooltip.style.cssText = `
                position: absolute;
                background: #333;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                font-size: 0.85rem;
                margin-top: 0.5rem;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            this.parentElement.style.position = 'relative';
            this.parentElement.appendChild(tooltip);
        });

        feeInput.addEventListener('blur', function() {
            const tooltip = this.parentElement.querySelector('.fee-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    }

    // Initialize Animations
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Stats Counters Animations
    const statNumbers = document.querySelectorAll('.stat-content h3');
    statNumbers.forEach(stat => {
        const finalValue = parseFloat(stat.textContent);
        if (!isNaN(finalValue)) {
            let currentValue = 0;
            const increment = finalValue / 50; // 50 steps
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    stat.textContent = finalValue % 1 === 0 ? finalValue : finalValue.toFixed(1);
                    clearInterval(timer);
                } else {
                    stat.textContent = currentValue % 1 === 0 ? Math.floor(currentValue) : currentValue.toFixed(1);
                }
            }, 20);
        }
    });

    console.log('Enhanced Doctor Profile page initialized successfully');
});
