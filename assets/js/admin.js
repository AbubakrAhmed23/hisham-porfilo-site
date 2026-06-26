/* =====================================================================
   admin.js — simple content manager for the portfolio.
   Loads assets/data/content.json, lets the owner edit/add/remove items,
   then commits the file back to GitHub via the REST API. A push to the
   repo triggers an automatic Vercel redeploy, so edits go live.
   The only credential is a GitHub token kept in this browser.
   ===================================================================== */
(function () {
  "use strict";

  // ---- config (repo Vercel deploys from; editable on the login screen) ----
  const DEFAULTS = {
    owner: "hishamhamza",
    repo: "hisham-profilo-site",
    branch: "main",
  };
  const FILE_PATH = "assets/data/content.json";
  const LS = {
    token: "hh_admin_token",
    owner: "hh_admin_owner",
    repo: "hh_admin_repo",
    branch: "hh_admin_branch",
  };
  const LANGS = ["en", "tr", "ar"];

  // ---- schema describing every editable section ----
  const blankI18n = () => ({ en: "", tr: "", ar: "" });
  const SCHEMA = [
    {
      key: "publications",
      label: "Publications",
      hint: "Papers shown in “Research & Publications”. The link opens when a card is clicked.",
      titleOf: (it) => it.title && it.title.en,
      blank: () => ({ link: "", tag: { en: "", tr: "", ar: "" }, title: blankI18n(), desc: blankI18n(), meta: blankI18n() }),
      fields: [
        { key: "link", label: "Link (URL)", type: "url" },
        { key: "tag", label: "Tag / badge", type: "i18n" },
        { key: "title", label: "Title", type: "i18n", textarea: true },
        { key: "desc", label: "Description", type: "i18n", textarea: true },
        { key: "meta", label: "Footnote (e.g. Journal article · IEEE Access)", type: "i18n" },
      ],
    },
    {
      key: "projects",
      label: "Projects",
      hint: "Cards shown in the “Projects” section.",
      titleOf: (it) => it.title && it.title.en,
      blank: () => ({ tags: [], title: blankI18n(), desc: blankI18n() }),
      fields: [
        { key: "title", label: "Title", type: "i18n" },
        { key: "desc", label: "Description", type: "i18n", textarea: true },
        { key: "tags", label: "Tags (comma separated)", type: "tags" },
      ],
    },
    {
      key: "experience",
      label: "Experience",
      hint: "Timeline entries in the “Experience” section.",
      titleOf: (it) => it.role && it.role.en,
      blank: () => ({ date: "", org: "", role: blankI18n(), desc: blankI18n() }),
      fields: [
        { key: "date", label: "Date range", type: "text" },
        { key: "org", label: "Organisation", type: "text" },
        { key: "role", label: "Role", type: "i18n" },
        { key: "desc", label: "Description", type: "i18n", textarea: true },
      ],
    },
    {
      key: "internships",
      label: "Internships",
      hint: "Small cards under the experience timeline.",
      titleOf: (it) => it.org,
      blank: () => ({ org: "", text: blankI18n() }),
      fields: [
        { key: "org", label: "Organisation", type: "text" },
        { key: "text", label: "Description", type: "i18n" },
      ],
    },
    {
      key: "education",
      label: "Education",
      hint: "Cards in the “Education” section. Leave grade empty to hide it.",
      titleOf: (it) => it.deg && it.deg.en,
      blank: () => ({ date: "", org: "", deg: blankI18n(), grade: blankI18n() }),
      fields: [
        { key: "date", label: "Date range", type: "text" },
        { key: "org", label: "Organisation", type: "text" },
        { key: "deg", label: "Degree / title", type: "i18n" },
        { key: "grade", label: "Grade / honour (optional)", type: "i18n" },
      ],
    },
  ];

  // ---- tiny DOM helpers ----
  const $ = (id) => document.getElementById(id);
  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) Object.entries(props).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v != null) n.setAttribute(k, v);
    });
    (children || []).forEach((c) => n.appendChild(c));
    return n;
  }

  // ---- state ----
  let DATA = null;     // current content being edited
  let fileSha = null;  // sha of content.json on GitHub (for commits)

  function cfg() {
    return {
      token: localStorage.getItem(LS.token) || "",
      owner: localStorage.getItem(LS.owner) || DEFAULTS.owner,
      repo: localStorage.getItem(LS.repo) || DEFAULTS.repo,
      branch: localStorage.getItem(LS.branch) || DEFAULTS.branch,
    };
  }

  // ========================= GitHub API =========================
  function apiUrl() {
    const c = cfg();
    return `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${FILE_PATH}`;
  }
  function headers() {
    return {
      Authorization: `Bearer ${cfg().token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }
  // base64 that survives UTF-8 (Arabic / Turkish)
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
  }

  async function ghGetFile() {
    const res = await fetch(`${apiUrl()}?ref=${cfg().branch}`, { headers: headers() });
    if (res.status === 401) throw new Error("Invalid or expired token.");
    if (res.status === 404) throw new Error("File or repository not found — check repository settings.");
    if (!res.ok) throw new Error(`GitHub error ${res.status}`);
    const json = await res.json();
    fileSha = json.sha;
    return JSON.parse(fromBase64(json.content));
  }

  async function ghPutFile(content, message) {
    const body = {
      message,
      content: toBase64(content),
      branch: cfg().branch,
    };
    if (fileSha) body.sha = fileSha;
    const res = await fetch(apiUrl(), { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message; } catch (e) {}
      throw new Error(`Save failed (${res.status}). ${detail}`);
    }
    const json = await res.json();
    fileSha = json.content && json.content.sha;
  }

  // ========================= editor UI =========================
  function setStatus(node, text, cls) {
    node.textContent = text;
    node.className = "status" + (cls ? " " + cls : "");
  }

  function i18nField(obj, field) {
    const grid = el("div", { class: "i18n-grid" });
    LANGS.forEach((lng) => {
      const inputProps = { value: obj[lng] || "", class: lng };
      const input = field.textarea ? el("textarea", inputProps) : el("input", { ...inputProps, type: "text" });
      input.addEventListener("input", () => { obj[lng] = input.value; });
      grid.appendChild(el("div", { class: "lang-row" }, [
        el("span", { class: "lang-tag", text: lng }),
        input,
      ]));
    });
    return grid;
  }

  function plainField(item, field) {
    if (field.type === "tags") {
      const input = el("input", { type: "text", value: (item[field.key] || []).join(", ") });
      input.addEventListener("input", () => {
        item[field.key] = input.value.split(",").map((s) => s.trim()).filter(Boolean);
      });
      return input;
    }
    const input = el("input", { type: field.type === "url" ? "url" : "text", value: item[field.key] || "" });
    if (field.type === "url") input.placeholder = "https://…";
    input.addEventListener("input", () => { item[field.key] = input.value; });
    return input;
  }

  function renderItem(section, list, item, index) {
    const head = el("div", { class: "item-head" }, [
      el("span", { class: "title", text: `${index + 1}. ${section.titleOf(item) || "—"}` }),
      el("button", { class: "btn ghost sm", title: "Move up", text: "↑", onclick: () => move(section, list, index, -1) }),
      el("button", { class: "btn ghost sm", title: "Move down", text: "↓", onclick: () => move(section, list, index, 1) }),
      el("button", { class: "btn ghost sm danger", text: "Delete", onclick: () => removeItem(section, list, index) }),
    ]);

    const fields = section.fields.map((field) => {
      const control = field.type === "i18n" ? i18nField(item[field.key], field) : plainField(item, field);
      return el("div", { class: "field" }, [el("label", { text: field.label }), control]);
    });

    return el("div", { class: "item" }, [head, ...fields]);
  }

  function renderSection(section) {
    const list = DATA[section.key] || (DATA[section.key] = []);
    const body = el("div", {}, list.map((item, i) => renderItem(section, list, item, i)));
    const add = el("div", { class: "add-row" }, [
      el("button", {
        class: "btn", text: `+ Add ${section.label.replace(/s$/, "").toLowerCase()}`,
        onclick: () => { list.push(section.blank()); rerender(); },
      }),
    ]);
    return el("div", { class: "panel" }, [
      el("h2", { text: section.label }),
      el("p", { class: "hint", text: section.hint }),
      body,
      add,
    ]);
  }

  function move(section, list, index, dir) {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    rerender();
  }
  function removeItem(section, list, index) {
    if (!confirm("Delete this item?")) return;
    list.splice(index, 1);
    rerender();
  }

  function rerender() {
    const editor = $("editor");
    editor.textContent = "";
    SCHEMA.forEach((section) => editor.appendChild(renderSection(section)));
  }

  // ========================= flows =========================
  async function load() {
    setStatus($("status"), "Loading…", "busy");
    try {
      DATA = await ghGetFile();
      rerender();
      setStatus($("status"), "Loaded latest from GitHub", "ok");
    } catch (e) {
      // fall back to the deployed file if GitHub read fails (e.g. token can't read)
      try {
        const res = await fetch("assets/data/content.json?ts=" + (window.HHTs || ""));
        DATA = await res.json();
        rerender();
        setStatus($("status"), "Loaded local copy — " + e.message, "err");
      } catch (e2) {
        setStatus($("status"), e.message, "err");
      }
    }
  }

  async function save() {
    const btn = $("saveBtn");
    btn.disabled = true;
    setStatus($("status"), "Publishing…", "busy");
    try {
      // refresh sha first so concurrent edits don't clash
      try { await ghGetFile(); } catch (e) {}
      const pretty = JSON.stringify(DATA, null, 2) + "\n";
      await ghPutFile(pretty, "Update site content via admin panel");
      setStatus($("status"), "Published ✓ — site will redeploy shortly", "ok");
    } catch (e) {
      setStatus($("status"), e.message, "err");
    } finally {
      btn.disabled = false;
    }
  }

  function showApp() {
    $("gate").classList.add("hidden");
    $("app").classList.remove("hidden");
    load();
  }

  // ========================= login gate =========================
  function initGate() {
    const c = cfg();
    $("owner").value = c.owner;
    $("repo").value = c.repo;
    $("branch").value = c.branch;

    $("loginBtn").addEventListener("click", async () => {
      const token = $("tok").value.trim();
      if (!token) { setStatus($("gateStatus"), "Enter a token.", "err"); return; }
      localStorage.setItem(LS.token, token);
      localStorage.setItem(LS.owner, $("owner").value.trim() || DEFAULTS.owner);
      localStorage.setItem(LS.repo, $("repo").value.trim() || DEFAULTS.repo);
      localStorage.setItem(LS.branch, $("branch").value.trim() || DEFAULTS.branch);

      setStatus($("gateStatus"), "Verifying…", "busy");
      try {
        await ghGetFile();              // validates token + repo access
        setStatus($("gateStatus"), "", "");
        showApp();
      } catch (e) {
        setStatus($("gateStatus"), e.message, "err");
      }
    });

    $("tok").addEventListener("keydown", (ev) => { if (ev.key === "Enter") $("loginBtn").click(); });
  }

  function logout() {
    localStorage.removeItem(LS.token);
    location.reload();
  }

  // ========================= boot =========================
  $("reloadBtn").addEventListener("click", load);
  $("saveBtn").addEventListener("click", save);
  $("logoutBtn").addEventListener("click", logout);
  initGate();

  if (cfg().token) showApp();   // already signed in this browser
})();
