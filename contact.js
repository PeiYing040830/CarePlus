document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        const submitBtn = contactForm.querySelector('.submit-btn');
        const formInputs = contactForm.querySelectorAll('input, textarea, select');

        // Add smooth scroll to top when page loads with success/error message
        if (document.querySelector('.alert')) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Form validation feedback
        formInputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });

            input.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        });

        // Validate individual field
        function validateField(field) {
            const value = field.value.trim();
            const isRequired = field.hasAttribute('required');

            if (isRequired && value === '') {
                setFieldError(field, 'This field is required');
                return false;
            }

            if (field.type === 'email' && value !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    setFieldError(field, 'Please enter a valid email address');
                    return false;
                }
            }

            if (field.type === 'tel' && value !== '') {
                const phoneRegex = /^[\d\s\-\+\(\)]+$/;
                if (!phoneRegex.test(value)) {
                    setFieldError(field, 'Please enter a valid phone number');
                    return false;
                }
            }

            clearFieldError(field);
            return true;
        }

        // Set field error state
        function setFieldError(field, message) {
            field.classList.add('error');
            field.style.borderColor = '#ef4444';

            let errorMsg = field.parentElement.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('small');
                errorMsg.className = 'error-message';
                errorMsg.style.color = '#ef4444';
                errorMsg.style.display = 'block';
                errorMsg.style.marginTop = '0.5rem';
                field.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = message;
        }

        // Clear field error state
        function clearFieldError(field) {
            field.classList.remove('error');
            field.style.borderColor = '';

            const errorMsg = field.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }

        // Form submission enhancement
        contactForm.addEventListener('submit', function(e) {
            let isValid = true;

            formInputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                e.preventDefault();

                // Scroll to first error
                const firstError = contactForm.querySelector('.error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstError.focus();
                }
            } else {
                // Show loading state on submit button
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;
            }
        });

        // Phone number formatting (optional enhancement)
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');

                // Format as +60 XX-XXX XXXX (Malaysian format)
                if (value.startsWith('60')) {
                    value = value.substring(2);
                }

                if (value.length > 0) {
                    if (value.length <= 2) {
                        e.target.value = '+60 ' + value;
                    } else if (value.length <= 5) {
                        e.target.value = '+60 ' + value.substring(0, 2) + '-' + value.substring(2);
                    } else {
                        e.target.value = '+60 ' + value.substring(0, 2) + '-' + value.substring(2, 5) + ' ' + value.substring(5, 9);
                    }
                }
            });
        }

        // Auto-hide alerts after 5 seconds
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            setTimeout(() => {
                alert.style.transition = 'opacity 0.5s ease';
                alert.style.opacity = '0';
                setTimeout(() => {
                    alert.remove();
                }, 500);
            }, 5000);
        });
    }

    // Smooth animations for info cards
    const infoCards = document.querySelectorAll('.info-card');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    infoCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
        observer.observe(card);
    });
});
