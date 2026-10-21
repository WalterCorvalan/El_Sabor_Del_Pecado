// Catálogo inicial. Se usa para "sembrar" Vercel Blob la primera vez que corre el sitio
// (antes de que el admin cargue sus propios datos).
// Ojo: esto SOLO se usa si Blob todavía no tiene ningún catálogo guardado. Si el
// sitio ya está en producción con datos cargados, cambiar este archivo no actualiza
// el catálogo en vivo — eso se edita siempre desde /admin.html.
// Los precios son de referencia (placeholder) hasta que se carguen los reales.

const IMG_SANDWICH =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80";
const IMG_PLATO =
  "https://images.unsplash.com/photo-1544510808-984e5f10e1f3?auto=format&fit=crop&w=900&q=80";
const IMG_EMPANADA =
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80";
const GUARNICIONES = [
  "Batatas en cubos",
  "Puré de boniato",
  "Puré de papas especiado",
  "Papas españolas",
  "Papas bastón"
];

function guarnicionVariant() {
  return {
    id: "guarnicion",
    name: "Guarnición a elección",
    multiple: false,
    required: true,
    options: GUARNICIONES
  };
}

// Foto de cada pan, para mostrarla en las opciones del sándwich.
const PAN_IMAGES = {
  "Francés": "images/pan/frances.webp",
  "Criollo": "images/pan/criollo.webp",
  "Ciabatta": "images/pan/ciabatta.webp"
};

function panVariant() {
  return {
    id: "pan",
    name: "Tipo de pan",
    multiple: false,
    required: true,
    options: ["Francés", "Criollo", "Ciabatta"],
    optionImages: PAN_IMAGES
  };
}

function coccionVariant() {
  return {
    id: "coccion",
    name: "Cocción",
    multiple: false,
    required: true,
    options: ["Soufle", "Al horno"]
  };
}

function product(id, name, description, image, variants = [], price = 0, extras = []) {
  return { id, name, description, price, image, variants, extras };
}

// Datos de la cuenta de Mercado Pago a la que transfieren los clientes.
// Bebidas nuevas (Levité) y fotos/descripciones actualizadas de las gaseosas de 600 ml.
const LEVITE_PRICE = 2000;
const GASEOSA_PRICE = 2800;
const CERVEZA_PRICE = 4200;
const PLATO_PRICE = 25000;
const SANDWICH_NOTE = "incluye guarnición de papas españolas";
const PLATO_NOTE = "incluye guarnición a elección";
const EMPANADAS_NOTE = "la docena $33.000";
const LEVITE_PRODUCTS = [
  ["bebida-levite-pomelo", "Levité Pomelo", "images/menu/bebida-levite-pomelo.webp"],
  ["bebida-levite-manzana", "Levité Manzana Roja", "images/menu/bebida-levite-manzana.webp"]
];
const GASEOSAS_600 = {
  "bebida-coca-cola": "images/menu/bebida-coca-cola-v2.webp",
  "bebida-coca-cola-zero": "images/menu/bebida-coca-cola-zero-v2.webp",
  "bebida-sprite": "images/menu/bebida-sprite-v2.webp",
  "bebida-sprite-zero": "images/menu/bebida-sprite-zero-v2.webp"
};
const CERVEZAS_LATA = {
  "bebida-stella-artois": "images/menu/bebida-stella-artois-v2.webp",
  "bebida-heineken": "images/menu/bebida-heineken-v2.webp"
};
const LEVITE_DESCRIPTION = "Agua saborizada 500 ml, sin azúcares";

const TRANSFER_DATA = {
  transferAlias: "elsabordelpecado.mp",
  transferCvu: "0000003100090499845534",
  transferHolder: "Brenda Yanet Mereyro",
  paymentLink: "https://mpago.la/1cRgax9"
};

// Versión del menú inicial. Si el menú guardado tiene otra versión (por ejemplo, uno viejo que
// se guardó antes de que existieran las fotos y los precios actuales), catalog-get lo reemplaza
// UNA vez por el menú inicial, conservando los ajustes (WhatsApp, horarios, envío, etc.).
// Subir este número a propósito pisa los cambios hechos en el admin: solo hacerlo si se quiere eso.
const MENU_VERSION = 11;

