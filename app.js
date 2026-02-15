// ═══════════════════════════════════════════════════════════════════════════
// AURUM LUXURY WATCHES - AUTHENTICATION & DATA MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// ─── AUTHENTICATION SYSTEM ─────────────────────────────────────────────────

class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.init();
  }

  init() {
    this.checkSession();
    this.setupAuthListeners();
  }

  // Check if user has valid session
  checkSession() {
    const sessionData = localStorage.getItem("aurum_session");
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const now = new Date().getTime();

        if (session.expiresAt > now) {
          this.currentUser = session.user;
          this.updateUIForLoggedInUser();
          return true;
        } else {
          this.logout();
        }
      } catch (e) {
        localStorage.removeItem("aurum_session");
      }
    }
    return false;
  }

  // Register new user
  async register(userData) {
    // Validate input
    if (!this.validateEmail(userData.email)) {
      throw new Error("Invalid email address");
    }
    if (userData.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Check if user already exists
    const users = this.getUsers();
    if (users.find((u) => u.email === userData.email)) {
      throw new Error("An account with this email already exists");
    }

    // Create new user
    const newUser = {
      id: this.generateUserId(),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: this.hashPassword(userData.password), // Simple hash (in production, use bcrypt server-side)
      createdAt: new Date().toISOString(),
      preferences: {
        language: "en",
        currency: "EUR",
      },
    };

    users.push(newUser);
    localStorage.setItem("aurum_users", JSON.stringify(users));

    // Auto login after registration
    await this.login(userData.email, userData.password);

    return newUser;
  }

  // Login user
  async login(email, password) {
    const users = this.getUsers();
    const hashedPassword = this.hashPassword(password);
    const user = users.find(
      (u) => u.email === email && u.password === hashedPassword
    );

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Create session
    const session = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences,
      },
      expiresAt: new Date().getTime() + this.sessionDuration,
    };

    localStorage.setItem("aurum_session", JSON.stringify(session));
    this.currentUser = session.user;
    this.updateUIForLoggedInUser();

    // Sync cart and favorites from server/local storage
    cartSystem.syncWithUser(user.id);
    favoritesSystem.syncWithUser(user.id);

    return user;
  }

  // Logout user
  logout() {
    // Save current cart and favorites to user account before logout
    if (this.currentUser) {
      cartSystem.saveToUserAccount(this.currentUser.id);
      favoritesSystem.saveToUserAccount(this.currentUser.id);
    }

    localStorage.removeItem("aurum_session");
    this.currentUser = null;
    this.updateUIForLoggedOutUser();
  }

  // Helper functions
  getUsers() {
    const usersData = localStorage.getItem("aurum_users");
    return usersData ? JSON.parse(usersData) : [];
  }

  generateUserId() {
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  hashPassword(password) {
    // Simple hash for demo (in production, use proper server-side hashing)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  updateUIForLoggedInUser() {
    const authButtons = document.querySelector(".auth-buttons");
    const userMenu = document.querySelector(".user-menu");

    if (authButtons) authButtons.style.display = "none";
    if (userMenu) {
      userMenu.style.display = "flex";
      const userName = userMenu.querySelector(".user-name");
      if (userName) {
        userName.textContent =
          this.currentUser.firstName || this.currentUser.email.split("@")[0];
      }
    }

    // Update cart and favorites count
    cartSystem.updateCartCount();
    favoritesSystem.updateFavoritesCount();
  }

  updateUIForLoggedOutUser() {
    const authButtons = document.querySelector(".auth-buttons");
    const userMenu = document.querySelector(".user-menu");

    if (authButtons) authButtons.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";

    // Clear cart and favorites display
    cartSystem.updateCartCount();
    favoritesSystem.updateFavoritesCount();
  }

  setupAuthListeners() {
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('[name="email"]').value;
        const password = loginForm.querySelector('[name="password"]').value;

        try {
          await this.login(email, password);
          closeModal("loginModal");
          showNotification("Welcome back to Aurum!", "success");
        } catch (error) {
          showNotification(error.message, "error");
        }
      });
    }

    // Register form
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userData = {
          firstName: registerForm.querySelector('[name="firstName"]').value,
          lastName: registerForm.querySelector('[name="lastName"]').value,
          email: registerForm.querySelector('[name="email"]').value,
          password: registerForm.querySelector('[name="password"]').value,
        };

        try {
          await this.register(userData);
          closeModal("registerModal");
          showNotification("Account created successfully!", "success");
        } catch (error) {
          showNotification(error.message, "error");
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.logout();
        showNotification("You have been logged out", "info");
      });
    }
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// ─── SHOPPING CART SYSTEM ──────────────────────────────────────────────────

class ShoppingCart {
  constructor() {
    this.items = [];
    this.init();
  }

  init() {
    this.loadCart();
    this.setupCartListeners();
  }

  loadCart() {
    // Load from user account if logged in, otherwise from localStorage
    if (authSystem.isAuthenticated()) {
      const userId = authSystem.getCurrentUser().id;
      const userCart = localStorage.getItem(`aurum_cart_${userId}`);
      this.items = userCart ? JSON.parse(userCart) : [];
    } else {
      const guestCart = localStorage.getItem("aurum_cart_guest");
      this.items = guestCart ? JSON.parse(guestCart) : [];
    }
    this.updateCartCount();
  }

  saveCart() {
    if (authSystem.isAuthenticated()) {
      const userId = authSystem.getCurrentUser().id;
      localStorage.setItem(`aurum_cart_${userId}`, JSON.stringify(this.items));
    } else {
      localStorage.setItem("aurum_cart_guest", JSON.stringify(this.items));
    }
    this.updateCartCount();
  }

