(() => {
  "use strict";

  const state = {
    catalog: null,
    cart: [], // { lineId, productId, categoryId, name, price, qty, selections: [{groupName, values:[]}] }
    expandedCategories: new Set()
  };

  const PRODUCTS_PREVIEW_COUNT = 2;

  function categoryIcon(category) {
    const key = `${category.id} ${category.name}`.toLowerCase();
    if (key.includes("empanada")) return "🥟";
    if (key.includes("bebida") || key.includes("gaseosa") || key.includes("cerveza")) return "🥤";
    if (key.includes("plato")) return "🍽️";
    if (key.includes("sandw") || key.includes("burger") || key.includes("hamburg")) return "🍔";
    return "🍴";
  }

  const el = {
    catalog: document.getElementById("catalog"),
    categoryTabs: document.getElementById("categoryTabs"),
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
  async function loadCatalog() {
    try {
      const res = await fetch("/api/catalog-get");
      if (!res.ok) throw new Error("No se pudo cargar el catálogo");
      state.catalog = await res.json();
      renderCategoryTabs();
      renderCatalog();
    } catch (err) {
      console.error(err);
      el.loadingState.textContent = "No pudimos cargar el menú. Probá recargar la página.";
    } finally {
      hideSplashScreen();
    }
  }

  function hideSplashScreen() {
    if (!el.splashScreen) return;
    el.splashScreen.classList.add("splash-hide");
    setTimeout(() => el.splashScreen.remove(), 500);
  }

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

    el.categoryTabs.querySelectorAll(".category-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.categoryTabs.querySelectorAll(".category-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderCatalog() {
    el.loadingState.remove();

    if (!state.catalog.categories.length) {
      el.catalog.innerHTML = '<div class="empty-state">Todavía no hay productos cargados.</div>';
      return;
    }

    el.catalog.innerHTML = state.catalog.categories
      .map((cat) => {
        const expanded = state.expandedCategories.has(cat.id);
        const visibleProducts = expanded ? cat.products : cat.products.slice(0, PRODUCTS_PREVIEW_COUNT);
        const cards = visibleProducts.map((p) => productCardHtml(cat, p)).join("");
        const showToggle = cat.products.length > PRODUCTS_PREVIEW_COUNT;

        return `
          <section class="category-section" id="${cat.id}">
            <div class="section-header">
              <h3>${escapeHtml(cat.name)}</h3>
              ${
                showToggle
                  ? `<button class="ver-todos" data-toggle-category="${cat.id}">${expanded ? "Ver menos" : "Ver todos"} ›</button>`
                  : ""
              }
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

    el.catalog.querySelectorAll("[data-toggle-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catId = btn.dataset.toggleCategory;
        if (state.expandedCategories.has(catId)) {
          state.expandedCategories.delete(catId);
        } else {
          state.expandedCategories.add(catId);
        }
        renderCatalog();
      });
    });

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

  function productCardHtml(category, product) {
    const img = product.image || "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80";
    return `
      <article class="product-card">
        <img class="product-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}" loading="lazy" />
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
            <button class="btn-add-sm" data-product-open data-category-id="${category.id}" data-product-id="${product.id}">
              Agregar
            </button>
          </div>
        </div>
      </article>
    `;
  }

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
            return `
              <label class="variant-option" for="${inputId}">
                <input type="${inputType}" id="${inputId}" name="variant-${variant.id}"
                  value="${escapeHtml(opt)}" data-variant-id="${variant.id}" data-variant-name="${escapeHtml(variant.name)}"
                  ${checkedFirst} />
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

    el.productModalBody.innerHTML = `
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

    addToCart(category, product, qty, selections, extras, notes);
    el.productModalBackdrop.classList.remove("open");
    showToast(`${product.name} agregado al carrito`);
  });

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

  function cartTotal() {
    return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function cartItemCount() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function renderCartBadge() {
    const count = cartItemCount();
    el.cartCount.textContent = count;
    el.miniCartCount.textContent = count;
    el.bottomCartCount.textContent = count;
    el.bottomCartCount.classList.toggle("hidden", count === 0);
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
    el.checkoutTotal.textContent = money(cartTotal());
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
      el.deliveryAddressField.classList.toggle("hidden", selectedShipping !== "Envío a domicilio");
    });
  });

  function buildOrderMessage(cart, total, contact, payment, extraNote) {
    const { name, phone, email, shipping, address } = contact;
    const lines = [];
    lines.push("¡Hola! Quiero hacer un pedido 🔥");
    lines.push("");
    lines.push("*Pedido:*");
    cart.forEach((item) => {
      const selectionsText = lineDetailsText(item);
      lines.push(`- ${item.qty}x ${item.name}${selectionsText ? ` (${selectionsText})` : ""} — ${money(item.price * item.qty)}`);
    });
    lines.push("");
    lines.push(`*Total: ${money(total)}*`);
    lines.push("");
    lines.push(`*Nombre:* ${name}`);
    lines.push(`*Teléfono:* ${phone}`);
    if (email) lines.push(`*Email:* ${email}`);
    lines.push(`*Entrega:* ${shipping}`);
    if (shipping === "Envío a domicilio") lines.push(`*Dirección:* ${address}`);
    lines.push(`*Medio de pago:* ${payment}`);
    if (extraNote) {
      lines.push("");
      lines.push(extraNote);
    }
    return lines.join("\n");
  }

  function openWhatsappWithMessage(message) {
    const encoded = encodeURIComponent(message);
    const phone = (state.catalog.whatsappNumber || "").replace(/\D/g, "");
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
    if (selectedShipping === "Envío a domicilio" && !address) {
      showToast("Ingresá una dirección de entrega");
      el.deliveryAddress.focus();
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

    el.resumenContact.innerHTML = `
      <div>${escapeHtml(name)}</div>
      <div>${escapeHtml(phone)}</div>
      ${email ? `<div>${escapeHtml(email)}</div>` : ""}
    `;

    el.resumenShipping.innerHTML = `
      <div>${escapeHtml(selectedShipping)}</div>
      ${selectedShipping === "Envío a domicilio" ? `<div>${escapeHtml(address)}</div>` : ""}
    `;

    el.resumenTotal.textContent = money(cartTotal());
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

  el.confirmResumen.addEventListener("click", async () => {
    const name = el.customerName.value.trim();
    const phone = el.customerPhone.value.trim();
    const email = el.customerEmail.value.trim();
    const address = selectedShipping === "Envío a domicilio" ? el.deliveryAddress.value.trim() : "Retiro en el local";
    const contact = { name, phone, email, shipping: selectedShipping, address };

    if (selectedPayment === "Mercado Pago") {
      el.confirmResumen.disabled = true;
      el.confirmResumen.textContent = "Iniciando pago...";
      try {
        const res = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: state.cart.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              selections: item.selections,
              extraIds: (item.extras || []).map((e) => e.id)
            })),
            address,
            phone
          })
        });
        const data = await res.json();

        if (!res.ok || !data.checkoutUrl) {
          showToast(data.error || "No se pudo iniciar el pago");
          el.confirmResumen.disabled = false;
          el.confirmResumen.textContent = "Confirmar pedido";
          return;
        }

        sessionStorage.setItem(
          PENDING_ORDER_KEY,
          JSON.stringify({ cart: state.cart, total: cartTotal(), contact })
        );
        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error(err);
        showToast("Error de conexión al iniciar el pago");
        el.confirmResumen.disabled = false;
        el.confirmResumen.textContent = "Confirmar pedido";
      }
      return;
    }

    const message = buildOrderMessage(state.cart, cartTotal(), contact, selectedPayment);
    openWhatsappWithMessage(message);
    el.resumenModalBackdrop.classList.remove("open");
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
        .join("") + `<div style="margin-top:8px;font-weight:800;">Total: ${money(pending.total)}</div>`;

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

  // ---------------- Mini header (aparece al bajar, el hero grande no queda fijo) ----------------
  function setupMiniHeaderScroll() {
    if (!el.heroBanner) return;
    let visible = false;
    const toggle = () => {
      const shouldShow = window.scrollY > el.heroBanner.offsetHeight - 60;
      if (shouldShow !== visible) {
        visible = shouldShow;
        el.miniHeader.classList.toggle("visible", visible);
      }
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  // ---------------- Hero CTA / bottom tabs ----------------
  if (el.heroCta) {
    el.heroCta.addEventListener("click", () => {
      el.categoryTabs.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function setActiveBottomTab(tab) {
    [el.bottomTabInicio, el.bottomTabMenu, el.bottomTabCart, el.bottomTabLocal].forEach((btn) => {
      if (btn) btn.classList.toggle("active", btn === tab);
    });
  }

  if (el.bottomTabInicio) {
    el.bottomTabInicio.addEventListener("click", () => {
      setActiveBottomTab(el.bottomTabInicio);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  if (el.bottomTabMenu) {
    el.bottomTabMenu.addEventListener("click", () => {
      setActiveBottomTab(el.bottomTabMenu);
      el.catalog.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (el.bottomTabCart) {
    el.bottomTabCart.addEventListener("click", () => {
      setActiveBottomTab(el.bottomTabCart);
      openCartModal();
    });
  }
  if (el.bottomTabLocal) {
    el.bottomTabLocal.addEventListener("click", () => {
      setActiveBottomTab(el.bottomTabLocal);
      const phone = (state.catalog?.whatsappNumber || "").replace(/\D/g, "");
      if (phone) window.open(`https://wa.me/${phone}`, "_blank");
    });
  }

  loadCatalog();
  handlePaymentReturn();
  setupMiniHeaderScroll();
})();
