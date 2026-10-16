const { getCatalogStore } = require("./utils/blob-store");
const { defaultCatalog, migrateCatalog, MENU_VERSION } = require("./utils/default-catalog");

exports.handler = async () => {
  try {
    const store = getCatalogStore();
    let catalog = await store.get("catalog", { type: "json" });

    if (!catalog) {
      catalog = defaultCatalog();
      await store.setJSON("catalog", catalog);
    } else if (catalog.menuVersion !== MENU_VERSION) {
      // Menú guardado de una versión anterior: se actualiza una sola vez.
      catalog = migrateCatalog(catalog);
      await store.setJSON("catalog", catalog);
    }

    // El CDN puede reutilizar la respuesta unos segundos: el menú carga más rápido y los
    // cambios del admin se ven en menos de un minuto. El admin pide con un parámetro único.
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=120"
      },
      body: JSON.stringify(catalog)
    };
  } catch (err) {
    // Sin almacenamiento (por ejemplo, un error de Blob) el sitio no puede quedar vacío:
    // se muestra el menú inicial del código. Los cambios hechos en el admin no se ven hasta
    // que el almacenamiento vuelva a andar.
    console.error("Error leyendo el catálogo, se usa el menú inicial:", err);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(defaultCatalog())
    };
  }
};
