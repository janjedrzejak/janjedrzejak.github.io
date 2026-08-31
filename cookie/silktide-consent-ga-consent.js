(function () {
  "use strict";

  const GA_ID = "G-9XTCEZ21TV";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted"
  });

  let enabled = false;
  let configured = false;
  const scrollSent = new Set();

  function send(name, params) {
    if (!enabled) return;
    gtag("event", name, params || {});
  }

  function enableAnalytics() {
    enabled = true;
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    if (!configured) {
      gtag("js", new Date());
      gtag("config", GA_ID, {
        send_page_view: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
      configured = true;
    }
  }

  function disableAnalytics() {
    enabled = false;
    gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }

  let language = "en";
  try {
    language = localStorage.getItem("portfolio-language") || document.documentElement.lang || "en";
  } catch (e) {
    language = document.documentElement.lang || "en";
  }
  language = language.toLowerCase().startsWith("pl") ? "pl" : "en";

  const pl = language === "pl";

  window.silktideConsentManager.init({
    backdrop: { show: true },
    prompt: { position: "bottomRight" },
    icon: { position: "bottomLeft" },
    text: {
      prompt: {
        description: pl
          ? "<p>Używam opcjonalnej analityki, aby ulepszać portfolio. Google Analytics jest wyłączony do momentu wyrażenia zgody.</p>"
          : "<p>I use optional analytics to improve this portfolio. Google Analytics is disabled until you consent.</p>",
        acceptAllButtonText: pl ? "Akceptuję analitykę" : "Accept analytics",
        rejectNonEssentialButtonText: pl ? "Odrzuć opcjonalne" : "Reject non-essential",
        preferencesButtonText: pl ? "Ustawienia" : "Preferences"
      },
      preferences: {
        title: pl ? "Ustawienia cookies" : "Cookie preferences",
        description: pl
          ? "<p>Wybierz, czy zezwalasz na opcjonalną analitykę odbiorców.</p>"
          : "<p>Choose whether you allow optional audience analytics.</p>",
        saveButtonText: pl ? "Zapisz i zamknij" : "Save and close",
        creditLinkText: "Silktide Consent Manager"
      }
    },
    consentTypes: [
      {
        id: "essential",
        label: pl ? "Niezbędne" : "Essential",
        description: pl
          ? "Wymagane do działania strony i zapamiętania wyborów prywatności."
          : "Required for website functionality and privacy choices.",
        required: true
      },
      {
        id: "analytics",
        label: pl ? "Analityczne" : "Analytics",
        description: pl
          ? "Google Analytics 4 mierzy wizyty, źródła ruchu i interakcje z portfolio."
          : "Google Analytics 4 measures visits, traffic sources and portfolio interactions.",
        defaultValue: false,
        gtag: "analytics_storage",
        scripts: [{
          url: "https://www.googletagmanager.com/gtag/js?id=" + GA_ID,
          load: "async",
          type: "text/javascript"
        }],
        onAccept: enableAnalytics,
        onReject: disableAnalytics
      }
    ]
  });

  window.CookieConsent = window.CookieConsent || {};
  window.CookieConsent.showPreferences = function () {
    const instance = window.silktideConsentManager.getInstance();
    if (instance) instance.toggleModal(true);
  };

  document.addEventListener("click", function (event) {
    const link = event.target.closest && event.target.closest("a");
    if (!link) return;
    const href = (link.getAttribute("href") || "").trim().toLowerCase();
    if (!href) return;

    if (href.startsWith("mailto:")) return send("email_click");
    if (href.startsWith("tel:")) return send("phone_click");
    if (href.includes("linkedin.com")) return send("linkedin_click");
    if (href.includes("resjanjedrzejakcv.pdf")) return send("cv_download", {file_name:"resJanJedrzejakCV.pdf"});
    if (href === "#contact" || href.endsWith("#contact")) return send("contact_click");
    if (href.includes("blog-posts/")) return send("blog_open", {article:href.split("/").pop()});
  });

  document.addEventListener("click", function (event) {
    const card = event.target.closest && event.target.closest("[data-project]");
    if (!card) return;
    const h = card.querySelector("h3");
    send("project_open", {project_name:h ? h.textContent.trim() : "project"});
  });

  window.addEventListener("scroll", function () {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max <= 0) return;
    const pct = Math.round((scrollY / max) * 100);
    [25,50,75,90].forEach(function (t) {
      if (pct >= t && !scrollSent.has(t)) {
        scrollSent.add(t);
        send("scroll_depth", {percent_scrolled:t});
      }
    });
  }, {passive:true});
})();