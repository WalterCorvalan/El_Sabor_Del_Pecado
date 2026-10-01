(() => {
  "use strict";

  const TOKEN_KEY = "esdp_admin_token";

  let catalog = null;
  let token = sessionStorage.getItem(TOKEN_KEY) || null;

  const el = {
    loginScreen: document.getElementById("loginScreen"),
    adminPanel: document.getElementById("adminPanel"),
    adminPassword: document.getElementById("adminPassword"),
    loginBtn: document.getElementById("loginBtn"),
    loginMsg: document.getElementById("loginMsg"),
    logoutBtn: document.getElementById("logoutBtn"),

    whatsappNumber: document.getElementById("whatsappNumber"),
    categoriesList: document.getElementById("categoriesList"),
    newCategoryName: document.getElementById("newCategoryName"),
    addCategoryBtn: document.getElementById("addCategoryBtn"),

    saveBtn: document.getElementById("saveBtn"),
    saveMsg: document.getElementById("saveMsg")
  };

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function slugify(str) {
    return (
      String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || uid("item")
    );
  }

  // ---------------- Auth ----------------
  async function login() {
    const password = el.adminPassword.value;
    el.loginMsg.textContent = "";
    if (!password) {
      el.loginMsg.textContent = "Ingresá la contraseña";
      return;
    }
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
      await enterPanel();
    } catch (err) {
      el.loginMsg.textContent = "Error de conexión";
      console.error(err);
    }
  }

  function logout() {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    el.adminPanel.classList.add("hidden");
    el.logoutBtn.classList.add("hidden");
    el.loginScreen.classList.remove("hidden");
  }

  el.loginBtn.addEventListener("click", login);
  el.adminPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  el.logoutBtn.addEventListener("click", logout);

  async function enterPanel() {
    el.loginScreen.classList.add("hidden");
    el.adminPanel.classList.remove("hidden");
    el.logoutBtn.classList.remove("hidden");
    await loadCatalog();
  }

  // ---------------- Carga de catálogo ----------------
  async function loadCatalog() {
    try {
      const res = await fetch("/api/catalog-get");
      catalog = await res.json();
      el.whatsappNumber.value = catalog.whatsappNumber || "";
      renderCategories();
    } catch (err) {
      console.error(err);
      el.saveMsg.textContent = "No se pudo cargar el catálogo";
      el.saveMsg.className = "admin-msg error";
    }
  }

  // ---------------- Render ----------------
  function renderCategories() {
    el.categoriesList.innerHTML = catalog.categories
      .map((cat, catIndex) => categoryHtml(cat, catIndex))
      .join("");

    bindCategoryEvents();
  }

  function categoryHtml(cat, catIndex) {
    const products = cat.products.map((p, pIndex) => productHtml(cat, catIndex, p, pIndex)).join("");
    return `
      <div class="admin-card" data-cat-index="${catIndex}">
        <div class="admin-row">
          <input type="text" class="cat-name-input" value="${escapeAttr(cat.name)}" data-cat-index="${catIndex}" />
          <button class="btn-danger btn-small" data-remove-category="${catIndex}">Eliminar categoría</button>
        </div>
        <div class="admin-grid" style="margin-top:12px;">${products || "<p style='color:#9e9e9e;'>Sin productos.</p>"}</div>
        <button class="btn-add" style="margin-top:10px;" data-add-product="${catIndex}">+ Agregar producto</button>
      </div>
    `;
  }

  function productHtml(cat, catIndex, product, pIndex) {
    const variants = (product.variants || [])
      .map((v, vIndex) => variantHtml(catIndex, pIndex, v, vIndex))
      .join("");

    return `
      <div class="admin-product" data-cat-index="${catIndex}" data-prod-index="${pIndex}">
        <div class="admin-row">
          <div>
            <label>Nombre</label>
            <input type="text" class="prod-name" value="${escapeAttr(product.name)}" />
          </div>
          <div>
            <label>Precio</label>
            <input type="text" inputmode="numeric" class="prod-price" value="${product.price}" />
          </div>
        </div>
        <div class="field" style="margin-top:8px;">
          <label>Descripción</label>
          <textarea rows="2" class="prod-desc">${escapeHtml(product.description || "")}</textarea>
        </div>
        <div class="field">
          <label>URL de la foto</label>
          <input type="text" class="prod-image" value="${escapeAttr(product.image || "")}" />
        </div>

        <div class="variant-admin">
          <strong style="color:var(--dorado);font-size:13px;">Variantes</strong>
          ${variants || "<p style='color:#9e9e9e;font-size:12px;'>Sin variantes.</p>"}
          <button class="btn-outline btn-small" style="margin-top:8px;" data-add-variant>+ Agregar variante</button>
        </div>

        <div class="admin-actions">
          <button class="btn-danger btn-small" data-remove-product>Eliminar producto</button>
        </div>
      </div>
    `;
  }

  function variantHtml(catIndex, pIndex, variant, vIndex) {
    return `
      <div class="variant-admin" style="border:1px dashed rgba(255,255,255,0.15);" data-variant-index="${vIndex}">
        <div class="admin-row">
          <div>
            <label>Nombre de la variante</label>
            <input type="text" class="variant-name" value="${escapeAttr(variant.name)}" />
          </div>
          <div>
            <label>Opciones (separadas por coma)</label>
            <input type="text" class="variant-options" value="${escapeAttr((variant.options || []).join(", "))}" />
          </div>
        </div>
        <div class="admin-row" style="align-items:center;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:6px;flex:none;">
            <input type="checkbox" class="variant-required" ${variant.required ? "checked" : ""} /> Obligatoria
          </label>
          <label style="display:flex;align-items:center;gap:6px;flex:none;">
            <input type="checkbox" class="variant-multiple" ${variant.multiple ? "checked" : ""} /> Selección múltiple
          </label>
          <button class="btn-danger btn-small" data-remove-variant style="flex:none;">Eliminar</button>
        </div>
      </div>
    `;
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
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ---------------- Eventos (delegados por categoría tras cada render) ----------------
  function bindCategoryEvents() {
    el.categoriesList.querySelectorAll(".cat-name-input").forEach((input) => {
      input.addEventListener("input", () => {
        catalog.categories[Number(input.dataset.catIndex)].name = input.value;
      });
    });

    el.categoriesList.querySelectorAll("[data-remove-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.removeCategory);
        if (confirm(`¿Eliminar la categoría "${catalog.categories[idx].name}" y todos sus productos?`)) {
          catalog.categories.splice(idx, 1);
          renderCategories();
        }
      });
    });

    el.categoriesList.querySelectorAll("[data-add-product]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.addProduct);
        catalog.categories[idx].products.push({
          id: uid("producto"),
          name: "Nuevo producto",
          description: "",
          price: 0,
          image: "",
          variants: []
        });
        renderCategories();
      });
    });

    el.categoriesList.querySelectorAll(".admin-product").forEach((card) => {
      const catIndex = Number(card.dataset.catIndex);
      const pIndex = Number(card.dataset.prodIndex);
      const product = catalog.categories[catIndex].products[pIndex];

      card.querySelector(".prod-name").addEventListener("input", (e) => (product.name = e.target.value));
      card.querySelector(".prod-desc").addEventListener("input", (e) => (product.description = e.target.value));
      card.querySelector(".prod-image").addEventListener("input", (e) => (product.image = e.target.value));
      card.querySelector(".prod-price").addEventListener("input", (e) => {
        const val = parseFloat(e.target.value.replace(",", "."));
        product.price = Number.isFinite(val) ? val : 0;
      });

      card.querySelector("[data-remove-product]").addEventListener("click", () => {
        if (confirm(`¿Eliminar "${product.name}"?`)) {
          catalog.categories[catIndex].products.splice(pIndex, 1);
          renderCategories();
        }
      });

      card.querySelector("[data-add-variant]").addEventListener("click", () => {
        product.variants = product.variants || [];
        product.variants.push({
          id: uid("variante"),
          name: "Nueva variante",
          required: false,
          multiple: false,
          options: ["Opción 1"]
        });
        renderCategories();
      });

      card.querySelectorAll(".variant-admin[data-variant-index]").forEach((vCard) => {
        const vIndex = Number(vCard.dataset.variantIndex);
        const variant = product.variants[vIndex];

        vCard.querySelector(".variant-name").addEventListener("input", (e) => (variant.name = e.target.value));
        vCard.querySelector(".variant-options").addEventListener("input", (e) => {
          variant.options = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        });
        vCard.querySelector(".variant-required").addEventListener("change", (e) => (variant.required = e.target.checked));
        vCard.querySelector(".variant-multiple").addEventListener("change", (e) => (variant.multiple = e.target.checked));

        vCard.querySelector("[data-remove-variant]").addEventListener("click", () => {
          product.variants.splice(vIndex, 1);
          renderCategories();
        });
      });
    });
  }

  el.addCategoryBtn.addEventListener("click", () => {
    const name = el.newCategoryName.value.trim();
    if (!name) return;
    catalog.categories.push({ id: slugify(name) + "-" + Date.now(), name, products: [] });
    el.newCategoryName.value = "";
    renderCategories();
  });

  // ---------------- Guardar ----------------
  el.saveBtn.addEventListener("click", async () => {
    catalog.whatsappNumber = el.whatsappNumber.value.trim();

    // Asegurar ids válidos en categorías/productos nuevos
    catalog.categories.forEach((cat) => {
      if (!cat.id) cat.id = slugify(cat.name);
      cat.products.forEach((p) => {
        if (!p.id) p.id = slugify(p.name) + "-" + Date.now();
      });
    });

    el.saveMsg.textContent = "Guardando...";
    el.saveMsg.className = "admin-msg";

    try {
      const res = await fetch("/api/catalog-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(catalog)
      });
      const data = await res.json();

      if (res.status === 401) {
        el.saveMsg.textContent = "Tu sesión expiró, volvé a ingresar la contraseña";
        el.saveMsg.className = "admin-msg error";
        logout();
        return;
      }

      if (!res.ok) {
        el.saveMsg.textContent = data.error || "No se pudo guardar";
        el.saveMsg.className = "admin-msg error";
        return;
      }

      el.saveMsg.textContent = "Catálogo guardado correctamente ✅";
      el.saveMsg.className = "admin-msg ok";
    } catch (err) {
      console.error(err);
      el.saveMsg.textContent = "Error de conexión al guardar";
      el.saveMsg.className = "admin-msg error";
    }
  });

  // ---------------- Init ----------------
  if (token) {
    enterPanel();
  }
})();