function defaultCatalog() {
  return {
    menuVersion: MENU_VERSION,
    whatsappNumber: "5491159937311",
    prepTime: { pickup: "20-30", delivery: "40-50" },
    // Ajustes de entrega y pago. Todo apagado hasta que el dueño lo active desde el admin.
    pickup: { enabled: false },
    trackingEnabled: false,
    payment: { ...TRANSFER_DATA, mercadopagoEnabled: false },
    categories: [
      {
        id: "sandwiches",
        name: "Sándwiches",
        note: SANDWICH_NOTE,
        products: [
          product(
            "sandwich-vacio",
            "Vacío especial de autor",
            "Vacío de ternera horneado a lenta cocción en reducción de vino tinto desmechado con hortalizas de estación y hierbas aromáticas, y lluvia de queso provolone.",
            "images/menu/sandwich-vacio.webp",
            [panVariant()],
            22000
          ),
          product(
            "sandwich-pollo-funghi",
            "Pollo al Funghi",
            "Pechugas de pollo doradas y desmechadas en salsa de champiñones, portobellos, verdeo, manteca y crema.",
            "images/menu/sandwich-pollo-funghi.webp",
            [panVariant()],
            22000
          ),
          product(
            "sandwich-bondiola-barbacoa",
            "Bondiola a la Barbacoa",
            "Bondiola marinada y cocida en reducción de cerveza negra, ajo, salsa barbacoa y rub seco de pimentón.",
            "images/menu/sandwich-bondiola-barbacoa.webp",
            [panVariant()],
            22000
          ),
          product(
            "sandwich-osobuco-malbec",
            "Osobuco al Malbec",
            "Osobuco al disco cocido en vino Malbec, entre cebollas, zanahoria, ajo, apio, pimentón y caldo de verduras, desmechado.",
            "images/menu/sandwich-osobuco-malbec.webp",
            [panVariant()],
            22000
          ),
          product(
            "sandwich-bondiola-honey-mustard",
            "Bondiola Honey Mustard",
            "Bondiola cocida a baja temperatura durante varias horas con cebollas caramelizadas, mostaza, miel y finas hierbas.",
            "images/menu/sandwich-bondiola-honey-mustard.webp",
            [panVariant()],
            22000
          )
        ]
      },
      {
        id: "al-plato",
        name: "Al Plato",
        note: PLATO_NOTE,
        products: [
          product(
            "plato-vacio",
            "Vacío especial de autor",
            "Lonjas de vacío de ternera horneado a lenta cocción en reducción de vino tinto con hortalizas de estación y hierbas aromáticas. Guarnición a elección.",
            "images/menu/plato-vacio.webp",
            [guarnicionVariant()],
            25000
          ),
          product(
            "plato-pollo-funghi",
            "Pollo al Funghi",
            "Pollo deshuesado dorado en salsa de champiñones, portobellos, verdeo, manteca y crema. Guarnición a elección.",
            "images/menu/plato-pollo-funghi.webp",
            [guarnicionVariant()],
            25000
          ),
          product(
            "plato-bondiola-barbacoa",
            "Bondiola a la Barbacoa",
            "Rodajas de bondiola marinada y cocida en reducción de cerveza negra, ajo, salsa barbacoa y rub seco de pimentón. Guarnición a elección.",
            "images/menu/plato-bondiola-barbacoa.webp",
            [guarnicionVariant()],
            25000
          ),
          product(
            "plato-osobuco-malbec",
            "Osobuco al Malbec",
            "Rodajas de osobuco al disco cocido en vino Malbec, entre cebollas, zanahoria, ajo, apio, pimentón y caldo de verduras. Guarnición a elección.",
            "images/menu/plato-osobuco-malbec.webp",
            [guarnicionVariant()],
            25000
          ),
          product(
            "plato-bondiola-honey-mustard",
            "Bondiola Honey Mustard",
            "Rodajas de bondiola cocida a baja temperatura durante varias horas con cebollas caramelizadas, mostaza, miel y finas hierbas. Guarnición a elección.",
            "images/menu/plato-bondiola-honey-mustard.webp",
            [guarnicionVariant()],
            25000
          )
        ]
      },
      {
        id: "empanadas",
        name: "Empanadas Gourmet",
        note: EMPANADAS_NOTE,
        // Cada 12 empanadas (de cualquier gusto) se cobran $33.000 en vez de 12 x $3.000.
        bundle: { enabled: true, size: 12, price: 33000 },
        products: [
          product(
            "empanada-vacio",
            "Empanada de Vacío especial de autor",
            "Empanada gourmet de vacío especial de autor.",
            "images/menu/empanada-vacio.webp",
            [coccionVariant()],
            3000
          ),
          product(
            "empanada-pollo-funghi",
            "Empanada de Pollo al Funghi",
            "Empanada gourmet de pollo al funghi.",
            "images/menu/empanada-pollo-funghi.webp",
            [coccionVariant()],
            3000
          ),
          product(
            "empanada-bondiola-barbacoa",
            "Empanada de Bondiola a la Barbacoa",
            "Empanada gourmet de bondiola a la barbacoa.",
            "images/menu/empanada-bondiola-barbacoa.webp",
            [coccionVariant()],
            3000
          ),
          product(
            "empanada-osobuco-malbec",
            "Empanada de Osobuco al Malbec",
            "Empanada gourmet de osobuco al Malbec.",
            "images/menu/empanada-osobuco-malbec.webp",
            [coccionVariant()],
            3000
          ),
          product(
            "empanada-bondiola-honey-mustard",
            "Empanada de Bondiola Honey Mustard",
            "Empanada gourmet de bondiola honey mustard.",
            "images/menu/empanada-bondiola-honey-mustard.webp",
            [coccionVariant()],
            3000
          )
        ]
      },
      {
        id: "dips",
        name: "Dips de Salsas",
        products: [
          product("dip-glase-miel-mostaza", "Glase de miel y mostaza", "Dip de glase de miel y mostaza.", "images/menu/dip-glase-miel-mostaza.webp", [], 1500),
          product("dip-barbacoa", "Barbacoa", "Dip de salsa barbacoa.", "images/menu/dip-barbacoa.webp", [], 1500),
          product("dip-mayo-tabasco", "Mayo aliñada al Tabasco", "Dip de mayonesa aliñada al Tabasco.", "images/menu/dip-mayo-tabasco.webp", [], 1500),
          product("dip-honey-mustard", "Honey Mustard", "Dip de honey mustard.", "images/menu/dip-honey-mustard.webp", [], 1500),
          product("dip-alioli-ciboulette", "Alioli con ciboulette", "Dip de alioli con ciboulette.", "images/menu/dip-alioli-ciboulette.webp", [], 1500)
        ]
      },
      {
        id: "bebidas",
        name: "Bebidas",
        products: [
          product("bebida-levite-pomelo", "Levité Pomelo", LEVITE_DESCRIPTION, "images/menu/bebida-levite-pomelo.webp", [], LEVITE_PRICE),
          product("bebida-levite-manzana", "Levité Manzana Roja", LEVITE_DESCRIPTION, "images/menu/bebida-levite-manzana.webp", [], LEVITE_PRICE),
          product("bebida-coca-cola", "Coca-Cola", "Botella de 600 ml", "images/menu/bebida-coca-cola-v2.webp", [], GASEOSA_PRICE),
          product("bebida-coca-cola-zero", "Coca-Cola Zero", "Botella de 600 ml", "images/menu/bebida-coca-cola-zero-v2.webp", [], GASEOSA_PRICE),
          product("bebida-sprite", "Sprite", "Botella de 600 ml", "images/menu/bebida-sprite-v2.webp", [], GASEOSA_PRICE),
          product("bebida-sprite-zero", "Sprite Zero", "Botella de 600 ml", "images/menu/bebida-sprite-zero-v2.webp", [], GASEOSA_PRICE),
          product("bebida-stella-artois", "Stella Artois", "Lata de 330 ml", "images/menu/bebida-stella-artois-v2.webp", [], CERVEZA_PRICE),
          product("bebida-heineken", "Heineken", "Lata de 330 ml", "images/menu/bebida-heineken-v2.webp", [], CERVEZA_PRICE)
        ]
      },
      {
        id: "promos",
        name: "Promos",
        hidden: true,
        products: [
          product(
            "promo-combo-sandwich-dip-bebida",
            "Combo Sándwich + Dip + Bebida",
            "Un sándwich a elección, un dip y una bebida. (Ejemplo: editá el precio y activá la categoría Promos desde el admin.)",
            "",
            [
              {
                id: "sandwich",
                name: "Sándwich",
                multiple: false,
                required: true,
                options: ["Vacío especial de autor", "Pollo al Funghi", "Bondiola a la Barbacoa", "Osobuco al Malbec", "Bondiola Honey Mustard"]
              },
              {
                id: "dip",
                name: "Dip",
                multiple: false,
                required: true,
                options: ["Glase de miel y mostaza", "Barbacoa", "Mayo aliñada al Tabasco", "Honey Mustard", "Alioli con ciboulette"]
              },
              {
                id: "bebida",
                name: "Bebida",
                multiple: false,
                required: true,
                options: ["Levité Pomelo", "Levité Manzana Roja", "Coca-Cola", "Coca-Cola Zero", "Sprite", "Sprite Zero", "Stella Artois", "Heineken"]
              }
            ],
            0
          )
        ]
      }
    ]
  };
}

