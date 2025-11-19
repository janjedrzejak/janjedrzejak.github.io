console.log('🔔 Inicjalizacja Silktide + GA (v2)');

        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());

        gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied'
        });

        console.log('📊 GA: Domyślny consent = DENIED');

        let gaLoaded = false;
        let lastAnalyticsConsent = null;

        function loadGA() {
            if (gaLoaded) return;
            gaLoaded = true;
            console.log('✅ ZAŁADOWUJĘ Google Analytics...');
            let script = document.createElement('script');
            script.src = 'https://www.googletagmanager.com/gtag/js?id=G-9XTCEZ21TV';
            script.async = true;
            script.onload = () => {
                console.log('✅ GA skrypt załadowany');
                gtag('consent', 'update', { 'analytics_storage': 'granted', 'ad_storage': 'granted' });
                gtag('config', 'G-9XTCEZ21TV', { 'page_path': window.location.pathname, 'page_title': document.title });
                console.log('✅ GA AKTYWNY - Śledzenie WŁĄCZONE 🎯');
            };
            script.onerror = () => { console.error('❌ Błąd ładowania GA'); gaLoaded = false; };
            document.head.appendChild(script);
        }

        function disableGA() {
            console.log('🚫 GA WYŁĄCZONY - Śledzenie WYŁĄCZONE');
            gtag('consent', 'update', { 'analytics_storage': 'denied', 'ad_storage': 'denied' });
        }

        function checkAnalyticsConsent() {
            // Sprawdź prawidłowy klucz Silktide: silktideCookieChoice_analytics
            let analyticsValue = localStorage.getItem('silktideCookieChoice_analytics');
            console.log('🔍 Sprawdzam silktideCookieChoice_analytics:', analyticsValue);

            let analyticsConsented = analyticsValue === 'true' || analyticsValue === true;

            if (analyticsConsented !== lastAnalyticsConsent) {
                lastAnalyticsConsent = analyticsConsented;

                if (analyticsConsented) {
                    console.log('👍 Analytics: ZAAKCEPTOWANE');
                    loadGA();
                } else {
                    console.log('👎 Analytics: ODRZUCONE');
                    disableGA();
                }
            }
        }

        // Nasłuchuj storage event
        window.addEventListener('storage', (e) => {
            console.log('🔄 Storage event - klucz:', e.key, 'wartość:', e.newValue);
            if (e.key === 'silktideCookieChoice_analytics') {
                console.log('🎯 ZMIANA Analytics cookie WYKRYTA!');
                checkAnalyticsConsent();
            }
        });

        // Co 500ms sprawdzaj zmiany
        setInterval(() => {
            checkAnalyticsConsent();
        }, 500);

        // Czekaj na Silktide
        let silktideReady = false;
        const checkSilktideInterval = setInterval(() => {
            if (typeof silktideCookieBannerManager !== 'undefined' && !silktideReady) {
                silktideReady = true;
                clearInterval(checkSilktideInterval);

                console.log('✓ Silktide Cookie Manager załadowany');

                silktideCookieBannerManager.updateCookieBannerConfig({
                    background: { showBackground: true },
                    cookieIcon: { position: 'bottomRight' },
                    cookieTypes: [
                        {
                            id: 'necessary',
                            name: 'Necessary',
                            description: '<p>These cookies are necessary for the website to function properly and cannot be switched off. They help with things like logging in and setting your privacy preferences.</p>',
                            required: true
                        },
                        {
                            id: 'analytics',
                            name: 'Analytics',
                            description: '<p>These cookies help us improve the site by tracking which pages are most popular and how visitors move around the site.</p>',
                            required: false
                        },
                        {
                            id: 'advertising',
                            name: 'Advertising',
                            description: '<p>These cookies provide extra features and personalization to improve your experience. They may be set by us or by partners whose services we use.</p>',
                            required: false
                        }
                    ],
                    text: {
                        banner: {
                            description: '<p>We use cookies on our site to enhance your user experience, provide personalized content, and analyze our traffic. <a href="https://your-website.com/cookie-policy" target="_blank">Cookie Policy.</a></p>',
                            acceptAllButtonText: 'Accept all',
                            acceptAllButtonAccessibleLabel: 'Accept all cookies',
                            rejectNonEssentialButtonText: 'Reject non-essential',
                            rejectNonEssentialButtonAccessibleLabel: 'Reject non-essential',
                            preferencesButtonText: 'Preferences',
                            preferencesButtonAccessibleLabel: 'Toggle preferences'
                        },
                        preferences: {
                            title: 'Customize your cookie preferences',
                            description: '<p>We respect your right to privacy. You can choose not to allow some types of cookies. Your cookie preferences will apply across our website.</p>',
                            creditLinkText: 'Get this banner for free',
                            creditLinkAccessibleLabel: 'Get this banner for free'
                        }
                    }
                });

                console.log('✓ Silktide konfiguracja gotowa');
                console.log('🔍 Sprawdzam istniejące preferencje...');

                // Sprawdź preferencje przy załadowaniu
                setTimeout(() => {
                    checkAnalyticsConsent();
                }, 500);
            }
        }, 100);

        setTimeout(() => clearInterval(checkSilktideInterval), 5000);