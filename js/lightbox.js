(() => {
  "use strict";

  const MAX_SCALE = 5;
  const DOUBLE_TAP_SCALE = 2.6;

  let root = null;
  let img = null;
  let captionEl = null;
  let backdropEl = null;

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragY = 0;
  let isOpen = false;

  const pointers = new Map();
  let gesture = null;
  let lastTap = { time: 0, x: 0, y: 0 };
  let moved = false;

  function build() {
    root = document.createElement("div");
    root.className = "lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Foto ampliada");
    root.innerHTML = `
      <div class="lb-backdrop"></div>
      <button class="lb-close" type="button" aria-label="Cerrar foto">&times;</button>
      <div class="lb-stage"><img class="lb-img" alt="" draggable="false" /></div>
      <div class="lb-caption"></div>
      <div class="lb-hint">Pellizcá o tocá dos veces para acercar</div>
    `;
    document.body.appendChild(root);

    img = root.querySelector(".lb-img");
    captionEl = root.querySelector(".lb-caption");
    backdropEl = root.querySelector(".lb-backdrop");
    const stage = root.querySelector(".lb-stage");

    root.querySelector(".lb-close").addEventListener("click", close);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("keydown", (e) => {
      if (isOpen && e.key === "Escape") close();
    });
    window.addEventListener("resize", () => {
      if (isOpen) {
        clamp();
        apply();
      }
    });
  }

  function apply(animate) {
    img.style.transition = animate ? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    img.style.transform = `translate3d(${tx}px, ${ty + dragY}px, 0) scale(${scale})`;
    const fade = 1 - Math.min(1, Math.abs(dragY) / 420);
    backdropEl.style.opacity = String(fade);
    root.classList.toggle("zoomed", scale > 1.02);
  }

  function clamp() {
    const stageW = root.clientWidth;
    const stageH = root.clientHeight;
    const baseW = img.offsetWidth;
    const baseH = img.offsetHeight;
    const maxX = Math.max(0, (baseW * scale - stageW) / 2);
    const maxY = Math.max(0, (baseH * scale - stageH) / 2);
    tx = Math.min(maxX, Math.max(-maxX, tx));
    ty = Math.min(maxY, Math.max(-maxY, ty));
    if (scale <= 1) {
      tx = 0;
      ty = 0;
    }
  }

  function zoomAt(newScale, cx, cy) {
    newScale = Math.min(MAX_SCALE, Math.max(1, newScale));
    const rect = root.getBoundingClientRect();
    const ox = cx - rect.left - rect.width / 2;
    const oy = cy - rect.top - rect.height / 2;
    const ratio = newScale / scale;
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
    scale = newScale;
    clamp();
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;

    if (pointers.size === 1) {
      gesture = { type: "pan", startX: e.clientX, startY: e.clientY, tx, ty, dragging: false };
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      gesture = {
        type: "pinch",
        startDist: dist(a, b),
        startScale: scale,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2
      };
      dragY = 0;
    }
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;

    if (gesture.type === "pinch" && pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values());
      const d = dist(a, b);
      if (gesture.startDist > 0) {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        zoomAt(gesture.startScale * (d / gesture.startDist), cx, cy);
        tx += cx - gesture.cx;
        ty += cy - gesture.cy;
        gesture.cx = cx;
        gesture.cy = cy;
        clamp();
        apply();
      }
      moved = true;
      return;
    }

    if (gesture.type === "pan" && pointers.size === 1) {
      const dx = e.clientX - gesture.startX;
      const dy = e.clientY - gesture.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;

      if (scale > 1.02) {
        tx = gesture.tx + dx;
        ty = gesture.ty + dy;
        clamp();
        apply();
      } else if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 0.8) {
        gesture.dragging = true;
        dragY = dy;
        apply();
      }
    }
  }

  function onUp(e) {
    const hadPointer = pointers.delete(e.pointerId);
    if (!hadPointer) return;

    if (gesture && gesture.type === "pinch") {
      if (scale < 1.05) {
        scale = 1;
        tx = 0;
        ty = 0;
        apply(true);
      }
      gesture = pointers.size === 1
        ? (() => {
            const p = Array.from(pointers.values())[0];
            return { type: "pan", startX: p.x, startY: p.y, tx, ty, dragging: false };
          })()
        : null;
      return;
    }

    if (gesture && gesture.type === "pan") {
      if (gesture.dragging) {
        if (dragY > 110) {
          close();
        } else {
          dragY = 0;
          apply(true);
        }
        gesture = null;
        return;
      }

      if (!moved) {
        const now = Date.now();
        const isDouble = now - lastTap.time < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
        if (isDouble) {
          if (scale > 1.05) {
            scale = 1;
            tx = 0;
            ty = 0;
          } else {
            zoomAt(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
          }
          apply(true);
          lastTap = { time: 0, x: 0, y: 0 };
        } else {
          lastTap = { time: now, x: e.clientX, y: e.clientY };
          const onImage = e.target === img;
          if (!onImage && scale <= 1.02) {
            setTimeout(() => {
              if (lastTap.time === now) close();
            }, 330);
          }
        }
      }
      gesture = null;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0022);
    zoomAt(scale * factor, e.clientX, e.clientY);
    apply();
  }

  function open({ src, alt = "", caption = "" }) {
    if (!root) build();
    scale = 1;
    tx = 0;
    ty = 0;
    dragY = 0;
    gesture = null;
    pointers.clear();
    img.src = src;
    img.alt = alt;
    captionEl.textContent = caption;
    apply();
    root.classList.add("open");
    document.body.classList.add("modal-open");
    isOpen = true;
    root.querySelector(".lb-close").focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove("open");
    document.body.classList.toggle("modal-open", !!document.querySelector(".modal-backdrop.open"));
    setTimeout(() => {
      if (!isOpen) {
        img.removeAttribute("src");
        scale = 1;
        tx = 0;
        ty = 0;
        dragY = 0;
        apply();
      }
    }, 350);
  }

  window.Lightbox = { open, close };
})();
