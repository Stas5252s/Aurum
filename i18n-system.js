/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AURUM - FINAL STABLE TRANSLATION SYSTEM
 * Translates ALL UI text reliably without breaking
 * ═══════════════════════════════════════════════════════════════════════════
 */

class I18nFinal {
  constructor() {
    this.currentLanguage = "en";
    this.translations = {};
    this.isTranslating = false;
    this.translationAttempts = 0;
    this.maxAttempts = 3;
    this.STORAGE_KEY = "aurum_language";
    this.supportedLanguages = ["en", "es", "de", "fr", "zh"];

    // Store original English text for each element
    this.originalTexts = new WeakMap();
  }

  async init() {
    console.log("[i18n] Final translation system initializing...");

    this.loadTranslations();
    await this.detectLanguage();
    await this.translatePage();
    this.setupLanguageSwitcher();

    console.log("[i18n] System ready - Language:", this.currentLanguage);
  }

  loadTranslations() {
    this.translations = {
      en: this.getEnglishTranslations(),
      es: this.getSpanishTranslations(),
      de: this.getGermanTranslations(),
      fr: this.getFrenchTranslations(),
      zh: this.getChineseTranslations(),
    };
  }

  async detectLanguage() {
    const savedLang = localStorage.getItem(this.STORAGE_KEY);
    if (savedLang && this.supportedLanguages.includes(savedLang)) {
      this.currentLanguage = savedLang;
      console.log("[i18n] Loaded language:", savedLang);
      return;
    }

    const browserLang = navigator.language.split("-")[0];
    if (this.supportedLanguages.includes(browserLang)) {
      this.currentLanguage = browserLang;
      localStorage.setItem(this.STORAGE_KEY, browserLang);
      return;
    }

    localStorage.setItem(this.STORAGE_KEY, "en");
  }