// Versión 2 -> 3: la empanada de vacío pasa a llamarse "especial de autor" y la docena deja de
// ser un producto aparte: ahora es un precio automático por cantidad en la categoría.
function patchToV3(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  const category = (c.categories || []).find((x) => x.id === "empanadas");
  if (category) {
    const vacio = category.products.find((p) => p.id === "empanada-vacio");
    if (vacio) {
      if (vacio.name === "Empanada de Vacío braseado al vino tinto") vacio.name = "Empanada de Vacío especial de autor";
      if (vacio.description === "Empanada gourmet de vacío braseado al vino tinto.") {
        vacio.description = "Empanada gourmet de vacío especial de autor.";
      }
    }
    const docena = category.products.find((p) => p.id === "empanada-docena");
    category.products = category.products.filter((p) => p.id !== "empanada-docena");
    if (!category.bundle) {
      category.bundle = { enabled: true, size: 12, price: docena && Number(docena.price) > 0 ? Number(docena.price) : 33000 };
    }
  }
  c.menuVersion = 3;
  return c;
}

// Versión 3 -> 4: las opciones de pan de los sándwiches pasan a mostrar su foto.
function patchToV4(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  for (const category of c.categories || []) {
    for (const product of category.products || []) {
      for (const variant of product.variants || []) {
        if (variant.id !== "pan" || variant.optionImages) continue;
        const images = {};
        for (const option of variant.options || []) if (PAN_IMAGES[option]) images[option] = PAN_IMAGES[option];
        if (Object.keys(images).length) variant.optionImages = images;
      }
    }
  }
  c.menuVersion = 4;
  return c;
}

