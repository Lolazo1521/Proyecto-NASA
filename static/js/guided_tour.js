// static/js/guided_tour.js — Bienvenida y recorrido guiado.
//
// - La primera vez que alguien abre la página aparece una bienvenida que explica, en dos frases,
//   para qué sirve, y ofrece un recorrido de 1 minuto.
// - El recorrido oscurece la pantalla, ilumina una sección a la vez y explica qué hace.
//   Los pasos cuyo elemento no se ve (por ejemplo, en el otro modo) se saltan solos.
// - El botón "❓ ¿Cómo se usa?" del encabezado lo vuelve a abrir.
// - Textos en static/js/i18n.js (claves tour.*); si cambias de idioma con el recorrido abierto,
//   el paso actual se vuelve a pintar.
(function () {
  const SEEN_KEY = 'lunarTourSeen';
  const t = (key, vars) => window.I18N.t(key, vars);

  // Cada paso apunta a uno o varios elementos (se ilumina el rectángulo que los envuelve)
  const STEPS = [
    { key: 's1', targets: () => [document.getElementById('siteSelect')?.parentElement] },
    { key: 's2', targets: () => [document.getElementById('startDateInput')?.parentElement, document.getElementById('btnPrevLunar')?.parentElement] },
    { key: 's3', targets: () => [document.getElementById('explorerNow')] },
    { key: 's4', targets: () => [document.getElementById('kpiGrid')] },
    { key: 's5', targets: () => [document.getElementById('timeSlider')?.parentElement] },
    { key: 's6', targets: () => [document.getElementById('threeContainer')] },
    { key: 's7', targets: () => [document.getElementById('globeInset')] },
    { key: 's8', targets: () => [document.getElementById('horizonCanvas')?.parentElement?.parentElement] },
    { key: 's9', targets: () => [document.getElementById('phase4Workspace')?.firstElementChild] },
    { key: 's10', targets: () => [document.getElementById('phase4ModeBar'), document.getElementById('langToggleBtn')] },
  ];

  const isVisible = el => !!el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
  const visibleSteps = () => STEPS.filter(s => s.targets().some(isVisible));

  let layer = null;       // contenedor del recorrido (bloqueo + foco + tarjeta)
  let steps = [];
  let index = 0;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) { /* sin almacenamiento */ }
  }

  // ---------- Bienvenida ----------
  function showWelcome() {
    closeAll();
    layer = el('div', 'fixed inset-0 z-[100] flex items-center justify-center p-4');
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.dataset.kind = 'welcome';
    layer.appendChild(el('div', 'absolute inset-0 bg-slate-950/80 backdrop-blur-sm'));
    const card = el('div', 'relative max-w-md w-full bg-slate-900 border border-sky-500/40 rounded-2xl p-6 shadow-2xl space-y-4');
    card.innerHTML = `
      <h2 class="text-xl font-bold text-white">${t('tour.welcome.title')}</h2>
      <p class="text-sm text-slate-300 leading-relaxed">${t('tour.welcome.body')}</p>
      <div class="flex flex-wrap gap-2 pt-2">
        <button data-act="start" class="flex-1 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold transition">${t('tour.welcome.start')}</button>
        <button data-act="skip" class="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm transition">${t('tour.welcome.skip')}</button>
      </div>`;
    layer.appendChild(card);
    card.querySelector('[data-act="start"]').addEventListener('click', () => { markSeen(); startTour(); });
    card.querySelector('[data-act="skip"]').addEventListener('click', () => { markSeen(); closeAll(); });
    document.body.appendChild(layer);
    card.querySelector('[data-act="start"]').focus();
  }

  // ---------- Recorrido ----------
  function startTour() {
    closeAll();
    steps = visibleSteps();
    if (!steps.length) return;
    index = 0;
    layer = el('div', 'fixed inset-0 z-[100]');
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.dataset.kind = 'tour';
    // Capa que bloquea clics fuera del recorrido
    layer.appendChild(el('div', 'absolute inset-0'));
    // Foco: un rectángulo transparente con una sombra enorme que oscurece todo lo demás
    const spot = el('div', 'tour-spot absolute rounded-xl pointer-events-none transition-all duration-300');
    spot.style.boxShadow = '0 0 0 9999px rgba(2, 6, 23, 0.78)';
    spot.style.outline = '2px solid rgba(56, 189, 248, 0.9)';
    layer.appendChild(spot);
    const card = el('div', 'tour-card absolute w-[340px] max-w-[calc(100vw-24px)] bg-slate-900 border border-sky-500/50 rounded-xl p-4 shadow-2xl space-y-3 transition-all duration-300');
    layer.appendChild(card);
    document.body.appendChild(layer);
    renderStep();
  }

  function unionRect(elements) {
    const rects = elements.filter(isVisible).map(e => e.getBoundingClientRect());
    const left = Math.min(...rects.map(r => r.left));
    const top = Math.min(...rects.map(r => r.top));
    const right = Math.max(...rects.map(r => r.right));
    const bottom = Math.max(...rects.map(r => r.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function renderStep() {
    if (!layer || layer.dataset.kind !== 'tour') return;
    const step = steps[index];
    const targets = step.targets().filter(isVisible);
    const card = layer.querySelector('.tour-card');
    const last = index === steps.length - 1;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[11px] mono text-sky-300">${t('tour.counter', { n: index + 1, total: steps.length })}</span>
        <button data-act="close" class="text-xs text-slate-400 hover:text-white">✕ ${t('tour.close')}</button>
      </div>
      <h3 class="text-base font-bold text-white">${t(`tour.${step.key}.title`)}</h3>
      <p class="text-sm text-slate-300 leading-relaxed">${t(`tour.${step.key}.body`)}</p>
      <div class="flex items-center justify-between pt-1">
        <button data-act="prev" class="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white ${index === 0 ? 'invisible' : ''}">${t('tour.prev')}</button>
        <div class="flex gap-1">${steps.map((_, i) => `<span class="w-1.5 h-1.5 rounded-full ${i === index ? 'bg-sky-400' : 'bg-slate-600'}"></span>`).join('')}</div>
        <button data-act="next" class="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold">${t(last ? 'tour.done' : 'tour.next')}</button>
      </div>`;
    card.querySelector('[data-act="close"]').addEventListener('click', closeAll);
    card.querySelector('[data-act="prev"]').addEventListener('click', () => go(-1));
    card.querySelector('[data-act="next"]').addEventListener('click', () => (last ? closeAll() : go(1)));

    // Llevar la sección a la vista y luego colocar foco y tarjeta
    targets[0].scrollIntoView({ block: 'center', behavior: 'auto' });
    requestAnimationFrame(() => position(targets));
    card.querySelector('[data-act="next"]').focus({ preventScroll: true });
  }

  function position(targets) {
    if (!layer || layer.dataset.kind !== 'tour') return;
    const pad = 8;
    const r = unionRect(targets);
    const spot = layer.querySelector('.tour-spot');
    Object.assign(spot.style, {
      left: `${r.left - pad}px`, top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
    });

    const card = layer.querySelector('.tour-card');
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let top;
    if (r.bottom + pad + 12 + ch <= vh) top = r.bottom + pad + 12;          // debajo
    else if (r.top - pad - 12 - ch >= 0) top = r.top - pad - 12 - ch;      // encima
    else top = Math.max(12, Math.min(vh - ch - 12, r.top + 12));            // dentro (secciones grandes)
    const left = Math.max(12, Math.min(vw - cw - 12, r.left));
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function go(delta) {
    index = Math.max(0, Math.min(steps.length - 1, index + delta));
    renderStep();
  }

  function closeAll() {
    if (layer) layer.remove();
    layer = null;
  }

  function refresh() {
    if (!layer) return;
    if (layer.dataset.kind === 'welcome') showWelcome();
    else renderStep();
  }

  function injectHelpButton() {
    const lang = document.getElementById('langToggleBtn');
    if (!lang || document.getElementById('tourHelpBtn')) return;
    const btn = el('button', 'text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/40 transition');
    btn.id = 'tourHelpBtn';
    btn.type = 'button';
    btn.textContent = t('tour.helpBtn');
    btn.addEventListener('click', startTour);
    lang.parentElement.insertBefore(btn, lang);
  }

  window.addEventListener('lunar:langchange', () => {
    const btn = document.getElementById('tourHelpBtn');
    if (btn) btn.textContent = t('tour.helpBtn');
    refresh();
  });
  window.addEventListener('resize', () => {
    if (layer && layer.dataset.kind === 'tour') position(steps[index].targets().filter(isVisible));
  });
  window.addEventListener('scroll', () => {
    if (layer && layer.dataset.kind === 'tour') position(steps[index].targets().filter(isVisible));
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (!layer) return;
    if (e.key === 'Escape') { markSeen(); closeAll(); }
    if (layer?.dataset.kind === 'tour') {
      if (e.key === 'ArrowRight') { index === steps.length - 1 ? closeAll() : go(1); }
      if (e.key === 'ArrowLeft') go(-1);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    injectHelpButton();
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (_) { /* sin almacenamiento */ }
    // Esperar a que carguen el escenario y el 3D para que el recorrido apunte a secciones ya dibujadas
    if (!seen) setTimeout(showWelcome, 1200);
  });

  window.LunarTour = { start: startTour, welcome: showWelcome };
})();
