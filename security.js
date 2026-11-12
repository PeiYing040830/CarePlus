document.addEventListener("DOMContentLoaded", function() {
    console.log("Security Page Loaded");

    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add animation on scroll for feature cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => observer.observe(card));

    // Observe compliance badges
    const complianceBadges = document.querySelectorAll('.compliance-badge');
    complianceBadges.forEach(badge => observer.observe(badge));

    // Observe practice items
    const practiceItems = document.querySelectorAll('.practice-item');
    practiceItems.forEach(item => observer.observe(item));

    // Animate stat numbers on scroll
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const text = target.textContent;

                // Only animate if it's a number
                if (text.includes('%') || text.includes('bit') || text.includes('/') || text.includes('min')) {
                    target.style.opacity = '0';
                    setTimeout(() => {
                        target.style.transition = 'opacity 0.8s ease';
                        target.style.opacity = '1';
                    }, 200);
                }

                statsObserver.unobserve(target);
            }
        });
    }, observerOptions);

    statNumbers.forEach(stat => statsObserver.observe(stat));

    // Add hover effect enhancement for cards
    const cards = document.querySelectorAll('.feature-card, .compliance-badge');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });

    // Back to top functionality (if needed)
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add shadow to navbar on scroll
        if (scrollTop > 50) {
            navbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }

        lastScrollTop = scrollTop;
    });

    console.log("Security page animations and interactions initialized");
});
