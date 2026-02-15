const cursor = document.getElementById("cursor");
const cursorRing = document.getElementById("cursorRing");

if (cursor && cursorRing) {
  let mouseX = 0,
    mouseY = 0,
    ringX = 0,
    ringY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + "px";
    cursor.style.top = mouseY + "px";
  });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + "px";
    cursorRing.style.top = ringY + "px";
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Enlarge cursor on interactive elements
  const interactiveElements = document.querySelectorAll(
    "a, button, .product-card, .coll-card, .action-btn, input, textarea, select"
  );
  interactiveElements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursor.style.width = "14px";
      cursor.style.height = "14px";
      cursorRing.style.width = "54px";
      cursorRing.style.height = "54px";
    });
    el.addEventListener("mouseleave", () => {
      cursor.style.width = "8px";
      cursor.style.height = "8px";
      cursorRing.style.width = "36px";
      cursorRing.style.height = "36px";
    });
  });
}

// ─── Sticky Navigation ──────────────────────────────
const navbar = document.getElementById("navbar");
if (navbar && !navbar.classList.contains("scrolled")) {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 80);
  });
}

// ─── Scroll Animations ──────────────────────────────
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));

// ─── Live Watch Hands ───────────────────────────────
function updateClock() {
  const now = new Date();
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();

  const hDeg = h * 30 + m * 0.5;
  const mDeg = m * 6;
  const sDeg = s * 6;

  const hourHand = document.querySelector(".hand-hour");
  const minHand = document.querySelector(".hand-min");
  const secHand = document.querySelector(".hand-sec");

  if (hourHand)
    hourHand.style.transform = `translateX(-50%) rotate(${hDeg}deg)`;
  if (minHand) minHand.style.transform = `translateX(-50%) rotate(${mDeg}deg)`;
  if (secHand) secHand.style.transform = `translateX(-50%) rotate(${sDeg}deg)`;
}

if (document.querySelector(".hand-hour")) {
  updateClock();
  setInterval(updateClock, 1000);
}

// ─── Parallax on Hero Watch ─────────────────────────
const heroWatch = document.querySelector(".hero-watch-visual");
if (heroWatch) {
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    if (scrolled < window.innerHeight) {
      heroWatch.style.transform = `translateY(calc(-50% + ${
        scrolled * 0.18
      }px))`;
    }
  });
}

// ─── Form Submission Handler ────────────────────────
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert(
      "Thank you for your inquiry. Our team will contact you within 24 hours."
    );
    contactForm.reset();
  });
}

// ─── Newsletter Submission ──────────────────────────
const newsletterForms = document.querySelectorAll(".newsletter-form");
newsletterForms.forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thank you for subscribing to the Aurum newsletter!");
    form.reset();
  });
});

// ─── Smooth Scroll for Anchor Links ─────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (href !== "#" && href !== "") {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});