  addItem(product) {
    const existingItem = this.items.find((item) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        collection: product.collection,
        price: product.price,
        image: product.image,
        ref: product.ref,
        quantity: 1,
      });
    }

    this.saveCart();
    this.updateCartDisplay();
    showNotification(`${product.name} added to cart`, "success");
  }

  removeItem(productId) {
    this.items = this.items.filter((item) => item.id !== productId);
    this.saveCart();
    this.updateCartDisplay();
    showNotification("Item removed from cart", "info");
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find((item) => item.id === productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      this.saveCart();
      this.updateCartDisplay();
    }
  }

  getTotal() {
    return this.items.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[€,]/g, ""));
      return sum + price * item.quantity;
    }, 0);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  updateCartCount() {
    const cartBadge = document.querySelector(".cart-badge");
    const count = this.getItemCount();
    if (cartBadge) {
      cartBadge.textContent = count;
      cartBadge.style.display = count > 0 ? "flex" : "none";
    }
  }

  updateCartDisplay() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    const emptyCart = document.getElementById("emptyCart");

    if (!cartItems) return;

    if (this.items.length === 0) {
      if (emptyCart) emptyCart.style.display = "block";
      cartItems.innerHTML = "";
      if (cartTotal) cartTotal.textContent = "€ 0";
    } else {
      if (emptyCart) emptyCart.style.display = "none";
      cartItems.innerHTML = this.items
        .map(
          (item) => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-image">
            <div class="pw-circle" style="${
              item.image ||
              "background:radial-gradient(circle at 35% 35%, #3a2f18, #080808)"
            }"></div>
          </div>
          <div class="cart-item-details">
            <div class="cart-item-collection">${item.collection}</div>
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-ref">${item.ref}</div>
          </div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="cartSystem.updateQuantity('${
              item.id
            }', ${item.quantity - 1})">−</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="cartSystem.updateQuantity('${
              item.id
            }', ${item.quantity + 1})">+</button>
          </div>
          <div class="cart-item-price">${item.price}</div>
          <button class="cart-item-remove" onclick="cartSystem.removeItem('${
            item.id
          }')">×</button>
        </div>
      `
        )
        .join("");

      if (cartTotal) {
        cartTotal.textContent = `€ ${this.getTotal().toLocaleString("en-US", {
          minimumFractionDigits: 0,
        })}`;
      }
    }

    this.updateCartCount();
  }

  syncWithUser(userId) {
    // Merge guest cart with user cart
    const guestCart = localStorage.getItem("aurum_cart_guest");
    const userCart = localStorage.getItem(`aurum_cart_${userId}`);

    if (guestCart && userCart) {
      const guestItems = JSON.parse(guestCart);
      const userItems = JSON.parse(userCart);

      // Merge items
      guestItems.forEach((guestItem) => {
        const existingItem = userItems.find((item) => item.id === guestItem.id);
        if (existingItem) {
          existingItem.quantity += guestItem.quantity;
        } else {
          userItems.push(guestItem);
        }
      });

      this.items = userItems;
      localStorage.setItem(`aurum_cart_${userId}`, JSON.stringify(userItems));
      localStorage.removeItem("aurum_cart_guest");
    } else if (guestCart) {
      this.items = JSON.parse(guestCart);
      localStorage.setItem(`aurum_cart_${userId}`, guestCart);
      localStorage.removeItem("aurum_cart_guest");
    } else {
      this.loadCart();
    }

    this.updateCartDisplay();
  }

  saveToUserAccount(userId) {
    if (this.items.length > 0) {
      localStorage.setItem(`aurum_cart_${userId}`, JSON.stringify(this.items));
    }
  }

  setupCartListeners() {
    // Open cart modal
    const cartIcon = document.querySelector(
      '.nav-icon:has(svg path[d*="M6 2"])'
    );
    if (cartIcon) {
      cartIcon.addEventListener("click", (e) => {
        e.preventDefault();
        this.updateCartDisplay();
        openModal("cartModal");
      });
    }

    // Checkout button
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        if (!authSystem.isAuthenticated()) {
          closeModal("cartModal");
          openModal("loginModal");
          showNotification("Please login to proceed with checkout", "info");
        } else {
          showNotification("Proceeding to checkout...", "success");
          // In production, redirect to checkout page
        }
      });
    }
  }
}

// ─── FAVORITES SYSTEM ──────────────────────────────────────────────────────

class FavoritesSystem {
  constructor() {
    this.items = [];
    this.init();
  }

  init() {
    this.loadFavorites();
    this.setupFavoriteListeners();
  }

  loadFavorites() {
    if (authSystem.isAuthenticated()) {
      const userId = authSystem.getCurrentUser().id;
      const userFavorites = localStorage.getItem(`aurum_favorites_${userId}`);
      this.items = userFavorites ? JSON.parse(userFavorites) : [];
    } else {
      const guestFavorites = localStorage.getItem("aurum_favorites_guest");
      this.items = guestFavorites ? JSON.parse(guestFavorites) : [];
    }
    this.updateFavoritesUI();
  }

  saveFavorites() {
    if (authSystem.isAuthenticated()) {
      const userId = authSystem.getCurrentUser().id;
      localStorage.setItem(
        `aurum_favorites_${userId}`,
        JSON.stringify(this.items)
      );
    } else {
      localStorage.setItem("aurum_favorites_guest", JSON.stringify(this.items));
    }
    this.updateFavoritesCount();
  }

  toggleFavorite(product) {
    const existingIndex = this.items.findIndex(
      (item) => item.id === product.id
    );

    if (existingIndex > -1) {
      this.items.splice(existingIndex, 1);
      showNotification(`${product.name} removed from favorites`, "info");
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        collection: product.collection,
        price: product.price,
        image: product.image,
        ref: product.ref,
        addedAt: new Date().toISOString(),
      });
      showNotification(`${product.name} added to favorites`, "success");
    }

    this.saveFavorites();
    this.updateFavoritesUI();
  }

  isFavorite(productId) {
    return this.items.some((item) => item.id === productId);
  }

  updateFavoritesCount() {
    // Could add a favorites count badge if needed
  }

  updateFavoritesUI() {
    // Update all favorite heart icons
    document
      .querySelectorAll('.action-btn[title*="Wishlist"]')
      .forEach((btn) => {
        const productCard = btn.closest(".product-card");
        if (productCard) {
          const productId = productCard.dataset.productId;
          if (productId && this.isFavorite(productId)) {
            btn.innerHTML = "♥";
            btn.style.color = "var(--gold)";
          } else {
            btn.innerHTML = "♡";
            btn.style.color = "";
          }
        }
      });

    // Update favorites modal display
    this.updateFavoritesDisplay();
  }

  updateFavoritesDisplay() {
    const favoritesItems = document.getElementById("favoritesItems");
    const emptyFavorites = document.getElementById("emptyFavorites");

    if (!favoritesItems) return;

    if (this.items.length === 0) {
      if (emptyFavorites) emptyFavorites.style.display = "block";
      favoritesItems.innerHTML = "";
    } else {
      if (emptyFavorites) emptyFavorites.style.display = "none";
      favoritesItems.innerHTML = this.items
        .map(
          (item) => `
        <div class="favorite-item" data-id="${item.id}">
          <div class="favorite-item-image">
            <div class="pw-circle" style="${
              item.image ||
              "background:radial-gradient(circle at 35% 35%, #3a2f18, #080808)"
            }"></div>
          </div>
          <div class="favorite-item-details">
            <div class="favorite-item-collection">${item.collection}</div>
            <div class="favorite-item-name">${item.name}</div>
            <div class="favorite-item-ref">${item.ref}</div>
            <div class="favorite-item-price">${item.price}</div>
          </div>
          <div class="favorite-item-actions">
            <button class="btn-ghost" style="padding:10px 20px;font-size:0.6rem" onclick="cartSystem.addItem(favoritesSystem.items.find(i => i.id === '${
              item.id
            }'))">Add to Cart</button>
            <button class="favorite-item-remove" onclick="favoritesSystem.toggleFavorite(favoritesSystem.items.find(i => i.id === '${
              item.id
            }'))">Remove</button>
          </div>
        </div>
      `
        )
        .join("");
    }
  }

  syncWithUser(userId) {
    const guestFavorites = localStorage.getItem("aurum_favorites_guest");
    const userFavorites = localStorage.getItem(`aurum_favorites_${userId}`);

    if (guestFavorites && userFavorites) {
      const guestItems = JSON.parse(guestFavorites);
      const userItems = JSON.parse(userFavorites);

      guestItems.forEach((guestItem) => {
        if (!userItems.find((item) => item.id === guestItem.id)) {
          userItems.push(guestItem);
        }
      });

      this.items = userItems;
      localStorage.setItem(
        `aurum_favorites_${userId}`,
        JSON.stringify(userItems)
      );
      localStorage.removeItem("aurum_favorites_guest");
    } else if (guestFavorites) {
      this.items = JSON.parse(guestFavorites);
      localStorage.setItem(`aurum_favorites_${userId}`, guestFavorites);
      localStorage.removeItem("aurum_favorites_guest");
    } else {
      this.loadFavorites();
    }

    this.updateFavoritesUI();
  }

  saveToUserAccount(userId) {
    if (this.items.length > 0) {
      localStorage.setItem(
        `aurum_favorites_${userId}`,
        JSON.stringify(this.items)
      );
    }
  }

  setupFavoriteListeners() {
    // Open favorites modal
    const favIcon = document.querySelector(
      '.nav-icon:has(svg path[d*="M20.84 4.61"])'
    );
    if (favIcon) {
      favIcon.addEventListener("click", (e) => {
        e.preventDefault();
        if (!authSystem.isAuthenticated()) {
          openModal("loginModal");
          showNotification("Please login to view your favorites", "info");
        } else {
          this.updateFavoritesDisplay();
          openModal("favoritesModal");
        }
      });
    }
  }
}

// ─── MULTILINGUAL SYSTEM ───────────────────────────────────────────────────

class MultilingualSystem {
  constructor() {
    this.currentLanguage = "en";
    this.translations = {};
    this._isApplying = false;
    this.init();
  }

  async init() {
    this.loadTranslations();
    await this.detectLanguage();
    this.setupLanguageSwitcher();

    // Apply translations immediately
    await this.applyTranslations();

    // Update UI to show correct language
    this.updateLanguageUI();
  }

  loadTranslations() {
    this.translations = {
      en: this.getEnglishTranslations(),
      ru: this.getRussianTranslations(),
      es: this.getSpanishTranslations(),
      fr: this.getFrenchTranslations(),
      de: this.getGermanTranslations(),
      zh: this.getChineseTranslations(),
      ja: this.getJapaneseTranslations(),
    };
  }

  async detectLanguage() {
    // Priority 1: Check localStorage (highest priority)
    const savedLang = localStorage.getItem("aurum_language");
    if (savedLang && this.translations[savedLang]) {
      this.currentLanguage = savedLang;
      console.log(`[i18n] Language loaded from localStorage: ${savedLang}`);
      return;
    }

    // Priority 2: Check user account preferences
    if (authSystem && authSystem.isAuthenticated()) {
      const user = authSystem.getCurrentUser();
      if (user && user.preferences && user.preferences.language) {
        const userLang = user.preferences.language;
        if (this.translations[userLang]) {
          this.currentLanguage = userLang;
          // Also save to localStorage for consistency
          localStorage.setItem("aurum_language", userLang);
          console.log(`[i18n] Language loaded from user account: ${userLang}`);
          return;
        }
      }
    }

    // Priority 3: Detect browser language
    const browserLang = navigator.language.split("-")[0];
    if (this.translations[browserLang]) {
      this.currentLanguage = browserLang;
      // Save to localStorage
      localStorage.setItem("aurum_language", browserLang);
      console.log(`[i18n] Language detected from browser: ${browserLang}`);
      return;
    }

    // Default: English
    this.currentLanguage = "en";
    localStorage.setItem("aurum_language", "en");
    console.log(`[i18n] Using default language: en`);
  }

  setLanguage(lang) {
    if (!this.translations[lang]) {
      console.error(`[i18n] Language not supported: ${lang}`);
      return;
    }

    console.log(`[i18n] Changing language to: ${lang}`);

    // Update current language
    this.currentLanguage = lang;

    // Save to localStorage (HIGHEST PRIORITY)
    localStorage.setItem("aurum_language", lang);

    // If user is logged in, also update their account preferences
    if (authSystem && authSystem.isAuthenticated()) {
      try {
        const session = JSON.parse(localStorage.getItem("aurum_session"));
        if (session && session.user) {
          if (!session.user.preferences) {
            session.user.preferences = {};
          }
          session.user.preferences.language = lang;
          localStorage.setItem("aurum_session", JSON.stringify(session));
          console.log(`[i18n] Language saved to user session: ${lang}`);
        }
      } catch (e) {
        console.error("[i18n] Error saving to user session:", e);
      }
    }

    // Apply translations
    this.applyTranslations();

    // Update UI
    this.updateLanguageUI();

    // Show notification
    showNotification(this.t("languageChanged"), "success");

    console.log(`[i18n] Language change complete: ${lang}`);
  }

  t(key) {
    return (
      this.translations[this.currentLanguage]?.[key] ||
      this.translations["en"]?.[key] ||
      key
    );
  }

  async applyTranslations() {
    // Prevent infinite loops
    if (this._isApplying) {
      console.log("[i18n] Translation already in progress, skipping...");
      return;
    }
    this._isApplying = true;

    console.log(
      `[i18n] Applying translations for language: ${this.currentLanguage}`
    );

    try {
      // Translate elements with data-i18n attribute
      document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        const translation = this.t(key);

        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.placeholder = translation;
        } else if (element.hasAttribute("title")) {
          element.setAttribute("title", translation);
        } else {
          element.textContent = translation;
        }
      });

      // Translate common elements by selector
      this.translateCommonElements();

      // Update page title
      this.updatePageTitle();

      console.log("[i18n] Translations applied successfully");
    } catch (error) {
      console.error("[i18n] Error applying translations:", error);
    } finally {
      // Reset flag after a short delay
      setTimeout(() => {
        this._isApplying = false;
      }, 100);
    }
  }

  translateCommonElements() {
    // Navigation
    const navLinks = document.querySelectorAll(
      ".nav-links a, .mobile-nav-links a"
    );
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href) {
        if (href.includes("index.html") || href === "/" || href === "") {
          link.textContent = this.t("home");
        } else if (href.includes("collections.html")) {
          link.textContent = this.t("collections");
        } else if (href.includes("new-arrivals.html")) {
          link.textContent = this.t("newArrivals");
        } else if (href.includes("bestsellers.html")) {
          link.textContent = this.t("bestSellers");
        } else if (href.includes("about.html")) {
          link.textContent = this.t("about");
        } else if (href.includes("contact.html")) {
          link.textContent = this.t("contact");
        }
      }
    });

    // Search placeholders
    document
      .querySelectorAll(
        'input[type="text"][placeholder*="Search"], input[placeholder*="search"]'
      )
      .forEach((input) => {
        input.placeholder = this.t("searchPlaceholder");
      });

    // Buttons
    document.querySelectorAll(".auth-btn").forEach((btn) => {
      if (
        btn.textContent.toLowerCase().includes("login") ||
        btn.textContent.toLowerCase().includes("connexion") ||
        btn.textContent.toLowerCase().includes("войти")
      ) {
        btn.textContent = this.t("login");
      } else if (
        btn.textContent.toLowerCase().includes("register") ||
        btn.textContent.toLowerCase().includes("inscription") ||
        btn.textContent.toLowerCase().includes("регистрация")
      ) {
        btn.textContent = this.t("register");
      } else if (
        btn.textContent.toLowerCase().includes("logout") ||
        btn.textContent.toLowerCase().includes("déconnexion") ||
        btn.textContent.toLowerCase().includes("выйти")
      ) {
        btn.textContent = this.t("logout");
      }
    });

    // Cart and checkout
    document.querySelectorAll(".btn-primary, .btn-ghost").forEach((btn) => {
      const text = btn.textContent.toLowerCase();
      if (
        text.includes("checkout") ||
        text.includes("commande") ||
        text.includes("оформить")
      ) {
        btn.innerHTML = `<span>${this.t("checkout")}</span> →`;
      } else if (
        text.includes("continue shopping") ||
        text.includes("continuer") ||
        text.includes("продолжить")
      ) {
        btn.textContent = this.t("continueShopping");
      } else if (
        text.includes("explore") ||
        text.includes("découvrir") ||
        text.includes("исследовать")
      ) {
        btn.innerHTML = `<span>${this.t("exploreCollections")}</span> →`;
      }
    });

    // Modal titles
    const modalTitles = {
      loginModal: this.t("welcomeBack"),
      registerModal: this.t("joinAurum"),
      cartModal: this.t("shoppingCart"),
      favoritesModal: this.t("yourFavorites"),
    };

    Object.keys(modalTitles).forEach((modalId) => {
      const modal = document.getElementById(modalId);
      if (modal) {
        const title = modal.querySelector(".modal-title");
        if (title) title.textContent = modalTitles[modalId];
      }
    });

    // Empty states
    const emptyCart = document.getElementById("emptyCart");
    if (emptyCart) {
      const text = emptyCart.querySelector(".empty-state-text");
      const subtext = emptyCart.querySelector(".empty-state-subtext");
      if (text) text.textContent = this.t("emptyCart");
      if (subtext) subtext.textContent = this.t("emptyCartSubtext");
    }

    const emptyFavorites = document.getElementById("emptyFavorites");
    if (emptyFavorites) {
      const text = emptyFavorites.querySelector(".empty-state-text");
      const subtext = emptyFavorites.querySelector(".empty-state-subtext");
      if (text) text.textContent = this.t("emptyFavorites");
      if (subtext) subtext.textContent = this.t("emptyFavoritesSubtext");
    }

    // Total label
    const totalLabel = document.querySelector(".cart-total-label");
    if (totalLabel) totalLabel.textContent = this.t("total");

    // Footer
    document.querySelectorAll(".footer-col h5").forEach((heading) => {
      const text = heading.textContent.toLowerCase();
      if (text.includes("collection") || text.includes("коллекци")) {
        heading.textContent = this.t("collections");
      } else if (text.includes("service") || text.includes("услуг")) {
        heading.textContent = this.t("services");
      } else if (text.includes("company") || text.includes("компания")) {
        heading.textContent = this.t("company");
      }
    });
  }

  updatePageTitle() {
    const currentPage = window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");
    const titles = {
      index: this.t("home"),
      collections: this.t("collections"),
      "new-arrivals": this.t("newArrivals"),
      bestsellers: this.t("bestSellers"),
      about: this.t("about"),
      contact: this.t("contact"),
    };

    if (titles[currentPage]) {
      document.title = `${titles[currentPage]} — AURUM Fine Watchmaking`;
    }
  }

  updateLanguageUI() {
    console.log(`[i18n] Updating UI to show language: ${this.currentLanguage}`);

    // Language flag mapping
    const flags = {
      en: "🇬🇧",
      ru: "🇷🇺",
      es: "🇪🇸",
      fr: "🇫🇷",
      de: "🇩🇪",
      zh: "🇨🇳",
      ja: "🇯🇵",
    };

    const names = {
      en: "English",
      ru: "Русский",
      es: "Español",
      fr: "Français",
      de: "Deutsch",
      zh: "中文",
      ja: "日本語",
    };

    // Update desktop language switcher
    const langCode = document.querySelector(".lang-code");
    const langFlag = document.querySelector(".lang-current .lang-flag");

    if (langCode) {
      langCode.textContent = this.currentLanguage.toUpperCase();
    }
    if (langFlag) {
      langFlag.textContent = flags[this.currentLanguage] || "🇬🇧";
    }

    // Update active state in all language options (desktop and mobile)
    document
      .querySelectorAll(".lang-option, .mobile-lang-option")
      .forEach((option) => {
        const isActive = option.dataset.lang === this.currentLanguage;
        if (isActive) {
          option.classList.add("active");
        } else {
          option.classList.remove("active");
        }
      });

    console.log("[i18n] UI updated successfully");
  }

  setupLanguageSwitcher() {
    console.log("[i18n] Setting up language switcher event listeners");

    // Remove any existing listeners by cloning and replacing
    document
      .querySelectorAll(".lang-option, .mobile-lang-option")
      .forEach((option) => {
        // Clone to remove old event listeners
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);

        // Add new event listener
        newOption.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const lang = newOption.dataset.lang;
          console.log(`[i18n] Language option clicked: ${lang}`);
          this.setLanguage(lang);
        });
      });

    console.log("[i18n] Language switcher setup complete");
  }

  getEnglishTranslations() {
    return {
      // Navigation
      home: "Home",
      collections: "Collections",
      newArrivals: "New Arrivals",
      bestSellers: "Best Sellers",
      about: "About",
      contact: "Contact",
      searchPlaceholder: "Search timepieces...",

      // Auth
      login: "Login",
      register: "Register",
      logout: "Logout",
      welcomeBack: "Welcome Back",
      joinAurum: "Join Aurum",
      email: "Email Address",
      password: "Password",
      firstName: "First Name",
      lastName: "Last Name",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      myAccount: "My Account",
      orderHistory: "Order History",

      // Cart & Shopping
      shoppingCart: "Shopping Cart",
      addToCart: "Add to Cart",
      removeFromCart: "Remove",
      checkout: "Proceed to Checkout",
      continueShopping: "Continue Shopping",
      emptyCart: "Your cart is empty",
      emptyCartSubtext: "Discover our exceptional timepieces",
      total: "Total",
      quantity: "Quantity",

      // Favorites
      yourFavorites: "Your Favorites",
      favorites: "Favorites",
      addToFavorites: "Add to Wishlist",
      emptyFavorites: "No favorites yet",
      emptyFavoritesSubtext: "Start building your wishlist",

      // Product
      viewDetails: "View Details",
      quickView: "Quick View",
      reference: "Reference",
      collection: "Collection",

      // Common
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      submit: "Submit",
      or: "or",
      languageChanged: "Language changed successfully",

      // Pages
      exploreCollections: "Explore Collections",
      ourHeritage: "Our Heritage",
      requestConsultation: "Request Consultation",

      // Contact
      getInTouch: "Get in Touch",
      yourName: "Your Name",
      yourEmail: "Your Email",
      yourMessage: "Your Message",
      sendMessage: "Send Message",

      // Footer
      services: "Services",
      company: "Company",
    };
  }

  getRussianTranslations() {
    return {
      home: "Главная",
      collections: "Коллекции",
      newArrivals: "Новинки",
      bestSellers: "Бестселлеры",
      about: "О нас",
      contact: "Контакты",
      searchPlaceholder: "Поиск часов...",

      login: "Войти",
      register: "Регистрация",
      logout: "Выйти",
      welcomeBack: "С возвращением",
      joinAurum: "Присоединиться к Aurum",
      email: "Электронная почта",
      password: "Пароль",
      firstName: "Имя",
      lastName: "Фамилия",
      createAccount: "Создать аккаунт",
      alreadyHaveAccount: "Уже есть аккаунт?",
      dontHaveAccount: "Нет аккаунта?",
      myAccount: "Мой аккаунт",
      orderHistory: "История заказов",

      shoppingCart: "Корзина",
      addToCart: "В корзину",
      removeFromCart: "Удалить",
      checkout: "Оформить заказ",
      continueShopping: "Продолжить покупки",
      emptyCart: "Ваша корзина пуста",
      emptyCartSubtext: "Откройте для себя наши исключительные часы",
      total: "Итого",
      quantity: "Количество",

      yourFavorites: "Избранное",
      favorites: "Избранное",
      addToFavorites: "В избранное",
      emptyFavorites: "Избранное пусто",
      emptyFavoritesSubtext: "Начните создавать свой список желаний",

      viewDetails: "Подробнее",
      quickView: "Быстрый просмотр",
      reference: "Артикул",
      collection: "Коллекция",

      close: "Закрыть",
      save: "Сохранить",
      cancel: "Отмена",
      submit: "Отправить",
      or: "или",
      languageChanged: "Язык успешно изменен",

      exploreCollections: "Изучить коллекции",
      ourHeritage: "Наше наследие",
      requestConsultation: "Запросить консультацию",

      getInTouch: "Связаться с нами",
      yourName: "Ваше имя",
      yourEmail: "Ваш email",
      yourMessage: "Ваше сообщение",
      sendMessage: "Отправить",

      services: "Услуги",
      company: "Компания",
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
      searchPlaceholder: "Buscar relojes...",

      login: "Iniciar Sesión",
      register: "Registrarse",
      logout: "Cerrar Sesión",
      welcomeBack: "Bienvenido de Nuevo",
      joinAurum: "Únete a Aurum",
      email: "Correo Electrónico",
      password: "Contraseña",
      firstName: "Nombre",
      lastName: "Apellido",
      createAccount: "Crear Cuenta",
      alreadyHaveAccount: "¿Ya tienes una cuenta?",
      dontHaveAccount: "¿No tienes cuenta?",
      myAccount: "Mi Cuenta",
      orderHistory: "Historial de Pedidos",

      shoppingCart: "Carrito",
      addToCart: "Añadir al Carrito",
      removeFromCart: "Eliminar",
      checkout: "Finalizar Compra",
      continueShopping: "Seguir Comprando",
      emptyCart: "Tu carrito está vacío",
      emptyCartSubtext: "Descubre nuestros relojes excepcionales",
      total: "Total",
      quantity: "Cantidad",

      yourFavorites: "Tus Favoritos",
      favorites: "Favoritos",
      addToFavorites: "Añadir a Favoritos",
      emptyFavorites: "Sin favoritos aún",
      emptyFavoritesSubtext: "Comienza a crear tu lista de deseos",

      viewDetails: "Ver Detalles",
      quickView: "Vista Rápida",
      reference: "Referencia",
      collection: "Colección",

      close: "Cerrar",
      save: "Guardar",
      cancel: "Cancelar",
      submit: "Enviar",
      or: "o",
      languageChanged: "Idioma cambiado exitosamente",

      exploreCollections: "Explorar Colecciones",
      ourHeritage: "Nuestro Legado",
      requestConsultation: "Solicitar Consulta",

      getInTouch: "Contáctanos",
      yourName: "Tu Nombre",
      yourEmail: "Tu Email",
      yourMessage: "Tu Mensaje",
      sendMessage: "Enviar",

      services: "Servicios",
      company: "Empresa",
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
      searchPlaceholder: "Rechercher des montres...",

      login: "Connexion",
      register: "Inscription",
      logout: "Déconnexion",
      welcomeBack: "Bon Retour",
      joinAurum: "Rejoindre Aurum",
      email: "Adresse Email",
      password: "Mot de Passe",
      firstName: "Prénom",
      lastName: "Nom",
      createAccount: "Créer un Compte",
      alreadyHaveAccount: "Vous avez déjà un compte?",
      dontHaveAccount: "Vous n'avez pas de compte?",
      myAccount: "Mon Compte",
      orderHistory: "Historique des Commandes",

      shoppingCart: "Panier",
      addToCart: "Ajouter au Panier",
      removeFromCart: "Retirer",
      checkout: "Passer la Commande",
      continueShopping: "Continuer les Achats",
      emptyCart: "Votre panier est vide",
      emptyCartSubtext: "Découvrez nos montres exceptionnelles",
      total: "Total",
      quantity: "Quantité",

      yourFavorites: "Vos Favoris",
      favorites: "Favoris",
      addToFavorites: "Ajouter aux Favoris",
      emptyFavorites: "Aucun favori",
      emptyFavoritesSubtext: "Commencez votre liste de souhaits",

      viewDetails: "Voir les Détails",
      quickView: "Aperçu Rapide",
      reference: "Référence",
      collection: "Collection",

      close: "Fermer",
      save: "Enregistrer",
      cancel: "Annuler",
      submit: "Soumettre",
      or: "ou",
      languageChanged: "Langue modifiée avec succès",

      exploreCollections: "Explorer les Collections",
      ourHeritage: "Notre Héritage",
      requestConsultation: "Demander une Consultation",

      getInTouch: "Nous Contacter",
      yourName: "Votre Nom",
      yourEmail: "Votre Email",
      yourMessage: "Votre Message",
      sendMessage: "Envoyer",

      services: "Services",
      company: "Entreprise",
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
      searchPlaceholder: "Uhren suchen...",

      login: "Anmelden",
      register: "Registrieren",
      logout: "Abmelden",
      welcomeBack: "Willkommen Zurück",
      joinAurum: "Aurum Beitreten",
      email: "E-Mail-Adresse",
      password: "Passwort",
      firstName: "Vorname",
      lastName: "Nachname",
      createAccount: "Konto Erstellen",
      alreadyHaveAccount: "Haben Sie bereits ein Konto?",
      dontHaveAccount: "Haben Sie noch kein Konto?",
      myAccount: "Mein Konto",
      orderHistory: "Bestellverlauf",

      shoppingCart: "Warenkorb",
      addToCart: "In den Warenkorb",
      removeFromCart: "Entfernen",
      checkout: "Zur Kasse",
      continueShopping: "Weiter Einkaufen",
      emptyCart: "Ihr Warenkorb ist leer",
      emptyCartSubtext: "Entdecken Sie unsere außergewöhnlichen Uhren",
      total: "Gesamt",
      quantity: "Menge",

      yourFavorites: "Ihre Favoriten",
      favorites: "Favoriten",
      addToFavorites: "Zu Favoriten",
      emptyFavorites: "Keine Favoriten",
      emptyFavoritesSubtext: "Beginnen Sie Ihre Wunschliste",

      viewDetails: "Details Ansehen",
      quickView: "Schnellansicht",
      reference: "Referenz",
      collection: "Kollektion",

      close: "Schließen",
      save: "Speichern",
      cancel: "Abbrechen",
      submit: "Senden",
      or: "oder",
      languageChanged: "Sprache erfolgreich geändert",

      exploreCollections: "Kollektionen Erkunden",
      ourHeritage: "Unser Erbe",
      requestConsultation: "Beratung Anfordern",

      getInTouch: "Kontaktieren Sie Uns",
      yourName: "Ihr Name",
      yourEmail: "Ihre E-Mail",
      yourMessage: "Ihre Nachricht",
      sendMessage: "Senden",

      services: "Dienstleistungen",
      company: "Unternehmen",
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
      searchPlaceholder: "搜索腕表...",

      login: "登录",
      register: "注册",
      logout: "登出",
      welcomeBack: "欢迎回来",
      joinAurum: "加入Aurum",
      email: "电子邮箱",
      password: "密码",
      firstName: "名",
      lastName: "姓",
      createAccount: "创建账户",
      alreadyHaveAccount: "已有账户？",
      dontHaveAccount: "没有账户？",
      myAccount: "我的账户",
      orderHistory: "订单历史",

      shoppingCart: "购物车",
      addToCart: "加入购物车",
      removeFromCart: "移除",
      checkout: "结账",
      continueShopping: "继续购物",
      emptyCart: "购物车为空",
      emptyCartSubtext: "发现我们的卓越腕表",
      total: "总计",
      quantity: "数量",

      yourFavorites: "我的收藏",
      favorites: "收藏",
      addToFavorites: "加入收藏",
      emptyFavorites: "暂无收藏",
      emptyFavoritesSubtext: "开始建立您的心愿单",

      viewDetails: "查看详情",
      quickView: "快速查看",
      reference: "型号",
      collection: "系列",

      close: "关闭",
      save: "保存",
      cancel: "取消",
      submit: "提交",
      or: "或",
      languageChanged: "语言已更改",

      exploreCollections: "探索系列",
      ourHeritage: "我们的传承",
      requestConsultation: "申请咨询",

      getInTouch: "联系我们",
      yourName: "您的姓名",
      yourEmail: "您的邮箱",
      yourMessage: "您的留言",
      sendMessage: "发送",

      services: "服务",
      company: "公司",
    };
  }

  getJapaneseTranslations() {
    return {
      home: "ホーム",
      collections: "コレクション",
      newArrivals: "新着",
      bestSellers: "ベストセラー",
      about: "会社概要",
      contact: "お問い合わせ",
      searchPlaceholder: "時計を検索...",

      login: "ログイン",
      register: "登録",
      logout: "ログアウト",
      welcomeBack: "おかえりなさい",
      joinAurum: "Aurumに参加",
      email: "メールアドレス",
      password: "パスワード",
      firstName: "名",
      lastName: "姓",
      createAccount: "アカウント作成",
      alreadyHaveAccount: "アカウントをお持ちですか？",
      dontHaveAccount: "アカウントをお持ちでないですか？",
      myAccount: "マイアカウント",
      orderHistory: "注文履歴",

      shoppingCart: "ショッピングカート",
      addToCart: "カートに追加",
      removeFromCart: "削除",
      checkout: "お会計",
      continueShopping: "買い物を続ける",
      emptyCart: "カートは空です",
      emptyCartSubtext: "素晴らしい時計をご覧ください",
      total: "合計",
      quantity: "数量",

      yourFavorites: "お気に入り",
      favorites: "お気に入り",
      addToFavorites: "お気に入りに追加",
      emptyFavorites: "お気に入りはまだありません",
      emptyFavoritesSubtext: "ウィッシュリストを作成",

      viewDetails: "詳細を見る",
      quickView: "クイックビュー",
      reference: "リファレンス",
      collection: "コレクション",

      close: "閉じる",
      save: "保存",
      cancel: "キャンセル",
      submit: "送信",
      or: "または",
      languageChanged: "言語が変更されました",

      exploreCollections: "コレクションを探す",
      ourHeritage: "私たちの歴史",
      requestConsultation: "相談をリクエスト",

      getInTouch: "お問い合わせ",
      yourName: "お名前",
      yourEmail: "メールアドレス",
      yourMessage: "メッセージ",
      sendMessage: "送信",

      services: "サービス",
      company: "会社",
    };
  }
}

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ─── INITIALIZE SYSTEMS ────────────────────────────────────────────────────

const authSystem = new AuthSystem();
const cartSystem = new ShoppingCart();
const favoritesSystem = new FavoritesSystem();
const i18n = new MultilingualSystem();

// Export for global access
window.authSystem = authSystem;
window.cartSystem = cartSystem;
window.favoritesSystem = favoritesSystem;
window.i18n = i18n;
window.openModal = openModal;
window.closeModal = closeModal;
window.showNotification = showNotification;

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL PRODUCT CARD INITIALIZATION & PAGE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

// Initialize product cards on ANY page
function initializeProductCards() {
  // Prevent multiple simultaneous initializations
  if (window._initializingCards) return;
  window._initializingCards = true;

  try {
    document.querySelectorAll(".product-card").forEach((card, index) => {
      // Skip if already initialized
      if (card.hasAttribute("data-initialized")) return;

      const productName =
        card.querySelector(".product-name")?.textContent || `Product ${index}`;
      const productCollection =
        card.querySelector(".product-collection")?.textContent || "Collection";
      const productRef =
        card.querySelector(".product-ref")?.textContent || "REF-000";
      const productPrice =
        card.querySelector(".product-price span, .product-price")
          ?.textContent || "€ 0";

      // Generate or use existing product ID
      let productId = card.getAttribute("data-product-id");
      if (!productId) {
        productId = `watch_${Date.now()}_${index}`;
        card.setAttribute("data-product-id", productId);
      }

      // Mark as initialized
      card.setAttribute("data-initialized", "true");

      // Add to cart functionality
      const addToCartBtn = card.querySelector(
        '.action-btn[title*="Cart"], .action-btn:has(+ .action-btn:last-child)'
      );
      if (addToCartBtn && !addToCartBtn.hasAttribute("data-cart-handler")) {
        addToCartBtn.setAttribute("data-cart-handler", "true");
        addToCartBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof cartSystem !== "undefined") {
            cartSystem.addItem({
              id: productId,
              name: productName,
              collection: productCollection,
              ref: productRef,
              price: productPrice,
            });
          }
        });
      }

      // Add to favorites functionality
      const addToFavBtn = card.querySelector(
        '.action-btn[title*="Wishlist"], .action-btn:first-child'
      );
      if (addToFavBtn && !addToFavBtn.hasAttribute("data-fav-handler")) {
        addToFavBtn.setAttribute("data-fav-handler", "true");
        addToFavBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (
            typeof authSystem !== "undefined" &&
            typeof favoritesSystem !== "undefined"
          ) {
            if (!authSystem.isAuthenticated()) {
              openModal("loginModal");
              showNotification("Please login to add favorites", "info");
            } else {
              favoritesSystem.toggleFavorite({
                id: productId,
                name: productName,
                collection: productCollection,
                ref: productRef,
                price: productPrice,
              });
            }
          }
        });
      }
    });
  } finally {
    // Reset flag
    setTimeout(() => {
      window._initializingCards = false;
    }, 100);
  }
}

// Page Transition System
class PageTransition {
  constructor() {
    this.transitionElement = null;
    this.init();
  }

  init() {
    // Create transition overlay
    this.transitionElement = document.createElement("div");
    this.transitionElement.className = "page-transition";
    this.transitionElement.innerHTML = `
      <div class="page-transition-content">
        <div class="page-transition-logo">AURUM</div>
        <div class="page-transition-spinner"></div>
      </div>
    `;
    document.body.appendChild(this.transitionElement);

    // Intercept all internal links
    this.setupLinkInterception();

    // Reveal page on load
    this.revealPage();
  }

  setupLinkInterception() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");

      // Skip if external link, hash, or special protocol
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        link.getAttribute("target") === "_blank"
      ) {
        return;
      }

      // Skip if it's a modal trigger
      if (link.getAttribute("onclick")?.includes("Modal")) {
        return;
      }

      // Prevent default and transition
      e.preventDefault();
      this.navigateTo(href);
    });
  }

  navigateTo(url) {
    // Show transition
    document.body.classList.add("transitioning");
    this.transitionElement.classList.add("active");

    // Navigate after animation
    setTimeout(() => {
      window.location.href = url;
    }, 400);
  }

  revealPage() {
    // Hide transition after page load
    setTimeout(() => {
      this.transitionElement.classList.remove("active");
      document.body.classList.remove("transitioning");
    }, 100);
  }
}

// Mobile Menu System
class MobileMenu {
  constructor() {
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createMobileMenu();
    this.setupToggle();
  }

  createMobileMenu() {
    // Check if already exists
    if (document.querySelector(".mobile-nav")) return;

    const nav = document.querySelector("nav");
    if (!nav) return;

    // Create mobile menu toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "mobile-menu-toggle";
    toggleBtn.innerHTML = "<span></span><span></span><span></span>";
    toggleBtn.setAttribute("aria-label", "Toggle menu");

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";

    // Create mobile nav
    const mobileNav = document.createElement("div");
    mobileNav.className = "mobile-nav";

    // Get nav links
    const navLinks = document.querySelector(".nav-links");
    const authButtons = document.querySelector(".auth-buttons");
    const userMenu = document.querySelector(".user-menu");
    const langSwitcher = document.querySelector(".language-switcher");

    // Build mobile menu content
    let mobileContent = '<ul class="mobile-nav-links">';
    if (navLinks) {
      navLinks.querySelectorAll("a").forEach((link) => {
        const isActive = link.classList.contains("active") ? "active" : "";
        mobileContent += `<li><a href="${link.getAttribute(
          "href"
        )}" class="${isActive}">${link.textContent}</a></li>`;
      });
    }
    mobileContent += "</ul>";

    // Add search
    mobileContent += `
      <div class="mobile-nav-actions">
        <div class="mobile-nav-search">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="color:var(--silver)">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search...">
        </div>
    `;

    // Add auth buttons or user menu
    if (authButtons && authButtons.style.display !== "none") {
      mobileContent += `
        <div class="mobile-nav-buttons">
          <button class="auth-btn" onclick="openModal('loginModal'); mobileMenu.close()">Login</button>
          <button class="auth-btn primary" onclick="openModal('registerModal'); mobileMenu.close()">Register</button>
        </div>
      `;
    }

    if (userMenu && userMenu.style.display !== "none") {
      const userName =
        userMenu.querySelector(".user-name")?.textContent || "User";
      mobileContent += `
        <div class="user-menu" style="display:flex">
          <div class="user-avatar">${userName.charAt(0)}</div>
          <span class="user-name">${userName}</span>
        </div>
        <div class="mobile-nav-buttons">
          <button class="auth-btn" onclick="openModal('favoritesModal'); mobileMenu.close()">Favorites</button>
          <button class="auth-btn" onclick="authSystem.logout(); mobileMenu.close()">Logout</button>
        </div>
      `;
    }

    // Add language switcher
    if (langSwitcher) {
      mobileContent += `
        <div class="mobile-lang-switcher">
          <div class="mobile-lang-option" data-lang="en">
            <span class="lang-flag">🇬🇧</span>
            <span class="lang-name">EN</span>
          </div>
          <div class="mobile-lang-option" data-lang="ru">
            <span class="lang-flag">🇷🇺</span>
            <span class="lang-name">RU</span>
          </div>
          <div class="mobile-lang-option" data-lang="es">
            <span class="lang-flag">🇪🇸</span>
            <span class="lang-name">ES</span>
          </div>
          <div class="mobile-lang-option" data-lang="fr">
            <span class="lang-flag">🇫🇷</span>
            <span class="lang-name">FR</span>
          </div>
          <div class="mobile-lang-option" data-lang="de">
            <span class="lang-flag">🇩🇪</span>
            <span class="lang-name">DE</span>
          </div>
          <div class="mobile-lang-option" data-lang="zh">
            <span class="lang-flag">🇨🇳</span>
            <span class="lang-name">ZH</span>
          </div>
          <div class="mobile-lang-option" data-lang="ja">
            <span class="lang-flag">🇯🇵</span>
            <span class="lang-name">JA</span>
          </div>
        </div>
      `;
    }

    mobileContent += "</div></div>";

    mobileNav.innerHTML = mobileContent;

    // Add to DOM
    const navActions = nav.querySelector(".nav-actions");
    if (navActions) {
      navActions.appendChild(toggleBtn);
    }
    document.body.appendChild(overlay);
    document.body.appendChild(mobileNav);

    // Setup language switcher in mobile menu
    mobileNav.querySelectorAll(".mobile-lang-option").forEach((option) => {
      option.addEventListener("click", () => {
        if (typeof i18n !== "undefined") {
          i18n.setLanguage(option.dataset.lang);
          this.close();
        }
      });
    });

    // Close on overlay click
    overlay.addEventListener("click", () => this.close());

    // Close on link click
    mobileNav.querySelectorAll(".mobile-nav-links a").forEach((link) => {
      link.addEventListener("click", () => {
        setTimeout(() => this.close(), 100);
      });
    });
  }

  setupToggle() {
    const toggleBtn = document.querySelector(".mobile-menu-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => this.toggle());
    }
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    const mobileNav = document.querySelector(".mobile-nav");
    const overlay = document.querySelector(".mobile-nav-overlay");
    const toggleBtn = document.querySelector(".mobile-menu-toggle");

    if (mobileNav) mobileNav.classList.add("active");
    if (overlay) overlay.classList.add("active");
    if (toggleBtn) toggleBtn.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  close() {
    this.isOpen = false;
    const mobileNav = document.querySelector(".mobile-nav");
    const overlay = document.querySelector(".mobile-nav-overlay");
    const toggleBtn = document.querySelector(".mobile-menu-toggle");

    if (mobileNav) mobileNav.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    if (toggleBtn) toggleBtn.classList.remove("active");
    document.body.style.overflow = "";
  }

  updateAuthState() {
    // Recreate mobile menu to reflect auth state
    const mobileNav = document.querySelector(".mobile-nav");
    const overlay = document.querySelector(".mobile-nav-overlay");
    if (mobileNav) mobileNav.remove();
    if (overlay) overlay.remove();
    this.createMobileMenu();
  }
}

