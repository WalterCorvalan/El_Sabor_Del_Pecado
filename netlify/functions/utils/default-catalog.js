// Catálogo inicial. Se usa para "sembrar" Netlify Blobs la primera vez que corre el sitio
// (antes de que el admin cargue sus propios datos).
// Ojo: esto SOLO se usa si Blobs todavía no tiene ningún catálogo guardado. Si el
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

function panVariant() {
  return {
    id: "pan",
    name: "Tipo de pan",
    multiple: false,
    required: true,
    options: ["Francés", "Criollo", "Ciabatta"]
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

function gustosVariant() {
  return {
    id: "gustos",
    name: "Gustos (elegí los que quieras)",
    multiple: true,
    required: true,
    options: [
      "Vacío braseado al vino tinto",
      "Pollo al Funghi",
      "Bondiola a la Barbacoa",
      "Osobuco al Malbec",
      "Bondiola Honey Mustard"
    ]
  };
}

function product(id, name, description, image, variants = [], price = 0, extras = []) {
  return { id, name, description, price, image, variants, extras };
}

function sandwichExtras() {
  return [
    { id: "extra-panceta", name: "Panceta extra", price: 800 },
    { id: "extra-doble-queso", name: "Doble queso", price: 600 },
    { id: "extra-huevo", name: "Huevo", price: 500 },
    { id: "extra-salsa-especial", name: "Salsa especial", price: 300 }
  ];
}

function defaultCatalog() {
  return {
    whatsappNumber: "5491122334455",
    categories: [
      {
        id: "sandwiches",
        name: "Sándwiches",
        products: [
          product(
            "sandwich-vacio",
            "Vacío especial de autor",
            "Vacío de ternera horneado a lenta cocción en reducción de vino tinto desmechado con hortalizas de estación y hierbas aromáticas, y lluvia de queso provolone.",
            "images/menu/sandwich-vacio.webp",
            [panVariant()],
            22000,
            sandwichExtras()
          ),
          product(
            "sandwich-pollo-funghi",
            "Pollo al Funghi",
            "Pechugas de pollo doradas y desmechadas en salsa de champiñones, portobellos, verdeo, manteca y crema.",
            "images/menu/sandwich-pollo-funghi.webp",
            [panVariant()],
            20000
          ),
          product(
            "sandwich-bondiola-barbacoa",
            "Bondiola a la Barbacoa",
            "Bondiola marinada y cocida en reducción de cerveza negra, ajo, salsa barbacoa y rub seco de pimentón.",
            "images/menu/sandwich-bondiola-barbacoa.webp",
            [panVariant()],
            18000
          ),
          product(
            "sandwich-osobuco-malbec",
            "Osobuco al Malbec",
            "Osobuco al disco cocido en vino Malbec, entre cebollas, zanahoria, ajo, apio, pimentón y caldo de verduras, desmechado.",
            "images/menu/sandwich-osobuco-malbec.webp",
            [panVariant()],
            20000
          ),
          product(
            "sandwich-bondiola-honey-mustard",
            "Bondiola Honey Mustard",
            "Bondiola cocida a baja temperatura durante varias horas con cebollas caramelizadas, mostaza, miel y finas hierbas.",
            "images/menu/sandwich-bondiola-honey-mustard.webp",
            [panVariant()],
            18000
          )
        ]
      },
      {
        id: "al-plato",
        name: "Al Plato",
        products: [
          product(
            "plato-vacio",
            "Vacío especial de autor",
            "Lonjas de vacío de ternera horneado a lenta cocción en reducción de vino tinto con hortalizas de estación y hierbas aromáticas. Guarnición a elección.",
            "images/menu/plato-vacio.webp",
            [guarnicionVariant()],
            22000
          ),
          product(
            "plato-pollo-funghi",
            "Pollo al Funghi",
            "Pollo deshuesado dorado en salsa de champiñones, portobellos, verdeo, manteca y crema. Guarnición a elección.",
            "images/menu/plato-pollo-funghi.webp",
            [guarnicionVariant()],
            22000
          ),
          product(
            "plato-bondiola-barbacoa",
            "Bondiola a la Barbacoa",
            "Rodajas de bondiola marinada y cocida en reducción de cerveza negra, ajo, salsa barbacoa y rub seco de pimentón. Guarnición a elección.",
            "images/menu/plato-bondiola-barbacoa.webp",
            [guarnicionVariant()],
            22000
          ),
          product(
            "plato-osobuco-malbec",
            "Osobuco al Malbec",
            "Rodajas de osobuco al disco cocido en vino Malbec, entre cebollas, zanahoria, ajo, apio, pimentón y caldo de verduras. Guarnición a elección.",
            "images/menu/plato-osobuco-malbec.webp",
            [guarnicionVariant()],
            22000
          ),
          product(
            "plato-bondiola-honey-mustard",
            "Bondiola Honey Mustard",
            "Rodajas de bondiola cocida a baja temperatura durante varias horas con cebollas caramelizadas, mostaza, miel y finas hierbas. Guarnición a elección.",
            "images/menu/plato-bondiola-honey-mustard.webp",
            [guarnicionVariant()],
            22000
          )
        ]
      },
      {
        id: "empanadas",
        name: "Empanadas Gourmet",
        products: [
          product(
            "empanada-vacio",
            "Empanada de Vacío braseado al vino tinto",
            "Empanada gourmet de vacío braseado al vino tinto.",
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
          ),
          product(
            "empanada-docena",
            "Docena de empanadas",
            "12 empanadas gourmet, mezcladas como quieras. Elegí los gustos y aclará en Observaciones cuántas querés de cada uno.",
            "images/menu/empanada-vacio.webp",
            [gustosVariant(), coccionVariant()],
            33000
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
          product(
            "coca-cola",
            "Gaseosas",
            "Gaseosa bien fría.",
            "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=80",
            [
              {
                id: "variedad",
                name: "Variedad",
                multiple: false,
                required: true,
                options: ["Coca-Cola", "Coca-Cola Zero", "Sprite", "Sprite Zero", "Fanta"]
              }
            ],
            2000
          ),
          product(
            "cerveza",
            "Cervezas",
            "Cerveza bien fría.",
            "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
            [
              {
                id: "marca",
                name: "Marca",
                multiple: false,
                required: true,
                options: ["Stella Artois", "Heineken"]
              }
            ],
            3000
          )
        ]
      }
    ]
  };
}

module.exports = { defaultCatalog };
