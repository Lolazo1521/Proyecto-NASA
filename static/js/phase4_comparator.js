// static/js/phase4_comparator.js
// Perfil de interfaz (Explorador / Ingeniería) + consola de misión + comparador multi-escenario.
//
// El perfil cambia TODA la página:
//   - Pone <body data-mode="explorer|engineering">; el CSS oculta .eng-only / .exp-only.
//   - Emite el evento 'lunar:modechange' para que index.html ajuste textos, capas 3D y etiquetas.
//   - Explorador: guía educativa arriba y comparador en lenguaje sencillo.
//   - Ingeniería: consola de misión arriba (ventanas de luz/DTE, umbrales que deciden el
//     veredicto, tabla horaria y exportación) y comparador técnico con los mismos umbrales.
// index.html avisa de cada escenario cargado con el evento 'lunar:report'.

// Valores de partida para la demo (no son requisitos oficiales de NASA): se ajustan en la consola.
const DEFAULT_THRESHOLDS = {
  sunMargin: 0.0,     // ° mínimos del Sol sobre el relieve para contar como luz útil
  dteMargin: 0.5,     // ° mínimos de la Tierra sobre el relieve para un enlace estable
  minSunPct: 50,      // % mínimo de horas con luz útil
  minDtePct: 25,      // % mínimo de horas con enlace útil
  maxDarkHours: 168,  // h máximas de sombra continua (≈ 7 días de autonomía con baterías)
};

const MODE_KEY = 'lunarNavigatorMode';

// ---------- Análisis (funciones puras) ----------

function marginOf(step, key) {
  return step[key].el - step[key].horizon_el;
}

function isUsable(step, key, minMargin) {
  return step[key].visible && marginOf(step, key) >= minMargin;
}