// Versión 4 -> 5: sándwiches a $22.000 y sin extras; se agregan los ajustes de entrega y pago.
function patchToV5(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  const sandwiches = (c.categories || []).find((x) => x.id === "sandwiches");
  if (sandwiches) {
    for (const p of sandwiches.products || []) {
      p.price = 22000;
      p.extras = [];
    }
  }
  if (!c.pickup) c.pickup = { enabled: false };
  if (typeof c.trackingEnabled !== "boolean") c.trackingEnabled = false;
  if (!c.payment) c.payment = { transferAlias: "", transferHolder: "", mercadopagoEnabled: false };
  c.menuVersion = 5;
  return c;
}

// Versión 5 -> 6: el WhatsApp que recibe los pedidos pasa al número definitivo del local.
function patchToV6(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  c.whatsappNumber = "5491139033797";
  c.menuVersion = 6;
  return c;
}

// Versión 6 -> 7: el WhatsApp que recibe los pedidos pasa al número del negocio.
function patchToV7(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  c.whatsappNumber = "5491159937311";
  c.menuVersion = 7;
  return c;
}

// Versión 7 -> 8: se cargan los datos de transferencia si todavía no se habían completado.
function patchToV8(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  const payment = c.payment || {};
  if (!payment.transferAlias && !payment.transferCvu && !payment.paymentLink) {
    c.payment = { ...payment, ...TRANSFER_DATA, mercadopagoEnabled: payment.mercadopagoEnabled === true };
  }
  c.menuVersion = 8;
  return c;
}

// Versión 8 -> 9: se agregan las Levité y se actualizan fotos y descripciones de las gaseosas.
// No toca precios guardados; las Levité nuevas entran con el precio de referencia.
function patchToV9(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  const bebidas = (c.categories || []).find((x) => x.id === "bebidas");
  if (bebidas) {
    bebidas.products = bebidas.products || [];
    const nuevas = [];
    for (const [id, name, image] of LEVITE_PRODUCTS) {
      if (!bebidas.products.some((p) => p.id === id)) {
        nuevas.push(product(id, name, LEVITE_DESCRIPTION, image, [], LEVITE_PRICE));
      }
    }
    bebidas.products.unshift(...nuevas);
    for (const p of bebidas.products) {
      if (GASEOSAS_600[p.id]) {
        p.image = GASEOSAS_600[p.id];
        p.description = "Botella de 600 ml";
      }
    }
  }
  const promos = (c.categories || []).find((x) => x.id === "promos");
  for (const p of (promos && promos.products) || []) {
    for (const variant of p.variants || []) {
      if (variant.id !== "bebida") continue;
      const options = variant.options || [];
      const faltan = LEVITE_PRODUCTS.map(([, name]) => name).filter((name) => !options.includes(name));
      variant.options = [...faltan, ...options];
    }
  }
  c.menuVersion = 9;
  return c;
}