  async changeLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      console.error("[i18n] Unsupported language:", lang);
      return false;
    }

    if (this.currentLanguage === lang) {
      console.log("[i18n] Already in this language");
      return true;
    }

    console.log(
      "[i18n] Changing language from",
      this.currentLanguage,
      "to",
      lang
    );

    this.currentLanguage = lang;
    localStorage.setItem(this.STORAGE_KEY, lang);

    // Reset translation attempts counter
    this.translationAttempts = 0;

    // Translate with retry logic
    let success = false;
    while (!success && this.translationAttempts < this.maxAttempts) {
      try {
        await this.translatePage();
        success = true;
      } catch (error) {
        console.error(
          "[i18n] Translation attempt",
          this.translationAttempts + 1,
          "failed:",
          error
        );
        this.translationAttempts++;
        if (this.translationAttempts < this.maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    if (success) {
      this.updateLanguageUI();
      if (typeof showNotification === "function") {
        showNotification(this.t("languageChanged"), "success");
      }
      console.log("[i18n] Language changed successfully");
      return true;
    } else {
      console.error(
        "[i18n] Failed to change language after",
        this.maxAttempts,
        "attempts"
      );
      return false;
    }
  }

  async translatePage() {
    if (this.isTranslating) {
      console.log("[i18n] Translation already in progress");
      return;
    }

    this.isTranslating = true;

    try {
      console.log("[i18n] Translating page to:", this.currentLanguage);

      // Translate specific elements with data-i18n
      this.translateDataI18n();

      // Translate navigation
      this.translateNavigation();

      // Translate buttons
      this.translateButtons();

      // Translate forms
      this.translateForms();

      // Translate modals
      this.translateModals();

      // Translate common text patterns
      this.translateCommonText();

      // Update page title
      this.updatePageTitle();

      console.log("[i18n] Page translation complete");
    } catch (error) {
      console.error("[i18n] Translation error:", error);
      throw error;
    } finally {
      this.isTranslating = false;
    }
  }

  translateDataI18n() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      if (element.hasAttribute("data-no-translate")) return;

      const key = element.getAttribute("data-i18n");
      const translation = this.t(key);

      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        if (element.hasAttribute("placeholder")) {
          element.placeholder = translation;
        }
      } else if (element.hasAttribute("title")) {
        element.title = translation;
      } else {
        element.textContent = translation;
      }
    });
  }

  translateNavigation() {
    // Nav links
    const navLinks = document.querySelectorAll(
      ".nav-links a, .mobile-nav-links a"
    );
    navLinks.forEach((link) => {
      if (link.hasAttribute("data-no-translate")) return;

      const href = link.getAttribute("href");
      if (href && href.includes("index.html")) {
        link.textContent = this.t("home");
      } else if (href && href.includes("collections.html")) {
        link.textContent = this.t("collections");
      } else if (href && href.includes("new-arrivals.html")) {
        link.textContent = this.t("newArrivals");
      } else if (href && href.includes("bestsellers.html")) {
        link.textContent = this.t("bestSellers");
      } else if (href && href.includes("about.html")) {
        link.textContent = this.t("about");
      } else if (href && href.includes("contact.html")) {
        link.textContent = this.t("contact");
      }
    });

    // Search placeholder
    const searchInputs = document.querySelectorAll(
      'input[type="text"], input[type="search"]'
    );
    searchInputs.forEach((input) => {
      if (!input.hasAttribute("data-no-translate") && input.placeholder) {
        if (input.placeholder.toLowerCase().includes("search")) {
          input.placeholder = this.t("searchPlaceholder");
        }
      }
    });
  }

  translateButtons() {
    // Auth buttons
    document.querySelectorAll(".auth-btn, button").forEach((btn) => {
      if (btn.hasAttribute("data-no-translate")) return;

      const originalText = btn.textContent.trim().toLowerCase();

      if (
        originalText.includes("login") ||
        originalText === "anmelden" ||
        originalText === "connexion"
      ) {
        btn.textContent = this.t("login");
      } else if (
        originalText.includes("register") ||
        originalText === "registrieren" ||
        originalText === "inscription"
      ) {
        btn.textContent = this.t("register");
      } else if (
        originalText.includes("logout") ||
        originalText === "abmelden" ||
        originalText === "déconnexion"
      ) {
        btn.textContent = this.t("logout");
      } else if (
        originalText.includes("subscribe") ||
        originalText === "abonnieren" ||
        originalText === "s'abonner"
      ) {
        btn.textContent = this.t("subscribe");
      }
    });

    // CTA buttons
    document.querySelectorAll(".btn-primary span").forEach((span) => {
      if (span.hasAttribute("data-no-translate")) return;

      const text = span.textContent.trim();
      if (
        text &&
        (text.includes("Explore") ||
          text.includes("Explorar") ||
          text.includes("Erkunden"))
      ) {
        span.textContent = this.t("exploreCollections");
      } else if (
        text.includes("Proceed") ||
        text.includes("Finalizar") ||
        text.includes("Zur Kasse")
      ) {
        span.textContent = this.t("proceedToCheckout");
      }
    });

    // Continue shopping
    document.querySelectorAll(".btn-ghost").forEach((btn) => {
      if (btn.hasAttribute("data-no-translate")) return;

      const text = btn.textContent.trim();
      if (
        text.includes("Continue") ||
        text.includes("Seguir") ||
        text.includes("Weiter")
      ) {
        btn.textContent = this.t("continueShopping");
      }
    });
  }

  translateForms() {
    // Form labels - common patterns
    const labelMap = {
      email: ["email", "e-mail", "correo"],
      password: ["password", "contraseña", "passwort"],
      firstName: ["first name", "nombre", "vorname"],
      lastName: ["last name", "apellido", "nachname"],
    };

    document.querySelectorAll("label").forEach((label) => {
      if (label.hasAttribute("data-no-translate")) return;

      const text = label.textContent.trim().toLowerCase();
      for (const [key, patterns] of Object.entries(labelMap)) {
        if (patterns.some((pattern) => text.includes(pattern))) {
          label.textContent = this.t(key);
          break;
        }
      }
    });

    // Modal subtitles
    document.querySelectorAll(".modal-subtitle").forEach((subtitle) => {
      if (subtitle.hasAttribute("data-no-translate")) return;

      const text = subtitle.textContent.trim();
      if (text.includes("Login") || text.includes("access")) {
        subtitle.textContent = this.t("loginSubtitle");
      } else if (text.includes("Create") || text.includes("account")) {
        subtitle.textContent = this.t("createAccountSubtitle");
      } else if (text.includes("Review") || text.includes("selected")) {
        subtitle.textContent = this.t("reviewTimepieces");
      } else if (text.includes("curated") || text.includes("collection")) {
        subtitle.textContent = this.t("curatedCollection");
      }
    });
  }

  translateModals() {
    // Modal titles
    const modalTitles = {
      loginModal: "welcomeBack",
      registerModal: "joinAurum",
      cartModal: "shoppingCart",
      favoritesModal: "yourFavorites",
    };

    for (const [modalId, key] of Object.entries(modalTitles)) {
      const modal = document.getElementById(modalId);
      if (modal) {
        const title = modal.querySelector(".modal-title");
        if (title) title.textContent = this.t(key);
      }
    }

    // Empty states
    const emptyCart = document.getElementById("emptyCart");
    if (emptyCart) {
      const text = emptyCart.querySelector(".empty-state-text");
      const subtext = emptyCart.querySelector(".empty-state-subtext");
      if (text) text.textContent = this.t("emptyCart");
      if (subtext) subtext.textContent = this.t("discoverTimepieces");
    }

    const emptyFavorites = document.getElementById("emptyFavorites");
    if (emptyFavorites) {
      const text = emptyFavorites.querySelector(".empty-state-text");
      const subtext = emptyFavorites.querySelector(".empty-state-subtext");
      if (text) text.textContent = this.t("noFavorites");
      if (subtext) subtext.textContent = this.t("startWishlist");
    }

    // Total label
    const totalLabel = document.querySelector(".cart-total-label");
    if (totalLabel) totalLabel.textContent = this.t("total");

    // Auth switch text
    document.querySelectorAll(".auth-switch").forEach((sw) => {
      if (sw.hasAttribute("data-no-translate")) return;

      const text = sw.textContent.toLowerCase();
      if (
        text.includes("already") ||
        text.includes("ya tienes") ||
        text.includes("haben sie bereits")
      ) {
        const link = sw.querySelector("a");
        if (link) {
          sw.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              node.textContent = this.t("alreadyHaveAccount") + " ";
            }
          });
          link.textContent = this.t("loginHere");
        }
      } else if (
        text.includes("don't") ||
        text.includes("no tienes") ||
        text.includes("haben sie noch kein")
      ) {
        const link = sw.querySelector("a");
        if (link) {
          sw.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              node.textContent = this.t("dontHaveAccount") + " ";
            }
          });
          link.textContent = this.t("createOne");
        }
      }
    });

    // Divider 'or' text
    document.querySelectorAll(".auth-divider").forEach((div) => {
      if (!div.hasAttribute("data-no-translate")) {
        div.textContent = this.t("or");
      }
    });
  }

  translateCommonText() {
    // Hero section
    const heroLabel = document.querySelector(".hero-label");
    if (heroLabel && !heroLabel.hasAttribute("data-no-translate")) {
      // Keep "Maison Aurum" but translate the year context if needed
      // For now, keep as is since it's a brand tagline
    }

    const heroTitle = document.querySelector(".hero-title");
    if (heroTitle && !heroTitle.hasAttribute("data-no-translate")) {
      heroTitle.innerHTML = this.t("heroTitle");
    }

    const heroSubtitle = document.querySelector(".hero-subtitle");
    if (heroSubtitle && !heroSubtitle.hasAttribute("data-no-translate")) {
      heroSubtitle.textContent = this.t("heroSubtitle");
    }

    // Hero CTAs
    const heroCTAs = document.querySelectorAll(".hero-ctas a");
    heroCTAs.forEach((link) => {
      if (link.hasAttribute("data-no-translate")) return;

      if (link.classList.contains("btn-primary")) {
        const span = link.querySelector("span");
        if (span) span.textContent = this.t("exploreCollections");
      } else if (link.classList.contains("btn-ghost")) {
        link.textContent = this.t("ourHeritage");
      }
    });

    // Hero scroll text
    const heroScroll = document.querySelector(".hero-scroll");
    if (heroScroll && !heroScroll.hasAttribute("data-no-translate")) {
      // Find the text node
      heroScroll.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = this.t("scroll");
        }
      });
    }

    // Marquee items
    document.querySelectorAll(".marquee-item").forEach((item, index) => {
      if (item.hasAttribute("data-no-translate")) return;

      const text = item.textContent.trim();
      if (
        text.includes("Free Worldwide Shipping") ||
        text.includes("Envío") ||
        text.includes("Versand")
      ) {
        item.textContent = this.t("freeShipping");
      } else if (
        text.includes("5-Year") ||
        text.includes("5 años") ||
        text.includes("5-Jahres")
      ) {
        item.textContent = this.t("warranty");
      } else if (
        text.includes("Certified Swiss Made") ||
        text.includes("Certificado") ||
        text.includes("Zertifiziert")
      ) {
        item.textContent = this.t("swissMade");
      } else if (
        text.includes("Complimentary Engraving") ||
        text.includes("Grabado") ||
        text.includes("Gravur")
      ) {
        item.textContent = this.t("engraving");
      } else if (
        text.includes("White Glove") ||
        text.includes("Entrega") ||
        text.includes("Lieferung")
      ) {
        item.textContent = this.t("whiteGlove");
      } else if (
        text.includes("Lifetime Servicing") ||
        text.includes("Servicio") ||
        text.includes("Wartung")
      ) {
        item.textContent = this.t("lifetimeService");
      }
    });

    // Featured section
    const sectionLabels = document.querySelectorAll(".section-label");
    sectionLabels.forEach((label) => {
      if (label.hasAttribute("data-no-translate")) return;

      const text = label.textContent.trim();
      if (
        text.includes("Curated") ||
        text.includes("Selección") ||
        text.includes("Kuratierte")
      ) {
        label.textContent = this.t("curatedSelection");
      } else if (
        text.includes("Exceptional") ||
        text.includes("Excepcionales") ||
        text.includes("Außergewöhnliche")
      ) {
        label.textContent = this.t("exceptionalTimepieces");
      } else if (text.includes("Collection") || text.includes("Kollektion")) {
        label.textContent = this.t("ourCollections");
      } else if (
        text.includes("Craft") ||
        text.includes("Artesanía") ||
        text.includes("Handwerk")
      ) {
        label.textContent = this.t("craftsmanship");
      }
    });

    // Section titles (with em tags)
    const sectionTitles = document.querySelectorAll(".section-title");
    sectionTitles.forEach((title) => {
      if (title.hasAttribute("data-no-translate")) return;

      const text = title.textContent.trim();
      if (text.includes("Exceptional") || text.includes("Excepcionales")) {
        title.innerHTML = this.t("exceptionalTimepiecesTitle");
      }
    });

    // View All button
    const viewAllBtns = document.querySelectorAll(".btn-ghost");
    viewAllBtns.forEach((btn) => {
      if (btn.hasAttribute("data-no-translate")) return;

      const text = btn.textContent.trim();
      if (
        text.includes("View All") ||
        text.includes("Ver Todo") ||
        text.includes("Alle Ansehen")
      ) {
        btn.textContent = this.t("viewAll");
      } else if (
        text.includes("Our Heritage") ||
        text.includes("Nuestro") ||
        text.includes("Unser Erbe")
      ) {
        btn.textContent = this.t("ourHeritage");
      }
    });

    // Newsletter
    const newsletterTitle = document.querySelector(".newsletter-title");
    if (newsletterTitle && !newsletterTitle.hasAttribute("data-no-translate")) {
      newsletterTitle.textContent = this.t("stayInformed");
    }

    const newsletterDesc = document.querySelector(".newsletter-desc");
    if (newsletterDesc && !newsletterDesc.hasAttribute("data-no-translate")) {
      newsletterDesc.textContent = this.t("newsletterDesc");
    }

    // Footer headings
    document.querySelectorAll(".footer-col h5").forEach((h5) => {
      if (h5.hasAttribute("data-no-translate")) return;

      const text = h5.textContent.trim();
      if (text.includes("Service") || text.includes("Dienst")) {
        h5.textContent = this.t("services");
      } else if (
        text.includes("Company") ||
        text.includes("Empresa") ||
        text.includes("Unternehmen")
      ) {
        h5.textContent = this.t("company");
      } else if (text.includes("Collection")) {
        h5.textContent = this.t("collections");
      }
    });

    // Product badges
    document.querySelectorAll(".product-badge").forEach((badge) => {
      if (badge.hasAttribute("data-no-translate")) return;

      const text = badge.textContent.trim().toLowerCase();
      if (
        text === "new" ||
        text === "nuevo" ||
        text === "neu" ||
        text === "nouveau"
      ) {
        badge.textContent = this.t("new");
      } else if (
        text === "limited" ||
        text === "limitado" ||
        text === "limitiert" ||
        text === "limité"
      ) {
        badge.textContent = this.t("limited");
      } else if (
        text.includes("sold") ||
        text.includes("agotado") ||
        text.includes("ausverkauft")
      ) {
        badge.textContent = this.t("soldOut");
      }
    });

    // Product price sold out text
    document.querySelectorAll(".product-price span").forEach((span) => {
      if (span.hasAttribute("data-no-translate")) return;

      const text = span.textContent.trim();
      if (
        text.includes("Sold Out") ||
        text.includes("Agotado") ||
        text.includes("Ausverkauft")
      ) {
        span.textContent = this.t("soldOut");
      }
    });

    // Product actions tooltips
    document.querySelectorAll(".action-btn[title]").forEach((btn) => {
      if (btn.hasAttribute("data-no-translate")) return;

      const title = btn.getAttribute("title");
      if (
        title.includes("Wishlist") ||
        title.includes("Favoritos") ||
        title.includes("Wunschliste")
      ) {
        btn.setAttribute("title", this.t("addToWishlist"));
      } else if (
        title.includes("View") ||
        title.includes("Ver") ||
        title.includes("Ansehen")
      ) {
        btn.setAttribute("title", this.t("quickView"));
      } else if (
        title.includes("Cart") ||
        title.includes("Carrito") ||
        title.includes("Warenkorb")
      ) {
        btn.setAttribute("title", this.t("addToCart"));
      }
    });
  }

  updatePageTitle() {
    const page =
      window.location.pathname.split("/").pop().replace(".html", "") || "index";
    const titleMap = {
      index: "home",
      collections: "collections",
      "new-arrivals": "newArrivals",
      bestsellers: "bestSellers",
      about: "about",
      contact: "contact",
    };

    const key = titleMap[page];
    if (key) {
      document.title = `${this.t(key)} — AURUM Fine Watchmaking`;
    }
  }

  updateLanguageUI() {
    const flags = {
      en: "🇬🇧",
      es: "🇪🇸",
      de: "🇩🇪",
      fr: "🇫🇷",
      zh: "🇨🇳",
    };

    const langCode = document.querySelector(".lang-code");
    const langFlag = document.querySelector(".lang-current .lang-flag");

    if (langCode) langCode.textContent = this.currentLanguage.toUpperCase();
    if (langFlag) langFlag.textContent = flags[this.currentLanguage];

    document
      .querySelectorAll(".lang-option, .mobile-lang-option")
      .forEach((option) => {
        option.classList.toggle(
          "active",
          option.dataset.lang === this.currentLanguage
        );
      });
  }

  setupLanguageSwitcher() {
    document
      .querySelectorAll(".lang-option, .mobile-lang-option")
      .forEach((option) => {
        // Clone to remove old listeners
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);

        newOption.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const lang = newOption.dataset.lang;
          await this.changeLanguage(lang);
        });
      });
  }

  t(key) {
    const translation = this.translations[this.currentLanguage]?.[key];
    if (!translation) {
      console.warn(
        `[i18n] Missing translation: ${key} for ${this.currentLanguage}`
      );
      return this.translations.en?.[key] || key;
    }
    return translation;
  }

  // COMPLETE TRANSLATION DICTIONARIES
  getEnglishTranslations() {
    return {
      // Pages
      home: "Home",
      collections: "Collections",
      newArrivals: "New Arrivals",
      bestSellers: "Best Sellers",
      about: "About",
      contact: "Contact",

      // Hero
      heroTitle: "Time is the<br>only true <em>luxury</em>",
      heroSubtitle:
        "Handcrafted in Geneva · 18K Gold & Platinum · Swiss Mechanical",
      exploreCollections: "Explore Collections",
      ourHeritage: "Our Heritage",
      scroll: "Scroll",

      // Marquee
      freeShipping: "Free Worldwide Shipping",
      warranty: "5-Year Movement Warranty",
      swissMade: "Certified Swiss Made",
      engraving: "Complimentary Engraving",
      whiteGlove: "White Glove Delivery",
      lifetimeService: "Lifetime Servicing Program",

      // Sections
      curatedSelection: "Curated Selection",
      exceptionalTimepieces: "Exceptional Timepieces",
      exceptionalTimepiecesTitle: "Exceptional <em>Timepieces</em>",
      viewAll: "View All →",
      ourCollections: "Our Collections",
      craftsmanship: "Craftsmanship",
      stayInformed: "Stay Informed",
      newsletterDesc:
        "Be the first to discover new collections and exclusive releases",

      // Products
      pieces: "pieces",
      new: "New",
      limited: "Limited",
      soldOut: "Sold Out",
      addToWishlist: "Add to Wishlist",
      quickView: "Quick View",
      addToCart: "Add to Cart",

      // Auth
      login: "Login",
      register: "Register",
      logout: "Logout",
      welcomeBack: "Welcome Back",
      joinAurum: "Join Aurum",
      loginSubtitle: "Login to access your account",
      createAccountSubtitle: "Create your account",
      email: "Email Address",
      password: "Password",
      firstName: "First Name",
      lastName: "Last Name",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      loginHere: "Login",
      createOne: "Create one",
      or: "or",

      // Cart
      shoppingCart: "Shopping Cart",
      reviewTimepieces: "Review your selected timepieces",
      emptyCart: "Your cart is empty",
      discoverTimepieces: "Discover our exceptional timepieces",
      proceedToCheckout: "Proceed to Checkout",
      continueShopping: "Continue Shopping",
      total: "Total",

      // Favorites
      yourFavorites: "Your Favorites",
      curatedCollection: "Your curated collection of timepieces",
      noFavorites: "No favorites yet",
      startWishlist: "Start building your wishlist",

      // Common
      searchPlaceholder: "Search timepieces...",
      subscribe: "Subscribe",
      close: "Close",
      languageChanged: "Language changed successfully",

      // Footer
      services: "Services",
      company: "Company",
    };
  }

  getSpanishTranslations() {
    return {
      home: "Inicio",
      collections: "Colecciones",
      newArrivals: "Novedades",
      bestSellers: "Más Vendidos",
      about: "Acerca de",
      contact: "Contacto",

      heroTitle: "El tiempo es el<br>único verdadero <em>lujo</em>",
      heroSubtitle:
        "Hecho a mano en Ginebra · Oro 18K y Platino · Mecánica Suiza",
      exploreCollections: "Explorar Colecciones",
      ourHeritage: "Nuestro Legado",
      scroll: "Desplazar",

      freeShipping: "Envío Gratuito a Todo el Mundo",
      warranty: "Garantía de Movimiento de 5 Años",
      swissMade: "Certificado Swiss Made",
      engraving: "Grabado de Cortesía",
      whiteGlove: "Entrega de Guante Blanco",
      lifetimeService: "Programa de Servicio de Por Vida",

      curatedSelection: "Selección Curada",
      exceptionalTimepieces: "Relojes Excepcionales",
      exceptionalTimepiecesTitle: "<em>Relojes</em> Excepcionales",
      viewAll: "Ver Todo →",
      ourCollections: "Nuestras Colecciones",
      craftsmanship: "Artesanía",
      stayInformed: "Manténgase Informado",
      newsletterDesc:
        "Sea el primero en descubrir nuevas colecciones y lanzamientos exclusivos",

      pieces: "piezas",
      new: "Nuevo",
      limited: "Limitado",
      soldOut: "Agotado",
      addToWishlist: "Añadir a Favoritos",
      quickView: "Vista Rápida",
      addToCart: "Añadir al Carrito",

      login: "Iniciar Sesión",
      register: "Registrarse",
      logout: "Cerrar Sesión",
      welcomeBack: "Bienvenido de Nuevo",
      joinAurum: "Únete a Aurum",
      loginSubtitle: "Inicia sesión para acceder a tu cuenta",
      createAccountSubtitle: "Crea tu cuenta",
      email: "Correo Electrónico",
      password: "Contraseña",
      firstName: "Nombre",
      lastName: "Apellido",
      createAccount: "Crear Cuenta",
      alreadyHaveAccount: "¿Ya tienes una cuenta?",
      dontHaveAccount: "¿No tienes cuenta?",
      loginHere: "Inicia sesión",
      createOne: "Crea una",
      or: "o",

      shoppingCart: "Carrito",
      reviewTimepieces: "Revisa tus relojes seleccionados",
      emptyCart: "Tu carrito está vacío",
      discoverTimepieces: "Descubre nuestros relojes excepcionales",
      proceedToCheckout: "Finalizar Compra",
      continueShopping: "Seguir Comprando",
      total: "Total",

      yourFavorites: "Tus Favoritos",
      curatedCollection: "Tu colección curada de relojes",
      noFavorites: "Sin favoritos aún",
      startWishlist: "Comienza a crear tu lista de deseos",

      searchPlaceholder: "Buscar relojes...",
      subscribe: "Suscribirse",
      close: "Cerrar",
      languageChanged: "Idioma cambiado exitosamente",

      services: "Servicios",
      company: "Empresa",
    };
  }

  getGermanTranslations() {
    return {
      home: "Startseite",
      collections: "Kollektionen",
      newArrivals: "Neuankömmlinge",
      bestSellers: "Bestseller",
      about: "Über Uns",
      contact: "Kontakt",

      heroTitle: "Zeitlose <i>Eleganz</i><br>Perfekt <i>Gefertigt</i>",
      heroSubtitle: "Entdecken Sie außergewöhnliche Schweizer Uhren",
      exploreCollections: "Kollektionen Erkunden",

      exceptionalTimepieces: "Außergewöhnliche Uhren",
      ourCollections: "Unsere Kollektionen",
      craftsmanship: "Handwerkskunst",
      stayInformed: "Bleiben Sie Informiert",
      newsletterDesc:
        "Seien Sie der Erste, der neue Kollektionen und exklusive Veröffentlichungen entdeckt",

      pieces: "Stücke",
      new: "Neu",
      limited: "Limitiert",
      soldOut: "Ausverkauft",
      addToWishlist: "Zur Wunschliste",
      quickView: "Schnellansicht",
      addToCart: "In den Warenkorb",

      login: "Anmelden",
      register: "Registrieren",
      logout: "Abmelden",
      welcomeBack: "Willkommen Zurück",
      joinAurum: "Aurum Beitreten",
      loginSubtitle: "Melden Sie sich an, um auf Ihr Konto zuzugreifen",
      createAccountSubtitle: "Erstellen Sie Ihr Konto",
      email: "E-Mail-Adresse",
      password: "Passwort",
      firstName: "Vorname",
      lastName: "Nachname",
      createAccount: "Konto Erstellen",
      alreadyHaveAccount: "Haben Sie bereits ein Konto?",
      dontHaveAccount: "Haben Sie noch kein Konto?",
      loginHere: "Anmelden",
      createOne: "Erstellen Sie eines",
      or: "oder",

      shoppingCart: "Warenkorb",
      reviewTimepieces: "Überprüfen Sie Ihre ausgewählten Uhren",
      emptyCart: "Ihr Warenkorb ist leer",
      discoverTimepieces: "Entdecken Sie unsere außergewöhnlichen Uhren",
      proceedToCheckout: "Zur Kasse",
      continueShopping: "Weiter Einkaufen",
      total: "Gesamt",

      yourFavorites: "Ihre Favoriten",
      curatedCollection: "Ihre kuratierte Uhrensammlung",
      noFavorites: "Noch keine Favoriten",
      startWishlist: "Beginnen Sie Ihre Wunschliste",

      searchPlaceholder: "Uhren suchen...",
      subscribe: "Abonnieren",
      close: "Schließen",
      languageChanged: "Sprache erfolgreich geändert",

      services: "Dienstleistungen",
      company: "Unternehmen",
    };
  }

  getFrenchTranslations() {
    return {
      home: "Accueil",
      collections: "Collections",
      newArrivals: "Nouveautés",
      bestSellers: "Meilleures Ventes",
      about: "À Propos",
      contact: "Contact",

      heroTitle:
        "<i>Élégance</i> Intemporelle<br>Conçue à la <i>Perfection</i>",
      heroSubtitle: "Découvrez des montres suisses exceptionnelles",
      exploreCollections: "Explorer les Collections",

      exceptionalTimepieces: "Montres Exceptionnelles",
      ourCollections: "Nos Collections",
      craftsmanship: "Artisanat",
      stayInformed: "Restez Informé",
      newsletterDesc:
        "Soyez le premier à découvrir les nouvelles collections et les sorties exclusives",

      pieces: "pièces",
      new: "Nouveau",
      limited: "Limité",
      soldOut: "Épuisé",
      addToWishlist: "Ajouter aux Favoris",
      quickView: "Aperçu Rapide",
      addToCart: "Ajouter au Panier",

      login: "Connexion",
      register: "Inscription",
      logout: "Déconnexion",
      welcomeBack: "Bon Retour",
      joinAurum: "Rejoindre Aurum",
      loginSubtitle: "Connectez-vous pour accéder à votre compte",
      createAccountSubtitle: "Créez votre compte",
      email: "Adresse Email",
      password: "Mot de Passe",
      firstName: "Prénom",
      lastName: "Nom",
      createAccount: "Créer un Compte",
      alreadyHaveAccount: "Vous avez déjà un compte?",
      dontHaveAccount: "Vous n'avez pas de compte?",
      loginHere: "Se connecter",
      createOne: "Créez-en un",
      or: "ou",

      shoppingCart: "Panier",
      reviewTimepieces: "Examinez vos montres sélectionnées",
      emptyCart: "Votre panier est vide",
      discoverTimepieces: "Découvrez nos montres exceptionnelles",
      proceedToCheckout: "Passer la Commande",
      continueShopping: "Continuer les Achats",
      total: "Total",

      yourFavorites: "Vos Favoris",
      curatedCollection: "Votre collection de montres sélectionnée",
      noFavorites: "Aucun favori pour le moment",
      startWishlist: "Commencez votre liste de souhaits",

      searchPlaceholder: "Rechercher des montres...",
      subscribe: "S'abonner",
      close: "Fermer",
      languageChanged: "Langue modifiée avec succès",

      services: "Services",
      company: "Entreprise",
    };
  }

  getChineseTranslations() {
    return {
      home: "首页",
      collections: "系列",
      newArrivals: "新品",
      bestSellers: "畅销款",
      about: "关于我们",
      contact: "联系我们",

      heroTitle: "永恒的<i>优雅</i><br>完美的<i>工艺</i>",
      heroSubtitle: "探索卓越的瑞士腕表",
      exploreCollections: "探索系列",

      exceptionalTimepieces: "卓越腕表",
      ourCollections: "我们的系列",
      craftsmanship: "工艺",
      stayInformed: "保持联系",
      newsletterDesc: "第一时间了解新系列和独家发布",

      pieces: "件",
      new: "新品",
      limited: "限量",
      soldOut: "售罄",
      addToWishlist: "加入收藏",
      quickView: "快速查看",
      addToCart: "加入购物车",

      login: "登录",
      register: "注册",
      logout: "登出",
      welcomeBack: "欢迎回来",
      joinAurum: "加入Aurum",
      loginSubtitle: "登录以访问您的账户",
      createAccountSubtitle: "创建您的账户",
      email: "电子邮箱",
      password: "密码",
      firstName: "名",
      lastName: "姓",
      createAccount: "创建账户",
      alreadyHaveAccount: "已有账户？",
      dontHaveAccount: "没有账户？",
      loginHere: "登录",
      createOne: "创建一个",
      or: "或",

      shoppingCart: "购物车",
      reviewTimepieces: "查看您选择的腕表",
      emptyCart: "购物车为空",
      discoverTimepieces: "发现我们的卓越腕表",
      proceedToCheckout: "结账",
      continueShopping: "继续购物",
      total: "总计",

      yourFavorites: "我的收藏",
      curatedCollection: "您精选的腕表系列",
      noFavorites: "暂无收藏",
      startWishlist: "开始建立您的心愿单",

      searchPlaceholder: "搜索腕表...",
      subscribe: "订阅",
      close: "关闭",
      languageChanged: "语言已更改",

      services: "服务",
      company: "公司",
    };
  }
}

// Create global instance
window.i18n = new I18nFinal();

// Auto-initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.i18n.init());
} else {
  window.i18n.init();
}

console.log("[i18n] FINAL system loaded - stable and reliable!");
