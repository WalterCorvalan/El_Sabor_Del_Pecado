// Reglas de negocio compartidas: las usan la tienda (navegador) y las funciones del
// servidor (Node), para que horarios, costo de envío y precios salgan siempre iguales.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Rules = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Argentina no tiene horario de verano: UTC-3 todo el año.
  const TZ_OFFSET_MIN = -180;
  const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const DELIVERY = "Envío a domicilio";
  const MAX_QTY = 50;
  const MAX_ITEMS = 50;

  function toMinutes(hhmm) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  function argentinaNow(now) {
    const d = new Date((now || new Date()).getTime() + TZ_OFFSET_MIN * 60000);
    return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }

  // ---------------- Horarios ----------------
  // catalog.schedule = { enabled, days: [{ open, from, to } x7] } (0 = domingo).
  // Si "to" es menor o igual que "from", el horario pasa de medianoche (ej. 20:00 a 01:00).
  function dayRange(schedule, dayIndex) {
    const d = schedule && Array.isArray(schedule.days) ? schedule.days[dayIndex] : null;
    if (!d || !d.open) return null;
    const from = toMinutes(d.from);
    const to = toMinutes(d.to);
    if (from === null || to === null) return null;
    return { from, to, overnight: to <= from, fromText: d.from, toText: d.to };
  }

  function nextOpeningText(schedule, today, minutes) {
    for (let offset = 0; offset <= 7; offset++) {
      const dayIndex = (today + offset) % 7;
      const range = dayRange(schedule, dayIndex);
      if (!range) continue;
      if (offset === 0 && range.from <= minutes) continue;
      const when = offset === 0 ? "hoy" : offset === 1 ? "mañana" : `el ${DAY_NAMES[dayIndex]}`;
      return `${when} a las ${range.fromText}`;
    }
    return "";
  }

  // -> { open, reason: "manual" | "schedule" | null, nextOpen, closesAt }
  function storeStatus(catalog, now) {
    if (!catalog) return { open: true, reason: null };
    if (catalog.storeOpen === false) return { open: false, reason: "manual" };

    const schedule = catalog.schedule;
    if (!schedule || !schedule.enabled) return { open: true, reason: null };

    const { day, minutes } = argentinaNow(now);
    const today = dayRange(schedule, day);
    const yesterday = dayRange(schedule, (day + 6) % 7);

    if (today) {
      if (!today.overnight && minutes >= today.from && minutes < today.to) {
        return { open: true, reason: null, closesAt: today.toText };
      }
      if (today.overnight && minutes >= today.from) {
        return { open: true, reason: null, closesAt: today.toText };
      }
    }
    if (yesterday && yesterday.overnight && minutes < yesterday.to) {
      return { open: true, reason: null, closesAt: yesterday.toText };
    }

    return { open: false, reason: "schedule", nextOpen: nextOpeningText(schedule, day, minutes) };
  }

  // ---------------- Envío ----------------
  // catalog.delivery = { enabled, fee, freeFrom, zones: [{ id, name, fee }] }
  function deliveryConfig(catalog) {
    const d = (catalog && catalog.delivery) || {};
    return {
      enabled: !!d.enabled,
      fee: Number(d.fee) > 0 ? Number(d.fee) : 0,
      freeFrom: Number(d.freeFrom) > 0 ? Number(d.freeFrom) : 0,
      zones: Array.isArray(d.zones) ? d.zones.filter((z) => z && z.id && z.name) : []
    };
  }

  // -> { enabled, fee, free, zone, needsZone }
  function deliveryFee(catalog, subtotal, zoneId) {
    const cfg = deliveryConfig(catalog);
    if (!cfg.enabled) return { enabled: false, fee: 0, free: false, zone: null, needsZone: false };

    let zone = null;
    let fee = cfg.fee;
    if (cfg.zones.length) {
      zone = cfg.zones.find((z) => z.id === zoneId) || null;
      if (!zone) return { enabled: true, fee: 0, free: false, zone: null, needsZone: true };
      fee = Number(zone.fee) > 0 ? Number(zone.fee) : 0;
    }

    const free = cfg.freeFrom > 0 && subtotal >= cfg.freeFrom;
    return { enabled: true, fee: free ? 0 : fee, free, zone, needsZone: false };
  }

  // ---------------- Tiempo estimado ----------------
  // catalog.prepTime = { pickup: "20-30", delivery: "40-50" } (minutos, texto libre corto)
  const DEFAULT_PREP = { pickup: "20-30", delivery: "40-50" };

  function prepEstimate(catalog, shipping) {
    const p = (catalog && catalog.prepTime) || {};
    const key = shipping === DELIVERY ? "delivery" : "pickup";
    const value = typeof p[key] === "string" && p[key].trim() ? p[key].trim() : DEFAULT_PREP[key];
    return value;
  }

  // ---------------- Promo por cantidad (ej. docena de empanadas) ----------------
  // category.bundle = { enabled, size, price }: cada "size" unidades de la categoría se cobran
  // "price" en total. Cuenta juntas las unidades de todos los productos de la categoría
  // (mezcladas como quieras) y el resto sigue al precio normal.
  function bundleConfig(category) {
    const b = category && category.bundle;
    if (!b || !b.enabled) return null;
    const size = Math.floor(Number(b.size));
    const price = Number(b.price);
    if (!Number.isFinite(size) || size < 2 || !Number.isFinite(price) || price <= 0) return null;
    return { size, price };
  }

  function bundleLabel(group) {
    return group.size === 12 ? "docena" : `pack de ${group.size}`;
  }

  // lines: [{ productId, qty, price }] (price = precio de una unidad)
  // -> { discount, groups: [{ categoryId, name, size, price, units, packs, saved, missing }] }
  function bundleDiscount(catalog, lines) {
    const owner = new Map();
    for (const category of catalog.categories || []) {
      if (!bundleConfig(category)) continue;
      for (const product of category.products || []) owner.set(product.id, category);
    }

    const byCategory = new Map();
    for (const line of lines || []) {
      const category = owner.get(line.productId);
      if (!category) continue;
      const entry = byCategory.get(category.id) || { category, units: [] };
      for (let i = 0; i < Number(line.qty); i++) entry.units.push(Number(line.price));
      byCategory.set(category.id, entry);
    }

    let discount = 0;
    const groups = [];
    for (const { category, units } of byCategory.values()) {
      const { size, price } = bundleConfig(category);
      units.sort((a, b) => a - b);
      const packs = Math.floor(units.length / size);
      let saved = 0;
      if (packs > 0) {
        const regular = units.slice(0, packs * size).reduce((sum, u) => sum + u, 0);
        saved = Math.max(0, regular - packs * price);
      }
      const remainder = units.length % size;
      groups.push({
        categoryId: category.id,
        name: category.name,
        size,
        price,
        units: units.length,
        packs,
        saved,
        missing: remainder === 0 ? 0 : size - remainder
      });
      discount += saved;
    }
    return { discount, groups };
  }

  // ---------------- Precios ----------------
  function cleanText(value, max) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
  }

  // Recalcula el pedido con el catálogo real: nunca se confía en los precios del cliente.
  // lines: [{ productId, qty, selections: [{groupName, values}], extraIds, notes }]
  // opts: { shipping, zoneId }
  // -> { ok: true, items, subtotal, deliveryFee, zone, total } | { ok: false, error }
  function priceOrder(catalog, lines, opts) {
    if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_ITEMS) {
      return { ok: false, error: "El carrito está vacío o es inválido" };
    }

    const products = new Map();
    const hiddenIds = new Set();
    const categoryOf = new Map();
    for (const category of catalog.categories || []) {
      for (const product of category.products || []) {
        products.set(product.id, product);
        categoryOf.set(product.id, category);
        if (category.hidden) hiddenIds.add(product.id);
      }
    }

    const items = [];
    let subtotal = 0;

    for (const line of lines) {
      const product = products.get(line && line.productId);
      if (!product) return { ok: false, error: "Hay un producto que ya no está en el menú" };
      if (product.available === false) return { ok: false, error: `${product.name} está agotado` };
      // Las categorías ocultas (por ejemplo, promos todavía no activadas) no se pueden pedir.
      if (hiddenIds.has(product.id)) return { ok: false, error: `${product.name} no está disponible por ahora` };

      const qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        return { ok: false, error: `Cantidad inválida para ${product.name}` };
      }

      const details = [];
      for (const s of Array.isArray(line.selections) ? line.selections : []) {
        const values = (Array.isArray(s && s.values) ? s.values : []).map((v) => cleanText(v, 60)).filter(Boolean);
        if (values.length) details.push(`${cleanText(s.groupName, 40)}: ${values.join(", ")}`);
      }

      const extrasIndex = new Map((product.extras || []).map((e) => [e.id, e]));
      const extraNames = [];
      let extrasTotal = 0;
      for (const extraId of Array.isArray(line.extraIds) ? line.extraIds : []) {
        const extra = extrasIndex.get(extraId);
        if (!extra) return { ok: false, error: `Un extra de ${product.name} ya no está disponible` };
        extrasTotal += Number(extra.price);
        extraNames.push(extra.name);
      }
      if (extraNames.length) details.push(`Extras: ${extraNames.join(", ")}`);

      const unitPrice = Number(product.price) + extrasTotal;
      subtotal += unitPrice * qty;
      items.push({
        productId: product.id,
        name: product.name,
        qty,
        price: unitPrice,
        details,
        notes: cleanText(line.notes, 200)
      });
    }

    // Promo por cantidad: el descuento se calcula acá, con los precios del catálogo.
    const bundle = bundleDiscount(catalog, items);
    const discountGroups = bundle.groups
      .filter((g) => g.saved > 0)
      .map((g) => ({ categoryId: g.categoryId, name: g.name, size: g.size, price: g.price, packs: g.packs, saved: g.saved }));
    for (const item of items) {
      const category = categoryOf.get(item.productId);
      if (category && discountGroups.some((g) => g.categoryId === category.id)) item.bundleKey = category.id;
    }
    const net = subtotal - bundle.discount;

    let fee = 0;
    let zone = null;
    if (opts && opts.shipping === DELIVERY) {
      const result = deliveryFee(catalog, net, opts.zoneId);
      if (result.needsZone) return { ok: false, error: "Elegí tu zona de entrega" };
      fee = result.fee;
      zone = result.zone ? { id: result.zone.id, name: result.zone.name } : null;
    }

    return {
      ok: true,
      items,
      subtotal,
      discount: bundle.discount,
      discountGroups,
      deliveryFee: fee,
      zone,
      total: net + fee
    };
  }

  return {
    DELIVERY,
    DAY_NAMES,
    toMinutes,
    storeStatus,
    deliveryConfig,
    deliveryFee,
    prepEstimate,
    bundleDiscount,
    bundleLabel,
    priceOrder
  };
});
