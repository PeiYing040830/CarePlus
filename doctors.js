document.addEventListener('DOMContentLoaded', function() {
    // Get filter elements
    const specializationFilter = document.getElementById('specialization-filter');
    const experienceFilter = document.getElementById('experience-filter');
    const searchInput = document.getElementById('search-input');
    const doctorsGrid = document.getElementById('doctors-grid');
    const noResultsMessage = document.getElementById('no-results-message');

    // Main filter function
    function filterDoctors() {
        const specialization = specializationFilter.value.toLowerCase();
        const experienceRange = experienceFilter.value;
        const searchTerm = searchInput.value.toLowerCase();

        const doctorCards = doctorsGrid.querySelectorAll('.doctor-card');
        let visibleCount = 0;

        doctorCards.forEach(card => {
            const cardSpecialization = card.dataset.specialization.toLowerCase();
            const cardExperience = parseInt(card.dataset.experience);
            const cardName = card.dataset.name.toLowerCase();

            // Check specialization match
            const matchesSpecialization = !specialization || cardSpecialization === specialization;

            // Check experience range match
            let matchesExperience = true;
            if (experienceRange) {
                if (experienceRange === '0-5') {
                    matchesExperience = cardExperience >= 0 && cardExperience <= 5;
                } else if (experienceRange === '5-10') {
                    matchesExperience = cardExperience > 5 && cardExperience <= 10;
                } else if (experienceRange === '10-20') {
                    matchesExperience = cardExperience > 10 && cardExperience <= 20;
                } else if (experienceRange === '20+') {
                    matchesExperience = cardExperience > 20;
                }
            }

            // Check search term match
            const matchesSearch = !searchTerm || cardName.includes(searchTerm);

            // Show or hide card based on all filters
            if (matchesSpecialization && matchesExperience && matchesSearch) {
                card.style.display = 'flex';
                card.style.animation = 'fadeIn 0.5s ease';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide no results message
        if (visibleCount === 0) {
            doctorsGrid.style.display = 'none';
            noResultsMessage.style.display = 'block';
        } else {
            doctorsGrid.style.display = 'grid';
            noResultsMessage.style.display = 'none';
        }

        // Update results count (optional)
        updateResultsCount(visibleCount, doctorCards.length);
    }

    // Update results count display (optional enhancement)
    function updateResultsCount(visible, total) {
        let countDisplay = document.getElementById('results-count');

        if (!countDisplay) {
            // Create count display if it doesn't exist
            const filterSection = document.querySelector('.filter-section .container');
            countDisplay = document.createElement('div');
            countDisplay.id = 'results-count';
            countDisplay.style.cssText = 'text-align: center; margin-top: 1rem; color: #64748b; font-weight: 500;';
            filterSection.appendChild(countDisplay);
        }

        if (visible === total) {
            countDisplay.textContent = `Showing all ${total} doctors`;
        } else {
            countDisplay.textContent = `Showing ${visible} of ${total} doctors`;
        }
    }

    // Add event listeners for filters
    specializationFilter.addEventListener('change', filterDoctors);
    experienceFilter.addEventListener('change', filterDoctors);

    // Add debounce to search input for better performance
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterDoctors, 300);
    });

    // Clear filters button functionality
    function createClearButton() {
        const filterContainer = document.querySelector('.filter-container');
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '✕ Clear Filters';
        clearBtn.className = 'clear-filters-btn';
        clearBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        `;

        clearBtn.addEventListener('mouseenter', function() {
            this.style.background = '#dc2626';
        });

        clearBtn.addEventListener('mouseleave', function() {
            this.style.background = '#ef4444';
        });

        clearBtn.addEventListener('click', function() {
            specializationFilter.value = '';
            experienceFilter.value = '';
            searchInput.value = '';
            filterDoctors();
        });

        filterContainer.appendChild(clearBtn);
    }

    // Initialize clear button
    createClearButton();

    // Smooth scroll animations for doctor cards
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
                }, index * 50);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Apply animation to all doctor cards
    const doctorCards = document.querySelectorAll('.doctor-card');
    doctorCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
        observer.observe(card);
    });

    // Add hover effect enhancement for book buttons
    const bookButtons = document.querySelectorAll('.book-btn');
    bookButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });

        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Initialize the filter on page load
    filterDoctors();

    // Add animation keyframe
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
});
