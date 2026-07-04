/* ===================== Footer year ===================== */
document.getElementById("year").textContent = new Date().getFullYear();

/* ===================== Theme (dark / light) toggle ===================== */
const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;

const applyTheme = (theme) => {
  root.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-pressed", String(theme === "light"));
};

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// keep in sync with the OS preference, unless the user has chosen manually
window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  try { if (localStorage.getItem("theme")) return; } catch (err) {}
  applyTheme(e.matches ? "light" : "dark");
});

/* ===================== Navbar scroll state ===================== */
const navbar = document.getElementById("navbar");
const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 20);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ===================== Mobile menu ===================== */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  })
);

/* ===================== Skill segments fill ===================== */
document.querySelectorAll(".segs").forEach((seg) => {
  const level = parseInt(seg.dataset.level || "0", 10);
  seg.querySelectorAll("i").forEach((dot, idx) => {
    if (idx < level) dot.classList.add("on");
  });
});

/* ===================== Reveal on scroll ===================== */
// Reveal anything currently on screen right now — belt-and-braces so
// async-rendered cards (content.js) or deep-linked sections (#projects,
// #experience) never stay stuck at opacity:0 waiting for a scroll event.
const revealVisible = (root = document) => {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  root.querySelectorAll(".reveal:not(.in-view)").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add("in-view");
  });
};

if ("IntersectionObserver" in window) {
  // Opt into the hidden-then-reveal effect only now that we know we can
  // reveal it. Without this class the CSS keeps all content visible.
  root.classList.add("reveal-ready");

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  // observe a set of .reveal elements (default: whole document).
  // exposed so content.js can register cards it renders after page load.
  window.HHObserveReveals = (scope = document) => {
    revealVisible(scope); // reveal what's already on screen immediately
    scope.querySelectorAll(".reveal:not(.in-view)").forEach((el) => revealObserver.observe(el));
  };
  window.HHObserveReveals();

  // Safety net: if anything is still hidden after load (observer race,
  // async content that landed off-screen), reveal what's on screen.
  window.addEventListener("load", () => revealVisible());
  window.addEventListener("resize", () => revealVisible(), { passive: true });
} else {
  // No IntersectionObserver → never hide anything; just show every card.
  window.HHObserveReveals = (scope = document) =>
    scope.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
  window.HHObserveReveals();
}

// trigger the segment scale animation when a skill card enters view
if ("IntersectionObserver" in window) {
  const skillObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll(".skill").forEach((s) => s.classList.add("in-view"));
          skillObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.25 }
  );
  document.querySelectorAll(".skill-card").forEach((c) => skillObserver.observe(c));
} else {
  document.querySelectorAll(".skill-card .skill").forEach((s) => s.classList.add("in-view"));
}

/* ===================== Active nav link on scroll ===================== */
if ("IntersectionObserver" in window) {
  const sections = [...document.querySelectorAll("main section[id]")];
  const navAnchors = [...navLinks.querySelectorAll("a")];
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navAnchors.forEach((a) =>
            a.classList.toggle("active", a.getAttribute("href") === "#" + id)
          );
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => spy.observe(s));
}
