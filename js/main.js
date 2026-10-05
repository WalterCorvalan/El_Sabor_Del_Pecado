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
    customerPhone: document.getElementById("customerPhone"),
    sendWhatsapp: document.getElementById("sendWhatsapp"),

    paymentResultModalBackdrop: document.getElementById("paymentResultModalBackdrop"),
    paymentResultTitle: document.getElementById("paymentResultTitle"),
    paymentResultSummary: document.getElementById("paymentResultSummary"),
    paymentResultMessage: document.getElementById("paymentResultMessage"),
    paymentResultWhatsapp: document.getElementById("paymentResultWhatsapp"),
    paymentResultClose: document.getElementById("paymentResultClose"),

    toast: document.getElementById("toast"),

    stickyCartBar: document.getElementById("stickyCartBar"),
    stickyCartCount: document.getElementById("stickyCartCount"),
    stickyCartTotal: document.getElementById("stickyCartTotal"),
    stickyCartItemsLabel: document.getElementById("stickyCartItemsLabel"),
    stickyCartIcon: document.getElementById("stickyCartIcon"),
    stickyCartOpen: document.getElementById("stickyCartOpen")
  };

  let selectedPayment = "Efectivo";
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
    }
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

    el.productModalBody.innerHTML = `
      ${variantsHtml}
      <div class="variant-group">
        <h4>Cantidad</h4>
        <div class="qty-control">
          <button type="button" id="modalQtyMinus">−</button>
          <span id="modalQtyValue">${currentProductContext.qty}</span>
          <button type="button" id="modalQtyPlus">+</button>
        </div>
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

    addToCart(category, product, qty, selections);
    el.productModalBackdrop.classList.remove("open");
    showToast(`${product.name} agregado al carrito`);
  });

  // ---------------- Carrito ----------------
  function addToCart(category, product, qty, selections) {
    const selectionsKey = JSON.stringify(selections);
    const existing = state.cart.find(
      (item) => item.productId === product.id && JSON.stringify(item.selections) === selectionsKey
    );

    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        lineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        categoryId: category.id,
        name: product.name,
        price: product.price,
        qty,
        selections
      });
    }
    renderCartBadge();
  }

  function removeFromCart(lineId) {
    state.cart = state.cart.filter((i) => i.lineId !== lineId);
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
    el.stickyCartCount.textContent = count;
    el.stickyCartTotal.textContent = money(cartTotal());
    el.stickyCartItemsLabel.textContent = `${count} item${count === 1 ? "" : "s"}`;
    el.stickyCartBar.classList.toggle("hidden", count === 0);
  }

  function renderCartModal() {
    if (!state.cart.length) {
      el.cartItems.innerHTML = '<div class="cart-empty">Tu carrito está vacío</div>';
    } else {
      el.cartItems.innerHTML = state.cart
        .map((item) => {
          const selectionsText = item.selections
            .map((s) => `${s.groupName}: ${s.values.join(", ")}`)
            .join(" · ");
          return `
            <div class="cart-item">
              <div class="cart-item-top">
                <strong>${item.qty}x ${escapeHtml(item.name)}</strong>
                <span>${money(item.price * item.qty)}</span>
              </div>
              ${selectionsText ? `<div class="cart-item-selections">${escapeHtml(selectionsText)}</div>` : ""}
              <div class="cart-item-bottom">
                <span style="color:#9e9e9e;font-size:12px;">${money(item.price)} c/u</span>
                <button class="cart-item-remove" data-remove="${item.lineId}">Quitar</button>
              </div>
            </div>
          `;
        })
        .join("");

      el.cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
      });
    }
    el.cartTotal.textContent = money(cartTotal());
  }

  function openCartModal() {
    renderCartModal();
    el.cartModalBackdrop.classList.add("open");
  }
  el.cartButton.addEventListener("click", openCartModal);
  el.stickyCartOpen.addEventListener("click", openCartModal);
  el.stickyCartIcon.addEventListener("click", openCartModal);
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
        const selectionsText = item.selections.map((s) => `${s.groupName}: ${s.values.join(", ")}`).join(" · ");
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

  function buildOrderMessage(cart, total, address, customerPhone, payment, extraNote) {
    const lines = [];
    lines.push("¡Hola! Quiero hacer un pedido 🔥");
    lines.push("");
    lines.push("*Pedido:*");
    cart.forEach((item) => {
      const selectionsText = (item.selections || [])
        .map((s) => `${s.groupName}: ${s.values.join(", ")}`)
        .join(" · ");
      lines.push(`- ${item.qty}x ${item.name}${selectionsText ? ` (${selectionsText})` : ""} — ${money(item.price * item.qty)}`);
    });
    lines.push("");
    lines.push(`*Total: ${money(total)}*`);
    lines.push("");
    lines.push(`*Dirección:* ${address}`);
    lines.push(`*Teléfono:* ${customerPhone}`);
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

  el.sendWhatsapp.addEventListener("click", async () => {
    const address = el.deliveryAddress.value.trim();
    const phone = el.customerPhone.value.trim();

    if (!address) {
      showToast("Ingresá una dirección de entrega");
      el.deliveryAddress.focus();
      return;
    }
    if (!phone) {
      showToast("Ingresá tu teléfono de contacto");
      el.customerPhone.focus();
      return;
    }
    if (!state.cart.length) {
      showToast("Tu carrito está vacío");
      return;
    }

    if (selectedPayment === "Mercado Pago") {
      el.sendWhatsapp.disabled = true;
      el.sendWhatsapp.textContent = "Iniciando pago...";
      try {
        const res = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: state.cart.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              selections: item.selections
            })),
            address,
            phone
          })
        });
        const data = await res.json();

        if (!res.ok || !data.checkoutUrl) {
          showToast(data.error || "No se pudo iniciar el pago");
          el.sendWhatsapp.disabled = false;
          el.sendWhatsapp.textContent = "Enviar pedido por WhatsApp";
          return;
        }

        sessionStorage.setItem(
          PENDING_ORDER_KEY,
          JSON.stringify({ cart: state.cart, total: cartTotal(), address, phone })
        );
        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error(err);
        showToast("Error de conexión al iniciar el pago");
        el.sendWhatsapp.disabled = false;
        el.sendWhatsapp.textContent = "Enviar pedido por WhatsApp";
      }
      return;
    }

    const message = buildOrderMessage(state.cart, cartTotal(), address, phone, selectedPayment);
    openWhatsappWithMessage(message);
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
          const selectionsText = (item.selections || []).map((s) => `${s.groupName}: ${s.values.join(", ")}`).join(" · ");
          return `<div>${item.qty}x ${escapeHtml(item.name)}${selectionsText ? " (" + escapeHtml(selectionsText) + ")" : ""} — ${money(item.price * item.qty)}</div>`;
        })
        .join("") + `<div style="margin-top:8px;font-weight:800;">Total: ${money(pending.total)}</div>`;

      el.paymentResultWhatsapp.onclick = () => {
        const message = buildOrderMessage(
          pending.cart,
          pending.total,
          pending.address,
          pending.phone,
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

  loadCatalog();
  handlePaymentReturn();
})();