// Versión 9 -> 10: se saca la Fanta y las cervezas pasan a mostrar la lata de 330 ml.
// No toca precios guardados.
function patchToV10(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  const bebidas = (c.categories || []).find((x) => x.id === "bebidas");
  if (bebidas) {
    bebidas.products = (bebidas.products || []).filter((p) => p.id !== "bebida-fanta");
    for (const p of bebidas.products) {
      if (CERVEZAS_LATA[p.id]) {
        p.image = CERVEZAS_LATA[p.id];
        p.description = "Lata de 330 ml";
      }
    }
  }
  const promos = (c.categories || []).find((x) => x.id === "promos");
  for (const p of (promos && promos.products) || []) {
    for (const variant of p.variants || []) {
      if (variant.id === "bebida") variant.options = (variant.options || []).filter((o) => o !== "Fanta");
    }
  }
  c.menuVersion = 10;
  return c;
}

// Versión 10 -> 11: precios nuevos de bebidas (gaseosas, cervezas y Levité) y de los platos,
// y aclaraciones al lado del título de sándwiches, platos y empanadas.
function patchToV11(stored) {
  const c = JSON.parse(JSON.stringify(stored));
  const priceById = {
    "bebida-coca-cola": GASEOSA_PRICE,
    "bebida-coca-cola-zero": GASEOSA_PRICE,
    "bebida-sprite": GASEOSA_PRICE,
    "bebida-sprite-zero": GASEOSA_PRICE,
    "bebida-stella-artois": CERVEZA_PRICE,
    "bebida-heineken": CERVEZA_PRICE,
    "bebida-levite-pomelo": LEVITE_PRICE,
    "bebida-levite-manzana": LEVITE_PRICE
  };
  const notes = { sandwiches: SANDWICH_NOTE, "al-plato": PLATO_NOTE, empanadas: EMPANADAS_NOTE };
  for (const category of c.categories || []) {
    if (notes[category.id]) category.note = notes[category.id];
    for (const p of category.products || []) {
      if (category.id === "bebidas" && priceById[p.id] !== undefined) p.price = priceById[p.id];
      if (category.id === "al-plato") p.price = PLATO_PRICE;
    }
  }
  c.menuVersion = 11;
  return c;
}

// Ajustes que no son del menú y se conservan al reemplazar el menú guardado.
function migrateCatalog(stored) {
  if (stored && stored.menuVersion >= 2 && stored.menuVersion < MENU_VERSION) {
    let c = stored;
    if (c.menuVersion === 2) c = patchToV3(c);
    if (c.menuVersion === 3) c = patchToV4(c);
    if (c.menuVersion === 4) c = patchToV5(c);
    if (c.menuVersion === 5) c = patchToV6(c);
    if (c.menuVersion === 6) c = patchToV7(c);
    if (c.menuVersion === 7) c = patchToV8(c);
    if (c.menuVersion === 8) c = patchToV9(c);
    if (c.menuVersion === 9) c = patchToV10(c);
    if (c.menuVersion === 10) c = patchToV11(c);
    return c;
  }
  const fresh = defaultCatalog();
  if (!stored) return fresh;

  // El WhatsApp del menú inicial es el definitivo del local: no se reemplaza por uno viejo.
  if (typeof stored.storeOpen === "boolean") fresh.storeOpen = stored.storeOpen;
  if (typeof stored.closedMessage === "string") fresh.closedMessage = stored.closedMessage;
  if (stored.schedule) fresh.schedule = stored.schedule;
  if (stored.delivery) fresh.delivery = stored.delivery;
  if (stored.prepTime) fresh.prepTime = stored.prepTime;
  if (stored.pickup) fresh.pickup = stored.pickup;
  if (typeof stored.trackingEnabled === "boolean") fresh.trackingEnabled = stored.trackingEnabled;
  if (stored.payment) fresh.payment = stored.payment;
  return fresh;
}

module.exports = { defaultCatalog, migrateCatalog, MENU_VERSION };
