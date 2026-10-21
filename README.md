# 🔥 El Sabor del Pecado

Sitio de pedidos online para delivery de comida casera (hamburguesas, platos y empanadas).
Sitio estático (HTML/CSS/JS vanilla) + funciones serverless, desplegado en Vercel.

## Funcionalidad

- Catálogo por categorías (Sándwiches, Al Plato, Empanadas, Bebidas, etc.) con fotos, variantes
  (tipo de pan, guarnición, cocción, etc.) y selector de cantidad.
- Carrito con varios productos a la vez, total en tiempo real.
- Checkout con dirección de entrega, teléfono de contacto y medio de pago (Efectivo /
  Transferencia / Mercado Pago). Con Efectivo o Transferencia arma el pedido y lo manda por
  WhatsApp (`wa.me`); con Mercado Pago redirige a Checkout Pro, y al volver pago el cliente
  confirma el envío del pedido por WhatsApp con una nota de "ya pagado".
- Panel `/admin.html` protegido por contraseña para editar productos, categorías y el número de
  WhatsApp, sin tocar código. Los datos se guardan en **Vercel Blob**.

## Estructura

```
index.html            sitio público
admin.html             panel de administración
css/styles.css
js/main.js             lógica del carrito, checkout y pago con Mercado Pago
js/admin.js             lógica del panel admin
api/                    una función de Vercel por archivo (envuelven los handlers de abajo)
netlify/functions/      lógica de los handlers (el nombre de la carpeta viene de cuando el sitio estaba en Netlify)
  catalog-get.js        GET público del catálogo (lo siembra con datos de ejemplo la 1ª vez)
  catalog-save.js        guarda el catálogo (requiere token de admin)
  admin-login.js          valida la contraseña y devuelve un token temporal (2hs)
  create-payment.js        crea una preferencia de pago en Mercado Pago (Checkout Pro)
  utils/auth.js            firma/verifica el token (HMAC con ADMIN_PASSWORD)
  utils/blob-store.js      conexión a Vercel Blob (el código de Netlify Blobs quedó como alternativa sin uso)
  utils/default-catalog.js  catálogo de ejemplo inicial
```

## Variables de entorno

Configurar en Vercel (Settings → Environment Variables):

| Variable                   | Descripción                                                        |
|-----------------------------|---------------------------------------------------------------------|
| `ADMIN_PASSWORD`            | Contraseña para entrar a `/admin.html`                               |
| `BLOB_READ_WRITE_TOKEN`      | Token de Vercel Blob (se agrega solo al conectar el store de Blob al proyecto) |
| `MERCADOPAGO_ACCESS_TOKEN`     | Access Token de Mercado Pago (mercadopago.com.ar/developers/panel). Si empieza con `TEST-` se usa el checkout de prueba (sandbox) |

## Deploy en Vercel

Las carpetas `api/` envuelven los handlers de `netlify/functions`
y el catálogo se guarda en Vercel Blob (ver `netlify/functions/utils/blob-store.js`).

1. Importar el repositorio en Vercel (Framework Preset: *Other*, sin build command).
2. En *Storage*, crear un store de **Blob** y conectarlo al proyecto (agrega `BLOB_READ_WRITE_TOKEN`).
3. En *Settings → Environment Variables* agregar `ADMIN_PASSWORD` y `MERCADOPAGO_ACCESS_TOKEN`.
4. Deploy. Entrar a `/admin.html` para cargar el catálogo (si está vacío arranca con el menú por defecto).

### Pedidos, horarios y envío

- Cada pedido se guarda (Vercel Blob) y se ve en `/admin.html`, pestaña **Pedidos**, con botón para imprimir el ticket de 80 mm. La pestaña **Estadísticas** resume ventas, lo más pedido y los horarios de más pedidos.
- En **Ajustes** se activan, de forma opcional, los horarios automáticos y el costo de envío (general o por zona).
- Las reglas de horarios, envío y precios están en `js/rules.js` y las usan la tienda y el servidor.
- **Precio por cantidad (docena):** cada categoría puede tener un precio por pack (Admin → Menú → categoría → "Precio por cantidad"). Hoy Empanadas Gourmet cobra cada 12 empanadas, de cualquier gusto, a $33.000; las que sobran van a $3.000. El descuento lo calculan `js/rules.js` (carrito y servidor), y en Mercado Pago el pack se manda como un solo ítem.
- **Entrega y pagos (Admin → Ajustes):** el retiro en local, el seguimiento del pedido y Mercado Pago vienen **apagados**; sin retiro, el cliente no elige cómo recibir el pedido y siempre es envío a domicilio. Con Transferencia el cliente ve el monto y el alias, y el pedido sale por WhatsApp para que adjunte el comprobante.
- **Botón atrás:** con una hoja, el carrito o una foto abiertos, "atrás" los cierra en vez de salir de la página.
- **Seguimiento:** cada pedido tiene un link (`seguimiento.html?o=...`) que se manda en el mensaje de WhatsApp y que el cliente ve en una barra en el sitio. Muestra Recibido, Preparando, Listo y Entregado, y se actualiza solo.
- **Tiempo estimado:** se configura en Admin → Ajustes.
- **Promos:** hay una categoría "Promos" oculta con un combo de ejemplo. Se activa con el interruptor de la categoría en Admin → Menú (y hay que cargarle el precio). Una categoría oculta no se puede pedir.
- **Visitas:** se cuentan en Upstash Redis. Para activarlo: Vercel → Storage → crear Upstash Redis → conectar al proyecto → Redeploy. Sin Redis las visitas no se cuentan y el resto anda igual.
- **Límite de Vercel gratis:** 12 funciones en total y hoy hay 12 en `api/`. Para sumar otra hay que unir funciones existentes.
- Si el almacenamiento (Blob) falla, el sitio muestra el menú inicial del código y los pedidos en efectivo o transferencia siguen yendo por WhatsApp, pero sin guardarse. Mercado Pago necesita el pedido guardado.
- La vista previa al compartir el link (WhatsApp, Instagram) sale de `api/share.js` y `images/og-share.jpg` (solo en Vercel).

## Desarrollo local

```bash
npm install
npx vercel dev
```

Esto levanta el sitio y las funciones de `api/` en local (requiere la CLI de Vercel y tener el proyecto
linkeado para que Vercel Blob funcione localmente).

## Fuera de alcance (por ahora)

- Historial de pedidos: el pedido solo se envía por WhatsApp, no queda guardado en ningún lado
  (incluso pagando con Mercado Pago, la confirmación depende de que el cliente toque el botón de
  WhatsApp al volver del pago — no hay webhook ni base de datos de pedidos).
- Dominio propio: queda en `*.vercel.app`.
