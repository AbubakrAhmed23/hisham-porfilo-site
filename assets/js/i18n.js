/* ===================== i18n: language switching + RTL ===================== */
(function () {
  const SUPPORTED = ["en", "tr", "ar"];
  const RTL = ["ar"];
  const STORAGE_KEY = "hh_lang";
  const cache = {};

  function getInitialLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    return "en"; // default opens in English
  }

  async function loadDict(lang) {
    if (cache[lang]) return cache[lang];
    const res = await fetch(`assets/i18n/${lang}.json`);
    if (!res.ok) throw new Error(`Missing translations for ${lang}`);
    const dict = await res.json();
    cache[lang] = dict;
    return dict;
  }

  function applyDict(dict) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key in dict) el.textContent = dict[key];
    });
    // attribute-based translations: data-i18n-attr="placeholder:key,aria-label:key"
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (key in dict) el.setAttribute(attr, dict[key]);
      });
    });
  }

  async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = "en";
    let dict;
    try {
      dict = await loadDict(lang);
    } catch (e) {
      console.error(e);
      return;
    }
    applyDict(dict);

    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", RTL.includes(lang) ? "rtl" : "ltr");

    localStorage.setItem(STORAGE_KEY, lang);

    document.querySelectorAll(".lang-btn").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.lang === lang)
    );
  }

  // wire up buttons
  document.querySelectorAll(".lang-btn").forEach((btn) =>
    btn.addEventListener("click", () => setLang(btn.dataset.lang))
  );

  // initial load
  setLang(getInitialLang());
})();
