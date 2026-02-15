// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATIC TRANSLATION INITIALIZATION
// Ensures correct language is applied on every page load
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  console.log("[translate-init] Starting initialization...");

  let initCount = 0;
  const MAX_INIT_ATTEMPTS = 50; // 5 seconds max

  // Wait for i18n to be available
  function waitForI18n(callback) {
    initCount++;

    if (typeof i18n !== "undefined") {
      console.log("[translate-init] i18n system found, initializing...");
      callback();
    } else if (initCount < MAX_INIT_ATTEMPTS) {
      setTimeout(() => waitForI18n(callback), 100);
    } else {
      console.error("[translate-init] Failed to initialize - i18n not found");
    }
  }

  // Initialize translations when ready
  waitForI18n(() => {
    console.log("[translate-init] Running language initialization");

    // Get saved language from localStorage
    const savedLanguage = localStorage.getItem("aurum_language");
    console.log("[translate-init] Saved language:", savedLanguage || "none");

    // If there's a saved language, ensure it's set
    if (savedLanguage && i18n.currentLanguage !== savedLanguage) {
      console.log("[translate-init] Setting language to:", savedLanguage);
      i18n.currentLanguage = savedLanguage;
    }

    // Apply translations and update UI
    setTimeout(() => {
      if (typeof i18n !== "undefined") {
        i18n.applyTranslations();
        i18n.updateLanguageUI();
        console.log("[translate-init] Translations applied successfully");
      }
    }, 100);

    // Re-translate when modals open
    const originalOpenModal = window.openModal;
    if (originalOpenModal && !window.openModal._i18nPatched) {
      window.openModal = function (modalId) {
        originalOpenModal(modalId);
        setTimeout(() => {
          if (typeof i18n !== "undefined") {
            i18n.applyTranslations();
          }
        }, 50);
      };
      window.openModal._i18nPatched = true;
    }

    console.log("[translate-init] Initialization complete");
  });
})();
