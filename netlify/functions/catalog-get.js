const { getStore } = require("@netlify/blobs");
const { defaultCatalog } = require("./utils/default-catalog");

exports.handler = async () => {
  try {
    const store = getStore("catalog");
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
    console.error("Error leyendo el catálogo:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo cargar el catálogo" })
    };
  }
};