// Initialize everything when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAllSystems);
} else {
  initializeAllSystems();
}

function initializeAllSystems() {
  // Wait a tick to ensure all systems are initialized
  setTimeout(() => {
    // Initialize product cards on all pages
    initializeProductCards();

    // Apply translations immediately (only once on load)
    if (typeof i18n !== "undefined") {
      i18n.applyTranslations();
    }

    // Initialize page transitions
    if (typeof PageTransition !== "undefined") {
      window.pageTransition = new PageTransition();
    }

    // Initialize mobile menu
    if (typeof MobileMenu !== "undefined") {
      window.mobileMenu = new MobileMenu();
    }

    // Update mobile menu when auth state changes
    if (typeof authSystem !== "undefined") {
      const originalLogin = authSystem.login.bind(authSystem);
      const originalLogout = authSystem.logout.bind(authSystem);

      authSystem.login = async function (...args) {
        const result = await originalLogin(...args);
        if (window.mobileMenu) {
          setTimeout(() => window.mobileMenu.updateAuthState(), 100);
        }
        if (typeof i18n !== "undefined") {
          setTimeout(() => i18n.applyTranslations(), 200);
        }
        return result;
      };

      authSystem.logout = function (...args) {
        const result = originalLogout(...args);
        if (window.mobileMenu) {
          setTimeout(() => window.mobileMenu.updateAuthState(), 100);
        }
        if (typeof i18n !== "undefined") {
          setTimeout(() => i18n.applyTranslations(), 200);
        }
        return result;
      };
    }
  }, 100);
}

// Export for global access
window.initializeProductCards = initializeProductCards;
window.PageTransition = PageTransition;
window.MobileMenu = MobileMenu;
