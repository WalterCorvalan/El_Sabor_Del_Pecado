# 🔥 El Sabor del Pecado

Sitio de pedidos online para delivery de comida casera (hamburguesas, platos y empanadas).
Sitio estático (HTML/CSS/JS vanilla) + Netlify Functions, pensado para desplegarse gratis en Netlify.

## Funcionalidad

- Catálogo por categorías (Sándwiches, Platos, Empanadas) con fotos, variantes (tipo de pan,
  aderezos, acompañamiento, cocción) y selector de cantidad.
- Carrito con varios productos a la vez, total en tiempo real.
- Checkout con dirección de entrega y medio de pago (Efectivo / Transferencia), que arma el
  pedido y lo envía por WhatsApp (`wa.me`), sin pasarela de pago.
- Panel `/admin.html` protegido por contraseña para editar productos, categorías y el número de
  WhatsApp, sin tocar código. Los datos se guardan en **Netlify Blobs**.

## Estructura

```
index.html            sitio público
admin.html             panel de administración
css/styles.css
js/main.js             lógica del carrito y el catálogo
js/admin.js             lógica del panel admin
netlify/functions/
  catalog-get.js        GET público del catálogo (lo siembra con datos de ejemplo la 1ª vez)
  catalog-save.js        guarda el catálogo (requiere token de admin)
  admin-login.js          valida la contraseña y devuelve un token temporal (2hs)
  utils/auth.js            firma/verifica el token (HMAC con ADMIN_PASSWORD)
  utils/default-catalog.js  catálogo de ejemplo inicial
```

## Variables de entorno

Configurar en Netlify (Site settings → Environment variables):

| Variable         | Descripción                                      |
|------------------|---------------------------------------------------|
| `ADMIN_PASSWORD` | Contraseña para entrar a `/admin.html`             |

No hace falta configurar nada más: Netlify Blobs funciona automáticamente en cualquier sitio
desplegado en Netlify (no requiere credenciales adicionales).

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

- Pasarela de pago online (Mercado Pago u otra).
- Historial de pedidos: el pedido solo se envía por WhatsApp, no queda guardado en ningún lado.
- Dominio propio: queda en `*.netlify.app`.
