(function () {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('mobileToggle');
    const overlay = document.getElementById('mobileOverlay');
    const body = document.body;

    if (!menu || !toggle || !overlay) return;

    const openMenu = () => {
        menu.classList.add('active');
        overlay.classList.add('active');
        toggle.classList.add('active');
        body.classList.add('menu-open');
    };

    const closeMenu = () => {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        toggle.classList.remove('active');
        body.classList.remove('menu-open');
    };

    toggle.addEventListener('click', () => {
        menu.classList.contains('active') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    document.querySelectorAll('.nav-link:not(.logout-link)').forEach(link => {
        link.addEventListener('click', () => setTimeout(closeMenu, 200));
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 968) closeMenu();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMenu();
    });

    // ===================================
    // GOOGLE TRANSLATE - SAVE LANGUAGE
    // ===================================

    // Save and restore selected language
    function initGoogleTranslate() {
        const translateSelect = document.querySelector('#google_translate_element select');

        if (translateSelect) {
            // Restore saved language
            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage) {
                translateSelect.value = savedLanguage;
            }

            // Save on change
            translateSelect.addEventListener('change', function() {
                localStorage.setItem('selectedLanguage', this.value);
            });
        }
    }

    // Wait for Google Translate to load
    setTimeout(initGoogleTranslate, 1500);

    // Re-initialize if Google Translate reloads
    const observer = new MutationObserver(initGoogleTranslate);
    const translateElement = document.getElementById('google_translate_element');

    if (translateElement) {
        observer.observe(translateElement, { childList: true, subtree: true });
    }

    console.log('✅ Doctor Header Navigation with Google Translate initialized');

})();
