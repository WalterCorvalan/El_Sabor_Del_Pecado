// Catálogo inicial. Se usa para "sembrar" Netlify Blobs la primera vez que corre el sitio
// (antes de que el admin cargue sus propios datos).
// Ojo: esto SOLO se usa si Blobs todavía no tiene ningún catálogo guardado. Si el
// sitio ya está en producción con datos cargados, cambiar este archivo no actualiza
// el catálogo en vivo — eso se edita siempre desde /admin.html.
// Los precios en 0 están pendientes de cargar.

const IMG_SANDWICH =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80";
const IMG_PLATO =
  "https://images.unsplash.com/photo-1544510808-984e5f10e1f3?auto=format&fit=crop&w=900&q=80";
const IMG_EMPANADA =
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80";
const IMG_DIP =
  "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=900&q=80";

const GUARNICIONES = [
  "Batatas en cubos al horno",
  "Papas españolas",
  "Puré de boniato",
  "Puré de papas con hierbas"
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

function coccionVariant() {
  return {
    id: "coccion",
    name: "Cocción",
    multiple: false,
    required: true,
    options: ["Soufle", "Al horno"]
  };
}

function product(id, name, description, image, variants = []) {
  return { id, name, description, price: 0, image, variants };
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
            IMG_SANDWICH
          ),
          product(
            "sandwich-pollo-funghi",
            "Pollo al Funghi",
            "Pechugas de pollo doradas y desmechadas en salsa de champiñones, portobellos, verdeo, manteca y crema.",
            IMG_SANDWICH
          ),
          product(
            "sandwich-bondiola-barbacoa",
            "Bondiola a la Barbacoa",
            "Bondiola marinada y cocida en reducción de cerveza negra, ajo, salsa barbacoa y rub seco de pimentón.",
            IMG_SANDWICH
          ),
          product(
            "sandwich-osobuco-malbec",
            "Osobuco al Malbec",
            "Osobuco al disco cocido en vino Malbec, entre cebollas, zanahoria, ajo, apio, pimentón y caldo de verduras, desmechado.",
            IMG_SANDWICH
          ),
          product(
            "sandwich-bondiola-honey-mustard",
            "Bondiola Honey Mustard",
            "Bondiola cocida a baja temperatura durante varias horas con cebollas caramelizadas, mostaza, miel y finas hierbas.",
            IMG_SANDWICH
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
            IMG_PLATO,
            [guarnicionVariant()]
          ),
          product(
            "plato-pollo-funghi",
            "Pollo al Funghi",
            "Pollo deshuesado dorado en salsa de champiñones, portobellos, verdeo, manteca y crema. Guarnición a elección.",
            IMG_PLATO,
            [guarnicionVariant()]
          ),
          product(
            "plato-bondiola-barbacoa",
            "Bondiola a la Barbacoa",
            "Rodajas de bondiola marinada y cocida en reducción de cerveza negra, ajo, salsa barbacoa y rub seco de pimentón. Guarnición a elección.",
            IMG_PLATO,
            [guarnicionVariant()]
          ),
          product(
            "plato-osobuco-malbec",
            "Osobuco al Malbec",
            "Rodajas de osobuco al disco cocido en vino Malbec, entre cebollas, zanahoria, ajo, apio, pimentón y caldo de verduras. Guarnición a elección.",
            IMG_PLATO,
            [guarnicionVariant()]
          ),
          product(
            "plato-bondiola-honey-mustard",
            "Bondiola Honey Mustard",
            "Rodajas de bondiola cocida a baja temperatura durante varias horas con cebollas caramelizadas, mostaza, miel y finas hierbas. Guarnición a elección.",
            IMG_PLATO,
            [guarnicionVariant()]
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
            IMG_EMPANADA,
            [coccionVariant()]
          ),
          product(
            "empanada-pollo-funghi",
            "Empanada de Pollo al Funghi",
            "Empanada gourmet de pollo al funghi.",
            IMG_EMPANADA,
            [coccionVariant()]
          ),
          product(
            "empanada-bondiola-barbacoa",
            "Empanada de Bondiola a la Barbacoa",
            "Empanada gourmet de bondiola a la barbacoa.",
            IMG_EMPANADA,
            [coccionVariant()]
          ),
          product(
            "empanada-osobuco-malbec",
            "Empanada de Osobuco al Malbec",
            "Empanada gourmet de osobuco al Malbec.",
            IMG_EMPANADA,
            [coccionVariant()]
          ),
          product(
            "empanada-bondiola-honey-mustard",
            "Empanada de Bondiola Honey Mustard",
            "Empanada gourmet de bondiola honey mustard.",
            IMG_EMPANADA,
            [coccionVariant()]
          )
        ]
      },
      {
        id: "dips",
        name: "Dips de Salsas",
        products: [
          product("dip-glase-miel-mostaza", "Glase de miel y mostaza", "Dip de glase de miel y mostaza.", IMG_DIP),
          product("dip-barbacoa", "Barbacoa", "Dip de salsa barbacoa.", IMG_DIP),
          product("dip-mayo-tabasco", "Mayo aliñada al Tabasco", "Dip de mayonesa aliñada al Tabasco.", IMG_DIP),
          product("dip-honey-mustard", "Honey Mustard", "Dip de honey mustard.", IMG_DIP),
          product("dip-alioli-ciboulette", "Alioli con ciboulette", "Dip de alioli con ciboulette.", IMG_DIP)
        ]
      },
      {
        id: "bebidas",
        name: "Bebidas",
        products: [
          product(
            "coca-cola",
            "Coca-Cola",
            "Línea Coca-Cola.",
            "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=80",
            [
              {
                id: "variedad",
                name: "Variedad",
                multiple: false,
                required: true,
                options: ["Coca-Cola", "Coca-Cola Zero", "Sprite", "Fanta"]
              }
            ]
          ),
          product(
            "cerveza",
            "Cerveza",
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
            ]
          )
        ]
      }
    ]
  };
}

module.exports = { defaultCatalog };
