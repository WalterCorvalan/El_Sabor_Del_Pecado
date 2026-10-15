(() => {
  "use strict";

  const TOKEN_KEY = "esdp_admin_token";
  const MAX_IMAGE_SIDE = 1000;
  const MAX_UPLOAD_BYTES = 2.4 * 1024 * 1024;

  let catalog = null;
  let token = sessionStorage.getItem(TOKEN_KEY) || null;
  let dirty = false;
  let filter = "";
  let activeTab = "menu";

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

  // ---------------- Inicio ----------------
  if (token) {
    enterPanel().catch((err) => console.error(err));
  }
})();
