(() => {
  "use strict";

  const state = {
    catalog: null,
    cart: [], // { lineId, productId, categoryId, name, price, qty, selections: [{groupName, values:[]}] }
    seenProducts: new Set()
  };

  const svg = (inner) =>
    `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const CATEGORY_ICONS = {
    sandwich: svg('<path d="M4.5 10.5a7.5 5.5 0 0 1 15 0z"/><path d="M3.5 13.5q1.9 2 3.8 0t3.8 0 3.8 0 3.9 0"/><path d="M4.5 16.2h15v.8a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z"/>'),
    plato: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.9"/>'),
    empanada: svg('<path d="M3 16.5a9 9 0 0 1 18 0z"/><path d="M5.6 16.5v1.7M8.7 16.5v2M12 16.5v2.2M15.3 16.5v2M18.4 16.5v1.7"/><path d="M8.5 11.5c1.2-1.2 2.7-1.8 4-1.8"/>'),
    dip: svg('<path d="M6.5 9h11l-.9 9.8a2 2 0 0 1-2 1.7H9.4a2 2 0 0 1-2-1.7z"/><path d="M8.5 9V6.5h7V9"/><path d="M9.8 13.5h4.4"/>'),
    bebida: svg('<path d="M7 4h10l-1.2 16H8.2z"/><path d="M7.6 10.2h8.8"/><path d="M13 4l1.7-2.2"/>'),
    otro: svg('<path d="M7.5 3v7.5M5.2 3v5a2.3 2.3 0 0 0 4.6 0V3M7.5 10.5V21"/><path d="M17 3c-2.2 1.8-2.7 4.8-2.7 8h2.7v10"/>')
  };

  function categoryIcon(category) {
    const key = `${category.id} ${category.name}`.toLowerCase();
    if (key.includes("empanada")) return CATEGORY_ICONS.empanada;
    if (key.includes("dip") || key.includes("salsa")) return CATEGORY_ICONS.dip;
    if (key.includes("bebida") || key.includes("gaseosa") || key.includes("cerveza")) return CATEGORY_ICONS.bebida;
    if (key.includes("plato")) return CATEGORY_ICONS.plato;
    if (key.includes("sandw") || key.includes("burger") || key.includes("hamburg")) return CATEGORY_ICONS.sandwich;
    return CATEGORY_ICONS.otro;
  }

  const el = {
    catalog: document.getElementById("catalog"),
    categoryTabs: document.getElementById("categoryTabs"),
    categoryTabsSlot: document.getElementById("categoryTabsSlot"),
    loadingState: document.getElementById("loadingState"),
    cartButton: document.getElementById("cartButton"),
    cartCount: document.getElementById("cartCount"),
    menuToggle: document.getElementById("menuToggle"),
    sideNav: document.getElementById("sideNav"),
    sideNavClose: document.getElementById("sideNavClose"),
    overlay: document.getElementById("overlay"),

    productModalBackdrop: document.getElementById("productModalBackdrop"),
    productModalTitle: document.getElementById("productModalTitle"),
    productModalBody: document.getElementById("productModalBody"),
    productModalConfirm: document.getElementById("productModalConfirm"),
    productModalClose: document.getElementById("productModalClose"),

    cartModalBackdrop: document.getElementById("cartModalBackdrop"),
    cartItems: document.getElementById("cartItems"),
    cartTotal: document.getElementById("cartTotal"),
    cartModalClose: document.getElementById("cartModalClose"),
    goToCheckout: document.getElementById("goToCheckout"),

    checkoutModalBackdrop: document.getElementById("checkoutModalBackdrop"),
    checkoutSummary: document.getElementById("checkoutSummary"),
    checkoutTotal: document.getElementById("checkoutTotal"),
    checkoutModalClose: document.getElementById("checkoutModalClose"),
    deliveryAddress: document.getElementById("deliveryAddress"),
    deliveryAddressField: document.getElementById("deliveryAddressField"),
    deliveryZoneField: document.getElementById("deliveryZoneField"),
    deliveryZone: document.getElementById("deliveryZone"),
    deliveryHint: document.getElementById("deliveryHint"),
    pickupHint: document.getElementById("pickupHint"),
    trackBar: document.getElementById("trackBar"),
    trackLink: document.getElementById("trackLink"),
    trackText: document.getElementById("trackText"),
    trackClose: document.getElementById("trackClose"),
    checkoutFeeRow: document.getElementById("checkoutFeeRow"),
    checkoutFee: document.getElementById("checkoutFee"),
    resumenFeeRow: document.getElementById("resumenFeeRow"),
    resumenFee: document.getElementById("resumenFee"),
    forgetData: document.getElementById("forgetData"),
    customerName: document.getElementById("customerName"),
    customerPhone: document.getElementById("customerPhone"),
    customerEmail: document.getElementById("customerEmail"),
    goToResumen: document.getElementById("goToResumen"),

    resumenModalBackdrop: document.getElementById("resumenModalBackdrop"),
    resumenModalClose: document.getElementById("resumenModalClose"),
    resumenItems: document.getElementById("resumenItems"),
    resumenContact: document.getElementById("resumenContact"),
    resumenShipping: document.getElementById("resumenShipping"),
    resumenTotal: document.getElementById("resumenTotal"),
    confirmResumen: document.getElementById("confirmResumen"),

    paymentResultModalBackdrop: document.getElementById("paymentResultModalBackdrop"),
    paymentResultTitle: document.getElementById("paymentResultTitle"),
    paymentResultSummary: document.getElementById("paymentResultSummary"),
    paymentResultMessage: document.getElementById("paymentResultMessage"),
    paymentResultWhatsapp: document.getElementById("paymentResultWhatsapp"),
    paymentResultClose: document.getElementById("paymentResultClose"),

    toast: document.getElementById("toast"),

    splashScreen: document.getElementById("splashScreen"),
    heroCta: document.getElementById("heroCta"),

    bottomTabInicio: document.getElementById("bottomTabInicio"),
    bottomTabMenu: document.getElementById("bottomTabMenu"),
    bottomTabCart: document.getElementById("bottomTabCart"),
    bottomTabLocal: document.getElementById("bottomTabLocal"),
    bottomCartCount: document.getElementById("bottomCartCount"),
    bottomTabs: document.getElementById("bottomTabs"),
    cartPill: document.getElementById("cartPill"),
    cartPillCount: document.getElementById("cartPillCount"),
    cartPillTotal: document.getElementById("cartPillTotal"),

    miniHeader: document.getElementById("miniHeader"),
    miniMenuToggle: document.getElementById("miniMenuToggle"),
    miniCartButton: document.getElementById("miniCartButton"),
    miniCartCount: document.getElementById("miniCartCount"),
    heroBanner: document.querySelector(".hero-banner")
  };

  let selectedPayment = "Efectivo";
  let selectedShipping = "Retiro en local";
  let currentProductContext = null; // { category, product, qty }

  function money(n) {
    return "$" + Number(n).toLocaleString("es-AR");
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  // ---------------- Navegación / menú ----------------
  function openSideNav() {
    el.sideNav.classList.add("open");
    el.overlay.classList.add("open");
  }
  function closeSideNav() {
    el.sideNav.classList.remove("open");
    el.overlay.classList.remove("open");
  }
  el.menuToggle.addEventListener("click", openSideNav);
  el.miniMenuToggle.addEventListener("click", openSideNav);
  el.sideNavClose.addEventListener("click", closeSideNav);
  el.overlay.addEventListener("click", () => {
    closeSideNav();
    closeAllModals();
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSideNav);
  });

  function closeAllModals() {
    el.productModalBackdrop.classList.remove("open");
    el.cartModalBackdrop.classList.remove("open");
    el.checkoutModalBackdrop.classList.remove("open");
    el.resumenModalBackdrop.classList.remove("open");
    el.paymentResultModalBackdrop.classList.remove("open");
  }

  const PENDING_ORDER_KEY = "esdp_pending_order";

  // ---------------- Carga del catálogo ----------------
  const CATALOG_CACHE_KEY = "esdp_catalog_v2";

  function readCachedCatalog() {
    try {
      const raw = localStorage.getItem(CATALOG_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && Array.isArray(parsed.categories) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function applyCatalog(catalog, firstTime) {
    state.catalog = catalog;
    state.catalog.categories = state.catalog.categories.filter((cat) => !cat.hidden);
    renderCategoryTabs();
    renderCatalog();
    setupDelivery();
    if (firstTime) {
      applySavedCustomer();
      startStatusWatcher();
      countVisit();
      renderTrackBar();
    } else {
      lastStoreClosed = storeIsClosed();
    }
  }

  // El menú guardado en el celular se muestra al instante y se actualiza en segundo plano
  // (si cambió, se vuelve a dibujar). Así el sitio no espera a la red para mostrar los platos.
  async function loadCatalog() {
    const cached = readCachedCatalog();
    const cachedJson = cached ? JSON.stringify(cached) : null;
    if (cached) {
      applyCatalog(cached, true);
      hideSplashScreen();
    }

    try {
      const res = await fetch("/api/catalog-get");
      if (!res.ok) throw new Error("No se pudo cargar el catálogo");
      const fresh = await res.json();
      const freshJson = JSON.stringify(fresh);
      try {
        localStorage.setItem(CATALOG_CACHE_KEY, freshJson);
      } catch (_) {}
      if (freshJson !== cachedJson) applyCatalog(fresh, !cached);
    } catch (err) {
      console.error(err);
      if (!cached) el.loadingState.textContent = "No pudimos cargar el menú. Probá recargar la página.";
    } finally {
      hideSplashScreen();
    }
  }

  let splashHidden = false;
  function hideSplashScreen() {
    if (splashHidden) return;
    splashHidden = true;
    const wait = Math.max(0, 350 - performance.now());
    setTimeout(() => {
      document.body.classList.add("ready");
      if (!el.splashScreen) return;
      el.splashScreen.classList.add("splash-hide");
      setTimeout(() => el.splashScreen.remove(), 600);
    }, wait);
  }
  setTimeout(hideSplashScreen, 6000);

  function renderCategoryTabs() {
    el.categoryTabs.innerHTML = state.catalog.categories
      .map(
        (cat, i) => `
          <button class="category-tab${i === 0 ? " active" : ""}" data-target="${cat.id}">
            <span class="pill-icon">${categoryIcon(cat)}</span>
            <span class="pill-label">${escapeHtml(cat.name)}</span>
          </button>
        `
      )
      .join("");

    measureTabsSlot();

    el.categoryTabs.querySelectorAll(".category-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        haptic(6);
        spyLockUntil = performance.now() + 900;
        setActiveCategoryTab(btn);
        const target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderStoreBanner() {
    const banner = document.getElementById("storeBanner");
    if (!banner) return;
    const closed = storeIsClosed();
    banner.classList.toggle("hidden", !closed);
    if (closed) {
      const status = Rules.storeStatus(state.catalog);
      const message =
        status.reason === "schedule"
          ? `Por ahora no estamos tomando pedidos.${status.nextOpen ? ` Abrimos ${status.nextOpen}.` : ""}`
          : state.catalog.closedMessage || "Por el momento no estamos tomando pedidos. ¡Volvemos pronto!";
      banner.innerHTML = `<div><strong>Local cerrado</strong>${escapeHtml(message)}</div>`;
    }
  }

  function measureTabsSlot() {
    if (el.categoryTabs.classList.contains("stuck")) return;
    el.categoryTabsSlot.style.height = `${el.categoryTabs.offsetHeight}px`;
  }

  function renderCatalog() {
    el.loadingState.remove();
    renderStoreBanner();

    if (!state.catalog.categories.length) {
      el.catalog.innerHTML = '<div class="empty-state">Todavía no hay productos cargados.</div>';
      return;
    }

    el.catalog.innerHTML = state.catalog.categories
      .map((cat) => {
        const cards = cat.products.map((p) => productCardHtml(cat, p)).join("");

        return `
          <section class="category-section" id="${cat.id}">
            <div class="section-header">
              <h3>${escapeHtml(cat.name)}</h3>
            </div>
            <div class="product-grid">${cards || '<p style="color:#9e9e9e;">Sin productos en esta categoría.</p>'}</div>
          </section>
        `;
      })
      .join("");

    el.catalog.querySelectorAll("[data-product-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const { categoryId, productId } = btn.dataset;
        const card = btn.closest(".product-card");
        const initialQty = card ? Number(card.querySelector(".qty-value")?.textContent) || 1 : 1;
        openProductModal(categoryId, productId, initialQty);
      });
    });

    setupReveal();
    setupImageFades();
    updateScrollState();

    el.catalog.querySelectorAll(".product-card").forEach((card) => {
      const valueEl = card.querySelector(".qty-value");
      card.querySelector(".qty-minus")?.addEventListener("click", () => {
        valueEl.textContent = Math.max(1, Number(valueEl.textContent) - 1);
      });
      card.querySelector(".qty-plus")?.addEventListener("click", () => {
        valueEl.textContent = Number(valueEl.textContent) + 1;
      });
    });
  }

  const ZOOM_ICON = svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M10.5 8v5M8 10.5h5"/>');

  function storeIsClosed() {
    return !!state.catalog && !Rules.storeStatus(state.catalog).open;
  }

  // Los horarios cambian solos: cada minuto se revisa si el local abrió o cerró.
  let statusTimer = null;
  let lastStoreClosed = null;
  function startStatusWatcher() {
    lastStoreClosed = storeIsClosed();
    if (statusTimer) return;
    statusTimer = setInterval(() => {
      if (!state.catalog) return;
      const closed = storeIsClosed();
      if (closed === lastStoreClosed) return;
      lastStoreClosed = closed;
      renderCatalog();
    }, 60000);
  }

  // Las tarjetas usan una miniatura liviana; la foto completa se carga al ampliar.
  function thumbUrl(image) {
    return /^images\/menu\/[^/]+\.webp$/.test(image || "") ? image.replace("images/menu/", "images/menu/t/") : image;
  }

  function productCardHtml(category, product) {
    const soldOut = product.available === false;
    const closed = storeIsClosed();
    const buttonLabel = soldOut ? "Agotado" : closed ? "Cerrado" : "Opciones";
    return `
      <article class="product-card reveal${soldOut ? " is-sold-out" : ""}" data-pid="${escapeHtml(product.id)}">
        ${
          product.image
            ? `<div class="thumb-wrap" role="button" tabindex="0" aria-label="Ampliar foto de ${escapeHtml(product.name)}">
          ${soldOut ? '<span class="sold-out-tag">Agotado</span>' : ""}
          <img class="product-thumb" src="${escapeHtml(thumbUrl(product.image))}" data-full="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" />
          <span class="thumb-zoom">${ZOOM_ICON}</span>
        </div>`
            : `<div class="thumb-wrap is-failed no-photo" aria-hidden="true">
          ${soldOut ? '<span class="sold-out-tag">Agotado</span>' : ""}
          <span class="thumb-placeholder"></span>
        </div>`
        }
        <div class="product-info">
          <h4>${escapeHtml(product.name)}</h4>
          <p>${escapeHtml(product.description || "")}</p>
          <div class="product-bottom">
            <span class="product-price">${money(product.price)}</span>
            <div class="qty-stepper">
              <button type="button" class="qty-minus" aria-label="Restar">−</button>
              <span class="qty-value">1</span>
              <button type="button" class="qty-plus" aria-label="Sumar">+</button>
            </div>
            <button class="btn-add-sm" data-product-open data-category-id="${category.id}" data-product-id="${product.id}"${soldOut || closed ? " disabled" : ""}>
              ${buttonLabel}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // ---------------- Zoom de fotos ----------------
  function openPhoto(src, name) {
    if (!window.Lightbox || !src) return;
    haptic(6);
    window.Lightbox.open({ src, alt: name, caption: name });
  }

  el.catalog.addEventListener("click", (e) => {
    const wrap = e.target.closest(".thumb-wrap");
    if (!wrap || wrap.classList.contains("is-failed")) return;
    const img = wrap.querySelector(".product-thumb");
    openPhoto(img?.dataset.full || img?.currentSrc || img?.src, img?.alt || "");
  });

  el.catalog.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const wrap = e.target.closest(".thumb-wrap");
    if (!wrap) return;
    e.preventDefault();
    wrap.click();
  });

  // ---------------- Modal de producto (variantes + cantidad) ----------------
  function openProductModal(categoryId, productId, initialQty = 1) {
    const category = state.catalog.categories.find((c) => c.id === categoryId);
    const product = category?.products.find((p) => p.id === productId);
    if (!product) return;

    currentProductContext = { category, product, qty: Math.max(1, initialQty), selections: {} };

    el.productModalTitle.textContent = product.name;

    const variants = product.variants || [];
    const variantsHtml = variants
      .map((variant) => {
        const inputType = variant.multiple ? "checkbox" : "radio";
        const options = variant.options
          .map((opt, idx) => {
            const inputId = `variant-${variant.id}-${idx}`;
            const checkedFirst = !variant.multiple && idx === 0 ? "checked" : "";
            const photo = variant.optionImages && variant.optionImages[opt];
            return `
              <label class="variant-option${photo ? " has-photo" : ""}" for="${inputId}">
                <input type="${inputType}" id="${inputId}" name="variant-${variant.id}"
                  value="${escapeHtml(opt)}" data-variant-id="${variant.id}" data-variant-name="${escapeHtml(variant.name)}"
                  ${checkedFirst} />
                ${photo ? `<img class="variant-thumb" src="${escapeHtml(photo)}" alt="" width="56" height="56" loading="lazy" decoding="async" />` : ""}
                <span>${escapeHtml(opt)}</span>
              </label>
            `;
          })
          .join("");

        return `
          <div class="variant-group">
            <h4>${escapeHtml(variant.name)} ${variant.required ? "" : "<small>(opcional)</small>"}</h4>
            ${options}
          </div>
        `;
      })
      .join("");

    const extras = product.extras || [];
    const extrasHtml = extras.length
      ? `
        <div class="variant-group">
          <h4>Extras <small>(opcional)</small></h4>
          ${extras
            .map(
              (extra, idx) => `
                <label class="variant-option" for="extra-${idx}">
                  <input type="checkbox" id="extra-${idx}" data-extra-id="${escapeHtml(extra.id)}"
                    data-extra-name="${escapeHtml(extra.name)}" data-extra-price="${Number(extra.price) || 0}" />
                  <span>${escapeHtml(extra.name)}</span>
                  <span style="margin-left:auto;color:var(--dorado);font-weight:700;">+${money(extra.price)}</span>
                </label>
              `
            )
            .join("")}
        </div>
      `
      : "";

    const photoHtml = product.image
      ? `<div class="modal-photo" role="button" tabindex="0" aria-label="Ampliar foto"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" /><span class="thumb-zoom">${ZOOM_ICON}</span></div>`
      : "";

    el.productModalBody.innerHTML = `
      ${photoHtml}
      ${variantsHtml}
      ${extrasHtml}
      <div class="variant-group">
        <h4>Cantidad</h4>
        <div class="qty-control">
          <button type="button" id="modalQtyMinus">−</button>
          <span id="modalQtyValue">${currentProductContext.qty}</span>
          <button type="button" id="modalQtyPlus">+</button>
        </div>
      </div>
      <div class="variant-group">
        <h4>Observaciones <small>(opcional)</small></h4>
        <textarea id="modalNotes" rows="2" placeholder="Ej: sin tomate, bien cocido, etc." style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:var(--negro);color:var(--blanco);font-size:14px;font-family:inherit;"></textarea>
      </div>
    `;

    const modalPhoto = el.productModalBody.querySelector(".modal-photo");
    if (modalPhoto) {
      const photoImg = modalPhoto.querySelector("img");
      if (photoImg.complete && photoImg.naturalWidth) photoImg.classList.add("loaded");
      photoImg.addEventListener("load", () => photoImg.classList.add("loaded"), { once: true });
      photoImg.addEventListener("error", () => modalPhoto.classList.add("is-failed"), { once: true });
      modalPhoto.addEventListener("click", () => openPhoto(photoImg.currentSrc || photoImg.src, product.name));
    }

    document.getElementById("modalQtyMinus").addEventListener("click", () => {
      currentProductContext.qty = Math.max(1, currentProductContext.qty - 1);
      document.getElementById("modalQtyValue").textContent = currentProductContext.qty;
    });
    document.getElementById("modalQtyPlus").addEventListener("click", () => {
      currentProductContext.qty += 1;
      document.getElementById("modalQtyValue").textContent = currentProductContext.qty;
    });

    el.productModalBackdrop.classList.add("open");
  }

  el.productModalClose.addEventListener("click", () => el.productModalBackdrop.classList.remove("open"));

  el.productModalConfirm.addEventListener("click", () => {
    if (!currentProductContext) return;
    if (storeIsClosed()) {
      showToast("El local está cerrado por ahora");
      return;
    }
    const { category, product, qty } = currentProductContext;
    const variants = product.variants || [];

    // Validar requeridos y juntar selecciones
    const selections = [];
    for (const variant of variants) {
      const inputs = el.productModalBody.querySelectorAll(`[data-variant-id="${variant.id}"]:checked`);
      const values = Array.from(inputs).map((i) => i.value);
      if (variant.required && values.length === 0) {
        showToast(`Elegí una opción para "${variant.name}"`);
        return;
      }
      if (values.length) {
        selections.push({ groupName: variant.name, values });
      }
    }

    const extraInputs = el.productModalBody.querySelectorAll("[data-extra-id]:checked");
    const extras = Array.from(extraInputs).map((input) => ({
      id: input.dataset.extraId,
      name: input.dataset.extraName,
      price: Number(input.dataset.extraPrice) || 0
    }));

    const notes = document.getElementById("modalNotes")?.value.trim() || "";

    if (addingToCart) return;

    if (prefersReducedMotion) {
      addToCart(category, product, qty, selections, extras, notes);
      haptic(12);
      el.productModalBackdrop.classList.remove("open");
      showToast(`${product.name} agregado al carrito`);
      return;
    }

    // Animación: el botón se vuelve un círculo con anillo girando, pasa a tilde verde
    // y recién ahí se suma al carrito y la bolita vuela hasta el pedido.
    addingToCart = true;
    const btn = el.productModalConfirm;
    btn.classList.add("is-loading");

    setTimeout(() => {
      addToCart(category, product, qty, selections, extras, notes);
      btn.classList.remove("is-loading");
      btn.classList.add("is-done");
      btn.insertAdjacentHTML(
        "beforeend",
        '<svg class="btn-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
      );
      haptic(12);
    }, ADD_LOADING_MS);

    setTimeout(() => {
      flyToCart(btn);
      el.productModalBackdrop.classList.remove("open");
      showToast(`${product.name} agregado al carrito`);
      setTimeout(celebrateCart, 560);
      setTimeout(() => {
        btn.classList.remove("is-loading", "is-done");
        btn.querySelector(".btn-check")?.remove();
        addingToCart = false;
      }, 500);
    }, ADD_LOADING_MS + ADD_DONE_MS);
  });

  let addingToCart = false;
  const ADD_LOADING_MS = 520;
  const ADD_DONE_MS = 520;

  function celebrateCart() {
    [el.cartPill, el.bottomTabCart].forEach((node) => {
      if (!node) return;
      node.classList.remove("ping");
      void node.offsetWidth;
      node.classList.add("ping");
      setTimeout(() => node.classList.remove("ping"), 900);
    });
  }

  // ---------------- Carrito ----------------
  function addToCart(category, product, qty, selections, extras = [], notes = "") {
    const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
    const unitPrice = product.price + extrasTotal;
    const matchKey = JSON.stringify({ selections, extras, notes });
    const existing = state.cart.find(
      (item) => item.productId === product.id && JSON.stringify({ selections: item.selections, extras: item.extras, notes: item.notes }) === matchKey
    );

    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        lineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        categoryId: category.id,
        name: product.name,
        price: unitPrice,
        qty,
        selections,
        extras,
        notes
      });
    }
    renderCartBadge();
  }

  function removeFromCart(lineId) {
    state.cart = state.cart.filter((i) => i.lineId !== lineId);
    renderCartBadge();
    renderCartModal();
  }

  function updateCartQty(lineId, delta) {
    const item = state.cart.find((i) => i.lineId === lineId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      state.cart = state.cart.filter((i) => i.lineId !== lineId);
    }
    renderCartBadge();
    renderCartModal();
  }

  // Precio del carrito con la promo por cantidad (ej. docena de empanadas) ya descontada.
  function cartPricing() {
    const gross = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    if (!state.catalog) return { gross, discount: 0, net: gross, groups: [] };
    const result = Rules.bundleDiscount(state.catalog, state.cart);
    return { gross, discount: result.discount, net: gross - result.discount, groups: result.groups };
  }

  function cartTotal() {
    return cartPricing().net;
  }

  // Filas de descuento (checkout y resumen)
  function discountRowsHtml() {
    return cartPricing()
      .groups.filter((g) => g.saved > 0)
      .map((g) => `<div>Promo ${Rules.bundleLabel(g)}${g.packs > 1 ? " x" + g.packs : ""} — −${money(g.saved)}</div>`)
      .join("");
  }

  // Aviso en el carrito: descuento logrado o cuánto falta para la promo.
  function promoCartHtml() {
    return cartPricing()
      .groups.map((g) => {
        const rows = [];
        if (g.saved > 0) {
          rows.push(`<div class="cart-promo ok"><span>Promo ${Rules.bundleLabel(g)}${g.packs > 1 ? " x" + g.packs : ""}</span><strong>−${money(g.saved)}</strong></div>`);
        }
        if (g.missing > 0) {
          rows.push(
            `<div class="cart-promo hint">Sumá ${g.missing} más de ${escapeHtml(g.name)} y completás ${g.packs > 0 ? "otra" : "la"} ${Rules.bundleLabel(g)} a ${money(g.price)}</div>`
          );
        }
        return rows.join("");
      })
      .join("");
  }

  function cartItemCount() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  let lastBadgeCount = 0;
  function renderCartBadge() {
    const count = cartItemCount();
    el.cartCount.textContent = count;
    el.miniCartCount.textContent = count;
    el.cartCount.classList.toggle("is-zero", count === 0);
    el.miniCartCount.classList.toggle("is-zero", count === 0);
    el.bottomCartCount.textContent = count;
    el.bottomCartCount.classList.toggle("hidden", count === 0);

    el.cartPillCount.textContent = `${count} ${count === 1 ? "producto" : "productos"}`;
    el.cartPillTotal.textContent = money(cartTotal());
    el.cartPill.classList.toggle("show", count > 0);
    el.cartPill.tabIndex = count > 0 ? 0 : -1;
    document.body.classList.toggle("has-cart", count > 0);

    if (count > lastBadgeCount) {
      [el.cartCount, el.miniCartCount, el.bottomCartCount, el.cartPillTotal].forEach(popElement);
    }
    lastBadgeCount = count;
  }

  function popElement(node) {
    if (!node || !node.animate) return;
    node.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.45)" }, { transform: "scale(0.92)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    );
  }

  function haptic(ms = 8) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  function flyToCart(fromEl) {
    const target = el.cartPill.classList.contains("show") ? el.cartPill : el.bottomTabCart.querySelector(".bottom-tab-icon");
    if (!fromEl || !target || !fromEl.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = fromEl.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.className = "fly-dot";
    const startX = from.left + from.width / 2 - 14;
    const startY = from.top + from.height / 2 - 14;
    const endX = to.left + Math.min(to.width / 2, 40) - 14;
    const endY = to.top + to.height / 2 - 14;
    dot.style.left = `${startX}px`;
    dot.style.top = `${startY}px`;
    document.body.appendChild(dot);
    const dx = endX - startX;
    const dy = endY - startY;
    const anim = dot.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.9, offset: 1 }
      ],
      { duration: 640, easing: "cubic-bezier(0.45, 0, 0.2, 1)" }
    );
    anim.onfinish = () => dot.remove();
  }

  function lineDetailsText(item) {
    const parts = (item.selections || []).map((s) => `${s.groupName}: ${s.values.join(", ")}`);
    if (item.extras && item.extras.length) {
      parts.push(`Extras: ${item.extras.map((e) => e.name).join(", ")}`);
    }
    if (item.notes) {
      parts.push(`Obs: ${item.notes}`);
    }
    return parts.join(" · ");
  }

  function renderCartModal() {
    if (!state.cart.length) {
      el.cartItems.innerHTML = '<div class="cart-empty">Tu carrito está vacío</div>';
    } else {
      el.cartItems.innerHTML = state.cart
        .map((item) => {
          const selectionsText = lineDetailsText(item);
          return `
            <div class="cart-item">
              <button class="cart-item-remove" data-remove="${item.lineId}" aria-label="Quitar ${escapeHtml(item.name)}">×</button>
              <div class="cart-item-top">
                <strong>${escapeHtml(item.name)}</strong>
                <span class="cart-item-price">${money(item.price * item.qty)}</span>
              </div>
              ${selectionsText ? `<div class="cart-item-selections">${escapeHtml(selectionsText)}</div>` : ""}
              <div class="cart-item-bottom">
                <div class="qty-stepper" data-cart-qty="${item.lineId}">
                  <button type="button" class="qty-minus" aria-label="Restar">−</button>
                  <span>${item.qty}</span>
                  <button type="button" class="qty-plus" aria-label="Sumar">+</button>
                </div>
                <span class="cart-item-unit">${money(item.price)} c/u</span>
              </div>
            </div>
          `;
        })
        .join("");

      el.cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
      });
      el.cartItems.querySelectorAll("[data-cart-qty]").forEach((stepper) => {
        const lineId = stepper.dataset.cartQty;
        stepper.querySelector(".qty-minus").addEventListener("click", () => updateCartQty(lineId, -1));
        stepper.querySelector(".qty-plus").addEventListener("click", () => updateCartQty(lineId, 1));
      });
    }
    if (state.cart.length) el.cartItems.insertAdjacentHTML("beforeend", promoCartHtml());
    el.cartTotal.textContent = money(cartTotal());
  }

  function openCartModal() {
    renderCartModal();
    el.cartModalBackdrop.classList.add("open");
  }
  el.cartButton.addEventListener("click", openCartModal);
  el.miniCartButton.addEventListener("click", openCartModal);
  el.cartModalClose.addEventListener("click", () => el.cartModalBackdrop.classList.remove("open"));

  // ---------------- Checkout ----------------
  el.goToCheckout.addEventListener("click", () => {
    if (storeIsClosed()) {
      showToast("El local está cerrado por ahora");
      return;
    }
    if (!state.cart.length) {
      showToast("Agregá algo al carrito primero");
      return;
    }
    el.cartModalBackdrop.classList.remove("open");
    renderCheckoutSummary();
    el.checkoutModalBackdrop.classList.add("open");
  });
  el.checkoutModalClose.addEventListener("click", () => el.checkoutModalBackdrop.classList.remove("open"));

  function renderCheckoutSummary() {
    el.checkoutSummary.innerHTML = state.cart
      .map((item) => {
        const selectionsText = lineDetailsText(item);
        return `<div>${item.qty}x ${escapeHtml(item.name)}${selectionsText ? " (" + escapeHtml(selectionsText) + ")" : ""} — ${money(item.price * item.qty)}</div>`;
      })
      .join("");
    el.checkoutSummary.insertAdjacentHTML("beforeend", discountRowsHtml());
    renderTotals();
  }

  document.querySelectorAll(".payment-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedPayment = btn.dataset.payment;
    });
  });

  document.querySelectorAll(".shipping-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".shipping-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedShipping = btn.dataset.shipping;
      el.deliveryAddressField.classList.toggle("hidden", selectedShipping !== Rules.DELIVERY);
      updateDeliveryUi();
    });
  });

  // ---------------- Envío y totales ----------------
  function setupDelivery() {
    const cfg = Rules.deliveryConfig(state.catalog);
    const pickupEta = Rules.prepEstimate(state.catalog, "Retiro en local");
    const deliveryEta = Rules.prepEstimate(state.catalog, Rules.DELIVERY);
    el.pickupHint.textContent = `Listo en ${pickupEta} min`;

    if (!cfg.enabled) {
      el.deliveryHint.textContent = "Consultar zona y costo";
    } else if (cfg.zones.length) {
      el.deliveryHint.textContent = "El costo depende de tu zona";
    } else if (cfg.fee > 0) {
      el.deliveryHint.textContent = `Costo de envío ${money(cfg.fee)}`;
    } else {
      el.deliveryHint.textContent = "Sin cargo de envío";
    }
    if (cfg.enabled && cfg.freeFrom > 0) {
      el.deliveryHint.textContent += ` · Gratis desde ${money(cfg.freeFrom)}`;
    }
    el.deliveryHint.textContent += ` · Llega en ${deliveryEta} min`;

    el.deliveryZone.innerHTML =
      '<option value="">Elegí tu zona</option>' +
      cfg.zones
        .map((z) => `<option value="${escapeHtml(z.id)}">${escapeHtml(z.name)} — ${money(z.fee)}</option>`)
        .join("");
    updateDeliveryUi();
  }

  function updateDeliveryUi() {
    const cfg = Rules.deliveryConfig(state.catalog);
    const isDelivery = selectedShipping === Rules.DELIVERY;
    el.deliveryZoneField.classList.toggle("hidden", !(isDelivery && cfg.enabled && cfg.zones.length));
    renderTotals();
  }

  el.deliveryZone.addEventListener("change", renderTotals);

  // Subtotal + envío (según entrega y zona). El servidor vuelve a calcularlo al guardar el pedido.
  function orderTotals() {
    const subtotal = cartTotal();
    if (selectedShipping !== Rules.DELIVERY || !state.catalog) {
      return { subtotal, fee: 0, total: subtotal, zone: null, info: null };
    }
    // El envío gratis cuenta sobre lo que se paga, ya con la promo descontada.
    const info = Rules.deliveryFee(state.catalog, subtotal, el.deliveryZone.value);
    return { subtotal, fee: info.fee, total: subtotal + info.fee, zone: info.zone, info };
  }

  function feeText(info) {
    if (!info || !info.enabled) return "";
    if (info.needsZone) return "Elegí tu zona";
    return info.free ? "Gratis" : money(info.fee);
  }

  function renderTotals() {
    const t = orderTotals();
    const text = feeText(t.info);
    [[el.checkoutFeeRow, el.checkoutFee], [el.resumenFeeRow, el.resumenFee]].forEach(([row, value]) => {
      row.classList.toggle("hidden", !text);
      value.textContent = text;
    });
    el.checkoutTotal.textContent = money(t.total);
    el.resumenTotal.textContent = money(t.total);
  }

  // ---------------- Visitas y seguimiento del pedido ----------------
  const VISITOR_KEY = "esdp_visitor";
  const VISIT_SENT_KEY = "esdp_visit_sent";
  const LAST_ORDER_KEY = "esdp_last_order";
  const LAST_ORDER_HOURS = 8;

  // Cuenta una visita por sesión. El id es aleatorio y no identifica a nadie: solo sirve
  // para distinguir visitantes distintos en las estadísticas.
  function countVisit() {
    try {
      if (sessionStorage.getItem(VISIT_SENT_KEY)) return;
      sessionStorage.setItem(VISIT_SENT_KEY, "1");
      let vid = localStorage.getItem(VISITOR_KEY);
      if (!vid) {
        vid = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
        localStorage.setItem(VISITOR_KEY, vid);
      }
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "visit", vid }),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  function rememberLastOrder(saved) {
    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ id: saved.orderId, number: saved.number, at: Date.now() }));
    } catch (_) {}
    renderTrackBar();
  }

  function renderTrackBar() {
    let last = null;
    try {
      last = JSON.parse(localStorage.getItem(LAST_ORDER_KEY));
    } catch (_) {}
    const fresh = last && last.id && Date.now() - last.at < LAST_ORDER_HOURS * 60 * 60 * 1000;
    el.trackBar.classList.toggle("hidden", !fresh);
    if (!fresh) return;
    el.trackLink.href = `seguimiento.html?o=${encodeURIComponent(last.id)}`;
    el.trackText.textContent = `Seguí tu pedido #${last.number}`;
  }

  el.trackClose.addEventListener("click", () => {
    try {
      localStorage.removeItem(LAST_ORDER_KEY);
    } catch (_) {}
    renderTrackBar();
  });

  // ---------------- Datos del cliente guardados en el celular ----------------
  const CUSTOMER_KEY = "esdp_customer_v1";

  function loadCustomer() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || null;
    } catch (_) {
      return null;
    }
  }

  function saveCustomer(data) {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
      el.forgetData.classList.remove("hidden");
    } catch (_) {}
  }

  function applySavedCustomer() {
    const saved = loadCustomer();
    if (!saved) return;
    el.customerName.value = saved.name || "";
    el.customerPhone.value = saved.phone || "";
    el.customerEmail.value = saved.email || "";
    el.deliveryAddress.value = saved.address || "";
    if (saved.zoneId) el.deliveryZone.value = saved.zoneId;
    if (saved.payment) {
      document.querySelector(`.payment-option[data-payment="${saved.payment}"]`)?.click();
    }
    if (saved.shipping) {
      document.querySelector(`.shipping-option[data-shipping="${saved.shipping}"]`)?.click();
    }
    el.forgetData.classList.remove("hidden");
  }

  el.forgetData.addEventListener("click", () => {
    try {
      localStorage.removeItem(CUSTOMER_KEY);
    } catch (_) {}
    el.customerName.value = "";
    el.customerPhone.value = "";
    el.customerEmail.value = "";
    el.deliveryAddress.value = "";
    el.deliveryZone.value = "";
    el.forgetData.classList.add("hidden");
    renderTotals();
    showToast("Listo, borramos tus datos de este celular");
  });

  function buildOrderMessage(cart, total, contact, payment, extraNote) {
    const { name, phone, email, shipping, address, number, deliveryFee, zoneName, orderId, eta } = contact;
    const lines = [];
    lines.push(number ? `¡Hola! Quiero hacer un pedido 🔥 (*Pedido #${number}*)` : "¡Hola! Quiero hacer un pedido 🔥");
    lines.push("");
    lines.push("*Pedido:*");
    cart.forEach((item) => {
      const selectionsText = lineDetailsText(item);
      lines.push(`- ${item.qty}x ${item.name}${selectionsText ? ` (${selectionsText})` : ""} — ${money(item.price * item.qty)}`);
    });
    (contact.promos || []).forEach((g) => {
      lines.push(`- Promo ${g.size === 12 ? "docena" : "pack de " + g.size} ${g.name}${g.packs > 1 ? " x" + g.packs : ""} — -${money(g.saved)}`);
    });
    if (shipping === Rules.DELIVERY && deliveryFee !== undefined) {
      lines.push(`- Envío${zoneName ? ` (${zoneName})` : ""} — ${deliveryFee > 0 ? money(deliveryFee) : "Gratis"}`);
    }
    lines.push("");
    lines.push(`*Total: ${money(total)}*`);
    lines.push("");
    lines.push(`*Nombre:* ${name}`);
    lines.push(`*Teléfono:* ${phone}`);
    if (email) lines.push(`*Email:* ${email}`);
    lines.push(`*Entrega:* ${shipping}`);
    if (shipping === Rules.DELIVERY) lines.push(`*Dirección:* ${address}`);
    lines.push(`*Medio de pago:* ${payment}`);
    if (eta) lines.push(`*Tiempo estimado:* ${eta} min`);
    if (orderId) lines.push(`*Seguí tu pedido:* ${window.location.origin}/seguimiento.html?o=${orderId}`);
    if (extraNote) {
      lines.push("");
      lines.push(extraNote);
    }
    return lines.join("\n");
  }

  function waNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 10 ? `549${digits}` : digits;
  }

  function openWhatsappWithMessage(message) {
    const encoded = encodeURIComponent(message);
    const phone = waNumber(state.catalog.whatsappNumber);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, "_blank", "noopener");
  }

  // ---------------- Checkout → Resumen del pedido ----------------
  el.goToResumen.addEventListener("click", () => {
    const name = el.customerName.value.trim();
    const phone = el.customerPhone.value.trim();
    const email = el.customerEmail.value.trim();
    const address = el.deliveryAddress.value.trim();

    if (!name) {
      showToast("Ingresá tu nombre y apellido");
      el.customerName.focus();
      return;
    }
    if (!phone) {
      showToast("Ingresá tu teléfono de contacto");
      el.customerPhone.focus();
      return;
    }
    if (selectedShipping === Rules.DELIVERY && !address) {
      showToast("Ingresá una dirección de entrega");
      el.deliveryAddress.focus();
      return;
    }
    if (selectedShipping === Rules.DELIVERY && orderTotals().info?.needsZone) {
      showToast("Elegí tu zona de entrega");
      el.deliveryZone.focus();
      return;
    }
    if (!state.cart.length) {
      showToast("Tu carrito está vacío");
      return;
    }

    el.checkoutModalBackdrop.classList.remove("open");

    el.resumenItems.innerHTML = state.cart
      .map((item) => {
        const selectionsText = lineDetailsText(item);
        return `<div>${item.qty}x ${escapeHtml(item.name)}${selectionsText ? " (" + escapeHtml(selectionsText) + ")" : ""} — ${money(item.price * item.qty)}</div>`;
      })
      .join("");
    el.resumenItems.insertAdjacentHTML("beforeend", discountRowsHtml());

    el.resumenContact.innerHTML = `
      <div>${escapeHtml(name)}</div>
      <div>${escapeHtml(phone)}</div>
      ${email ? `<div>${escapeHtml(email)}</div>` : ""}
    `;

    el.resumenShipping.innerHTML = `
      <div>${escapeHtml(selectedShipping)}</div>
      ${selectedShipping === Rules.DELIVERY && orderTotals().zone ? `<div>Zona: ${escapeHtml(orderTotals().zone.name)}</div>` : ""}
      ${selectedShipping === Rules.DELIVERY ? `<div>${escapeHtml(address)}</div>` : ""}
    `;

    renderTotals();
    el.resumenModalBackdrop.classList.add("open");
  });
  el.checkoutModalClose.addEventListener("click", () => el.checkoutModalBackdrop.classList.remove("open"));
  el.resumenModalClose.addEventListener("click", () => el.resumenModalBackdrop.classList.remove("open"));

  document.querySelectorAll("[data-edit-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      el.resumenModalBackdrop.classList.remove("open");
      el.checkoutModalBackdrop.classList.add("open");
    });
  });

  function resetConfirmButton() {
    el.confirmResumen.disabled = false;
    el.confirmResumen.textContent = "Confirmar pedido";
  }

  // Guarda el pedido en el servidor (que recalcula precios y envío).
  // Devuelve { saved } si se guardó, { rejected } si el servidor lo rechazó (ej. local cerrado)
  // o { unavailable } si no hubo conexión o falló el servidor.
  async function submitOrder(contact) {
    try {
      const res = await fetch("/api/order-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: state.cart.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            selections: item.selections,
            extraIds: (item.extras || []).map((e) => e.id),
            notes: item.notes || ""
          })),
          customer: { name: contact.name, phone: contact.phone, email: contact.email },
          shipping: contact.shipping,
          zoneId: el.deliveryZone.value,
          address: contact.shipping === Rules.DELIVERY ? contact.address : "",
          payment: selectedPayment
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return { saved: data };
      if (res.status >= 400 && res.status < 500) return { rejected: data.error || "No se pudo enviar el pedido" };
      return { unavailable: true };
    } catch (err) {
      console.error(err);
      return { unavailable: true };
    }
  }

  el.confirmResumen.addEventListener("click", async () => {
    const name = el.customerName.value.trim();
    const phone = el.customerPhone.value.trim();
    const email = el.customerEmail.value.trim();
    const typedAddress = el.deliveryAddress.value.trim();
    const address = selectedShipping === Rules.DELIVERY ? typedAddress : "Retiro en el local";
    const contact = { name, phone, email, shipping: selectedShipping, address };

    el.confirmResumen.disabled = true;
    el.confirmResumen.textContent = selectedPayment === "Mercado Pago" ? "Iniciando pago..." : "Enviando pedido...";

    const totals = orderTotals();
    const result = await submitOrder(contact);

    if (result.rejected) {
      showToast(result.rejected);
      resetConfirmButton();
      return;
    }

    // Con Mercado Pago el pedido tiene que estar guardado para poder cobrarlo.
    if (result.unavailable && selectedPayment === "Mercado Pago") {
      showToast("No pudimos iniciar el pago. Probá de nuevo en un momento.");
      resetConfirmButton();
      return;
    }

    const saved = result.saved || null;
    // Con el pedido guardado se usan los montos del servidor.
    contact.number = saved ? saved.number : undefined;
    contact.orderId = saved ? saved.orderId : undefined;
    contact.eta = saved ? saved.eta : undefined;
    contact.promos = saved
      ? saved.discountGroups || []
      : cartPricing().groups.filter((g) => g.saved > 0);
    if (saved) rememberLastOrder(saved);
    contact.deliveryFee = saved ? saved.deliveryFee : totals.fee;
    contact.zoneName = totals.zone ? totals.zone.name : "";
    const total = saved ? saved.total : totals.total;

    saveCustomer({
      name,
      phone,
      email,
      address: typedAddress,
      shipping: selectedShipping,
      zoneId: el.deliveryZone.value,
      payment: selectedPayment
    });

    if (selectedPayment === "Mercado Pago") {
      try {
        const res = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: saved.orderId })
        });
        const data = await res.json();

        if (!res.ok || !data.checkoutUrl) {
          showToast(data.error || "No se pudo iniciar el pago");
          resetConfirmButton();
          return;
        }

        sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ cart: state.cart, total, contact }));
        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error(err);
        showToast("Error de conexión al iniciar el pago");
        resetConfirmButton();
      }
      return;
    }

    const message = buildOrderMessage(state.cart, total, contact, selectedPayment);
    openWhatsappWithMessage(message);
    resetConfirmButton();
    el.resumenModalBackdrop.classList.remove("open");

    if (saved) {
      state.cart = [];
      renderCartBadge();
      renderCartModal();
      showToast(`Pedido #${saved.number} enviado`);
    }
  });

  // ---------------- Vuelta de Mercado Pago ----------------
  function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    if (!status) return;

    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    const pending = raw ? JSON.parse(raw) : null;

    if (status === "success" && pending) {
      el.paymentResultTitle.textContent = "¡Pago confirmado! 🎉";
      el.paymentResultMessage.textContent =
        "Tu pago se acreditó correctamente. Tocá el botón para avisarle al local y que empiecen a prepararlo.";
      el.paymentResultSummary.innerHTML = pending.cart
        .map((item) => {
          const detailsText = lineDetailsText(item);
          return `<div>${item.qty}x ${escapeHtml(item.name)}${detailsText ? " (" + escapeHtml(detailsText) + ")" : ""} — ${money(item.price * item.qty)}</div>`;
        })
        .join("") +
        (pending.contact.deliveryFee > 0 ? `<div>Envío — ${money(pending.contact.deliveryFee)}</div>` : "") +
        `<div style="margin-top:8px;font-weight:800;">Total: ${money(pending.total)}</div>`;

      el.paymentResultWhatsapp.onclick = () => {
        const message = buildOrderMessage(
          pending.cart,
          pending.total,
          pending.contact,
          "Mercado Pago",
          "✅ *Pago ya realizado con Mercado Pago*"
        );
        openWhatsappWithMessage(message);
        sessionStorage.removeItem(PENDING_ORDER_KEY);
        el.paymentResultModalBackdrop.classList.remove("open");
      };

      el.paymentResultModalBackdrop.classList.add("open");
      state.cart = [];
      renderCartBadge();
    } else if (status === "failure") {
      showToast("El pago no se completó. Podés intentar de nuevo.");
    } else if (status === "pending") {
      showToast("Tu pago está pendiente de aprobación.");
    }

    params.delete("payment");
    const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", newUrl);
  }

  el.paymentResultClose.addEventListener("click", () => el.paymentResultModalBackdrop.classList.remove("open"));

  // ---------------- Hero CTA / bottom tabs ----------------
  let tabLockUntil = 0;
  const BOTTOM_TABS = [el.bottomTabInicio, el.bottomTabMenu, el.bottomTabCart, el.bottomTabLocal];

  function setActiveBottomTab(tab) {
    BOTTOM_TABS.forEach((btn) => btn.classList.toggle("active", btn === tab));
    el.bottomTabs.style.setProperty("--tab-index", Math.max(0, BOTTOM_TABS.indexOf(tab)));
  }

  function syncBottomTab() {
    if (document.querySelector(".modal-backdrop.open")) return;
    if (performance.now() < tabLockUntil) return;
    const heroH = el.heroBanner ? el.heroBanner.offsetHeight : 400;
    setActiveBottomTab(window.scrollY > heroH * 0.6 ? el.bottomTabMenu : el.bottomTabInicio);
  }

  function lockTabs(ms = 900) {
    tabLockUntil = performance.now() + ms;
  }

  if (el.heroCta) {
    el.heroCta.addEventListener("click", () => {
      haptic(8);
      lockTabs();
      setActiveBottomTab(el.bottomTabMenu);
      el.categoryTabs.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  el.bottomTabInicio.addEventListener("click", () => {
    haptic(6);
    lockTabs();
    setActiveBottomTab(el.bottomTabInicio);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  el.bottomTabMenu.addEventListener("click", () => {
    haptic(6);
    lockTabs();
    setActiveBottomTab(el.bottomTabMenu);
    window.scrollTo({ top: Math.max(0, el.categoryTabs.offsetTop - 8), behavior: "smooth" });
  });
  el.bottomTabCart.addEventListener("click", () => {
    haptic(6);
    openCartModal();
  });
  el.bottomTabLocal.addEventListener("click", () => {
    haptic(6);
    setActiveBottomTab(el.bottomTabLocal);
    const phone = waNumber(state.catalog?.whatsappNumber);
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
    setTimeout(syncBottomTab, 700);
  });
  el.cartPill.addEventListener("click", () => {
    haptic(6);
    openCartModal();
  });

  // ---------------- Animaciones y comportamiento tipo app ----------------
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let revealObserver = null;
  function setupReveal() {
    if (revealObserver) revealObserver.disconnect();
    const nodes = Array.from(el.catalog.querySelectorAll(".product-card, .section-header"));
    nodes.forEach((n) => n.classList.add("reveal"));

    const show = (node, animate) => {
      if (!animate) node.classList.add("no-anim");
      node.classList.add("in");
      if (node.dataset.pid) state.seenProducts.add(node.dataset.pid);
      const done = () => {
        node.style.transitionDelay = "";
        node.classList.add("done");
      };
      if (animate) node.addEventListener("transitionend", done, { once: true });
      else done();
    };

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => show(n, false));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.style.transitionDelay = `${Math.min(order, 5) * 70}ms`;
          order++;
          show(entry.target, true);
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    nodes.forEach((n) => {
      if (n.dataset.pid && state.seenProducts.has(n.dataset.pid)) show(n, false);
      else revealObserver.observe(n);
    });
  }

  function setupImageFades() {
    el.catalog.querySelectorAll(".product-thumb").forEach((img) => {
      const ok = () => img.classList.add("loaded");
      const fail = () => {
        // Si falta la miniatura, se prueba con la foto completa antes de darla por rota.
        const full = img.dataset.full;
        if (full && img.getAttribute("src") !== full) {
          img.src = full;
          return;
        }
        img.removeAttribute("src");
        img.classList.add("loaded", "failed");
        img.closest(".thumb-wrap")?.classList.add("is-failed");
      };
      if (img.complete) {
        img.naturalWidth ? ok() : fail();
      } else {
        img.addEventListener("load", ok, { once: true });
        img.addEventListener("error", fail, { once: !img.dataset.full });
      }
    });
    const heroImg = document.querySelector(".hero-image");
    if (heroImg) {
      const ok = () => heroImg.classList.add("loaded");
      if (heroImg.complete) ok();
      else heroImg.addEventListener("load", ok, { once: true });
    }
  }

  let spyLockUntil = 0;
  let activeCategoryTab = null;
  function setActiveCategoryTab(tab) {
    if (!tab || tab === activeCategoryTab) return;
    activeCategoryTab = tab;
    el.categoryTabs.querySelectorAll(".category-tab").forEach((b) => b.classList.toggle("active", b === tab));
    const left = tab.offsetLeft - (el.categoryTabs.clientWidth - tab.offsetWidth) / 2;
    el.categoryTabs.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  let lastSpyAt = 0;
  let lastHeroP = -1;

  function updateScrollState() {
    // Lecturas primero y escrituras después: mezclarlas obliga al navegador a recalcular el
    // diseño varias veces por cuadro y es lo que hace que el scroll dé tirones.
    const y = window.scrollY;
    const heroH = el.heroBanner ? el.heroBanner.offsetHeight : 400;
    const stickyTop = el.miniHeader.offsetHeight || 64;
    const slotTop = el.categoryTabsSlot.getBoundingClientRect().top;

    const now = performance.now();
    let spyTab;
    if (state.catalog && now > spyLockUntil && now - lastSpyAt > 120) {
      lastSpyAt = now;
      const line = stickyTop + el.categoryTabs.offsetHeight + 24;
      let current = null;
      el.catalog.querySelectorAll(".category-section").forEach((sec) => {
        if (sec.getBoundingClientRect().top <= line) current = sec;
      });
      const tabs = el.categoryTabs.querySelectorAll(".category-tab");
      spyTab = current ? Array.from(tabs).find((t) => t.dataset.target === current.id) : tabs[0];
    }

    el.miniHeader.classList.toggle("visible", y > heroH - 60);

    // El efecto del hero solo importa mientras se ve: pasado el hero no se vuelve a tocar.
    if (el.heroBanner && !prefersReducedMotion) {
      const p = Math.min(1, Math.max(0, y / heroH));
      const rounded = Number(p.toFixed(3));
      if (rounded !== lastHeroP) {
        lastHeroP = rounded;
        el.heroBanner.style.setProperty("--p", rounded.toFixed(3));
      }
    }

    el.categoryTabs.classList.toggle("stuck", y > 0 && slotTop <= stickyTop);
    if (spyTab !== undefined) setActiveCategoryTab(spyTab);

    syncBottomTab();
  }

  function setupScrollEffects() {
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          updateScrollState();
          ticking = false;
        });
      },
      { passive: true }
    );
    const syncMiniHeight = () =>
      document.documentElement.style.setProperty("--mini-h", `${el.miniHeader.offsetHeight}px`);
    window.addEventListener("resize", () => {
      syncMiniHeight();
      measureTabsSlot();
      updateScrollState();
    });
    syncMiniHeight();
    updateScrollState();
  }

  function setupSheets() {
    const backdrops = document.querySelectorAll(".modal-backdrop");

    backdrops.forEach((backdrop) => {
      const modal = backdrop.querySelector(".modal");
      if (!modal) return;

      const handle = document.createElement("div");
      handle.className = "sheet-handle";
      handle.setAttribute("aria-hidden", "true");
      modal.prepend(handle);

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.remove("open");
      });

      let startY = 0;
      let dy = 0;
      let startTime = 0;
      let armed = false;
      let dragging = false;

      modal.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          startY = e.touches[0].clientY;
          startTime = Date.now();
          dy = 0;
          dragging = false;
          armed = modal.scrollTop <= 0;
        },
        { passive: true }
      );

      modal.addEventListener(
        "touchmove",
        (e) => {
          if (!armed) return;
          const delta = e.touches[0].clientY - startY;
          if (!dragging) {
            if (delta > 10 && modal.scrollTop <= 0) {
              dragging = true;
              modal.classList.add("dragging");
            } else if (delta < -4) {
              armed = false;
              return;
            } else {
              return;
            }
          }
          dy = Math.max(0, delta);
          modal.style.transform = `translateY(${dy}px)`;
          backdrop.style.background = `rgba(10, 6, 5, ${0.72 * (1 - Math.min(1, dy / 420))})`;
          if (e.cancelable) e.preventDefault();
        },
        { passive: false }
      );

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        modal.classList.remove("dragging");
        const velocity = dy / Math.max(1, Date.now() - startTime);
        const shouldClose = dy > 110 || (velocity > 0.6 && dy > 40);
        modal.style.transform = "";
        backdrop.style.background = "";
        if (shouldClose) {
          haptic(6);
          backdrop.classList.remove("open");
        }
        dy = 0;
      };
      modal.addEventListener("touchend", endDrag);
      modal.addEventListener("touchcancel", endDrag);
    });

    const syncOpenState = () => {
      const anyOpen = !!document.querySelector(".modal-backdrop.open");
      document.body.classList.toggle("modal-open", anyOpen);
      if (el.cartModalBackdrop.classList.contains("open")) setActiveBottomTab(el.bottomTabCart);
      else if (!anyOpen) syncBottomTab();
    };
    const observer = new MutationObserver(syncOpenState);
    backdrops.forEach((b) => observer.observe(b, { attributes: true, attributeFilter: ["class"] }));
  }

  setupSheets();
  setupScrollEffects();

  renderCartBadge();
  loadCatalog();
  handlePaymentReturn();
})();
