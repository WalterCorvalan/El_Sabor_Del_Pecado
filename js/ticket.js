(() => {
  "use strict";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function money(n) {
    return "$" + Number(n).toLocaleString("es-AR");
  }

  function pad(n, size) {
    return String(n).padStart(size, "0");
  }

  function formatDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    return `${pad(d.getDate(), 2)}/${pad(d.getMonth() + 1, 2)}/${d.getFullYear()} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`;
  }

  // order: { number, createdAt, customer:{name, phone}, shipping, zone, address, payment,
  //          items:[{qty, name, price, details:[string], notes}], subtotal, deliveryFee, total }
  function renderTicketHtml(order) {
    const isDelivery = order.shipping === "Envío a domicilio";
    const items = (order.items || [])
      .map((item) => {
        const details = (item.details || []).map((d) => `<div class="t-detail">${esc(d)}</div>`).join("");
        const notes = item.notes ? `<div class="t-detail">Obs: ${esc(item.notes)}</div>` : "";
        return `
          <div class="t-item">
            <div class="t-row t-item-main">
              <span class="t-item-name">${esc(item.qty)} x ${esc(item.name)}</span>
              <span class="t-item-price">${money(item.price * item.qty)}</span>
            </div>
            ${details}${notes}
          </div>`;
      })
      .join("");

    const hasFeeLine = isDelivery && order.deliveryFee !== undefined;
    const hasDiscount = order.discount > 0;
    const discountRows = (order.discountGroups || [])
      .map(
        (g) =>
          `<div class="t-row"><span>Promo ${g.size === 12 ? "docena" : "x" + g.size}${g.packs > 1 ? " x" + g.packs : ""}</span><span>-${money(g.saved)}</span></div>`
      )
      .join("");
    const feeLines =
      hasFeeLine || hasDiscount
        ? `
        <div class="t-row"><span>Subtotal</span><span>${money(order.subtotal ?? order.total - (order.deliveryFee || 0) + (order.discount || 0))}</span></div>${discountRows}${
            hasFeeLine
              ? `
        <div class="t-row"><span>Envío${order.zone ? " (" + esc(order.zone.name) + ")" : ""}</span><span>${order.deliveryFee > 0 ? money(order.deliveryFee) : "Gratis"}</span></div>`
              : ""
          }`
        : "";

    return `
      <div class="ticket">
        <div class="t-title">EL SABOR<br>DEL PECADO</div>
        <div class="t-center t-sub">Sandwichería Gourmet</div>
        <div class="t-sep"></div>

        <div class="t-row t-big">
          <span>PEDIDO #${esc(pad(order.number, 4))}</span>
        </div>
        <div class="t-center">${esc(formatDate(order.createdAt))}</div>

        <div class="t-badge">${isDelivery ? "ENVÍO A DOMICILIO" : "RETIRO EN LOCAL"}</div>

        <div class="t-block">
          <div><strong>${esc(order.customer?.name)}</strong></div>
          <div>Tel: ${esc(order.customer?.phone)}</div>
          ${isDelivery ? `<div>Dir: ${esc(order.address)}</div>` : ""}
        </div>
        <div class="t-sep"></div>

        ${items}

        <div class="t-sep"></div>${feeLines}
        <div class="t-row t-total">
          <span>TOTAL</span>
          <span>${money(order.total)}</span>
        </div>
        <div class="t-center t-payment">Pago: ${esc(order.payment)}</div>
        <div class="t-sep"></div>
        <div class="t-center t-sub">¡Gracias por tu pedido!</div>
        <div class="t-feed"></div>
      </div>`;
  }

  // Líneas del ancho justo del ticket: si el papel corta de más, se nota que falta un borde
  function renderRulerHtml() {
    const edge = "|" + "=".repeat(33) + "|";
    const digits = "1234567890".repeat(4).slice(0, 35);
    return `
      <div class="ticket">
        <div class="t-title">PRUEBA<br>DE MÁRGENES</div>
        <div class="t-sep"></div>
        <div class="t-ruler">${edge}</div>
        <div class="t-ruler">${digits}</div>
        <div class="t-ruler">${edge}</div>
        <div class="t-box">Esta caja debe verse completa<br>(los 4 bordes), sin cortarse.</div>
        <div class="t-center t-sub">Las dos líneas con "|" deben verse<br>con el "|" de los dos extremos.<br>Si falta alguno, hay que achicar<br>el ancho en el driver.</div>
        <div class="t-feed"></div>
      </div>`;
  }

  window.TicketPrinter = { renderTicketHtml, renderRulerHtml };
})();
