# 🔥 El Sabor del Pecado

Sitio de pedidos online para delivery de comida casera (hamburguesas, platos y empanadas).
Sitio estático (HTML/CSS/JS vanilla) + Netlify Functions, pensado para desplegarse gratis en Netlify.

## Funcionalidad

- Catálogo por categorías (Sándwiches, Al Plato, Empanadas, Bebidas, etc.) con fotos, variantes
  (tipo de pan, guarnición, cocción, etc.) y selector de cantidad.
- Carrito con varios productos a la vez, total en tiempo real.
- Checkout con dirección de entrega, teléfono de contacto y medio de pago (Efectivo /
  Transferencia / Mercado Pago). Con Efectivo o Transferencia arma el pedido y lo manda por
  WhatsApp (`wa.me`); con Mercado Pago redirige a Checkout Pro, y al volver pago el cliente
  confirma el envío del pedido por WhatsApp con una nota de "ya pagado".
- Panel `/admin.html` protegido por contraseña para editar productos, categorías y el número de
  WhatsApp, sin tocar código. Los datos se guardan en **Netlify Blobs**.

## Estructura

```
index.html            sitio público
admin.html             panel de administración
css/styles.css
js/main.js             lógica del carrito, checkout y pago con Mercado Pago
js/admin.js             lógica del panel admin
netlify/functions/
  catalog-get.js        GET público del catálogo (lo siembra con datos de ejemplo la 1ª vez)
  catalog-save.js        guarda el catálogo (requiere token de admin)
  admin-login.js          valida la contraseña y devuelve un token temporal (2hs)
  create-payment.js        crea una preferencia de pago en Mercado Pago (Checkout Pro)
  utils/auth.js            firma/verifica el token (HMAC con ADMIN_PASSWORD)
  utils/blob-store.js      conexión a Netlify Blobs (con respaldo manual siteID/token)
  utils/default-catalog.js  catálogo de ejemplo inicial
```

## Variables de entorno

Configurar en Netlify (Site settings → Environment variables):

| Variable                   | Descripción                                                        |
|-----------------------------|---------------------------------------------------------------------|
| `ADMIN_PASSWORD`            | Contraseña para entrar a `/admin.html`                               |
| `NETLIFY_SITE_ID`            | ID del sitio (ver "Project overview"). Respaldo si Blobs no recibe contexto automático |
| `NETLIFY_BLOBS_TOKEN`         | Personal access token de Netlify. Mismo respaldo que `NETLIFY_SITE_ID` |
| `MERCADOPAGO_ACCESS_TOKEN`     | Access Token de Mercado Pago (mercadopago.com.ar/developers/panel). Si empieza con `TEST-` se usa el checkout de prueba (sandbox) |

En teoría Netlify Blobs se configura solo (`NETLIFY_SITE_ID`/`NETLIFY_BLOBS_TOKEN` son solo
necesarias si el contexto automático falla con `MissingBlobsEnvironmentError`, como pasó en este
proyecto en la plataforma nueva de Netlify — ver `utils/blob-store.js`).

## Deploy en Netlify

1. Crear un nuevo sitio en Netlify apuntando a este repositorio.
2. Build command: *(no hace falta, es estático)* — ya está configurado en `netlify.toml`.
3. Publish directory: `.` (raíz).
4. Agregar la variable de entorno `ADMIN_PASSWORD` con una contraseña fuerte.
5. Deploy. El sitio queda en `https://<tu-sitio>.netlify.app`.
6. Entrar a `https://<tu-sitio>.netlify.app/admin.html` con esa contraseña para cargar el número
   de WhatsApp real y el catálogo definitivo (al desplegar, el sitio arranca con un catálogo de
   ejemplo para poder probar el flujo completo).

## Desarrollo local

```bash
npm install
npx netlify dev
```

Esto levanta el sitio y las functions en `http://localhost:8888` (requiere la Netlify CLI y estar
logueado/linkeado al sitio para que Netlify Blobs funcione localmente).

## Fuera de alcance (por ahora)

- Historial de pedidos: el pedido solo se envía por WhatsApp, no queda guardado en ningún lado
  (incluso pagando con Mercado Pago, la confirmación depende de que el cliente toque el botón de
  WhatsApp al volver del pago — no hay webhook ni base de datos de pedidos).
- Dominio propio: queda en `*.netlify.app`.
