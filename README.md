# Hisham Hamza — Portfolio

Personal portfolio website for **Hisham Hamza**, Control & Automation Engineer and Ph.D.
researcher (PLC / SCADA / HMI · MATLAB/Simulink · Machine Learning).

Built as a fast, static, single-page site with **plain HTML / CSS / JS** — no build step.

## Features
- Responsive, mobile-first dark theme with a teal accent (+ optional light theme toggle)
- **Trilingual:** English (default), Turkish, Arabic — Arabic switches the layout to **RTL**
- Sections: Hero · About · Skills (1–5 segment ratings) · Research & Publications · Projects ·
  Experience & Internships · Education · Certifications · Languages · Contact
- Scroll-reveal animations and a sticky navigation bar

## Project structure
```
index.html              # all sections, marked up with data-i18n keys
assets/
  css/styles.css         # theme tokens, layout, responsive, RTL (logical properties)
  js/main.js             # nav, theme toggle, scroll reveals, skill segments
  js/i18n.js             # language switching + dir=rtl handling
  i18n/{en,tr,ar}.json   # translation dictionaries
  img/                   # profile photo, logo, CV (PDF)
vercel.json              # clean URLs + asset caching headers
```

## Run locally
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Translations
All visible text is keyed via `data-i18n="..."` and translated in
`assets/i18n/{en,tr,ar}.json`. To edit copy, change the value for a key in **all three**
files. The selected language is remembered in `localStorage`.

## Deploy (Vercel)
1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Other** (no build command, output = repo root).
4. Deploy — Vercel serves the static files directly.
