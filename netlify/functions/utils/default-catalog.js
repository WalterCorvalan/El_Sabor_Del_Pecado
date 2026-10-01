// Catálogo inicial de ejemplo. Se usa para "sembrar" Netlify Blobs
// la primera vez que corre el sitio (antes de que el admin cargue sus propios datos).

function defaultCatalog() {
  return {
    whatsappNumber: "5491122334455",
    categories: [
      {
        id: "sandwiches",
        name: "Sándwiches",
        products: [
          {
            id: "burger-clasica",
            name: "Hamburguesa Clásica",
            description:
              "Medallón de carne 150g, cheddar, lechuga, tomate y nuestra salsa especial.",
            price: 4500,
            image:
              "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "pan",
                name: "Tipo de pan",
                multiple: false,
                required: true,
                options: ["Pan de papa", "Pan negro", "Pan sin TACC"]
              },
              {
                id: "aderezos",
                name: "Aderezos",
                multiple: true,
                required: false,
                options: ["Ketchup", "Mostaza", "Mayonesa", "Barbacoa", "Alioli"]
              }
            ]
          },
          {
            id: "burger-bacon",
            name: "Hamburguesa con Bacon",
            description:
              "Doble medallón, panceta crocante, cheddar derretido y cebolla crispy.",
            price: 5800,
            image:
              "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "pan",
                name: "Tipo de pan",
                multiple: false,
                required: true,
                options: ["Pan de papa", "Pan negro", "Pan sin TACC"]
              },
              {
                id: "aderezos",
                name: "Aderezos",
                multiple: true,
                required: false,
                options: ["Ketchup", "Mostaza", "Mayonesa", "Barbacoa", "Alioli"]
              }
            ]
          },
          {
            id: "burger-pollo",
            name: "Hamburguesa de Pollo",
            description:
              "Suprema de pollo crocante, lechuga, tomate y mayonesa de la casa.",
            price: 4200,
            image:
              "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "pan",
                name: "Tipo de pan",
                multiple: false,
                required: true,
                options: ["Pan de papa", "Pan negro", "Pan sin TACC"]
              },
              {
                id: "aderezos",
                name: "Aderezos",
                multiple: true,
                required: false,
                options: ["Ketchup", "Mostaza", "Mayonesa", "Barbacoa", "Alioli"]
              }
            ]
          }
        ]
      },
      {
        id: "platos",
        name: "Platos",
        products: [
          {
            id: "milanesa-napolitana",
            name: "Milanesa Napolitana",
            description:
              "Milanesa de ternera con salsa de tomate, jamón y mozzarella gratinada.",
            price: 6200,
            image:
              "https://images.unsplash.com/photo-1544510808-984e5f10e1f3?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "acompanamiento",
                name: "Acompañamiento",
                multiple: false,
                required: true,
                options: ["Papas fritas", "Ensalada", "Puré"]
              }
            ]
          },
          {
            id: "pollo-al-horno",
            name: "Pollo al Horno",
            description: "Pechuga de pollo al horno con hierbas y limón.",
            price: 5500,
            image:
              "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80",
            variants: [
              {
                id: "acompanamiento",
                name: "Acompañamiento",
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
            id: "empanada-carne",
            name: "Empanadas de Carne (x6)",
            description: "Clásicas empanadas criollas de carne cortada a cuchillo.",
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
          },
          {
            id: "empanada-jyq",
            name: "Empanadas de Jamón y Queso (x6)",
            description: "Jamón y queso bien fundido en masa casera.",
            price: 4800,
            image:
              "https://images.unsplash.com/photo-1601924638867-3ec69f78a2ba?auto=format&fit=crop&w=900&q=80",
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
      }
    ]
  };
}

module.exports = { defaultCatalog };
