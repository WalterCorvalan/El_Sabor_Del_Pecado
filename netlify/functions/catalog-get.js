const { getCatalogStore } = require("./utils/blob-store");
const { defaultCatalog } = require("./utils/default-catalog");

exports.handler = async () => {
  try {
    const store = getCatalogStore();
    let catalog = await store.get("catalog", { type: "json" });

    if (!catalog) {
      catalog = defaultCatalog();
      await store.setJSON("catalog", catalog);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
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
