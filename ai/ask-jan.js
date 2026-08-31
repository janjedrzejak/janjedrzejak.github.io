(function () {
  "use strict";

  const endpoint = (window.ASK_JAN_API_URL || "").replace(/\/$/, "");
  const maxHistory = 6;
  const history = [];
  let busy = false;

  const language = () => {
    try {
      const saved = localStorage.getItem("portfolio-language");
      return (saved || document.documentElement.lang || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
    } catch {
      return (document.documentElement.lang || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
    }
  };

  const copy = {
    en: {
      title: "Ask Jan",
      kicker: "Portfolio AI",
      greeting: "Ask about Jan's experience, projects, AI, automation or product work. Answers are grounded only in this portfolio.",
      placeholder: "Ask a question…",
      note: "AI may make mistakes. Portfolio sources are shown when available.",
      offline: "The AI backend is not connected yet. The interface is ready; connect the Cloudflare Worker URL to enable questions.",
      error: "I couldn't answer that right now. Please try again.",
      busy: "The assistant is busy. Try again in a moment.",
      suggestions: [
        ["AI experience", "What experience does Jan have with AI?"],
        ["Automation", "Which automation projects has Jan worked on?"],
        ["Product ownership", "What product ownership experience does Jan have?"],
        ["Contact", "How can I contact Jan?"]
      ]
    },
    pl: {
      title: "Ask Jan",
      kicker: "Portfolio AI",
      greeting: "Zapytaj o doświadczenie Jana, projekty, AI, automatyzację lub product ownership. Odpowiedzi bazują wyłącznie na tym portfolio.",
      placeholder: "Zadaj pytanie…",
      note: "AI może się mylić. Gdy to możliwe, pokazuję źródła z portfolio.",
      offline: "Backend AI nie jest jeszcze podłączony. Interfejs jest gotowy — połączymy URL Cloudflare Workera, aby uruchomić pytania.",
      error: "Nie udało mi się teraz odpowiedzieć. Spróbuj ponownie.",
      busy: "Asystent jest chwilowo zajęty. Spróbuj za moment.",
      suggestions: [
        ["Doświadczenie AI", "Jakie doświadczenie Jan ma z AI?"],
        ["Automatyzacja", "Jakie projekty automatyzacyjne realizował Jan?"],
        ["Product ownership", "Jakie doświadczenie Jan ma jako Product Owner?"],
        ["Kontakt", "Jak mogę skontaktować się z Janem?"]
      ]
    }
  };

  function track(name, params) {
    if (window.portfolioAnalytics && typeof window.portfolioAnalytics.track === "function") {
      window.portfolioAnalytics.track(name, params || {});
    }
  }

  function build() {
    const lang = language();
    const t = copy[lang];

    const launcher = document.createElement("button");
    launcher.className = "ask-jan-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "ask-jan-panel");
    launcher.innerHTML = '<span class="ask-jan-launcher-dot"></span><span>AI / ASK JAN</span>';

    const panel = document.createElement("section");
    panel.className = "ask-jan-panel";
    panel.id = "ask-jan-panel";
    panel.setAttribute("aria-label", t.title);
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = [
      '<header class="ask-jan-head">',
        '<div class="ask-jan-title"><span class="ask-jan-kicker">' + escapeHtml(t.kicker) + '</span><strong>' + escapeHtml(t.title) + '</strong></div>',
        '<button class="ask-jan-close" type="button" aria-label="Close">×</button>',
      '</header>',
      '<div class="ask-jan-messages" aria-live="polite"></div>',
      '<div class="ask-jan-compose">',
        '<form class="ask-jan-form">',
          '<textarea class="ask-jan-input" rows="1" maxlength="500" placeholder="' + escapeHtml(t.placeholder) + '"></textarea>',
          '<button class="ask-jan-send" type="submit" aria-label="Send">↗</button>',
        '</form>',
        '<p class="ask-jan-note">' + escapeHtml(t.note) + '</p>',
      '</div>'
    ].join("");

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const messages = panel.querySelector(".ask-jan-messages");
    const form = panel.querySelector(".ask-jan-form");
    const input = panel.querySelector(".ask-jan-input");
    const send = panel.querySelector(".ask-jan-send");
    const close = panel.querySelector(".ask-jan-close");

    addAssistant(messages, endpoint ? t.greeting : t.offline, [], false, t.suggestions);

    if (!endpoint) {
      input.disabled = true;
      send.disabled = true;
    }

    function open() {
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      launcher.setAttribute("aria-expanded", "true");
      track("ai_chat_open");
      if (!input.disabled) setTimeout(() => input.focus(), 100);
    }

    function shut() {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }

    launcher.addEventListener("click", () => panel.classList.contains("is-open") ? shut() : open());
    close.addEventListener("click", shut);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("is-open")) shut();
    });

    messages.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-ask-jan-question]");
      if (chip) {
        input.value = chip.dataset.askJanQuestion || "";
        submit();
        return;
      }
      const source = event.target.closest(".ask-jan-source");
      if (source) track("ai_source_click");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });

    async function submit() {
      const question = input.value.trim();
      if (!question || busy || !endpoint) return;

      busy = true;
      input.value = "";
      input.style.height = "auto";
      input.disabled = true;
      send.disabled = true;

      addUser(messages, question);
      history.push({ role: "user", content: question });
      while (history.length > maxHistory) history.shift();

      const typing = addTyping(messages);
      track("ai_prompt_submit", { question_category: classify(question) });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 22000);

      try {
        const response = await fetch(endpoint + "/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            history: history.slice(0, -1)
          }),
          signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));
        typing.remove();

        if (!response.ok) {
          const message = response.status === 429 ? t.busy : (data.error || t.error);
          addAssistant(messages, message, [], true);
          return;
        }

        addAssistant(messages, data.answer || t.error, data.sources || []);
        history.push({ role: "assistant", content: data.answer || "" });
        while (history.length > maxHistory) history.shift();
        track("ai_response", { question_category: data.category || classify(question) });
      } catch {
        typing.remove();
        addAssistant(messages, t.error, [], true);
      } finally {
        clearTimeout(timeout);
        busy = false;
        input.disabled = false;
        send.disabled = false;
        input.focus();
      }
    }
  }

  function addUser(container, text) {
    const wrap = document.createElement("div");
    wrap.className = "ask-jan-message ask-jan-message-user";
    wrap.innerHTML = '<div class="ask-jan-bubble"></div>';
    wrap.querySelector(".ask-jan-bubble").textContent = text;
    container.appendChild(wrap);
    scrollBottom(container);
  }

  function addAssistant(container, text, sources, error, suggestions) {
    const wrap = document.createElement("div");
    wrap.className = "ask-jan-message ask-jan-message-assistant" + (error ? " is-error" : "");

    const bubble = document.createElement("div");
    bubble.className = "ask-jan-bubble";
    bubble.textContent = text;
    wrap.appendChild(bubble);

    if (Array.isArray(sources) && sources.length) {
      const sourceWrap = document.createElement("div");
      sourceWrap.className = "ask-jan-sources";
      sources.forEach((source) => {
        if (!source || !source.url) return;
        const a = document.createElement("a");
        a.className = "ask-jan-source";
        a.href = source.url;
        a.target = source.url.startsWith("http") ? "_blank" : "_self";
        a.rel = "noreferrer";
        a.textContent = source.label || "Source";
        sourceWrap.appendChild(a);
      });
      wrap.appendChild(sourceWrap);
    }

    if (Array.isArray(suggestions) && suggestions.length) {
      const quick = document.createElement("div");
      quick.className = "ask-jan-quick";
      suggestions.forEach(([label, question]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ask-jan-chip";
        button.dataset.askJanQuestion = question;
        button.textContent = label;
        quick.appendChild(button);
      });
      wrap.appendChild(quick);
    }

    container.appendChild(wrap);
    scrollBottom(container);
    return wrap;
  }

  function addTyping(container) {
    const wrap = document.createElement("div");
    wrap.className = "ask-jan-message ask-jan-message-assistant";
    wrap.innerHTML = '<div class="ask-jan-bubble"><span class="ask-jan-typing"><i></i><i></i><i></i></span></div>';
    container.appendChild(wrap);
    scrollBottom(container);
    return wrap;
  }

  function scrollBottom(container) {
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }

  function classify(text) {
    const q = text.toLowerCase();
    if (/\b(ai|ml|rag|llm|machine|sztuczna)\b/.test(q)) return "ai";
    if (/n8n|automat|workflow|power automate/.test(q)) return "automation";
    if (/product|produkt|owner|crm|b2b/.test(q)) return "product";
    if (/experience|doswiad|career|karier/.test(q)) return "experience";
    if (/contact|kontakt|email|telefon|linkedin/.test(q)) return "contact";
    return "other";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build, { once: true });
  } else {
    build();
  }
})();
