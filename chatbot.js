(() => {
  "use strict";

  const script = document.currentScript;
  const siteRoot = script?.src ? new URL(".", script.src) : new URL("/", window.location.href);
  const CHAT_API_URL = "https://janek-portfolio-ai-guide.janjedrzejak.chatgpt.site/api/chat";
  const MAX_MESSAGE_LENGTH = 600;
  const MAX_HISTORY_MESSAGES = 8;
  const REQUEST_TIMEOUT_MS = 26000;

  if (document.querySelector("[data-portfolio-chat]")) return;

  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = new URL("chatbot.css", siteRoot).href;
  document.head.appendChild(cssLink);

  const copy = {
    en: {
      launcher: "Ask Jan's AI guide",
      title: "Jan / AI guide",
      status: "Portfolio knowledge online",
      close: "Close AI guide",
      assistant: "AI guide",
      you: "You",
      greeting: "Hi — I’m Jan’s AI portfolio guide. Ask me about his experience, projects, approach to automation or how to get in touch.",
      placeholder: "Ask about Jan’s work…",
      send: "Send message",
      notice: "AI can make mistakes. Don’t share sensitive data. Messages are processed by Groq.",
      privacy: "Privacy",
      typing: "Preparing an answer",
      error: "I couldn’t reach the AI service just now. Please try again in a moment.",
      limited: "The AI service has reached its temporary limit. Please try again later.",
      tooFast: "Please wait a moment before sending another message.",
      suggestions: [
        "Which AI projects has Jan delivered?",
        "How does Jan approach automation?",
        "What can Jan help a team with?",
        "How can I contact Jan?"
      ]
    },
    pl: {
      launcher: "Zapytaj przewodnika AI Jana",
      title: "Jan / przewodnik AI",
      status: "Wiedza portfolio aktywna",
      close: "Zamknij przewodnika AI",
      assistant: "Przewodnik AI",
      you: "Ty",
      greeting: "Cześć — jestem przewodnikiem AI po portfolio Jana. Zapytaj mnie o jego doświadczenie, projekty, podejście do automatyzacji albo możliwość współpracy.",
      placeholder: "Zapytaj o pracę Jana…",
      send: "Wyślij wiadomość",
      notice: "AI może się mylić. Nie podawaj danych wrażliwych. Wiadomości przetwarza Groq.",
      privacy: "Prywatność",
      typing: "Przygotowuję odpowiedź",
      error: "Nie udało mi się teraz połączyć z usługą AI. Spróbuj ponownie za chwilę.",
      limited: "Usługa AI osiągnęła chwilowy limit. Spróbuj ponownie później.",
      tooFast: "Odczekaj chwilę przed wysłaniem kolejnej wiadomości.",
      suggestions: [
        "Jakie projekty AI realizował Jan?",
        "Jak Jan podchodzi do automatyzacji?",
        "W czym Jan może pomóc zespołowi?",
        "Jak skontaktować się z Janem?"
      ]
    }
  };

  const iconChat = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.25-4.15A8.5 8.5 0 1 1 21 12Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>';
  const iconSend = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

  const root = document.createElement("section");
  root.className = "portfolio-chat";
  root.dataset.portfolioChat = "";
  root.innerHTML = `
    <button class="portfolio-chat__launcher" type="button" aria-expanded="false" aria-controls="portfolio-chat-panel">
      ${iconChat}<span class="portfolio-chat__sr-only" data-chat-copy="launcher"></span>
    </button>
    <div class="portfolio-chat__panel" id="portfolio-chat-panel" role="dialog" aria-modal="false" aria-labelledby="portfolio-chat-title" aria-hidden="true" hidden>
      <header class="portfolio-chat__header">
        <span class="portfolio-chat__mark" aria-hidden="true">JJ</span>
        <div class="portfolio-chat__title"><strong id="portfolio-chat-title" data-chat-copy="title"></strong><span class="portfolio-chat__status" data-chat-copy="status"></span></div>
        <button class="portfolio-chat__close" type="button"><span aria-hidden="true">×</span><span class="portfolio-chat__sr-only" data-chat-copy="close"></span></button>
      </header>
      <div class="portfolio-chat__messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <div class="portfolio-chat__suggestions" aria-label="Suggested questions"></div>
      <div class="portfolio-chat__composer">
        <form class="portfolio-chat__form">
          <label class="portfolio-chat__input-wrap">
            <span class="portfolio-chat__sr-only" data-chat-copy="placeholder"></span>
            <textarea class="portfolio-chat__input" rows="1" maxlength="${MAX_MESSAGE_LENGTH}"></textarea>
            <span class="portfolio-chat__count" aria-hidden="true">0/${MAX_MESSAGE_LENGTH}</span>
          </label>
          <button class="portfolio-chat__send" type="submit" disabled>${iconSend}<span class="portfolio-chat__sr-only" data-chat-copy="send"></span></button>
        </form>
        <p class="portfolio-chat__notice"><span data-chat-copy="notice"></span> <a href="${new URL("privacy.html", siteRoot).href}" data-chat-copy="privacy"></a>.</p>
      </div>
    </div>`;
  document.body.appendChild(root);

  const launcher = root.querySelector(".portfolio-chat__launcher");
  const panel = root.querySelector(".portfolio-chat__panel");
  const closeButton = root.querySelector(".portfolio-chat__close");
  const messages = root.querySelector(".portfolio-chat__messages");
  const suggestions = root.querySelector(".portfolio-chat__suggestions");
  const form = root.querySelector(".portfolio-chat__form");
  const input = root.querySelector(".portfolio-chat__input");
  const count = root.querySelector(".portfolio-chat__count");
  const sendButton = root.querySelector(".portfolio-chat__send");
  let language = document.documentElement.lang?.toLowerCase().startsWith("pl") ? "pl" : "en";
  let isBusy = false;
  let hasStarted = false;
  let conversation = [];

  function track(eventName) {
    if (typeof window.gtag === "function") window.gtag("event", eventName, { event_category: "ai_guide" });
  }

  function currentCopy() { return copy[language]; }

  function applyCopy(nextLanguage) {
    language = nextLanguage === "pl" ? "pl" : "en";
    root.querySelectorAll("[data-chat-copy]").forEach((element) => {
      const key = element.dataset.chatCopy;
      if (typeof currentCopy()[key] === "string") element.textContent = currentCopy()[key];
    });
    launcher.setAttribute("aria-label", currentCopy().launcher);
    closeButton.setAttribute("aria-label", currentCopy().close);
    sendButton.setAttribute("aria-label", currentCopy().send);
    input.setAttribute("aria-label", currentCopy().placeholder);
    input.placeholder = currentCopy().placeholder;
    renderSuggestions();
    if (!hasStarted) {
      messages.replaceChildren();
      addMessage("assistant", currentCopy().greeting, false);
    }
  }

  function renderSuggestions() {
    suggestions.replaceChildren();
    if (hasStarted) {
      suggestions.hidden = true;
      return;
    }
    suggestions.hidden = false;
    currentCopy().suggestions.forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "portfolio-chat__suggestion";
      button.textContent = question;
      button.addEventListener("click", () => submitQuestion(question));
      suggestions.appendChild(button);
    });
  }

  function isSafeLink(raw) {
    try {
      const url = new URL(raw, "https://janjedrzejak.github.io/");
      if (url.protocol === "mailto:") return url.href === "mailto:jan.jedrzejak@gmail.com";
      if (url.protocol !== "https:") return false;
      if (url.hostname === "janjedrzejak.github.io") return true;
      return url.hostname === "www.linkedin.com" && url.pathname.replace(/\/$/, "") === "/in/janjedrzejak";
    } catch (_) {
      return false;
    }
  }

  function appendSafeText(container, text) {
    const urlPattern = /(https:\/\/[^\s<>]+|mailto:[^\s<>]+)/g;
    let cursor = 0;
    for (const match of text.matchAll(urlPattern)) {
      const rawMatch = match[0];
      const clean = rawMatch.replace(/[),.;!?]+$/, "");
      const trailing = rawMatch.slice(clean.length);
      container.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      if (isSafeLink(clean)) {
        const anchor = document.createElement("a");
        anchor.href = clean;
        anchor.textContent = clean.replace("https://janjedrzejak.github.io/", "/");
        if (anchor.hostname && anchor.hostname !== window.location.hostname) {
          anchor.target = "_blank";
          anchor.rel = "noreferrer";
        }
        container.appendChild(anchor);
      } else {
        container.appendChild(document.createTextNode(clean));
      }
      if (trailing) container.appendChild(document.createTextNode(trailing));
      cursor = match.index + rawMatch.length;
    }
    container.appendChild(document.createTextNode(text.slice(cursor)));
  }

  function addMessage(role, text, record = true) {
    const article = document.createElement("article");
    article.className = `portfolio-chat__message portfolio-chat__message--${role}`;
    const label = document.createElement("span");
    label.className = "portfolio-chat__message-label";
    label.textContent = role === "user" ? currentCopy().you : currentCopy().assistant;
    const bubble = document.createElement("p");
    bubble.className = "portfolio-chat__bubble";
    appendSafeText(bubble, String(text || ""));
    article.append(label, bubble);
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
    if (record) {
      conversation.push({ role, content: String(text).slice(0, MAX_MESSAGE_LENGTH * 2) });
      conversation = conversation.slice(-MAX_HISTORY_MESSAGES);
    }
    return article;
  }

  function addTyping() {
    const article = document.createElement("article");
    article.className = "portfolio-chat__message portfolio-chat__message--assistant";
    article.dataset.typing = "";
    const label = document.createElement("span");
    label.className = "portfolio-chat__message-label";
    label.textContent = currentCopy().typing;
    const bubble = document.createElement("p");
    bubble.className = "portfolio-chat__bubble";
    bubble.innerHTML = '<span class="portfolio-chat__typing" aria-hidden="true"><i></i><i></i><i></i></span>';
    article.append(label, bubble);
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
    return article;
  }

  function setBusy(busy) {
    isBusy = busy;
    input.disabled = busy;
    sendButton.disabled = busy || !input.value.trim();
    suggestions.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 92)}px`;
    count.textContent = `${input.value.length}/${MAX_MESSAGE_LENGTH}`;
    count.classList.toggle("is-near-limit", input.value.length > MAX_MESSAGE_LENGTH * .85);
    sendButton.disabled = isBusy || !input.value.trim();
  }

  function openChat() {
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-modal", window.matchMedia("(max-width: 540px)").matches ? "true" : "false");
    launcher.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    document.documentElement.classList.add("portfolio-chat-is-open");
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
    track("chat_open");
  }

  function closeChat() {
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-modal", "false");
    launcher.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    document.documentElement.classList.remove("portfolio-chat-is-open");
    launcher.focus({ preventScroll: true });
  }

  async function submitQuestion(rawQuestion) {
    const question = String(rawQuestion || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!question || isBusy) return;
    if (!hasStarted) {
      hasStarted = true;
      renderSuggestions();
    }
    input.value = "";
    resizeInput();
    const history = conversation.slice(-MAX_HISTORY_MESSAGES);
    addMessage("user", question);
    const typing = addTyping();
    setBusy(true);
    track("chat_message_sent");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history,
          locale: language,
          page: `${window.location.pathname}${window.location.hash}`.slice(0, 180)
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error("AI request failed");
        error.status = response.status;
        throw error;
      }
      typing.remove();
      addMessage("assistant", payload.answer || currentCopy().error);
      track("chat_response_received");
    } catch (error) {
      typing.remove();
      const message = error.status === 429
        ? currentCopy().limited
        : error.status === 425
          ? currentCopy().tooFast
          : currentCopy().error;
      addMessage("assistant", message, false);
      track("chat_error");
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
      input.focus({ preventScroll: true });
    }
  }

  launcher.addEventListener("click", openChat);
  closeButton.addEventListener("click", closeChat);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(input.value);
  });
  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(input.value);
    }
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]), textarea:not([disabled]), a[href]')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });
  document.addEventListener("portfolio:language", (event) => applyCopy(event.detail?.language));
  new MutationObserver(() => {
    const next = document.documentElement.lang?.toLowerCase().startsWith("pl") ? "pl" : "en";
    if (next !== language) applyCopy(next);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  applyCopy(language);
  resizeInput();
})();
