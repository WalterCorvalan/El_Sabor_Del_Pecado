(() => {
  "use strict";

  const TOKEN_KEY = "esdp_admin_token";
  const MAX_IMAGE_SIDE = 1000;
  const MAX_UPLOAD_BYTES = 2.4 * 1024 * 1024;

  let catalog = null;
  let token = sessionStorage.getItem(TOKEN_KEY) || null;
  let dirty = false;
  let filter = "";
  let activeTab = "pedidos";

  const openCats = new Set();
  const openProds = new Set();

  const $ = (id) => document.getElementById(id);
  const el = {
    loginScreen: $("loginScreen"),
    app: $("app"),
    password: $("adminPassword"),
    loginBtn: $("loginBtn"),
    loginMsg: $("loginMsg"),
    logoutBtn: $("logoutBtn"),
    tabs: $("tabs"),
    tabMenu: $("tabMenu"),
    tabAjustes: $("tabAjustes"),
    tabPedidos: $("tabPedidos"),
    tabStats: $("tabStats"),
    savebar: $("savebar"),
    saveBtn: $("saveBtn"),
    toast: $("toast")
  };

  // ---------------- Utilidades ----------------
  const ICONS = {
    chevron: '<path d="m9 5 7 7-7 7"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 18 5-5 3 3 3-3 3 3"/>'
  };

  function icon(name) {
    return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function slugify(str) {
    return (
      String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "categoria"
    );
  }

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function money(n) {
    return "$" + Number(n || 0).toLocaleString("es-AR");
  }

  let toastTimer = null;
  function toast(message, type = "") {
    el.toast.textContent = message;
    el.toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2800);
  }

  function markDirty() {
    dirty = true;
    el.savebar.classList.add("show");
    document.getElementById("savebarText").textContent = "Tenés cambios sin guardar";
  }

  function markSaved() {
    dirty = false;
    el.savebar.classList.remove("show");
  }

  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  function findCategory(id) {
    return catalog.categories.find((c) => c.id === id);
  }

  function findProduct(id) {
    for (const cat of catalog.categories) {
      const index = cat.products.findIndex((p) => p.id === id);
      if (index !== -1) return { cat, product: cat.products[index], index };
    }
    return null;
  }

  function move(array, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= array.length) return false;
    [array[index], array[target]] = [array[target], array[index]];
    return true;
  }

  // ---------------- Ingreso ----------------
  async function login() {
    const password = el.password.value;
    el.loginMsg.textContent = "";
    if (!password) {
      el.loginMsg.textContent = "Ingresá la contraseña";
      return;
    }
    el.loginBtn.disabled = true;
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        el.loginMsg.textContent = data.error || "No se pudo iniciar sesión";
        return;
      }
      token = data.token;
      sessionStorage.setItem(TOKEN_KEY, token);
      el.password.value = "";
      await enterPanel();
    } catch (err) {
      console.error(err);
      el.loginMsg.textContent = "Error de conexión";
    } finally {
      el.loginBtn.disabled = false;
    }
  }

  function logout(message) {
    token = null;
    stopOrdersPolling();
    knownOrderIds = null;
    ordersLoaded = false;
    sessionStorage.removeItem(TOKEN_KEY);
    el.app.classList.add("hidden");
    el.loginScreen.classList.remove("hidden");
    if (message) el.loginMsg.textContent = message;
  }

  el.loginBtn.addEventListener("click", login);
  el.password.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  el.logoutBtn.addEventListener("click", () => {
    if (dirty && !confirm("Tenés cambios sin guardar. ¿Salir igual?")) return;
    dirty = false;
    logout();
  });

  async function enterPanel() {
    el.loginScreen.classList.add("hidden");
    el.app.classList.remove("hidden");
    startOrdersPolling();
    await loadCatalog();
  }

  async function loadCatalog() {
    try {
      const res = await fetch("/api/catalog-get", { cache: "no-store" });
      if (!res.ok) throw new Error("catalog-get " + res.status);
      catalog = await res.json();
      if (catalog.categories.length && !openCats.size) openCats.add(catalog.categories[0].id);
      renderAll();
    } catch (err) {
      console.error(err);
      el.tabMenu.innerHTML = '<div class="empty-box">No se pudo cargar el menú. Recargá la página.</div>';
    }
  }

  // ---------------- Pestañas ----------------
  el.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    activeTab = btn.dataset.tab;
    el.tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
    el.tabMenu.classList.toggle("hidden", activeTab !== "menu");
    el.tabAjustes.classList.toggle("hidden", activeTab !== "ajustes");
    el.tabPedidos.classList.toggle("hidden", activeTab !== "pedidos");
    el.tabStats.classList.toggle("hidden", activeTab !== "stats");
    if (activeTab === "pedidos" || activeTab === "stats") loadOrders();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---------------- Render: menú ----------------
  function renderAll() {
    renderMenu();
    renderSettings();
  }

  function productMatches(product) {
    if (!filter) return true;
    return normalize(product.name).includes(filter) || normalize(product.description).includes(filter);
  }

  function renderMenu() {
    const totalProducts = catalog.categories.reduce((n, c) => n + c.products.length, 0);
    const parts = [];

    parts.push(`
      <div class="search">
        ${icon("search")}
        <input type="search" id="searchInput" placeholder="Buscar producto..." value="${esc(filterRaw)}" autocomplete="off" />
      </div>
      <p class="summary">${catalog.categories.length} categorías · ${totalProducts} productos</p>
    `);

    catalog.categories.forEach((cat, catIndex) => {
      const products = cat.products.filter(productMatches);
      if (filter && !products.length) return;
      const isOpen = filter ? true : openCats.has(cat.id);
      parts.push(`
        <section class="cat${isOpen ? " open" : ""}" data-cat="${esc(cat.id)}">
          <header class="cat-head">
            <button class="cat-toggle" type="button" data-action="toggle-cat" aria-label="Abrir o cerrar categoría">${icon("chevron")}</button>
            <input class="cat-name" type="text" data-cat-field="name" value="${esc(cat.name)}" aria-label="Nombre de la categoría" />
            <span class="count">${cat.products.length}</span>
            <div class="cat-tools">
              <button class="icon-btn" type="button" data-action="cat-up" ${catIndex === 0 ? "disabled" : ""} aria-label="Subir categoría">${icon("up")}</button>
              <button class="icon-btn" type="button" data-action="cat-down" ${catIndex === catalog.categories.length - 1 ? "disabled" : ""} aria-label="Bajar categoría">${icon("down")}</button>
              <button class="icon-btn danger" type="button" data-action="cat-delete" aria-label="Eliminar categoría">${icon("trash")}</button>
            </div>
          </header>
          <div class="cat-body">
            ${products.map((p) => productHtml(cat, p)).join("") || '<div class="empty-box">Todavía no hay productos en esta categoría.</div>'}
            <button class="btn btn-ghost btn-block" type="button" data-action="prod-add">${icon("plus")} Agregar producto</button>
          </div>
        </section>
      `);
    });

    if (!filter) {
      parts.push(`
        <div class="add-row">
          <input type="text" id="newCategoryName" placeholder="Nombre de una nueva categoría" />
          <button class="btn btn-red" type="button" data-action="cat-add">${icon("plus")} Categoría</button>
        </div>
      `);
    } else if (!catalog.categories.some((c) => c.products.some(productMatches))) {
      parts.push('<div class="empty-box">No hay productos que coincidan con la búsqueda.</div>');
    }

    el.tabMenu.innerHTML = parts.join("");
  }

  let filterRaw = "";

  function productHtml(cat, product) {
    const isOpen = openProds.has(product.id);
    const variants = product.variants || [];
    const extras = product.extras || [];
    const off = product.available === false;
    const meta = [money(product.price)];
    if (variants.length) meta.push(`${variants.length} ${variants.length === 1 ? "opción" : "opciones"}`);
    if (extras.length) meta.push(`${extras.length} ${extras.length === 1 ? "extra" : "extras"}`);

    const thumb = product.image
      ? `<img class="prod-thumb" src="${esc(product.image)}" alt="" loading="lazy" />`
      : `<div class="prod-thumb empty">${icon("image")}</div>`;

    const index = cat.products.indexOf(product);

    return `
      <article class="prod${isOpen ? " open" : ""}${off ? " is-off" : ""}" data-prod="${esc(product.id)}">
        <div class="prod-head" data-action="toggle-prod">
          ${thumb}
          <div class="prod-main">
            <span class="prod-title">${esc(product.name) || "Sin nombre"}<span class="off-tag">Agotado</span></span>
            <span class="prod-meta">${meta.join(" · ")}</span>
          </div>
          <label class="switch" data-stop title="Disponible">
            <input type="checkbox" data-field="available" ${off ? "" : "checked"} aria-label="Disponible" />
            <span class="slider"></span>
          </label>
          <span class="chev">${icon("chevron")}</span>
        </div>

        <div class="prod-body">
          <div class="field">
            <label>Nombre</label>
            <input type="text" data-field="name" value="${esc(product.name)}" />
          </div>

          <div class="grid-2">
            <div class="field">
              <label>Precio</label>
              <div class="price-input"><span>$</span><input type="text" inputmode="numeric" data-field="price" value="${esc(product.price)}" /></div>
            </div>
            <div class="field">
              <label class="switch"><input type="checkbox" data-field="available" ${off ? "" : "checked"} /><span class="slider"></span> Disponible</label>
            </div>
          </div>

          <div class="field">
            <label>Descripción</label>
            <textarea rows="3" data-field="description">${esc(product.description || "")}</textarea>
          </div>

          <div class="field">
            <label>Foto</label>
            <div class="photo-row">
              ${
                product.image
                  ? `<img class="photo-preview" src="${esc(product.image)}" alt="" />`
                  : `<div class="photo-preview empty">${icon("image")}</div>`
              }
              <div class="photo-actions">
                <label class="btn btn-ghost btn-sm" style="cursor:pointer;">
                  ${icon("camera")} ${product.image ? "Cambiar foto" : "Subir foto"}
                  <input type="file" accept="image/*" data-action="upload" hidden />
                </label>
                ${product.image ? '<button class="btn btn-danger btn-sm" type="button" data-action="photo-remove">Quitar</button>' : ""}
                <span class="status"></span>
              </div>
            </div>
            <details class="link-input">
              <summary>Usar un link de internet</summary>
              <input type="text" data-field="image" value="${esc(product.image || "")}" placeholder="https://..." />
            </details>
          </div>

          <div class="block">
            <div class="block-head"><strong>Opciones a elegir</strong></div>
            <p class="block-hint">Por ejemplo el tipo de pan o la guarnición. El cliente elige una (o varias) antes de agregar.</p>
            ${variants.map((v) => variantHtml(v)).join("")}
            <div class="chips">
              <button class="chip" type="button" data-action="var-add">+ Opción nueva</button>
              <button class="chip" type="button" data-action="var-pan">+ Tipo de pan</button>
              <button class="chip" type="button" data-action="var-guarnicion">+ Guarnición</button>
            </div>
          </div>

          <div class="block">
            <div class="block-head"><strong>Extras con precio</strong></div>
            <p class="block-hint">Agregados opcionales que suman al precio (ej: Panceta extra $800).</p>
            ${extras.map((x) => extraHtml(x)).join("")}
            <div class="chips">
              <button class="chip" type="button" data-action="extra-add">+ Agregar extra</button>
            </div>
          </div>

          <div class="prod-actions">
            <button class="icon-btn" type="button" data-action="prod-up" ${index === 0 ? "disabled" : ""} aria-label="Subir producto">${icon("up")}</button>
            <button class="icon-btn" type="button" data-action="prod-down" ${index === cat.products.length - 1 ? "disabled" : ""} aria-label="Bajar producto">${icon("down")}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="prod-dup">${icon("copy")} Duplicar</button>
            <span class="spacer"></span>
            <button class="btn btn-danger btn-sm" type="button" data-action="prod-delete">${icon("trash")} Eliminar</button>
          </div>
        </div>
      </article>
    `;
  }

  function variantHtml(v) {
    return `
      <div class="variant" data-variant="${esc(v.id)}">
        <div class="field" style="margin-top:0;">
          <label>Nombre (lo que ve el cliente)</label>
          <input type="text" data-vfield="name" value="${esc(v.name)}" placeholder="Ej: Tipo de pan" />
        </div>
        <div class="field">
          <label>Opciones, separadas por coma</label>
          <input type="text" data-vfield="options" value="${esc((v.options || []).join(", "))}" placeholder="Francés, Criollo, Ciabatta" />
        </div>
        <div class="row">
          <label class="check"><input type="checkbox" data-vfield="required" ${v.required ? "checked" : ""} /> Obligatoria</label>
          <label class="check"><input type="checkbox" data-vfield="multiple" ${v.multiple ? "checked" : ""} /> Se pueden elegir varias</label>
          <span class="spacer"></span>
          <button class="icon-btn danger" type="button" data-action="var-delete" aria-label="Eliminar opción">${icon("trash")}</button>
        </div>
      </div>
    `;
  }

  function extraHtml(x) {
    return `
      <div class="extra" data-extra="${esc(x.id)}">
        <input type="text" data-efield="name" value="${esc(x.name)}" placeholder="Ej: Panceta extra" />
        <div class="price-input"><span>$</span><input type="text" inputmode="numeric" data-efield="price" value="${esc(x.price)}" /></div>
        <button class="icon-btn danger" type="button" data-action="extra-delete" aria-label="Eliminar extra">${icon("trash")}</button>
      </div>
    `;
  }

  // ---------------- Render: ajustes ----------------
  function renderSettings() {
    const open = catalog.storeOpen !== false;
    el.tabAjustes.innerHTML = `
      <div class="card">
        <h2>Pedidos</h2>
        <p class="hint">Si cerrás el local, el sitio muestra un aviso y no deja agregar productos ni confirmar pedidos.</p>
        <div class="field">
          <label class="switch"><input type="checkbox" id="storeOpen" ${open ? "checked" : ""} /><span class="slider"></span> <span id="storeOpenLabel">${open ? "Local abierto" : "Local cerrado"}</span></label>
        </div>
        <div class="field">
          <label for="closedMessage">Mensaje cuando está cerrado</label>
          <textarea id="closedMessage" rows="2" placeholder="Por el momento no estamos tomando pedidos. ¡Volvemos pronto!">${esc(catalog.closedMessage || "")}</textarea>
        </div>
      </div>

      ${scheduleCardHtml()}

      ${deliveryCardHtml()}

      <div class="card">
        <h2>WhatsApp del local</h2>
        <p class="hint">Número que recibe los pedidos. Solo dígitos, con código de país y sin el +. Ejemplo: 5491122334455</p>
        <div class="field">
          <input type="tel" inputmode="numeric" id="whatsappNumber" value="${esc(catalog.whatsappNumber || "")}" />
        </div>
        <a class="inline-link" id="whatsappTest" href="#" target="_blank" rel="noopener">Probar este número en WhatsApp</a>
      </div>

      <div class="card">
        <h2>Menú inicial</h2>
        <p class="hint">Vuelve el menú a la carta base con los productos, fotos y precios cargados de fábrica. <strong>Pisa todos los cambios que hayas hecho en el menú.</strong> Se conservan el WhatsApp y el estado del local.</p>
        <div class="field">
          <button class="btn btn-danger btn-sm" type="button" id="resetMenuBtn">Restaurar menú inicial</button>
        </div>
      </div>
    `;
    updateWhatsappLink();
  }

  function updateWhatsappLink() {
    const link = document.getElementById("whatsappTest");
    if (!link) return;
    const digits = String(catalog.whatsappNumber || "").replace(/\D/g, "");
    link.href = digits ? `https://wa.me/${digits}` : "#";
  }

  el.tabAjustes.addEventListener("input", (e) => {
    if (e.target.id === "whatsappNumber") {
      catalog.whatsappNumber = e.target.value.replace(/\D/g, "");
      updateWhatsappLink();
      markDirty();
    } else if (e.target.id === "closedMessage") {
      catalog.closedMessage = e.target.value;
      markDirty();
    }
  });

  el.tabAjustes.addEventListener("click", async (e) => {
    if (e.target.id !== "resetMenuBtn") return;
    if (!confirm("Esto reemplaza TODO el menú por la carta inicial y borra tus cambios. ¿Continuar?")) return;
    if (!confirm("Última confirmación: no se puede deshacer. ¿Restaurar el menú inicial?")) return;

    const btn = e.target;
    btn.disabled = true;
    try {
      const res = await fetch("/api/catalog-reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        logout("Tu sesión expiró, ingresá de nuevo");
        return;
      }
      if (!res.ok) {
        toast(data.error || "No se pudo restaurar el menú", "error");
        return;
      }
      catalog = data.catalog;
      openCats.clear();
      openProds.clear();
      if (catalog.categories.length) openCats.add(catalog.categories[0].id);
      markSaved();
      renderAll();
      toast("Menú restaurado. Ya está en el sitio", "ok");
    } catch (err) {
      console.error(err);
      toast("Error de conexión", "error");
    } finally {
      btn.disabled = false;
    }
  });

  el.tabAjustes.addEventListener("change", (e) => {
    if (e.target.id === "storeOpen") {
      catalog.storeOpen = e.target.checked;
      document.getElementById("storeOpenLabel").textContent = e.target.checked ? "Local abierto" : "Local cerrado";
      markDirty();
    }
  });

  // ---------------- Eventos del menú (delegados) ----------------
  el.tabMenu.addEventListener("input", (e) => {
    const target = e.target;

    if (target.id === "searchInput") {
      filterRaw = target.value;
      filter = normalize(target.value.trim());
      const caret = target.selectionStart;
      renderMenu();
      const input = document.getElementById("searchInput");
      input.focus();
      input.setSelectionRange(caret, caret);
      return;
    }

    const catEl = target.closest("[data-cat]");
    const prodEl = target.closest("[data-prod]");

    if (target.matches("[data-cat-field='name']") && catEl) {
      findCategory(catEl.dataset.cat).name = target.value;
      markDirty();
      return;
    }

    if (!prodEl) return;
    const found = findProduct(prodEl.dataset.prod);
    if (!found) return;
    const { product } = found;

    if (target.matches("[data-field]")) {
      const field = target.dataset.field;
      if (field === "available") return;
      if (field === "price") {
        const val = parseFloat(String(target.value).replace(/\./g, "").replace(",", "."));
        product.price = Number.isFinite(val) && val >= 0 ? val : 0;
      } else {
        product[field] = target.value;
      }
      if (field === "name") prodEl.querySelector(".prod-title").firstChild.textContent = target.value || "Sin nombre";
      if (field === "price" || field === "name") updateMeta(prodEl, product);
      if (field === "image") refreshPhoto(prodEl, product);
      markDirty();
      return;
    }

    const varEl = target.closest("[data-variant]");
    if (varEl && target.matches("[data-vfield]")) {
      const variant = product.variants.find((v) => v.id === varEl.dataset.variant);
      if (!variant) return;
      const field = target.dataset.vfield;
      if (field === "options") {
        variant.options = target.value.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (field === "name") {
        variant.name = target.value;
      } else {
        return;
      }
      markDirty();
      return;
    }

    const extraEl = target.closest("[data-extra]");
    if (extraEl && target.matches("[data-efield]")) {
      const extra = product.extras.find((x) => x.id === extraEl.dataset.extra);
      if (!extra) return;
      if (target.dataset.efield === "price") {
        const val = parseFloat(String(target.value).replace(/\./g, "").replace(",", "."));
        extra.price = Number.isFinite(val) && val >= 0 ? val : 0;
      } else {
        extra.name = target.value;
      }
      markDirty();
    }
  });

  el.tabMenu.addEventListener("change", (e) => {
    const target = e.target;
    const prodEl = target.closest("[data-prod]");
    if (!prodEl) return;
    const found = findProduct(prodEl.dataset.prod);
    if (!found) return;
    const { product } = found;

    if (target.matches("[data-field='available']")) {
      product.available = target.checked;
      prodEl.classList.toggle("is-off", !target.checked);
      prodEl.querySelectorAll("[data-field='available']").forEach((c) => (c.checked = target.checked));
      markDirty();
      return;
    }

    const varEl = target.closest("[data-variant]");
    if (varEl && target.matches("[data-vfield='required'], [data-vfield='multiple']")) {
      const variant = product.variants.find((v) => v.id === varEl.dataset.variant);
      if (variant) {
        variant[target.dataset.vfield] = target.checked;
        markDirty();
      }
      return;
    }

    if (target.matches("[data-action='upload']")) {
      const file = target.files && target.files[0];
      target.value = "";
      if (file) uploadPhoto(prodEl, product, file);
    }
  });

  el.tabMenu.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    if (actionEl.dataset.action === "upload") return;
    if (e.target.closest("[data-stop]")) return;

    const action = actionEl.dataset.action;
    const catEl = actionEl.closest("[data-cat]");
    const prodEl = actionEl.closest("[data-prod]");
    const cat = catEl ? findCategory(catEl.dataset.cat) : null;
    const found = prodEl ? findProduct(prodEl.dataset.prod) : null;
    const product = found ? found.product : null;

    switch (action) {
      case "toggle-cat": {
        if (openCats.has(cat.id)) openCats.delete(cat.id);
        else openCats.add(cat.id);
        catEl.classList.toggle("open", openCats.has(cat.id));
        return;
      }
      case "toggle-prod": {
        if (openProds.has(product.id)) openProds.delete(product.id);
        else openProds.add(product.id);
        prodEl.classList.toggle("open", openProds.has(product.id));
        return;
      }
      case "cat-up":
      case "cat-down": {
        const index = catalog.categories.indexOf(cat);
        if (move(catalog.categories, index, action === "cat-up" ? -1 : 1)) {
          markDirty();
          renderMenu();
        }
        return;
      }
      case "cat-delete": {
        const n = cat.products.length;
        const text = n
          ? `¿Eliminar la categoría "${cat.name}" y sus ${n} productos? No se puede deshacer.`
          : `¿Eliminar la categoría "${cat.name}"?`;
        if (!confirm(text)) return;
        catalog.categories.splice(catalog.categories.indexOf(cat), 1);
        markDirty();
        renderMenu();
        return;
      }
      case "cat-add": {
        const input = document.getElementById("newCategoryName");
        const name = input.value.trim();
        if (!name) {
          input.focus();
          toast("Escribí el nombre de la categoría");
          return;
        }
        const newCat = { id: `${slugify(name)}-${Date.now().toString(36)}`, name, products: [] };
        catalog.categories.push(newCat);
        openCats.add(newCat.id);
        markDirty();
        renderMenu();
        return;
      }
      case "prod-add": {
        const newProduct = { id: uid("producto"), name: "Nuevo producto", description: "", price: 0, image: "", available: true, variants: [], extras: [] };
        cat.products.push(newProduct);
        openCats.add(cat.id);
        openProds.add(newProduct.id);
        markDirty();
        renderMenu();
        const added = el.tabMenu.querySelector(`[data-prod="${newProduct.id}"]`);
        if (added) {
          added.scrollIntoView({ behavior: "smooth", block: "center" });
          const name = added.querySelector("[data-field='name']");
          name.focus();
          name.select();
        }
        return;
      }
      case "prod-up":
      case "prod-down": {
        if (move(found.cat.products, found.index, action === "prod-up" ? -1 : 1)) {
          markDirty();
          renderMenu();
          const moved = el.tabMenu.querySelector(`[data-prod="${product.id}"]`);
          if (moved) moved.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      case "prod-dup": {
        const copy = JSON.parse(JSON.stringify(product));
        copy.id = uid("producto");
        copy.name = `${product.name} (copia)`;
        (copy.variants || []).forEach((v) => (v.id = uid("variante")));
        (copy.extras || []).forEach((x) => (x.id = uid("extra")));
        found.cat.products.splice(found.index + 1, 0, copy);
        openProds.add(copy.id);
        markDirty();
        renderMenu();
        toast("Producto duplicado", "ok");
        return;
      }
      case "prod-delete": {
        if (!confirm(`¿Eliminar "${product.name}"? No se puede deshacer.`)) return;
        found.cat.products.splice(found.index, 1);
        openProds.delete(product.id);
        markDirty();
        renderMenu();
        return;
      }
      case "photo-remove": {
        product.image = "";
        markDirty();
        renderMenu();
        return;
      }
      case "var-add":
      case "var-pan":
      case "var-guarnicion": {
        product.variants = product.variants || [];
        const base = { id: uid("variante"), required: true, multiple: false };
        if (action === "var-pan") {
          product.variants.push({ ...base, name: "Tipo de pan", options: ["Francés", "Criollo", "Ciabatta"] });
        } else if (action === "var-guarnicion") {
          product.variants.push({
            ...base,
            name: "Guarnición a elección",
            options: ["Batatas en cubos al horno", "Papas españolas", "Puré de boniato", "Puré de papas con hierbas"]
          });
        } else {
          product.variants.push({ ...base, required: false, name: "Nueva opción", options: ["Opción 1", "Opción 2"] });
        }
        markDirty();
        renderMenu();
        return;
      }
      case "var-delete": {
        const varEl = actionEl.closest("[data-variant]");
        product.variants = product.variants.filter((v) => v.id !== varEl.dataset.variant);
        markDirty();
        renderMenu();
        return;
      }
      case "extra-add": {
        product.extras = product.extras || [];
        product.extras.push({ id: uid("extra"), name: "", price: 0 });
        markDirty();
        renderMenu();
        const rows = el.tabMenu.querySelectorAll(`[data-prod="${product.id}"] [data-extra] [data-efield='name']`);
        if (rows.length) rows[rows.length - 1].focus();
        return;
      }
      case "extra-delete": {
        const extraEl = actionEl.closest("[data-extra]");
        product.extras = product.extras.filter((x) => x.id !== extraEl.dataset.extra);
        markDirty();
        renderMenu();
        return;
      }
      default:
        return;
    }
  });

  function updateMeta(prodEl, product) {
    const meta = [money(product.price)];
    const variants = product.variants || [];
    const extras = product.extras || [];
    if (variants.length) meta.push(`${variants.length} ${variants.length === 1 ? "opción" : "opciones"}`);
    if (extras.length) meta.push(`${extras.length} ${extras.length === 1 ? "extra" : "extras"}`);
    prodEl.querySelector(".prod-meta").textContent = meta.join(" · ");
  }

  function refreshPhoto(prodEl, product) {
    const preview = prodEl.querySelector(".photo-preview");
    if (preview && preview.tagName === "IMG") preview.src = product.image || "";
    const thumb = prodEl.querySelector(".prod-thumb");
    if (thumb && thumb.tagName === "IMG") thumb.src = product.image || "";
  }

  // ---------------- Fotos: se achican en el celular antes de subir ----------------
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la imagen"));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  async function prepareImage(file) {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", 0.82);
    if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
    return blob;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function uploadPhoto(prodEl, product, file) {
    const status = prodEl.querySelector(".photo-actions .status");
    const setStatus = (text, type = "") => {
      status.textContent = text;
      status.className = `status ${type}`;
    };

    if (!file.type.startsWith("image/")) {
      setStatus("Elegí un archivo de imagen", "error");
      return;
    }

    setStatus("Preparando la foto...");
    try {
      const blob = await prepareImage(file);
      if (!blob) throw new Error("No se pudo procesar la imagen");
      if (blob.size > MAX_UPLOAD_BYTES) {
        setStatus("La foto sigue siendo muy pesada, probá con otra", "error");
        return;
      }

      setStatus("Subiendo...");
      const dataBase64 = await blobToBase64(blob);
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentType: blob.type, dataBase64 })
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        logout("Tu sesión expiró, ingresá de nuevo");
        return;
      }
      if (!res.ok) {
        setStatus(data.error || "No se pudo subir la foto", "error");
        return;
      }

      product.image = data.url;
      markDirty();
      renderMenu();
      toast("Foto subida. Recordá guardar los cambios", "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo subir la foto", "error");
    }
  }

  // ---------------- Guardar ----------------
  function validate() {
    for (const cat of catalog.categories) {
      if (!cat.name.trim()) return { message: "Hay una categoría sin nombre", cat };
      for (const p of cat.products) {
        if (!p.name.trim()) return { message: "Hay un producto sin nombre", cat, product: p };
        for (const v of p.variants || []) {
          if (!v.name.trim()) return { message: `"${p.name}": una opción no tiene nombre`, cat, product: p };
          if (!v.options.length) return { message: `"${p.name}": la opción "${v.name}" necesita al menos una alternativa`, cat, product: p };
        }
        for (const x of p.extras || []) {
          if (!x.name.trim()) return { message: `"${p.name}": hay un extra sin nombre`, cat, product: p };
        }
      }
    }
    if (!/^[0-9]{8,15}$/.test(String(catalog.whatsappNumber || ""))) {
      return { message: "El número de WhatsApp debe tener entre 8 y 15 dígitos", settings: true };
    }
    return null;
  }

  function showProblem(problem) {
    toast(problem.message, "error");
    if (problem.settings) {
      el.tabs.querySelector('[data-tab="ajustes"]').click();
      return;
    }
    el.tabs.querySelector('[data-tab="menu"]').click();
    if (problem.cat) openCats.add(problem.cat.id);
    if (problem.product) openProds.add(problem.product.id);
    filter = "";
    filterRaw = "";
    renderMenu();
    if (problem.product) {
      const node = el.tabMenu.querySelector(`[data-prod="${problem.product.id}"]`);
      if (node) setTimeout(() => node.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
  }

  el.saveBtn.addEventListener("click", async () => {
    const problem = validate();
    if (problem) {
      showProblem(problem);
      return;
    }

    el.saveBtn.disabled = true;
    el.saveBtn.textContent = "Guardando...";
    try {
      const res = await fetch("/api/catalog-save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(catalog)
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        logout("Tu sesión expiró, ingresá de nuevo");
        return;
      }
      if (!res.ok) {
        toast(data.error || "No se pudo guardar", "error");
        return;
      }
      markSaved();
      toast("Cambios guardados. Ya están en el sitio", "ok");
    } catch (err) {
      console.error(err);
      toast("Error de conexión al guardar", "error");
    } finally {
      el.saveBtn.disabled = false;
      el.saveBtn.textContent = "Guardar";
    }
  });

  // ---------------- Horarios y envío (ajustes) ----------------
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // se muestran de lunes a domingo
  const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  function defaultSchedule() {
    return {
      enabled: false,
      days: Array.from({ length: 7 }, () => ({ open: true, from: "19:00", to: "23:30" }))
    };
  }

  function defaultDelivery() {
    return { enabled: false, fee: 0, freeFrom: 0, zones: [] };
  }

  function ensureSchedule() {
    if (!catalog.schedule) catalog.schedule = defaultSchedule();
    return catalog.schedule;
  }

  function ensureDelivery() {
    if (!catalog.delivery) catalog.delivery = defaultDelivery();
    return catalog.delivery;
  }

  function parseMoney(value) {
    const val = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(val) && val >= 0 ? val : 0;
  }

  function scheduleCardHtml() {
    const schedule = catalog.schedule || defaultSchedule();
    const rows = DAY_ORDER.map((dayIndex) => {
      const d = schedule.days[dayIndex];
      return `
        <div class="sched-row" data-day="${dayIndex}">
          <label class="switch"><input type="checkbox" data-sched="open" ${d.open ? "checked" : ""} /><span class="slider"></span> <span class="sched-day">${DAY_LABELS[dayIndex]}</span></label>
          <div class="sched-times${d.open ? "" : " is-off"}">
            <input type="time" data-sched="from" value="${esc(d.from)}" aria-label="Abre" />
            <span>a</span>
            <input type="time" data-sched="to" value="${esc(d.to)}" aria-label="Cierra" />
          </div>
        </div>`;
    }).join("");

    return `
      <div class="card">
        <h2>Horarios</h2>
        <p class="hint">Si los activás, el sitio abre y cierra solo según estos horarios y fuera de horario muestra "Abrimos hoy a las 19:00". El interruptor "Local abierto" de arriba sigue mandando: si lo cerrás, queda cerrado aunque sea horario. Si el horario termina antes de la hora de apertura (ej. 20:00 a 01:00), cuenta hasta la madrugada siguiente. Hora de Argentina.</p>
        <div class="field">
          <label class="switch"><input type="checkbox" id="scheduleEnabled" ${schedule.enabled ? "checked" : ""} /><span class="slider"></span> <span id="scheduleEnabledLabel">${schedule.enabled ? "Horarios automáticos activados" : "Horarios automáticos desactivados"}</span></label>
        </div>
        <div class="sched${schedule.enabled ? "" : " is-disabled"}" id="scheduleDays">${rows}</div>
      </div>`;
  }

  function zoneRowHtml(zone) {
    return `
      <div class="extra" data-zone="${esc(zone.id)}">
        <input type="text" data-zfield="name" value="${esc(zone.name)}" placeholder="Ej: Centro" />
        <div class="price-input"><span>$</span><input type="text" inputmode="numeric" data-zfield="fee" value="${esc(zone.fee)}" /></div>
        <button class="icon-btn danger" type="button" data-zaction="delete" aria-label="Eliminar zona">${icon("trash")}</button>
      </div>`;
  }

  function deliveryCardHtml() {
    const delivery = catalog.delivery || defaultDelivery();
    return `
      <div class="card">
        <h2>Costo de envío</h2>
        <p class="hint">Opcional. Si lo activás, el costo se suma al total y al mensaje del pedido. Si lo dejás desactivado, el sitio sigue diciendo "Consultar zona y costo" y el envío se arregla por WhatsApp.</p>
        <div class="field">
          <label class="switch"><input type="checkbox" id="deliveryEnabled" ${delivery.enabled ? "checked" : ""} /><span class="slider"></span> <span id="deliveryEnabledLabel">${delivery.enabled ? "Cobrar envío activado" : "Cobrar envío desactivado"}</span></label>
        </div>
        <div id="deliveryFields" class="${delivery.enabled ? "" : "is-disabled"}">
          <div class="grid-2">
            <div class="field">
              <label for="deliveryFee">Costo de envío</label>
              <div class="price-input"><span>$</span><input type="text" inputmode="numeric" id="deliveryFee" value="${esc(delivery.fee)}" /></div>
            </div>
            <div class="field">
              <label for="deliveryFreeFrom">Gratis desde (0 = nunca)</label>
              <div class="price-input"><span>$</span><input type="text" inputmode="numeric" id="deliveryFreeFrom" value="${esc(delivery.freeFrom)}" /></div>
            </div>
          </div>
          <div class="field">
            <label>Zonas (opcional)</label>
            <p class="hint">Si cargás zonas, el cliente elige la suya y se cobra el costo de esa zona (el costo general de arriba no se usa).</p>
            <div class="zones" id="deliveryZones">${(delivery.zones || []).map(zoneRowHtml).join("")}</div>
            <button class="btn btn-ghost btn-sm" type="button" data-zaction="add">${icon("plus")} Agregar zona</button>
          </div>
        </div>
      </div>`;
  }

  el.tabAjustes.addEventListener("change", (e) => {
    const t = e.target;

    if (t.id === "scheduleEnabled") {
      ensureSchedule().enabled = t.checked;
      document.getElementById("scheduleEnabledLabel").textContent = t.checked
        ? "Horarios automáticos activados"
        : "Horarios automáticos desactivados";
      document.getElementById("scheduleDays").classList.toggle("is-disabled", !t.checked);
      markDirty();
      return;
    }

    if (t.matches("[data-sched]")) {
      const row = t.closest("[data-day]");
      const day = ensureSchedule().days[Number(row.dataset.day)];
      const field = t.dataset.sched;
      if (field === "open") {
        day.open = t.checked;
        row.querySelector(".sched-times").classList.toggle("is-off", !t.checked);
      } else {
        day[field] = t.value;
      }
      markDirty();
      return;
    }

    if (t.id === "deliveryEnabled") {
      ensureDelivery().enabled = t.checked;
      document.getElementById("deliveryEnabledLabel").textContent = t.checked
        ? "Cobrar envío activado"
        : "Cobrar envío desactivado";
      document.getElementById("deliveryFields").classList.toggle("is-disabled", !t.checked);
      markDirty();
    }
  });

  el.tabAjustes.addEventListener("input", (e) => {
    const t = e.target;

    if (t.id === "deliveryFee") {
      ensureDelivery().fee = parseMoney(t.value);
      markDirty();
    } else if (t.id === "deliveryFreeFrom") {
      ensureDelivery().freeFrom = parseMoney(t.value);
      markDirty();
    } else if (t.matches("[data-zfield]")) {
      const zone = ensureDelivery().zones.find((z) => z.id === t.closest("[data-zone]").dataset.zone);
      if (!zone) return;
      if (t.dataset.zfield === "fee") zone.fee = parseMoney(t.value);
      else zone.name = t.value;
      markDirty();
    }
  });

  el.tabAjustes.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-zaction]");
    if (!btn) return;
    const delivery = ensureDelivery();

    if (btn.dataset.zaction === "add") {
      delivery.zones.push({ id: uid("zona"), name: "", fee: 0 });
    } else {
      const id = btn.closest("[data-zone]").dataset.zone;
      delivery.zones = delivery.zones.filter((z) => z.id !== id);
    }
    markDirty();
    renderSettings();
  });

  // ---------------- Pedidos ----------------
  const STATUS_LABELS = {
    nuevo: "Nuevo",
    preparando: "Preparando",
    listo: "Listo",
    entregado: "Entregado",
    cancelado: "Cancelado"
  };
  const NEXT_STATUS = { nuevo: "preparando", preparando: "listo", listo: "entregado" };
  const NEXT_LABEL = { nuevo: "Empezar a preparar", preparando: "Marcar listo", listo: "Marcar entregado" };
  const ORDERS_POLL_MS = 20000;

  let orders = [];
  let ordersLoaded = false;
  let ordersFilter = "activos";
  let ordersTimer = null;
  let knownOrderIds = null;

  function startOrdersPolling() {
    stopOrdersPolling();
    loadOrders();
    ordersTimer = setInterval(() => {
      if (!document.hidden) loadOrders();
    }, ORDERS_POLL_MS);
  }

  function stopOrdersPolling() {
    clearInterval(ordersTimer);
    ordersTimer = null;
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.2, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.start(t0);
        osc.stop(t0 + 0.17);
      });
    } catch (_) {}
  }

  async function loadOrders() {
    if (!token) return;
    try {
      const res = await fetch("/api/orders-list", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        stopOrdersPolling();
        logout("Tu sesión expiró, ingresá de nuevo");
        return;
      }
      if (!res.ok) throw new Error("orders-list " + res.status);
      const data = await res.json();
      orders = data.orders || [];

      const ids = new Set(orders.map((o) => o.id));
      if (knownOrderIds) {
        const fresh = orders.filter((o) => !knownOrderIds.has(o.id) && o.status === "nuevo");
        if (fresh.length) {
          beep();
          toast(fresh.length === 1 ? `Pedido nuevo #${fresh[0].number}` : `${fresh.length} pedidos nuevos`, "ok");
        }
      }
      knownOrderIds = ids;
      ordersLoaded = true;
      renderOrders();
    } catch (err) {
      console.error(err);
      if (!ordersLoaded) {
        el.tabPedidos.innerHTML = '<div class="empty-box">No se pudieron cargar los pedidos. Probá de nuevo en un momento.</div>';
      }
    }
  }

  function orderTime(iso) {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function isActiveStatus(status) {
    return status === "nuevo" || status === "preparando" || status === "listo";
  }

  function updateOrdersBadge() {
    const count = orders.filter((o) => o.status === "nuevo").length;
    const badge = document.getElementById("ordersBadge");
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  }

  function orderHtml(order) {
    const isDelivery = order.shipping === "Envío a domicilio";
    const phoneDigits = String(order.customer?.phone || "").replace(/\D/g, "");
    const items = (order.items || [])
      .map(
        (item) => `
        <li>
          <strong>${esc(item.qty)}x ${esc(item.name)}</strong> <span class="o-price">${money(item.price * item.qty)}</span>
          ${(item.details || []).map((d) => `<div class="o-detail">${esc(d)}</div>`).join("")}
          ${item.notes ? `<div class="o-detail">Obs: ${esc(item.notes)}</div>` : ""}
        </li>`
      )
      .join("");

    const mpNote =
      order.payment === "Mercado Pago"
        ? '<div class="o-note">Pagó con Mercado Pago: confirmá el cobro en la app de Mercado Pago.</div>'
        : "";

    const next = NEXT_STATUS[order.status];
    const actions = [
      next ? `<button class="btn btn-gold btn-sm" type="button" data-oaction="status" data-status="${next}">${NEXT_LABEL[order.status]}</button>` : "",
      `<button class="btn btn-ghost btn-sm" type="button" data-oaction="print">Imprimir ticket</button>`,
      isActiveStatus(order.status)
        ? `<button class="btn btn-danger btn-sm" type="button" data-oaction="status" data-status="cancelado">Cancelar</button>`
        : ""
    ].join("");

    return `
      <article class="order st-${esc(order.status)}" data-order="${esc(order.id)}">
        <header class="order-head">
          <span class="order-num">#${esc(String(order.number).padStart(4, "0"))}</span>
          <span class="order-time">${esc(orderTime(order.createdAt))}</span>
          <span class="order-status">${esc(STATUS_LABELS[order.status] || order.status)}</span>
          <strong class="order-total">${money(order.total)}</strong>
        </header>
        <div class="order-who">
          <strong>${esc(order.customer?.name)}</strong>
          · <a href="tel:${esc(phoneDigits)}">${esc(order.customer?.phone)}</a>
          ${phoneDigits ? `· <a href="https://wa.me/${esc(phoneDigits)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        </div>
        <div class="order-ship">${isDelivery ? "Envío a domicilio" : "Retiro en local"}${order.zone ? ` (${esc(order.zone.name)})` : ""}${isDelivery ? ` — ${esc(order.address)}` : ""}</div>
        <ul class="order-items">${items}</ul>
        ${order.deliveryFee > 0 ? `<div class="o-detail">Envío: ${money(order.deliveryFee)}</div>` : ""}
        <div class="order-pay">Pago: <strong>${esc(order.payment)}</strong></div>
        ${mpNote}
        <div class="order-actions">${actions}</div>
      </article>`;
  }

  function renderOrders() {
    updateOrdersBadge();
    renderStats();
    const visible = ordersFilter === "activos" ? orders.filter((o) => isActiveStatus(o.status)) : orders;
    const activeCount = orders.filter((o) => isActiveStatus(o.status)).length;

    el.tabPedidos.innerHTML = `
      <div class="orders-bar">
        <div class="chips">
          <button type="button" class="chip${ordersFilter === "activos" ? " active" : ""}" data-ofilter="activos">Activos (${activeCount})</button>
          <button type="button" class="chip${ordersFilter === "todos" ? " active" : ""}" data-ofilter="todos">Todos (${orders.length})</button>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-oaction="refresh">Actualizar</button>
      </div>
      ${
        visible.length
          ? visible.map(orderHtml).join("")
          : `<div class="empty-box">${ordersFilter === "activos" ? "No hay pedidos activos." : "Todavía no hay pedidos."}</div>`
      }`;
  }

  el.tabPedidos.addEventListener("click", async (e) => {
    const filterBtn = e.target.closest("[data-ofilter]");
    if (filterBtn) {
      ordersFilter = filterBtn.dataset.ofilter;
      renderOrders();
      return;
    }

    const btn = e.target.closest("[data-oaction]");
    if (!btn) return;
    const action = btn.dataset.oaction;

    if (action === "refresh") {
      loadOrders();
      return;
    }

    const orderEl = btn.closest("[data-order]");
    const order = orders.find((o) => o.id === orderEl?.dataset.order);
    if (!order) return;

    if (action === "print") {
      document.getElementById("printArea").innerHTML = TicketPrinter.renderTicketHtml(order);
      window.print();
      return;
    }

    if (action === "status") {
      const status = btn.dataset.status;
      if (status === "cancelado" && !confirm(`¿Cancelar el pedido #${order.number}?`)) return;
      btn.disabled = true;
      try {
        const res = await fetch("/api/order-update", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: order.id, status })
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          logout("Tu sesión expiró, ingresá de nuevo");
          return;
        }
        if (!res.ok) {
          toast(data.error || "No se pudo actualizar el pedido", "error");
          btn.disabled = false;
          return;
        }
        order.status = status;
        renderOrders();
      } catch (err) {
        console.error(err);
        toast("Error de conexión", "error");
        btn.disabled = false;
      }
    }
  });

  // ---------------- Estadísticas ----------------
  // Se calculan con los pedidos guardados (los cancelados no cuentan).
  const STATS_PERIODS = [
    { id: "hoy", label: "Hoy" },
    { id: "7", label: "7 días" },
    { id: "30", label: "30 días" },
    { id: "todo", label: "Todo" }
  ];
  let statsPeriod = "7";

  function periodStart(period) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === "hoy") return d.getTime();
    if (period === "todo") return 0;
    d.setDate(d.getDate() - (Number(period) - 1));
    return d.getTime();
  }

  function barRow(label, value, max, text) {
    const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
    return `
      <div class="bar-row">
        <span class="bar-label">${esc(label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
        <span class="bar-value">${esc(text)}</span>
      </div>`;
  }

  function renderStats() {
    if (!el.tabStats) return;
    const start = periodStart(statsPeriod);
    const list = orders.filter((o) => o.status !== "cancelado" && new Date(o.createdAt).getTime() >= start);

    const revenue = list.reduce((sum, o) => sum + (o.total || 0), 0);
    const average = list.length ? Math.round(revenue / list.length) : 0;

    const products = new Map();
    const hours = new Array(24).fill(0);
    const payments = new Map();
    let deliveries = 0;
    for (const o of list) {
      for (const item of o.items || []) {
        products.set(item.name, (products.get(item.name) || 0) + item.qty);
      }
      hours[new Date(o.createdAt).getHours()] += 1;
      payments.set(o.payment, (payments.get(o.payment) || 0) + 1);
      if (o.shipping === "Envío a domicilio") deliveries += 1;
    }

    const topProducts = [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxProduct = topProducts.length ? topProducts[0][1] : 0;
    const activeHours = hours.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0);
    const maxHour = Math.max(0, ...hours);

    const chips = STATS_PERIODS.map(
      (p) => `<button type="button" class="chip${statsPeriod === p.id ? " active" : ""}" data-speriod="${p.id}">${p.label}</button>`
    ).join("");

    el.tabStats.innerHTML = `
      <div class="orders-bar"><div class="chips">${chips}</div></div>

      <div class="kpis">
        <div class="kpi"><span class="kpi-num">${list.length}</span><span class="kpi-label">Pedidos</span></div>
        <div class="kpi"><span class="kpi-num">${money(revenue)}</span><span class="kpi-label">Ventas</span></div>
        <div class="kpi"><span class="kpi-num">${money(average)}</span><span class="kpi-label">Ticket promedio</span></div>
      </div>

      ${
        list.length
          ? `
      <div class="card">
        <h2>Lo más pedido</h2>
        ${topProducts.map(([name, qty]) => barRow(name, qty, maxProduct, `${qty}`)).join("")}
      </div>

      <div class="card">
        <h2>Pedidos por hora</h2>
        ${activeHours.map((h) => barRow(`${String(h.hour).padStart(2, "0")} hs`, h.count, maxHour, `${h.count}`)).join("")}
      </div>

      <div class="card">
        <h2>Entrega y pago</h2>
        ${barRow("Envío a domicilio", deliveries, list.length, `${deliveries}`)}
        ${barRow("Retiro en local", list.length - deliveries, list.length, `${list.length - deliveries}`)}
        ${[...payments.entries()].map(([name, count]) => barRow(name, count, list.length, `${count}`)).join("")}
      </div>`
          : '<div class="empty-box">Todavía no hay pedidos en este período.</div>'
      }

      <p class="hint stats-note">Se calcula con los últimos 200 pedidos guardados. Las visitas al sitio todavía no se cuentan.</p>`;
  }

  el.tabStats.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-speriod]");
    if (!btn) return;
    statsPeriod = btn.dataset.speriod;
    renderStats();
  });

  // ---------------- Inicio ----------------
  if (token) {
    enterPanel().catch((err) => console.error(err));
  }
})();
