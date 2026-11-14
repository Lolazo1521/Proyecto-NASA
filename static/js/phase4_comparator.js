// static/js/phase4_comparator.js

class Phase4Manager {
  constructor() {
    this.mode = 'explorer'; // 'explorer' | 'engineering'
    this.scenarios = []; // Máximo 3 escenarios fijados
    this.sitesCatalog = [];
    this.minSolarThreshold = 2.0; // Grados mínimos útiles para paneles
    this.minDteMargin = 1.0;      // Grados mínimos sobre horizonte para enlace estable
  }

  async init() {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) this.sitesCatalog = await res.json();
    } catch (e) {
      console.warn('No se pudo cargar catálogo en Phase4Manager:', e);
    }

    this.renderModeBar();
    this.renderWorkspace();
    this.bindEvents();
  }

  renderModeBar() {
    const barHost = document.getElementById('phase4ModeBar');
    if (!barHost) return;

    barHost.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Perfil de Interfaz:</span>
          <div class="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-700">
            <button id="btnModeExplorer" class="px-3 py-1 rounded-md text-xs font-bold transition bg-sky-500 text-slate-950">
              🎓 Modo Explorador (Educativo)
            </button>
            <button id="btnModeEngineering" class="px-3 py-1 rounded-md text-xs font-bold transition text-slate-300 hover:text-white">
              🛰️ Modo Ingeniería (Misión)
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnPinCurrentScenario" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow">
            <span>📌 Fijar Escenario Actual al Comparador</span>
            <span id="pinnedCountBadge" class="mono bg-indigo-950 px-1.5 py-0.5 rounded text-[11px]">0/3</span>
          </button>
        </div>
      </div>
    `;
  }

  renderWorkspace() {
    const host = document.getElementById('phase4Workspace');
    if (!host) return;

    host.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 pb-12 space-y-6">

        <!-- BLOQUE A: PANEL ADAPTATIVO SEGÚN MODO (EXPLORADOR VS INGENIERÍA) -->
        <section id="dualModePanel" class="bg-slate-900 border border-slate-800 rounded-xl p-5">
          ${this.mode === 'explorer' ? this.getExplorerHTML() : this.getEngineeringHTML()}
        </section>

        <!-- BLOQUE B: COMPARADOR MULTI-ESCENARIO LADO A LADO (SPLIT-VIEW) -->
        <section class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>Comparador Multi-Escenario (Trade-off Ciencia vs. Ingeniería)</span>
                <span class="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Hasta 3 Escenarios</span>
              </h2>
              <p class="text-xs text-slate-400">Evalúa sitios candidatos o impactos por retrasos de lanzamiento lado a lado</p>
            </div>

            <!-- Selector rápido para agregar escenarios directamente -->
            <div class="flex flex-wrap items-center gap-2">
              <select id="compQuickSite" class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white">
                ${this.sitesCatalog.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
              <input id="compQuickDate" type="date" value="2026-12-01" class="mono bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" />
              <button id="btnAddQuickScenario" class="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition">
                + Añadir
              </button>
              <button id="btnClearScenarios" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">
                Limpiar
              </button>
            </div>
          </div>

          <!-- Grid de Tarjetas Comparativas -->
          <div id="comparisonCardsGrid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${this.getComparisonCardsHTML()}
          </div>

          <!-- Gráfico Comparativo de Curvas Solares -->
          <div id="comparisonChartWrapper" class="${this.scenarios.length > 0 ? '' : 'hidden'} bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-300">Comparativa de Elevación Solar a lo largo del Ciclo (30 días)</span>
              <div id="compChartLegend" class="flex flex-wrap gap-3 text-xs"></div>
            </div>
            <div class="w-full h-56">
              <canvas id="comparisonCanvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </section>

      </div>
    `;

    if (this.scenarios.length > 0) {
      this.drawComparisonChart();
    }
  }

  getExplorerHTML() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-white">Guía de Exploración: ¿Por qué es tan extremo alunizar en la Luna?</h2>
            <p class="text-xs text-slate-400">Contraste visual entre las condiciones terrestres y el entorno operativo lunar</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">Vista Divulgación</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-amber-400 font-bold text-xs uppercase">1. Día y Noche de 14 Días</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              Mientras en la Tierra un día dura 24 horas, en latitudes medias lunares el Sol brilla durante <strong>14.7 días terrestres</strong> seguidos y luego cae una noche gélida de otros <strong>14.7 días</strong> (-170 °C), obligando a sobrevivir con baterías o calefactores nucleares.
            </p>
          </div>

          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-sky-400 font-bold text-xs uppercase">2. Sin Atmósfera ni Crepúsculo</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              Al no existir aire que disperse la luz, no hay amaneceres graduales ni refracción en el horizonte. Cuando el borde del Sol cruza una montaña, la transición de luz brillante a <strong>oscuridad total</strong> ocurre en segundos.
            </p>
          </div>

          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-indigo-400 font-bold text-xs uppercase">3. La Tierra "Clavada" en el Cielo</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              Debido al acoplamiento de marea, la Tierra nunca sale ni se pone como el Sol: permanece casi fija en una zona del cielo dibujando un pequeño ocho (<strong>libración</strong>). Si alunizas en la cara oculta (ej. <em>Chang'e 4</em>), la Tierra jamás es visible.
            </p>
          </div>

          <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-2">
            <div class="text-teal-400 font-bold text-xs uppercase">4. El Dilema del Polo Sur</div>
            <p class="text-xs text-slate-300 leading-relaxed">
              El eje lunar apenas está inclinado <strong>1.54°</strong>. En el Polo Sur el Sol viaja rasante al horizonte: el fondo de los cráteres nunca recibe luz y guarda <strong>hielo de agua</strong>, mientras los bordes altos tienen luz casi eterna para generar electricidad.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  getEngineeringHTML() {
    const activeScenario = this.scenarios[0] || null;
    const sampleRows = activeScenario ? activeScenario.timeline.filter((_, idx) => idx % 12 === 0).slice(0, 15) : [];

    return `
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-white">Consola de Ingeniería de Misión y Análisis de Viabilidad</h2>
            <p class="text-xs text-slate-400">Define márgenes operativos de potencia/telemetría y exporta efemérides topocéntricas</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
              <label class="text-slate-400">Elev. Solar Mín (°):</label>
              <input id="inputMinSolar" type="number" step="0.5" value="${this.minSolarThreshold}" class="mono w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-bold" />
            </div>
            <div class="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
              <label class="text-slate-400">Margen DTE (°):</label>
              <input id="inputMinDte" type="number" step="0.5" value="${this.minDteMargin}" class="mono w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-sky-300 font-bold" />
            </div>
            <button id="btnExportCSV" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
              ⬇ Exportar CSV
            </button>
            <button id="btnExportJSON" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition">
              ⬇ Exportar JSON
            </button>
          </div>
        </div>

        ${
          activeScenario
            ? `
          <div class="overflow-x-auto border border-slate-800 rounded-lg">
            <table class="w-full text-left border-collapse text-xs mono">
              <thead>
                <tr class="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th class="py-2 px-3">Timestamp (UTC)</th>
                  <th class="py-2 px-3">Sol Az / El</th>
                  <th class="py-2 px-3">Horizonte Sol</th>
                  <th class="py-2 px-3">Potencia PV</th>
                  <th class="py-2 px-3">Tierra Az / El</th>
                  <th class="py-2 px-3">Estado DTE</th>
                  <th class="py-2 px-3">Sunset en</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/70 bg-slate-900/40">
                ${sampleRows
                  .map(
                    r => `
                  <tr class="hover:bg-slate-800/40">
                    <td class="py-1.5 px-3 text-slate-200">${r.timestamp_utc}</td>
                    <td class="py-1.5 px-3 text-amber-300">${r.sun.az.toFixed(1)}° / ${r.sun.el.toFixed(2)}°</td>
                    <td class="py-1.5 px-3 text-slate-400">${r.sun.horizon_el.toFixed(2)}°</td>
                    <td class="py-1.5 px-3 ${r.sun.el - r.sun.horizon_el >= this.minSolarThreshold ? 'text-emerald-400' : 'text-rose-400'}">
                      ${r.sun.solar_power_efficiency_pct.toFixed(1)}%
                    </td>
                    <td class="py-1.5 px-3 text-sky-300">${r.earth.az.toFixed(1)}° / ${r.earth.el.toFixed(2)}°</td>
                    <td class="py-1.5 px-3">
                      ${
                        r.earth.el - r.earth.horizon_el >= this.minDteMargin
                          ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">NOMINAL</span>'
                          : r.earth.visible
                          ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">RASANTE</span>'
                          : '<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">OCLUIDO</span>'
                      }
                    </td>
                    <td class="py-1.5 px-3 text-slate-300">${r.hours_to_sunset === null ? '>30d' : r.hours_to_sunset.toFixed(1) + 'h'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-slate-500">* Mostrando muestras cada 12h del primer escenario fijado (${activeScenario.site.name}). Exporta CSV/JSON para obtener las 720 horas completas.</p>
          `
            : `<div class="p-4 rounded-lg bg-slate-950 border border-dashed border-slate-700 text-xs text-slate-400 text-center">
                Fija al menos un escenario con el botón <strong>"📌 Fijar Escenario Actual al Comparador"</strong> para inspeccionar su tabla de telemetría horaria y exportar los reportes.
              </div>`
        }
      </div>
    `;
  }

  getComparisonCardsHTML() {
    if (this.scenarios.length === 0) {
      return `
        <div class="md:col-span-3 p-8 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-2">
          <div class="text-sm font-semibold text-slate-300">No hay escenarios fijados para comparar</div>
          <p class="text-xs text-slate-400 max-w-xl mx-auto">
            Usa el botón superior <strong>"📌 Fijar Escenario Actual"</strong> o selecciona un sitio y fecha arriba y pulsa <strong>"+ Añadir"</strong> para contrastar hasta 3 planes de alunizaje lado a lado.
          </p>
        </div>
      `;
    }

    const colors = ['border-amber-500/50', 'border-sky-500/50', 'border-emerald-500/50'];
    const badges = ['bg-amber-500/20 text-amber-300', 'bg-sky-500/20 text-sky-300', 'bg-emerald-500/20 text-emerald-300'];

    const bestSun = Math.max(...this.scenarios.map(s => s.summary.sunlight_availability_pct));
    const bestDte = Math.max(...this.scenarios.map(s => s.summary.dte_availability_pct));

    return this.scenarios
      .map((sc, idx) => {
        const isBestSun = sc.summary.sunlight_availability_pct === bestSun && this.scenarios.length > 1;
        const isBestDte = sc.summary.dte_availability_pct === bestDte && this.scenarios.length > 1;
        const maxDarkHours = this.computeLongestDarkStreak(sc.timeline);

        return `
          <div class="bg-slate-950 border ${colors[idx]} rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="mono text-[11px] font-bold px-2 py-0.5 rounded ${badges[idx]}">ESCENARIO #${idx + 1}</span>
                <button data-remove-idx="${idx}" class="btn-remove-sc text-xs text-slate-500 hover:text-rose-400">✕ Quitar</button>
              </div>
              <h3 class="font-bold text-sm text-white">${sc.site.name}</h3>
              <p class="mono text-[11px] text-slate-400 mt-0.5">
                Inicio: ${sc.timeline[0]?.timestamp_utc.slice(0, 10)} • Lat ${sc.site.lat.toFixed(2)}°
              </p>
            </div>

            <div class="space-y-2 text-xs border-t border-slate-800/80 pt-3">
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Disponibilidad Solar:</span>
                <span class="mono font-bold ${isBestSun ? 'text-emerald-400' : 'text-white'}">
                  ${sc.summary.sunlight_availability_pct}% (${sc.summary.sunlit_hours}h) ${isBestSun ? '★' : ''}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-400">Enlace Tierra (DTE):</span>
                <span class="mono font-bold ${isBestDte ? 'text-emerald-400' : 'text-white'}">
                  ${sc.summary.dte_availability_pct}% (${sc.summary.dte_comm_hours}h) ${isBestDte ? '★' : ''}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-400">Elevación Solar Máx:</span>
                <span class="mono font-semibold text-amber-300">${sc.summary.max_solar_elevation_deg.toFixed(2)}°</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-slate-400">Sombra continua máx:</span>
                <span class="mono font-semibold ${maxDarkHours > 120 ? 'text-rose-400' : 'text-slate-200'}">
                  ${maxDarkHours} h (${(maxDarkHours / 24).toFixed(1)}d)
                </span>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-800/80 text-[11px]">
              ${
                sc.summary.dte_availability_pct === 0
                  ? '<span class="text-rose-400 font-semibold">⚠ Requiere satélite relé orbital (sin DTE)</span>'
                  : sc.summary.sunlight_availability_pct >= 70 && sc.summary.dte_availability_pct >= 50
                  ? '<span class="text-emerald-400 font-semibold">✔ Alta viabilidad energética y de telemetría</span>'
                  : '<span class="text-amber-300 font-semibold">⚡ Viabilidad moderada: revisar reservas de batería</span>'
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  computeLongestDarkStreak(timeline) {
    let maxStreak = 0;
    let current = 0;
    for (const step of timeline) {
      if (!step.sun.visible) {
        current++;
        if (current > maxStreak) maxStreak = current;
      } else {
        current = 0;
      }
    }
    return maxStreak;
  }

  drawComparisonChart() {
    const canvas = document.getElementById('comparisonCanvas');
    if (!canvas || this.scenarios.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 14, right: 16, bottom: 24, left: 38 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const allEls = this.scenarios.flatMap(s => s.timeline.map(t => t.sun.el));
    const minEl = Math.min(-15, Math.floor(Math.min(...allEls)));
    const maxEl = Math.max(15, Math.ceil(Math.max(...allEls)));

    const xToPx = (idx, total) => pad.left + (idx / Math.max(1, total - 1)) * plotW;
    const yToPx = el => pad.top + plotH - ((el - minEl) / (maxEl - minEl)) * plotH;

    ctx.clearRect(0, 0, W, H);

    // Línea 0°
    const yZero = yToPx(0);
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yZero);
    ctx.lineTo(W - pad.right, yZero);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(`${maxEl}°`, 6, pad.top + 8);
    ctx.fillText(`0°`, 12, yZero + 3);
    ctx.fillText(`${minEl}°`, 6, pad.top + plotH);

    const strokeColors = ['#fbbf24', '#38bdf8', '#34d399'];
    const legendHost = document.getElementById('compChartLegend');
    legendHost.innerHTML = '';

    this.scenarios.forEach((sc, idx) => {
      const color = strokeColors[idx];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      sc.timeline.forEach((pt, i) => {
        const x = xToPx(i, sc.timeline.length);
        const y = yToPx(pt.sun.el);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const item = document.createElement('span');
      item.className = 'flex items-center gap-1.5 text-slate-300';
      item.innerHTML = `<span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${color}"></span>${sc.site.name.split('(')[0].trim()} (${sc.timeline[0]?.timestamp_utc.slice(0, 10)})`;
      legendHost.appendChild(item);
    });
  }

  async addScenarioByParams(paramsObj) {
    if (this.scenarios.length >= 3) {
      this.scenarios.shift(); // Reemplaza el más antiguo si ya hay 3
    }
    const query = new URLSearchParams({ ...paramsObj, days: 30 }).toString();
    const res = await fetch(`/api/evaluate?${query}`);
    if (!res.ok) throw new Error('Error evaluando escenario para comparación');
    const report = await res.json();
    this.scenarios.push(report);

    document.getElementById('pinnedCountBadge').textContent = `${this.scenarios.length}/3`;
    this.renderWorkspace();
    this.bindDynamicEvents();
  }

  exportData(format) {
    if (this.scenarios.length === 0) return;
    const target = this.scenarios[0];

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json' });
      this.triggerDownload(blob, `lunar_mission_${target.site.id}.json`);
      return;
    }

    const headers = ['timestamp_utc', 'sun_az_deg', 'sun_el_deg', 'sun_horizon_deg', 'sun_visible', 'solar_eff_pct', 'earth_az_deg', 'earth_el_deg', 'earth_horizon_deg', 'dte_visible', 'hours_to_sunset', 'hours_to_earthset'];
    const rows = target.timeline.map(t => [
      t.timestamp_utc,
      t.sun.az,
      t.sun.el,
      t.sun.horizon_el,
      t.sun.visible,
      t.sun.solar_power_efficiency_pct,
      t.earth.az,
      t.earth.el,
      t.earth.horizon_el,
      t.earth.visible,
      t.hours_to_sunset ?? 'CONTINUOUS',
      t.hours_to_earthset ?? 'CONTINUOUS'
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `lunar_ephemeris_${target.site.id}.csv`);
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

  bindEvents() {
    document.getElementById('btnModeExplorer')?.addEventListener('click', () => {
      this.mode = 'explorer';
      document.getElementById('btnModeExplorer').className = 'px-3 py-1 rounded-md text-xs font-bold transition bg-sky-500 text-slate-950';
      document.getElementById('btnModeEngineering').className = 'px-3 py-1 rounded-md text-xs font-bold transition text-slate-300 hover:text-white';
      this.renderWorkspace();
      this.bindDynamicEvents();
    });

    document.getElementById('btnModeEngineering')?.addEventListener('click', () => {
      this.mode = 'engineering';
      document.getElementById('btnModeEngineering').className = 'px-3 py-1 rounded-md text-xs font-bold transition bg-sky-500 text-slate-950';
      document.getElementById('btnModeExplorer').className = 'px-3 py-1 rounded-md text-xs font-bold transition text-slate-300 hover:text-white';
      this.renderWorkspace();
      this.bindDynamicEvents();
    });

    document.getElementById('btnPinCurrentScenario')?.addEventListener('click', async () => {
      const siteId = document.getElementById('siteSelect')?.value || 'shackleton-rim';
      const startDate = document.getElementById('startDateInput')?.value || '2026-11-15';
      const params = { site_id: siteId, start_date: startDate };
      if (siteId === 'custom') {
        params.lat = document.getElementById('customLat')?.value || -88.5;
        params.lon = document.getElementById('customLon')?.value || 45.0;
        params.alt_km = document.getElementById('customAlt')?.value || 1.5;
      }
      await this.addScenarioByParams(params);
    });

    this.bindDynamicEvents();
  }

  bindDynamicEvents() {
    document.getElementById('btnAddQuickScenario')?.addEventListener('click', async () => {
      const siteId = document.getElementById('compQuickSite').value;
      const startDate = document.getElementById('compQuickDate').value;
      await this.addScenarioByParams({ site_id: siteId, start_date: startDate });
    });

    document.getElementById('btnClearScenarios')?.addEventListener('click', () => {
      this.scenarios = [];
      document.getElementById('pinnedCountBadge').textContent = '0/3';
      this.renderWorkspace();
      this.bindDynamicEvents();
    });

    document.querySelectorAll('.btn-remove-sc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeIdx, 10);
        this.scenarios.splice(idx, 1);
        document.getElementById('pinnedCountBadge').textContent = `${this.scenarios.length}/3`;
        this.renderWorkspace();
        this.bindDynamicEvents();
      });
    });

    document.getElementById('inputMinSolar')?.addEventListener('change', e => {
      this.minSolarThreshold = parseFloat(e.target.value) || 0;
      this.renderWorkspace();
      this.bindDynamicEvents();
    });

    document.getElementById('inputMinDte')?.addEventListener('change', e => {
      this.minDteMargin = parseFloat(e.target.value) || 0;
      this.renderWorkspace();
      this.bindDynamicEvents();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => this.exportData('csv'));
    document.getElementById('btnExportJSON')?.addEventListener('click', () => this.exportData('json'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const phase4 = new Phase4Manager();
  phase4.init();
});