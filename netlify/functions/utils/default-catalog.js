// Catálogo inicial de ejemplo. Se usa para "sembrar" Netlify Blobs
// la primera vez que corre el sitio (antes de que el admin cargue sus propios datos).
// Ojo: esto SOLO se usa si Blobs todavía no tiene ningún catálogo guardado. Si el
// sitio ya está en producción con datos cargados, cambiar este archivo no actualiza
// el catálogo en vivo — eso se edita siempre desde /admin.html.

function defaultCatalog() {
  return {
    whatsappNumber: "5491122334455",
    categories: [
      {
        id: "sandwiches",
        name: "Sándwiches",
        products: [
          {
            id: "vacio-al-malbec",
            name: "Vacío al Malbec",
            description:
              "Vacío cocido a baja temperatura con vino Malbec, cebolla, morrón y fideos. Viene con papas españolas.",
            price: 1500,
            image:
              "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "pan",
                name: "Tipo de pan",
                multiple: false,
                required: true,
                options: ["Francés", "Criollo", "Ciabatta"]
              }
            ]
          },
          {
            id: "osobuco",
            name: "Osobuco",
            description: "Sándwich de osobuco. Viene con papas españolas.",
            price: 1500,
            image:
              "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "pan",
                name: "Tipo de pan",
                multiple: false,
                required: true,
                options: ["Francés", "Criollo", "Ciabatta"]
              }
            ]
          }
        ]
      },
      {
        id: "al-plato",
        name: "Al Plato",
        products: [
          {
            id: "vacio-al-plato",
            name: "Vacío al Plato",
            description: "Vacío con guarnición a elección, sin cargo.",
            price: 6500,
            image:
              "https://images.unsplash.com/photo-1544510808-984e5f10e1f3?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "guarnicion",
                name: "Guarnición",
                multiple: false,
                required: true,
                options: ["Papas fritas", "Ensalada", "Puré"]
              }
            ]
          }
        ]
      },
      {
        id: "empanadas",
        name: "Empanadas",
        products: [
          {
            id: "empanada-vacio",
            name: "Empanadas de Vacío (x6)",
            description: "Empanadas criollas de vacío cortado a cuchillo.",
            price: 4800,
            image:
              "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "coccion",
                name: "Cocción",
                multiple: false,
                required: true,
                options: ["Al horno", "Fritas"]
              }
            ]
          }
        ]
      },
      {
        id: "bebidas",
        name: "Bebidas",
        products: [
          {
            id: "coca-cola",
            name: "Coca-Cola",
            description: "Línea Coca-Cola.",
            price: 1800,
            image:
              "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "variedad",
                name: "Variedad",
                multiple: false,
                required: true,
                options: ["Coca-Cola", "Coca-Cola Zero", "Sprite", "Fanta"]
              }
            ]
          },
          {
            id: "cerveza",
            name: "Cerveza",
            description: "Cerveza bien fría.",
            price: 2200,
            image:
              "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "marca",
                name: "Marca",
                multiple: false,
                required: true,
                options: ["Stella Artois", "Heineken"]
              }
            ]
          }
        ]
      }
    ]
  };
}

module.exports = { defaultCatalog };