// Tramos continuos donde el cuerpo es visible con al menos minMargin grados sobre el relieve
function computeWindows(timeline, key, minMargin) {
  const runs = [];
  let cur = null;
  timeline.forEach((t, i) => {
    if (isUsable(t, key, minMargin)) {
      const m = marginOf(t, key);
      if (!cur) cur = { start: i, end: i, minMargin: m, maxEl: t[key].el };
      cur.end = i;
      cur.minMargin = Math.min(cur.minMargin, m);
      cur.maxEl = Math.max(cur.maxEl, t[key].el);
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  });
  if (cur) runs.push(cur);
  return runs.map(r => ({
    ...r,
    hours: r.end - r.start + 1,
    startTs: timeline[r.start].timestamp_utc,
    endTs: timeline[r.end].timestamp_utc,
    openStart: r.start === 0,                   // ya venía ocurriendo antes del periodo
    openEnd: r.end === timeline.length - 1,     // continúa después del periodo
  }));
}

function longestGap(timeline, key, minMargin) {
  let best = 0, cur = 0;
  for (const t of timeline) {
    if (isUsable(t, key, minMargin)) cur = 0;
    else best = Math.max(best, ++cur);
  }
  return best;
}

function assessViability(report, th) {
  const tl = report.timeline;
  const n = tl.length;
  const sunHours = tl.filter(t => isUsable(t, 'sun', th.sunMargin)).length;
  const dteHours = tl.filter(t => isUsable(t, 'earth', th.dteMargin)).length;
  const usableSunPct = (sunHours / n) * 100;
  const usableDtePct = (dteHours / n) * 100;
  const longestDark = longestGap(tl, 'sun', th.sunMargin);
  const longestNoDte = longestGap(tl, 'earth', th.dteMargin);

  const criteria = [
    { id: 'sun', label: 'Luz útil', value: `${usableSunPct.toFixed(1)}% (${sunHours} h)`, target: `≥ ${th.minSunPct}%`, ok: usableSunPct >= th.minSunPct },
    { id: 'dte', label: 'Enlace DTE útil', value: `${usableDtePct.toFixed(1)}% (${dteHours} h)`, target: `≥ ${th.minDtePct}%`, ok: usableDtePct >= th.minDtePct },
    { id: 'dark', label: 'Sombra continua máx.', value: `${longestDark} h (${(longestDark / 24).toFixed(1)} d)`, target: `≤ ${th.maxDarkHours} h`, ok: longestDark <= th.maxDarkHours },
  ];
  const fails = criteria.filter(c => !c.ok).length;
  const verdict = fails === 0 ? 'VIABLE' : fails === 1 ? 'MARGINAL' : 'NO VIABLE';
  return {
    usableSunPct, usableDtePct, sunHours, dteHours, longestDark, longestNoDte,
    criteria, fails, verdict, needsRelay: dteHours === 0,
  };
}

const VERDICT_STYLE = {
  'VIABLE': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'MARGINAL': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'NO VIABLE': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

// "2026-Nov-16 05:00" → "Nov-16 05:00"
const shortTs = ts => (ts || '').slice(5);

function fmtDays(hours) {
  if (hours < 24) return `${hours} horas`;
  const d = hours / 24;
  return `${d.toFixed(d < 10 ? 1 : 0)} días`;
}

class Phase4Manager {
  constructor() {
    let saved = null;
    try { saved = localStorage.getItem(MODE_KEY); } catch (_) { /* almacenamiento no disponible */ }
    this.mode = saved === 'engineering' ? 'engineering' : 'explorer';
    this.scenarios = [];        // máximo 3 escenarios fijados
    this.sitesCatalog = [];
    this.th = { ...DEFAULT_THRESHOLDS };
    this.chartMode = null;      // 'full' | 'zoom' (null = automático según latitud)
    this.busy = false;
    this.showHourly = false;
    this.mainReport = window.lunarReport || null; // escenario cargado en la vista principal
  }

  async init() {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) this.sitesCatalog = await res.json();
    } catch (e) {
      console.warn('No se pudo cargar catálogo en Phase4Manager:', e);
    }

    window.addEventListener('lunar:report', (e) => {
      this.mainReport = e.detail;
      this.renderTop(false);
    });
    window.addEventListener('resize', () => this.drawComparisonChart());

    this.renderModeBar();
    this.applyMode();
    this.renderTop(false);
    this.renderWorkspace();
  }

  // ---------- Perfil ----------

  applyMode() {
    document.body.dataset.mode = this.mode;
    try { localStorage.setItem(MODE_KEY, this.mode); } catch (_) { /* sin almacenamiento */ }
    const on = 'px-3 py-1 rounded-md text-xs font-bold transition bg-sky-500 text-slate-950';
    const off = 'px-3 py-1 rounded-md text-xs font-bold transition text-slate-300 hover:text-white';
    const exp = document.getElementById('btnModeExplorer');
    const eng = document.getElementById('btnModeEngineering');
    if (exp) exp.className = this.mode === 'explorer' ? on : off;
    if (eng) eng.className = this.mode === 'engineering' ? on : off;
    const hint = document.getElementById('modeHint');
    if (hint) {
      hint.textContent = this.mode === 'explorer'
        ? 'Explicaciones sencillas, menos capas en 3D y guía de por qué la Luna es tan extrema.'
        : 'Márgenes sobre el relieve, ventanas operativas, umbrales de viabilidad y exportación.';
    }
    window.dispatchEvent(new CustomEvent('lunar:modechange', { detail: { mode: this.mode } }));
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.applyMode();
    this.renderTop(true);
    this.renderWorkspace();
  }

  currentPanelMode() {
    return document.getElementById('panelModeSelect')?.value || 'auto';
  }

  startLabel(sc) {
    return (sc.timeline[0]?.timestamp_utc || '').split(' ')[0];
  }

  setStatus(msg, kind = 'error') {
    const el = document.getElementById('compStatus');
    if (!el) return;
    if (!msg) { el.className = 'hidden'; el.textContent = ''; return; }
    const styles = {
      error: 'text-xs rounded-lg px-3 py-2 bg-rose-950/60 border border-rose-500/40 text-rose-200',
      info: 'text-xs rounded-lg px-3 py-2 bg-slate-950 border border-slate-700 text-slate-300',
    };
    el.className = styles[kind] || styles.info;
    el.textContent = msg;
  }

  renderModeBar() {
    const barHost = document.getElementById('phase4ModeBar');
    if (!barHost) return;

    barHost.innerHTML = `
      <div class="bg-slate-950/80 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Perfil de Interfaz:</span>
          <div class="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-700">
            <button id="btnModeExplorer">🎓 Modo Explorador (Educativo)</button>
            <button id="btnModeEngineering">🛰️ Modo Ingeniería (Misión)</button>
          </div>
          <span id="modeHint" class="hidden 2xl:inline text-[11px] text-slate-400"></span>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnPinCurrentScenario" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow">
            <span>📌 Fijar Escenario Actual al Comparador</span>
            <span id="pinnedCountBadge" class="mono bg-indigo-950 px-1.5 py-0.5 rounded text-[11px]">0/3</span>
          </button>
        </div>
      </div>
      </div>
    `;

    document.getElementById('btnModeExplorer').addEventListener('click', () => this.setMode('explorer'));
    document.getElementById('btnModeEngineering').addEventListener('click', () => this.setMode('engineering'));
    document.getElementById('btnPinCurrentScenario').addEventListener('click', async () => {
      const siteId = document.getElementById('siteSelect')?.value || 'shackleton-rim';
      const startDate = document.getElementById('startDateInput')?.value || '2026-11-15';
      const params = { site_id: siteId, start_date: startDate };
      if (siteId === 'custom') {
        params.lat = document.getElementById('customLat')?.value || -88.5;
        params.lon = document.getElementById('customLon')?.value || 45.0;
        params.alt_km = document.getElementById('customAlt')?.value || 1.5;
      }
      await this.addScenarioByParams(params);
      document.getElementById('phase4Workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------- Bloque superior según el perfil ----------

  renderTop(animate) {
    const host = document.getElementById('modeTopHost');
    if (!host) return;
    host.innerHTML = this.mode === 'explorer' ? this.getExplorerHTML() : this.getEngineeringHTML();
    if (animate) host.firstElementChild?.classList.add('mode-in');
    this.bindTopEvents();
  }

  getExplorerHTML() {
    return `
      <section class="bg-slate-900 border border-emerald-500/25 rounded-xl p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-white">🎓 ¿Por qué es tan difícil alunizar en el Polo Sur?</h2>
            <p class="text-xs text-slate-400">Cuatro ideas para entender lo que ves en el visor. Mueve la barra de tiempo o pulsa "Simular Ciclo" para verlas en acción.</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">Vista Divulgación</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-amber-400 font-bold text-xs uppercase">1. Día y noche de 14 días</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              En la Tierra un día dura 24 horas. En la Luna, cerca del ecuador, el Sol brilla <strong>casi 15 días seguidos</strong> y luego llega una noche helada de otros 15 días (−170 °C). El lander tiene que sobrevivir con baterías.
            </p>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-sky-400 font-bold text-xs uppercase">2. Sin aire, sin crepúsculo</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              No hay atmósfera que reparta la luz: si una montaña tapa el Sol, se pasa de luz intensa a <strong>oscuridad total</strong>. Las sombras del visor son negras por eso.
            </p>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-indigo-400 font-bold text-xs uppercase">3. La Tierra casi quieta</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              La Luna siempre nos da la misma cara, así que la Tierra no sale ni se pone como el Sol: se queda en la misma zona del cielo y solo <strong>se mece un poco</strong> (libración). En la cara oculta nunca se ve.
            </p>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-teal-400 font-bold text-xs uppercase">4. El dilema del Polo Sur</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              El eje de la Luna casi no está inclinado (<strong>1.54°</strong>), así que en el polo el Sol da vueltas rozando el horizonte. Los fondos de los cráteres nunca reciben luz y guardan <strong>hielo</strong>; las crestas tienen luz casi siempre.
            </p>
          </div>
        </div>

        <div class="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
          💡 <strong class="text-slate-200">Prueba esto:</strong> mira Shackleton y luego cambia a Apollo 11 en "Sitio de alunizaje".
          En el polo el Sol nunca pasa de ~2° de altura; en el ecuador sube hasta casi 90°. Abre "🌕 Luna completa" para ver dónde da el Sol.
        </div>
      </section>
    `;
  }

  getEngineeringHTML() {
    const r = this.mainReport;
    const th = this.th;
    if (!r) {
      return `<section class="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 text-xs text-slate-400">🛰️ Consola de misión: esperando el escenario…</section>`;
    }
    const a = assessViability(r, th);
    const sunWins = computeWindows(r.timeline, 'sun', th.sunMargin);
    const dteWins = computeWindows(r.timeline, 'earth', th.dteMargin);
    const panel = r.summary.panel_mode === 'vertical' ? 'verticales con seguimiento (cos el)' : 'horizontales (sen el)';
    const start = (r.timeline[0]?.timestamp_utc || '').split(' ')[0];

    const input = (id, label, value, step, color) => `
      <label class="flex items-center justify-between gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px]">
        <span class="text-slate-400">${label}</span>
        <input data-th="${id}" type="number" step="${step}" value="${value}" class="th-input mono w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 ${color} font-bold text-right" />
      </label>`;

    const winTable = (wins, color, emptyMsg) => {
      if (!wins.length) {
        return `<div class="p-3 text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">${emptyMsg}</div>`;
      }
      const total = wins.reduce((s, w) => s + w.hours, 0);
      const rows = wins.slice(0, 8).map((w, i) => `
        <tr class="border-t border-slate-800/70">
          <td class="py-1 px-2 text-slate-500">${i + 1}</td>
          <td class="py-1 px-2 text-slate-200">${w.openStart ? '◀ ' : ''}${shortTs(w.startTs)}</td>
          <td class="py-1 px-2 text-slate-200">${shortTs(w.endTs)}${w.openEnd ? ' ▶' : ''}</td>
          <td class="py-1 px-2 ${color} text-right">${w.hours} h</td>
          <td class="py-1 px-2 text-slate-400 text-right">+${w.minMargin.toFixed(2)}°</td>
        </tr>`).join('');
      const more = wins.length > 8 ? `<tr><td colspan="5" class="py-1 px-2 text-slate-500">… y ${wins.length - 8} ventanas más</td></tr>` : '';
      return `
        <table class="w-full text-[11px] mono">
          <thead><tr class="text-slate-500">
            <th class="py-1 px-2 text-left">#</th><th class="py-1 px-2 text-left">Inicio (UTC)</th><th class="py-1 px-2 text-left">Fin</th>
            <th class="py-1 px-2 text-right">Dur.</th><th class="py-1 px-2 text-right">Margen mín.</th>
          </tr></thead>
          <tbody>${rows}${more}</tbody>
        </table>
        <div class="mt-1 text-[10px] text-slate-500">${wins.length} ventana(s) · ${total} h en total · ◀ ya iniciada / ▶ continúa después del periodo</div>`;
    };

    const hourly = this.showHourly ? this.getHourlyTableHTML(r) : '';

    return `
      <section class="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-white">🛰️ Consola de Misión · ${r.site.name}</h2>
            <p class="text-xs text-slate-400 mono">Desde ${start} · ${r.timeline.length - 1} h · paneles ${panel} · los umbrales deciden el veredicto (aquí y en el comparador)</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnToggleHourly" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition">${this.showHourly ? 'Ocultar' : 'Ver'} tabla horaria</button>
            <button id="btnExportCSV" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">⬇ CSV</button>
            <button id="btnExportJSON" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition">⬇ JSON</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          ${input('sunMargin', 'Margen solar mín. (°)', th.sunMargin, 0.25, 'text-amber-300')}
          ${input('dteMargin', 'Margen DTE mín. (°)', th.dteMargin, 0.25, 'text-sky-300')}
          ${input('minSunPct', 'Luz útil mín. (%)', th.minSunPct, 5, 'text-amber-300')}
          ${input('minDtePct', 'DTE útil mín. (%)', th.minDtePct, 5, 'text-sky-300')}
          ${input('maxDarkHours', 'Sombra máx. (h)', th.maxDarkHours, 12, 'text-rose-300')}
          <button id="btnResetTh" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition">Restaurar umbrales</button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase text-slate-400">Veredicto</span>
              <span class="mono text-sm font-bold px-2.5 py-1 rounded border ${VERDICT_STYLE[a.verdict]}">${a.verdict}</span>
            </div>
            <ul class="space-y-1.5 text-xs">
              ${a.criteria.map(c => `
                <li class="flex items-center justify-between gap-2">
                  <span class="${c.ok ? 'text-emerald-400' : 'text-rose-400'}">${c.ok ? '✔' : '✖'} ${c.label}</span>
                  <span class="mono text-slate-200">${c.value} <span class="text-slate-500">${c.target}</span></span>
                </li>`).join('')}
            </ul>
            <div class="border-t border-slate-800 pt-2 space-y-1 text-[11px] text-slate-400 mono">
              <div>Máx. sin enlace DTE: <span class="text-slate-200">${a.longestNoDte} h (${(a.longestNoDte / 24).toFixed(1)} d)</span></div>
              <div>Eficiencia media con luz: <span class="text-slate-200">${r.summary.mean_panel_efficiency_lit_pct ?? '—'}%</span></div>
              <div>Elevación solar máx.: <span class="text-slate-200">${r.summary.max_solar_elevation_deg.toFixed(2)}°</span></div>
              ${a.needsRelay ? '<div class="text-rose-300 font-semibold">⚠ Sin enlace DTE útil: requiere satélite relé</div>' : ''}
            </div>
          </div>

          <div class="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div class="text-xs font-bold text-amber-300 mb-1">☀ Ventanas de luz útil <span class="text-slate-500 font-normal">(margen ≥ ${th.sunMargin}°)</span></div>
            ${winTable(sunWins, 'text-amber-300', 'Sin ventanas de luz útil con este margen en el periodo.')}
          </div>

          <div class="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div class="text-xs font-bold text-sky-300 mb-1">📡 Ventanas de enlace DTE <span class="text-slate-500 font-normal">(margen ≥ ${th.dteMargin}°)</span></div>
            ${winTable(dteWins, 'text-sky-300', 'Sin ventanas de enlace directo con este margen: se necesita un satélite relé.')}
          </div>
        </div>
        ${hourly}
      </section>
    `;
  }

  getHourlyTableHTML(r) {
    const th = this.th;
    const rows = r.timeline.filter((_, idx) => idx % 12 === 0);
    return `
      <div class="overflow-x-auto max-h-80 overflow-y-auto border border-slate-800 rounded-lg">
        <table class="w-full text-left border-collapse text-xs mono">
          <thead class="sticky top-0">
            <tr class="bg-slate-950 text-slate-400 border-b border-slate-800">
              <th class="py-2 px-3">Timestamp (UTC)</th><th class="py-2 px-3">Sol Az / El</th><th class="py-2 px-3">Horizonte Sol</th>
              <th class="py-2 px-3">Potencia PV</th><th class="py-2 px-3">Tierra Az / El</th><th class="py-2 px-3">Estado DTE</th><th class="py-2 px-3">Sunset en</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/70 bg-slate-900/40">
            ${rows.map(t => `
              <tr class="hover:bg-slate-800/40">
                <td class="py-1.5 px-3 text-slate-200">${t.timestamp_utc}</td>
                <td class="py-1.5 px-3 text-amber-300">${t.sun.az.toFixed(1)}° / ${t.sun.el.toFixed(2)}°</td>
                <td class="py-1.5 px-3 text-slate-400">${t.sun.horizon_el.toFixed(2)}°</td>
                <td class="py-1.5 px-3 ${isUsable(t, 'sun', th.sunMargin) ? 'text-emerald-400' : 'text-rose-400'}">${t.sun.solar_power_efficiency_pct.toFixed(1)}%</td>
                <td class="py-1.5 px-3 text-sky-300">${t.earth.az.toFixed(1)}° / ${t.earth.el.toFixed(2)}°</td>
                <td class="py-1.5 px-3">${
                  isUsable(t, 'earth', th.dteMargin)
                    ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">NOMINAL</span>'
                    : t.earth.visible
                    ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">RASANTE</span>'
                    : '<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">OCLUIDO</span>'
                }</td>
                <td class="py-1.5 px-3 text-slate-300">${t.hours_to_sunset === null ? 'fin periodo' : t.hours_to_sunset.toFixed(1) + 'h'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-slate-500">* Muestras cada 12 h. Exporta CSV/JSON para obtener todas las horas.</p>`;
  }

  bindTopEvents() {
    document.querySelectorAll('.th-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = parseFloat(inp.value);
        if (!Number.isFinite(v)) return;
        this.th[inp.dataset.th] = v;
        this.renderTop(false);
        this.renderWorkspace();
      });
    });
    document.getElementById('btnResetTh')?.addEventListener('click', () => {
      this.th = { ...DEFAULT_THRESHOLDS };
      this.renderTop(false);
      this.renderWorkspace();
    });
    document.getElementById('btnToggleHourly')?.addEventListener('click', () => {
      this.showHourly = !this.showHourly;
      this.renderTop(false);
    });
    document.getElementById('btnExportCSV')?.addEventListener('click', () => this.exportData('csv'));
    document.getElementById('btnExportJSON')?.addEventListener('click', () => this.exportData('json'));
  }

  // ---------- Comparador ----------

  renderWorkspace() {
    const host = document.getElementById('phase4Workspace');
    if (!host) return;
    const explorer = this.mode === 'explorer';

    host.innerHTML = `
      <div class="space-y-6 pb-12">
        <section class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>${explorer ? 'Compara sitios y fechas' : 'Comparador Multi-Escenario (Trade-off Ciencia vs. Ingeniería)'}</span>
                <span class="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Hasta 3 Escenarios</span>
              </h2>
              <p class="text-xs text-slate-400">${explorer
                ? 'Pon lado a lado hasta 3 sitios o fechas y mira cuál tiene más luz y más contacto con la Tierra.'
                : 'Evalúa sitios candidatos o impactos por retrasos de lanzamiento lado a lado (veredicto con los umbrales de la consola).'}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select id="compQuickSite" class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white">
                ${this.sitesCatalog.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
              <input id="compQuickDate" type="date" value="${document.getElementById('startDateInput')?.value || '2026-11-15'}" class="mono bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" />
              <button id="btnAddQuickScenario" class="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition">+ Añadir</button>
              <button id="btnClearScenarios" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">Limpiar</button>
            </div>
          </div>

          <div id="compStatus" class="hidden"></div>

          <div id="comparisonCardsGrid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${this.getComparisonCardsHTML()}
          </div>

          <div id="comparisonChartWrapper" class="${this.scenarios.length > 0 ? '' : 'hidden'} bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-300">${explorer ? 'Altura del Sol día por día' : 'Elevación solar a lo largo del periodo (30 días)'}</span>
                <div class="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[11px]">
                  <button data-chart-mode="zoom" class="chart-mode-btn px-2 py-0.5 rounded">Zoom horizonte ±10°</button>
                  <button data-chart-mode="full" class="chart-mode-btn px-2 py-0.5 rounded">Escala completa</button>
                </div>
              </div>
              <div id="compChartLegend" class="flex flex-wrap gap-3 text-xs"></div>
            </div>
            <p class="text-[11px] text-slate-500 mb-1">${explorer
              ? 'Línea = altura del Sol · punteada = altura de las montañas en esa dirección · barras de abajo = días con luz'
              : 'Línea sólida = elevación del Sol · punteada = horizonte topográfico en esa dirección · franjas inferiores = horas con Sol visible (cada escenario)'}</p>
            <div class="w-full h-64">
              <canvas id="comparisonCanvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </section>
      </div>
    `;

    if (this.scenarios.length > 0) this.drawComparisonChart();
    this.bindWorkspaceEvents();
  }

  getComparisonCardsHTML() {
    if (this.scenarios.length === 0) {
      return `
        <div class="md:col-span-3 p-8 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-2">
          <div class="text-sm font-semibold text-slate-300">No hay escenarios fijados para comparar</div>
          <p class="text-xs text-slate-400 max-w-xl mx-auto">
            Usa el botón superior <strong>"📌 Fijar Escenario Actual"</strong> o selecciona un sitio y fecha arriba y pulsa <strong>"+ Añadir"</strong> para contrastar hasta 3 planes de alunizaje lado a lado.
          </p>
        </div>`;
    }

    const colors = ['border-amber-500/50', 'border-sky-500/50', 'border-emerald-500/50'];
    const badges = ['bg-amber-500/20 text-amber-300', 'bg-sky-500/20 text-sky-300', 'bg-emerald-500/20 text-emerald-300'];
    const assessed = this.scenarios.map(sc => assessViability(sc, this.th));
    const bestSun = Math.max(...assessed.map(a => a.usableSunPct));
    const bestDte = Math.max(...assessed.map(a => a.usableDtePct));
    const multi = this.scenarios.length > 1;

    return this.scenarios.map((sc, idx) => {
      const a = assessed[idx];
      const starSun = multi && a.usableSunPct === bestSun ? ' ★' : '';
      const starDte = multi && a.usableDtePct === bestDte ? ' ★' : '';
      const head = `
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="mono text-[11px] font-bold px-2 py-0.5 rounded ${badges[idx]}">ESCENARIO #${idx + 1}</span>
            <button data-remove-idx="${idx}" class="btn-remove-sc text-xs text-slate-500 hover:text-rose-400">✕ Quitar</button>
          </div>
          <h3 class="font-bold text-sm text-white">${sc.site.name}</h3>
          <p class="mono text-[11px] text-slate-400 mt-0.5">Inicio: ${this.startLabel(sc)} • Lat ${sc.site.lat.toFixed(2)}°</p>
        </div>`;

      if (this.mode === 'explorer') {
        const reasons = [];
        a.criteria.forEach(c => {
          if (c.ok) return;
          if (c.id === 'sun') reasons.push('poca luz para los paneles');
          if (c.id === 'dte') reasons.push(a.needsRelay ? 'no se ve la Tierra: necesitaría un satélite relé' : 'poco tiempo de contacto con la Tierra');
          if (c.id === 'dark') reasons.push(`sombras de hasta ${fmtDays(a.longestDark)} seguidos`);
        });
        const verdict = a.verdict === 'VIABLE'
          ? '<span class="text-emerald-400 font-semibold">✅ Buen sitio para esta fecha: tiene luz y contacto suficientes.</span>'
          : `<span class="${a.verdict === 'MARGINAL' ? 'text-amber-300' : 'text-rose-400'} font-semibold">${a.verdict === 'MARGINAL' ? '⚠️ Se puede, con riesgo' : '❌ Muy difícil'}: ${reasons.join('; ')}.</span>`;
        return `
          <div class="bg-slate-950 border ${colors[idx]} rounded-xl p-4 flex flex-col justify-between space-y-4">
            ${head}
            <div class="space-y-2 text-xs border-t border-slate-800/80 pt-3 text-slate-300">
              <div>☀️ Hay luz útil <b class="text-white">${a.usableSunPct.toFixed(0)}%</b> del mes${starSun}</div>
              <div>📡 Contacto con la Tierra <b class="text-white">${a.usableDtePct.toFixed(0)}%</b> del mes${starDte}</div>
              <div>🌑 La sombra más larga dura <b class="text-white">${fmtDays(a.longestDark)}</b></div>
              <div>⬆️ El Sol sube como máximo <b class="text-white">${sc.summary.max_solar_elevation_deg.toFixed(1)}°</b></div>
            </div>
            <div class="pt-2 border-t border-slate-800/80 text-[11px]">${verdict}</div>
          </div>`;
      }

      return `
        <div class="bg-slate-950 border ${colors[idx]} rounded-xl p-4 flex flex-col justify-between space-y-4">
          ${head}
          <div class="space-y-2 text-xs border-t border-slate-800/80 pt-3">
            <div class="flex justify-between"><span class="text-slate-400">Luz útil (≥${this.th.sunMargin}°):</span><span class="mono font-bold ${starSun ? 'text-emerald-400' : 'text-white'}">${a.usableSunPct.toFixed(1)}% (${a.sunHours}h)${starSun}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">DTE útil (≥${this.th.dteMargin}°):</span><span class="mono font-bold ${starDte ? 'text-emerald-400' : 'text-white'}">${a.usableDtePct.toFixed(1)}% (${a.dteHours}h)${starDte}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Elevación solar máx.:</span><span class="mono font-semibold text-amber-300">${sc.summary.max_solar_elevation_deg.toFixed(2)}°</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Sombra continua máx.:</span><span class="mono font-semibold ${a.criteria[2].ok ? 'text-slate-200' : 'text-rose-400'}">${a.longestDark} h (${(a.longestDark / 24).toFixed(1)}d)</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Máx. sin DTE:</span><span class="mono font-semibold text-slate-200">${a.longestNoDte} h</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Paneles:</span><span class="mono text-slate-300">${sc.summary.panel_mode === 'vertical' ? 'verticales' : 'horizontales'} · ${sc.summary.mean_panel_efficiency_lit_pct ?? '—'}%</span></div>
          </div>
          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
            <span class="mono font-bold px-2 py-0.5 rounded border ${VERDICT_STYLE[a.verdict]}">${a.verdict}</span>
            <span class="text-slate-400">${a.criteria.map(c => (c.ok ? '✔' : '✖') + ' ' + c.label.split(' ')[0]).join(' · ')}</span>
          </div>
          ${a.needsRelay ? '<div class="text-[11px] text-rose-300 font-semibold -mt-2">⚠ Requiere satélite relé (sin DTE útil)</div>' : ''}
        </div>`;
    }).join('');
  }

  drawComparisonChart() {
    const canvas = document.getElementById('comparisonCanvas');
    if (!canvas || this.scenarios.length === 0) return;

    // Automático: si hay un sitio polar, la escala completa (±90°) aplasta su curva → zoom
    const anyPolar = this.scenarios.some(sc => Math.abs(sc.site.lat) >= 75);
    const mode = this.chartMode || (anyPolar ? 'zoom' : 'full');
    document.querySelectorAll('.chart-mode-btn').forEach(btn => {
      btn.className = 'chart-mode-btn px-2 py-0.5 rounded ' +
        (btn.dataset.chartMode === mode ? 'bg-slate-700 text-sky-300 font-bold' : 'text-slate-400 hover:text-white');
    });

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const n = this.scenarios.length;
    const bandH = 6, bandGap = 3;
    const W = rect.width, H = rect.height;
    const pad = { top: 12, right: 16, bottom: 22 + n * (bandH + bandGap) + 4, left: 40 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    let minEl, maxEl, step;
    if (mode === 'zoom') {
      minEl = -10; maxEl = 10; step = 5;
    } else {
      const allEls = this.scenarios.flatMap(s => s.timeline.map(t => t.sun.el));
      step = 15;
      minEl = Math.max(-90, Math.floor(Math.min(...allEls) / step) * step);
      maxEl = Math.min(90, Math.ceil(Math.max(...allEls) / step) * step);
      if (maxEl - minEl < 2 * step) { minEl -= step; maxEl += step; }
    }

    const maxHours = Math.max(...this.scenarios.map(s => s.timeline.length - 1), 1);
    const xToPx = h => pad.left + (h / maxHours) * plotW;
    const yToPx = el => pad.top + plotH - ((el - minEl) / (maxEl - minEl)) * plotH;

    ctx.clearRect(0, 0, W, H);
    ctx.font = '10px JetBrains Mono, monospace';

    for (let el = minEl; el <= maxEl; el += step) {
      const y = yToPx(el);
      ctx.strokeStyle = el === 0 ? '#475569' : '#1e293b';
      ctx.setLineDash(el === 0 ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${el}°`, 4, y + 3);
    }
    ctx.setLineDash([]);

    const days = maxHours / 24;
    for (let d = 0; d <= days; d += 5) {
      const x = xToPx(d * 24);
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
      ctx.fillStyle = '#64748b';
      const lbl = `día ${d}`;
      const tw = ctx.measureText(lbl).width;
      ctx.fillText(lbl, Math.min(x - tw / 2, W - tw - 2), H - 6);
    }

    const strokeColors = ['#fbbf24', '#38bdf8', '#34d399'];
    const legendHost = document.getElementById('compChartLegend');
    legendHost.innerHTML = '';

    ctx.save();
    ctx.beginPath(); ctx.rect(pad.left, pad.top, plotW, plotH); ctx.clip();
    this.scenarios.forEach((sc, idx) => {
      const color = strokeColors[idx];
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      sc.timeline.forEach((pt, i) => (i === 0 ? ctx.moveTo(xToPx(i), yToPx(pt.sun.horizon_el)) : ctx.lineTo(xToPx(i), yToPx(pt.sun.horizon_el))));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      sc.timeline.forEach((pt, i) => (i === 0 ? ctx.moveTo(xToPx(i), yToPx(pt.sun.el)) : ctx.lineTo(xToPx(i), yToPx(pt.sun.el))));
      ctx.stroke();
    });
    ctx.restore();

    this.scenarios.forEach((sc, idx) => {
      const y = pad.top + plotH + 8 + idx * (bandH + bandGap);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pad.left, y, xToPx(sc.timeline.length - 1) - pad.left, bandH);
      ctx.fillStyle = strokeColors[idx];
      let runStart = null;
      sc.timeline.forEach((pt, i) => {
        if (pt.sun.visible && runStart === null) runStart = i;
        if ((!pt.sun.visible || i === sc.timeline.length - 1) && runStart !== null) {
          const end = pt.sun.visible ? i : i - 1;
          ctx.fillRect(xToPx(runStart), y, Math.max(1, xToPx(end + 1) - xToPx(runStart)), bandH);
          runStart = null;
        }
      });

      const item = document.createElement('span');
      item.className = 'flex items-center gap-1.5 text-slate-300';
      item.innerHTML = `<span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${strokeColors[idx]}"></span>${sc.site.name.split('(')[0].trim()} (${this.startLabel(sc)})`;
      legendHost.appendChild(item);
    });
  }

  async addScenarioByParams(paramsObj) {
    if (this.busy) return;
    this.busy = true;
    this.setStatus('Evaluando escenario…', 'info');
    try {
      const query = new URLSearchParams({ ...paramsObj, days: 30, panel: this.currentPanelMode() }).toString();
      const res = await fetch(`/api/evaluate?${query}`);
      if (!res.ok) {
        let detail = `Error ${res.status} evaluando el escenario`;
        try { detail = (await res.json()).detail || detail; } catch (_) { /* respuesta no JSON */ }
        throw new Error(detail);
      }
      const report = await res.json();
      if (this.scenarios.length >= 3) this.scenarios.shift(); // reemplaza el más antiguo
      this.scenarios.push(report);
      document.getElementById('pinnedCountBadge').textContent = `${this.scenarios.length}/3`;
      this.renderWorkspace();
    } catch (err) {
      console.warn(err);
      this.setStatus(err.message === 'Failed to fetch'
        ? 'No hay conexión con el servidor local (¿está corriendo api.py?).'
        : err.message, 'error');
    } finally {
      this.busy = false;
    }
  }

  exportData(format) {
    const target = this.mainReport || this.scenarios[0];
    if (!target) return;
    const date = (target.timeline[0]?.timestamp_utc || '').split(' ')[0];

    if (format === 'json') {
      const payload = { thresholds: this.th, viability: assessViability(target, this.th), ...target };
      this.triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `lunar_mission_${target.site.id}_${date}.json`);
      return;
    }

    const headers = ['timestamp_utc', 'sun_az_deg', 'sun_el_deg', 'sun_horizon_deg', 'sun_margin_deg', 'sun_visible', 'solar_eff_pct',
      'earth_az_deg', 'earth_el_deg', 'earth_horizon_deg', 'earth_margin_deg', 'dte_visible', 'hours_to_sunset', 'hours_to_earthset'];
    const rows = target.timeline.map(t => [
      t.timestamp_utc, t.sun.az, t.sun.el, t.sun.horizon_el, (t.sun.el - t.sun.horizon_el).toFixed(3), t.sun.visible, t.sun.solar_power_efficiency_pct,
      t.earth.az, t.earth.el, t.earth.horizon_el, (t.earth.el - t.earth.horizon_el).toFixed(3), t.earth.visible,
      t.hours_to_sunset ?? 'BEYOND_PERIOD', t.hours_to_earthset ?? 'BEYOND_PERIOD',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    this.triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `lunar_ephemeris_${target.site.id}_${date}.csv`);
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  bindWorkspaceEvents() {
    document.getElementById('btnAddQuickScenario')?.addEventListener('click', async () => {
      const siteId = document.getElementById('compQuickSite').value;
      const startDate = document.getElementById('compQuickDate').value;
      await this.addScenarioByParams({ site_id: siteId, start_date: startDate });
    });

    document.getElementById('btnClearScenarios')?.addEventListener('click', () => {
      this.scenarios = [];
      document.getElementById('pinnedCountBadge').textContent = '0/3';
      this.renderWorkspace();
    });

    document.querySelectorAll('.btn-remove-sc').forEach(btn => {
      btn.addEventListener('click', () => {
        this.scenarios.splice(parseInt(btn.dataset.removeIdx, 10), 1);
        document.getElementById('pinnedCountBadge').textContent = `${this.scenarios.length}/3`;
        this.renderWorkspace();
      });
    });

    document.querySelectorAll('.chart-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.chartMode = btn.dataset.chartMode;
        this.drawComparisonChart();
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const phase4 = new Phase4Manager();
  phase4.init();
});
