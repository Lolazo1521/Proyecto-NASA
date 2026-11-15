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
// Todos los textos salen de static/js/i18n.js (t) y se vuelven a pintar con 'lunar:langchange'.

const t = (key, vars) => window.I18N.t(key, vars);
const fmtDays = (h) => window.I18N.fmtDays(h);

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
  timeline.forEach((s, i) => {
    if (isUsable(s, key, minMargin)) {
      const m = marginOf(s, key);
      if (!cur) cur = { start: i, end: i, minMargin: m, maxEl: s[key].el };
      cur.end = i;
      cur.minMargin = Math.min(cur.minMargin, m);
      cur.maxEl = Math.max(cur.maxEl, s[key].el);
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
  for (const s of timeline) {
    if (isUsable(s, key, minMargin)) cur = 0;
    else best = Math.max(best, ++cur);
  }
  return best;
}

// Devuelve datos (sin textos): los textos se generan al pintar, en el idioma activo
function assessViability(report, th) {
  const tl = report.timeline;
  const n = tl.length;
  const sunHours = tl.filter(s => isUsable(s, 'sun', th.sunMargin)).length;
  const dteHours = tl.filter(s => isUsable(s, 'earth', th.dteMargin)).length;
  const usableSunPct = (sunHours / n) * 100;
  const usableDtePct = (dteHours / n) * 100;
  const longestDark = longestGap(tl, 'sun', th.sunMargin);
  const longestNoDte = longestGap(tl, 'earth', th.dteMargin);

  const criteria = [
    { id: 'sun', value: `${usableSunPct.toFixed(1)}% (${sunHours} h)`, target: `≥ ${th.minSunPct}%`, ok: usableSunPct >= th.minSunPct },
    { id: 'dte', value: `${usableDtePct.toFixed(1)}% (${dteHours} h)`, target: `≥ ${th.minDtePct}%`, ok: usableDtePct >= th.minDtePct },
    { id: 'dark', value: `${longestDark} h (${(longestDark / 24).toFixed(1)} d)`, target: `≤ ${th.maxDarkHours} h`, ok: longestDark <= th.maxDarkHours },
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

// Altura máxima del Sol en palabras (para el modo Explorador)
function sunHeightWords(el) {
  const key = el < 5 ? 'sunHeight.veryLow' : el < 30 ? 'sunHeight.low' : 'sunHeight.high';
  return t(key, { el: el.toFixed(1) });
}

// Mismo criterio que index.html para mostrar el nombre del sitio en el idioma activo
function siteName(site) {
  if (site.id === 'custom') return t('site.custom.name', { lat: site.lat.toFixed(2), lon: site.lon.toFixed(2) });
  return window.I18N.has(`site.${site.id}.name`) ? t(`site.${site.id}.name`) : site.name;
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
    this.status = null;         // { key, vars, kind } del mensaje del comparador
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
    window.addEventListener('lunar:langchange', () => {
      this.renderModeBar();
      this.updateModeButtons();
      this.renderTop(false);
      this.renderWorkspace();
    });
    window.addEventListener('resize', () => this.drawComparisonChart());

    this.renderModeBar();
    this.applyMode();
    this.renderTop(false);
    this.renderWorkspace();
  }

  // ---------- Perfil ----------

  updateModeButtons() {
    const on = 'px-3 py-1 rounded-md text-xs font-bold transition bg-sky-500 text-slate-950';
    const off = 'px-3 py-1 rounded-md text-xs font-bold transition text-slate-300 hover:text-white';
    const exp = document.getElementById('btnModeExplorer');
    const eng = document.getElementById('btnModeEngineering');
    if (exp) exp.className = this.mode === 'explorer' ? on : off;
    if (eng) eng.className = this.mode === 'engineering' ? on : off;
    const hint = document.getElementById('modeHint');
    if (hint) hint.textContent = t(this.mode === 'explorer' ? 'mode.hintExp' : 'mode.hintEng');
    const pin = document.getElementById('pinLabel');
    if (pin) pin.textContent = t(this.mode === 'explorer' ? 'pin.buttonExp' : 'pin.button');
  }

  applyMode() {
    document.body.dataset.mode = this.mode;
    try { localStorage.setItem(MODE_KEY, this.mode); } catch (_) { /* sin almacenamiento */ }
    this.updateModeButtons();
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

  setStatus(status) {
    this.status = status;
    this.renderStatus();
  }

  renderStatus() {
    const el = document.getElementById('compStatus');
    if (!el) return;
    if (!this.status) { el.className = 'hidden'; el.textContent = ''; return; }
    const styles = {
      error: 'text-xs rounded-lg px-3 py-2 bg-rose-950/60 border border-rose-500/40 text-rose-200',
      info: 'text-xs rounded-lg px-3 py-2 bg-slate-950 border border-slate-700 text-slate-300',
    };
    el.className = styles[this.status.kind] || styles.info;
    el.textContent = t(this.status.key, this.status.vars);
  }

  renderModeBar() {
    const barHost = document.getElementById('phase4ModeBar');
    if (!barHost) return;

    barHost.innerHTML = `
      <div class="bg-slate-950/80 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">${t('mode.label')}</span>
          <div class="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-700">
            <button id="btnModeExplorer">${t('mode.explorer')}</button>
            <button id="btnModeEngineering">${t('mode.engineering')}</button>
          </div>
          <span id="modeHint" class="hidden 2xl:inline text-[11px] text-slate-400"></span>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnPinCurrentScenario" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow">
            <span id="pinLabel">${t(this.mode === 'explorer' ? 'pin.buttonExp' : 'pin.button')}</span>
            <span id="pinnedCountBadge" class="mono bg-indigo-950 px-1.5 py-0.5 rounded text-[11px]">${this.scenarios.length}/3</span>
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
    const card = (n, color) => `
      <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
        <div class="${color} font-bold text-sm">${t(`guide.c${n}.title`)}</div>
        <p class="text-sm text-slate-300 leading-relaxed">${t(`guide.c${n}.body`)}</p>
      </div>`;
    return `
      <section class="bg-slate-900 border border-emerald-500/25 rounded-xl p-5 space-y-4">
        <div class="text-sm text-slate-300 bg-sky-500/10 border border-sky-500/30 rounded-lg px-4 py-3">${t('guide.steps')}</div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold text-white">${t('guide.title')}</h2>
            <p class="text-sm text-slate-400">${t('guide.sub')}</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">${t('guide.badge')}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${card(1, 'text-amber-300')}
          ${card(2, 'text-sky-300')}
          ${card(3, 'text-indigo-300')}
          ${card(4, 'text-teal-300')}
        </div>
        <div class="text-sm text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3">${t('guide.try')}</div>
      </section>
    `;
  }

  getEngineeringHTML() {
    const r = this.mainReport;
    const th = this.th;
    if (!r) {
      return `<section class="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 text-xs text-slate-400">${t('eng.waiting')}</section>`;
    }
    const a = assessViability(r, th);
    const sunWins = computeWindows(r.timeline, 'sun', th.sunMargin);
    const dteWins = computeWindows(r.timeline, 'earth', th.dteMargin);
    const panel = t(r.summary.panel_mode === 'vertical' ? 'eng.panelVertical' : 'eng.panelHorizontal');
    const start = (r.timeline[0]?.timestamp_utc || '').split(' ')[0];

    const input = (id, value, step, color) => `
      <label class="flex items-center justify-between gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px]">
        <span class="text-slate-400">${t('th.' + id)}</span>
        <input data-th="${id}" type="number" step="${step}" value="${value}" class="th-input mono w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 ${color} font-bold text-right" />
      </label>`;

    const winTable = (wins, color, emptyKey) => {
      if (!wins.length) {
        return `<div class="p-3 text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">${t(emptyKey)}</div>`;
      }
      const total = wins.reduce((sum, w) => sum + w.hours, 0);
      const rows = wins.slice(0, 8).map((w, i) => `
        <tr class="border-t border-slate-800/70">
          <td class="py-1 px-2 text-slate-500">${i + 1}</td>
          <td class="py-1 px-2 text-slate-200">${w.openStart ? '◀ ' : ''}${shortTs(w.startTs)}</td>
          <td class="py-1 px-2 text-slate-200">${shortTs(w.endTs)}${w.openEnd ? ' ▶' : ''}</td>
          <td class="py-1 px-2 ${color} text-right">${w.hours} h</td>
          <td class="py-1 px-2 text-slate-400 text-right">+${w.minMargin.toFixed(2)}°</td>
        </tr>`).join('');
      const more = wins.length > 8 ? `<tr><td colspan="5" class="py-1 px-2 text-slate-500">${t('win.more', { n: wins.length - 8 })}</td></tr>` : '';
      return `
        <table class="w-full text-[11px] mono">
          <thead><tr class="text-slate-500">
            <th class="py-1 px-2 text-left">#</th><th class="py-1 px-2 text-left">${t('win.start')}</th><th class="py-1 px-2 text-left">${t('win.end')}</th>
            <th class="py-1 px-2 text-right">${t('win.dur')}</th><th class="py-1 px-2 text-right">${t('win.minMargin')}</th>
          </tr></thead>
          <tbody>${rows}${more}</tbody>
        </table>
        <div class="mt-1 text-[10px] text-slate-500">${t('win.footer', { n: wins.length, h: total })}</div>`;
    };

    const hourly = this.showHourly ? this.getHourlyTableHTML(r) : '';

    return `
      <section class="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-white">${t('eng.title', { site: siteName(r.site) })}</h2>
            <p class="text-xs text-slate-400 mono">${t('eng.sub', { start, h: r.timeline.length - 1, panel })}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnToggleHourly" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition">${t(this.showHourly ? 'eng.hideHourly' : 'eng.showHourly')}</button>
            <button id="btnExportCSV" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">⬇ CSV</button>
            <button id="btnExportJSON" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition">⬇ JSON</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          ${input('sunMargin', th.sunMargin, 0.25, 'text-amber-300')}
          ${input('dteMargin', th.dteMargin, 0.25, 'text-sky-300')}
          ${input('minSunPct', th.minSunPct, 5, 'text-amber-300')}
          ${input('minDtePct', th.minDtePct, 5, 'text-sky-300')}
          ${input('maxDarkHours', th.maxDarkHours, 12, 'text-rose-300')}
          <button id="btnResetTh" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition">${t('eng.reset')}</button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase text-slate-400">${t('eng.verdict')}</span>
              <span class="mono text-sm font-bold px-2.5 py-1 rounded border ${VERDICT_STYLE[a.verdict]}">${t('verdict.' + a.verdict)}</span>
            </div>
            <ul class="space-y-1.5 text-xs">
              ${a.criteria.map(c => `
                <li class="flex items-center justify-between gap-2">
                  <span class="${c.ok ? 'text-emerald-400' : 'text-rose-400'}">${c.ok ? '✔' : '✖'} ${t('crit.' + c.id)}</span>
                  <span class="mono text-slate-200">${c.value} <span class="text-slate-500">${c.target}</span></span>
                </li>`).join('')}
            </ul>
            <div class="border-t border-slate-800 pt-2 space-y-1 text-[11px] text-slate-400 mono">
              <div>${t('eng.maxNoDte')} <span class="text-slate-200">${a.longestNoDte} h (${(a.longestNoDte / 24).toFixed(1)} d)</span></div>
              <div>${t('eng.meanEff')} <span class="text-slate-200">${r.summary.mean_panel_efficiency_lit_pct ?? '—'}%</span></div>
              <div>${t('eng.maxEl')} <span class="text-slate-200">${r.summary.max_solar_elevation_deg.toFixed(2)}°</span></div>
              ${a.needsRelay ? `<div class="text-rose-300 font-semibold">${t('eng.relay')}</div>` : ''}
            </div>
          </div>

          <div class="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div class="text-xs font-bold text-amber-300 mb-1">${t('eng.sunWin')} <span class="text-slate-500 font-normal">${t('eng.marginGe', { m: th.sunMargin })}</span></div>
            ${winTable(sunWins, 'text-amber-300', 'eng.noSunWin')}
          </div>

          <div class="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div class="text-xs font-bold text-sky-300 mb-1">${t('eng.dteWin')} <span class="text-slate-500 font-normal">${t('eng.marginGe', { m: th.dteMargin })}</span></div>
            ${winTable(dteWins, 'text-sky-300', 'eng.noDteWin')}
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
              <th class="py-2 px-3">${t('hourly.ts')}</th><th class="py-2 px-3">${t('hourly.sun')}</th><th class="py-2 px-3">${t('hourly.sunHorizon')}</th>
              <th class="py-2 px-3">${t('hourly.pv')}</th><th class="py-2 px-3">${t('hourly.earth')}</th><th class="py-2 px-3">${t('hourly.dte')}</th><th class="py-2 px-3">${t('hourly.sunset')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/70 bg-slate-900/40">
            ${rows.map(s => `
              <tr class="hover:bg-slate-800/40">
                <td class="py-1.5 px-3 text-slate-200">${s.timestamp_utc}</td>
                <td class="py-1.5 px-3 text-amber-300">${s.sun.az.toFixed(1)}° / ${s.sun.el.toFixed(2)}°</td>
                <td class="py-1.5 px-3 text-slate-400">${s.sun.horizon_el.toFixed(2)}°</td>
                <td class="py-1.5 px-3 ${isUsable(s, 'sun', th.sunMargin) ? 'text-emerald-400' : 'text-rose-400'}">${s.sun.solar_power_efficiency_pct.toFixed(1)}%</td>
                <td class="py-1.5 px-3 text-sky-300">${s.earth.az.toFixed(1)}° / ${s.earth.el.toFixed(2)}°</td>
                <td class="py-1.5 px-3">${
                  isUsable(s, 'earth', th.dteMargin)
                    ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">${t('hourly.nominal')}</span>`
                    : s.earth.visible
                    ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">${t('hourly.grazing')}</span>`
                    : `<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">${t('hourly.occluded')}</span>`
                }</td>
                <td class="py-1.5 px-3 text-slate-300">${s.hours_to_sunset === null ? t('hourly.endPeriod') : s.hours_to_sunset.toFixed(1) + 'h'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-slate-500">${t('hourly.note')}</p>`;
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
    // Conservar lo que el usuario tenía elegido en el selector rápido al volver a pintar
    const prevSite = document.getElementById('compQuickSite')?.value;
    const prevDate = document.getElementById('compQuickDate')?.value;
    const quickDate = prevDate || document.getElementById('startDateInput')?.value || '2026-11-15';

    host.innerHTML = `
      <div class="space-y-6 pb-12">
        <section class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>${t(explorer ? 'comp.titleExp' : 'comp.titleEng')}</span>
                <span class="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${t(explorer ? 'comp.max3Exp' : 'comp.max3')}</span>
              </h2>
              <p class="text-xs text-slate-400">${t(explorer ? 'comp.subExp' : 'comp.subEng')}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select id="compQuickSite" class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white">
                ${this.sitesCatalog.map(s => `<option value="${s.id}"${s.id === prevSite ? ' selected' : ''}>${siteName(s)}</option>`).join('')}
              </select>
              <input id="compQuickDate" type="date" value="${quickDate}" class="mono bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" />
              <button id="btnAddQuickScenario" class="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition">${t('comp.add')}</button>
              <button id="btnClearScenarios" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">${t('comp.clear')}</button>
            </div>
          </div>

          <div id="compStatus" class="hidden"></div>

          <div id="comparisonCardsGrid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${this.getComparisonCardsHTML()}
          </div>

          <div id="comparisonChartWrapper" class="${this.scenarios.length > 0 ? '' : 'hidden'} bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-300">${t(explorer ? 'chart.titleExp' : 'chart.titleEng')}</span>
                <div class="${explorer ? 'hidden' : 'flex'} items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[11px]">
                  <button data-chart-mode="zoom" class="chart-mode-btn px-2 py-0.5 rounded">${t('chart.zoom')}</button>
                  <button data-chart-mode="full" class="chart-mode-btn px-2 py-0.5 rounded">${t('chart.full')}</button>
                </div>
              </div>
              <div id="compChartLegend" class="flex flex-wrap gap-3 text-xs"></div>
            </div>
            <p class="text-[11px] text-slate-500 mb-1">${t(explorer ? 'chart.legendExp' : 'chart.legendEng')}</p>
            <div class="w-full h-64">
              <canvas id="comparisonCanvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </section>
      </div>
    `;

    this.renderStatus();
    if (this.scenarios.length > 0) this.drawComparisonChart();
    this.bindWorkspaceEvents();
  }

  getComparisonCardsHTML() {
    if (this.scenarios.length === 0) {
      return `
        <div class="md:col-span-3 p-8 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-2">
          <div class="text-sm font-semibold text-slate-300">${t(this.mode === 'explorer' ? 'comp.emptyTitleExp' : 'comp.emptyTitle')}</div>
          <p class="text-xs text-slate-400 max-w-xl mx-auto">${t(this.mode === 'explorer' ? 'comp.emptyBodyExp' : 'comp.emptyBody')}</p>
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
      const panelWord = t(sc.summary.panel_mode === 'vertical' ? 'panel.vertical' : 'panel.horizontal');
      const head = `
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="mono text-[11px] font-bold px-2 py-0.5 rounded ${badges[idx]}">${t(this.mode === 'explorer' ? 'card.scenarioExp' : 'card.scenario', { n: idx + 1 })}</span>
            <button data-remove-idx="${idx}" class="btn-remove-sc text-xs text-slate-500 hover:text-rose-400">${t('card.remove')}</button>
          </div>
          <h3 class="font-bold text-sm text-white">${siteName(sc.site)}</h3>
          <p class="${this.mode === 'explorer' ? '' : 'mono '}text-[11px] text-slate-400 mt-0.5">${this.mode === 'explorer'
            ? t('card.startExp', { d: window.I18N.fmtDate(sc.timeline[0]?.timestamp_utc) })
            : t('card.start', { d: this.startLabel(sc), lat: sc.site.lat.toFixed(2) })}</p>
        </div>`;

      if (this.mode === 'explorer') {
        const reasons = [];
        a.criteria.forEach(c => {
          if (c.ok) return;
          if (c.id === 'sun') reasons.push(t('reason.sun'));
          if (c.id === 'dte') reasons.push(t(a.needsRelay ? 'reason.relay' : 'reason.dte'));
          if (c.id === 'dark') reasons.push(t('reason.dark', { d: fmtDays(a.longestDark) }));
        });
        const verdict = a.verdict === 'VIABLE'
          ? `<span class="text-emerald-400 font-semibold">${t('card.good')}</span>`
          : `<span class="${a.verdict === 'MARGINAL' ? 'text-amber-300' : 'text-rose-400'} font-semibold">${t(a.verdict === 'MARGINAL' ? 'card.risky' : 'card.hard')}: ${reasons.join('; ')}.</span>`;
        return `
          <div class="bg-slate-950 border ${colors[idx]} rounded-xl p-4 flex flex-col justify-between space-y-4">
            ${head}
            <div class="space-y-2 text-xs border-t border-slate-800/80 pt-3 text-slate-300">
              <div>${t('card.sunPct', { days: Math.round(a.usableSunPct * 0.3), star: starSun })}</div>
              <div>${t('card.dtePct', { days: Math.round(a.usableDtePct * 0.3), star: starDte })}</div>
              <div>${t('card.longestShadow', { d: fmtDays(a.longestDark) })}</div>
              <div>${t('card.maxEl', { desc: sunHeightWords(sc.summary.max_solar_elevation_deg) })}</div>
            </div>
            <div class="pt-2 border-t border-slate-800/80 text-[11px]">${verdict}</div>
          </div>`;
      }

      return `
        <div class="bg-slate-950 border ${colors[idx]} rounded-xl p-4 flex flex-col justify-between space-y-4">
          ${head}
          <div class="space-y-2 text-xs border-t border-slate-800/80 pt-3">
            <div class="flex justify-between"><span class="text-slate-400">${t('card.usableSun', { m: this.th.sunMargin })}</span><span class="mono font-bold ${starSun ? 'text-emerald-400' : 'text-white'}">${a.usableSunPct.toFixed(1)}% (${a.sunHours}h)${starSun}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">${t('card.usableDte', { m: this.th.dteMargin })}</span><span class="mono font-bold ${starDte ? 'text-emerald-400' : 'text-white'}">${a.usableDtePct.toFixed(1)}% (${a.dteHours}h)${starDte}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">${t('card.maxElEng')}</span><span class="mono font-semibold text-amber-300">${sc.summary.max_solar_elevation_deg.toFixed(2)}°</span></div>
            <div class="flex justify-between"><span class="text-slate-400">${t('card.longestShadowEng')}</span><span class="mono font-semibold ${a.criteria[2].ok ? 'text-slate-200' : 'text-rose-400'}">${a.longestDark} h (${(a.longestDark / 24).toFixed(1)}d)</span></div>
            <div class="flex justify-between"><span class="text-slate-400">${t('card.maxNoDte')}</span><span class="mono font-semibold text-slate-200">${a.longestNoDte} h</span></div>
            <div class="flex justify-between"><span class="text-slate-400">${t('card.panels')}</span><span class="mono text-slate-300">${panelWord} · ${sc.summary.mean_panel_efficiency_lit_pct ?? '—'}%</span></div>
          </div>
          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
            <span class="mono font-bold px-2 py-0.5 rounded border ${VERDICT_STYLE[a.verdict]}">${t('verdict.' + a.verdict)}</span>
            <span class="text-slate-400">${a.criteria.map(c => (c.ok ? '✔' : '✖') + ' ' + t('crit.short.' + c.id)).join(' · ')}</span>
          </div>
          ${a.needsRelay ? `<div class="text-[11px] text-rose-300 font-semibold -mt-2">${t('card.relay')}</div>` : ''}
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
      const allEls = this.scenarios.flatMap(s => s.timeline.map(x => x.sun.el));
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
      const lbl = t('chart.day', { d });
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
      item.innerHTML = `<span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${strokeColors[idx]}"></span>${siteName(sc.site).split('(')[0].trim()} (${this.startLabel(sc)})`;
      legendHost.appendChild(item);
    });
  }

  async addScenarioByParams(paramsObj) {
    if (this.busy) return;
    this.busy = true;
    this.setStatus({ key: 'comp.evaluating', kind: 'info' });
    try {
      const query = new URLSearchParams({ ...paramsObj, days: 30, panel: this.currentPanelMode() }).toString();
      const res = await fetch(`/api/evaluate?${query}`);
      if (!res.ok) {
        const site = this.sitesCatalog.find(s => s.id === paramsObj.site_id);
        const label = site ? siteName(site) : `${paramsObj.lat}°, ${paramsObj.lon}°`;
        const err = new Error('http');
        err.i18n = res.status === 503 ? { key: 'err.offline', vars: { site: label, date: paramsObj.start_date } }
          : res.status === 400 ? { key: 'err.badCoords' }
          : res.status === 502 ? { key: 'err.horizons' }
          : { key: 'err.generic', vars: { code: res.status } };
        throw err;
      }
      const report = await res.json();
      if (this.scenarios.length >= 3) this.scenarios.shift(); // reemplaza el más antiguo
      this.scenarios.push(report);
      this.status = null;
      document.getElementById('pinnedCountBadge').textContent = `${this.scenarios.length}/3`;
      this.renderWorkspace();
    } catch (err) {
      console.warn(err);
      this.setStatus({ ...(err.i18n || { key: 'err.server' }), kind: 'error' });
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
    const rows = target.timeline.map(s => [
      s.timestamp_utc, s.sun.az, s.sun.el, s.sun.horizon_el, (s.sun.el - s.sun.horizon_el).toFixed(3), s.sun.visible, s.sun.solar_power_efficiency_pct,
      s.earth.az, s.earth.el, s.earth.horizon_el, (s.earth.el - s.earth.horizon_el).toFixed(3), s.earth.visible,
      s.hours_to_sunset ?? 'BEYOND_PERIOD', s.hours_to_earthset ?? 'BEYOND_PERIOD',
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
      this.status = null;
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
