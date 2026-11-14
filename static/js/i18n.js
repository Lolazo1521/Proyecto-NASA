// static/js/i18n.js — Traducción completa de toda la página con recarga automática (ES <-> EN)

const RAW_DICTIONARY = {
  // Header y Estados
  "Evaluación Topográfica de Iluminación Solar y Enlace Directo Tierra (DTE) • Sin Atmósfera":
    "Topographic Assessment of Solar Illumination & Direct-to-Earth (DTE) Link • Airless Body",
  "Simulador Topográfico 3D, Sombras Polares y Enlace Directo Tierra (DTE)":
    "3D Topographic Simulator, Polar Shadows & Direct-to-Earth (DTE) Link",
  "LISTO": "READY",
  "INICIALIZANDO...": "INITIALIZING...",
  "CONSULTANDO JPL HORIZONS...": "QUERYING JPL HORIZONS...",
  "EFEMÉRIDES SINCRONIZADAS": "EPHEMERIS SYNCHRONIZED",
  "ESCENA 3D Y EFEMÉRIDES LISTAS": "3D SCENE & EPHEMERIS READY",
  "ERROR DE CONEXIÓN": "CONNECTION ERROR",

  // Barra de Perfil y Comparador
  "Perfil de Interfaz:": "Interface Profile:",
  "Modo Explorador (Educativo)": "Explorer Mode (Educational)",
  "Modo Ingeniería (Misión)": "Engineering Mode (Mission)",
  "Explicaciones sencillas, menos capas en 3D y guía de por qué la Luna es tan extrema.":
    "Simple explanations, fewer 3D layers, and a guide on why the Moon is so extreme.",
  "Telemetría completa, grilla polar, vectores 3D, umbrales operativos y exportación CSV/JSON.":
    "Full telemetry, polar grid, 3D vectors, operational thresholds, and CSV/JSON export.",
  "Fijar Escenario Actual al Comparador": "Pin Current Scenario to Comparator",
  "Fijar Escenario Actual": "Pin Current Scenario",

  // Controles de Sitio y Fecha
  "Sitio de Alunizaje": "Landing Site",
  "Ingresar Coordenadas Personalizadas...": "Enter Custom Coordinates...",
  "Latitud (°)": "Latitude (°)",
  "Longitud (°)": "Longitude (°)",
  "Elev. (km)": "Elev. (km)",
  "Fecha Inicio Misión (UTC)": "Mission Start Date (UTC)",
  "-1 Día Lunar": "-1 Lunar Day",
  "+½ Día Lunar": "+½ Lunar Day",
  "+½ Día Lunar (14.8d)": "+½ Lunar Day (14.8d)",
  "+1 Día Lunar": "+1 Lunar Day",
  "+1 Día Lunar (29.5d)": "+1 Lunar Day (29.5d)",
  "+Estación (90d)": "+Season (90d)",
  "Evaluar": "Evaluate",
  "Cargando sitio...": "Loading site...",
  "Punto de aterrizaje definido manualmente por el usuario.": "Manually defined custom landing coordinates.",

  // Descripciones de sitios curados
  "Cresta con iluminación solar casi continua cerca de depósitos de hielo permanente.":
    "Ridge with near-continuous solar illumination close to permanent water-ice deposits.",
  "Macizo elevado con excelente línea de vista directa hacia la Tierra (DTE).":
    "Elevated massif with optimal Direct-to-Earth (DTE) line of sight.",
  "Meseta elevada con pendientes suaves y ventanas extendidas de luz solar.":
    "High plateau with gentle slopes and extended sunlight windows.",
  "Borde de cráter polar con acceso cercano a regiones permanentemente en sombra (PSR).":
    "Polar crater rim with close access to Permanently Shadowed Regions (PSRs).",
  "Primer alunizaje tripulado; ciclo ecuatorial clásico de ~14.7 días de luz y 14.7 de noche.":
    "First crewed landing; classic equatorial cycle of ~14.7 Earth days of light and 14.7 of night.",
  "Zona rodeada por los Montes Apeninos, ideal para probar bloqueo topográfico local.":
    "Site bordered by the Apennine Mountains, ideal for testing local topographic masking.",
  "Primer alunizaje exitoso en latitudes altas del sur lunar.":
    "First successful landing at high southern lunar latitudes.",
  "Ubicado en la cara oculta: elevación terrestre siempre negativa (requiere satélite relé).":
    "Located on the lunar far side: Earth elevation is always negative (requires relay satellite).",

  // Guía Modo Explorador
  "¿Por qué es tan difícil alunizar en el Polo Sur?": "Why Is Landing at the South Pole So Hard?",
  "Cuatro ideas para entender lo que ves en el visor. Mueve la barra de tiempo o pulsa \"Simular Ciclo\" para verlas en acción.":
    "Four key ideas to understand what you see in the viewer. Scrub the timeline or press \"Simulate Cycle\" to see them in action.",
  "Vista Divulgación": "Outreach View",
  "1. Día y noche de 14 días": "1. 14-Day Light & Night Cycle",
  "2. Sin aire, sin crepúsculo": "2. No Air, No Twilight",
  "3. La Tierra casi quieta": "3. Earth Nearly Stationary",
  "4. El dilema del Polo Sur": "4. The South Pole Dilemma",

  "En la Tierra un día dura 24 horas. En la Luna, cerca del ecuador, el Sol brilla":
    "On Earth a day lasts 24 hours. On the Moon, near the equator, the Sun shines for",
  "casi 15 días seguidos": "nearly 15 straight days",
  "y luego llega una noche helada de otros 15 días (−170 °C). El lander tiene que sobrevivir con baterías.":
    "followed by a freezing 15-day night (−170 °C). The lander must survive on batteries.",
  "y luego llega una noche helada de otros 15 días (-170 °C). El lander tiene que sobrevivir con baterías.":
    "followed by a freezing 15-day night (-170 °C). The lander must survive on batteries.",

  "No hay atmósfera que reparta la luz: si una montaña tapa el Sol, se pasa de luz intensa a":
    "There is no atmosphere to scatter light: if a mountain blocks the Sun, bright daylight drops to",
  "oscuridad total": "pitch darkness",
  ". Las sombras del visor son negras por eso.": ". That is why shadows in the viewer are pure black.",

  "La Luna siempre nos da la misma cara, así que la Tierra no sale ni se pone como el Sol: se queda en la misma zona del cielo y solo":
    "The Moon always shows us the same face, so Earth neither rises nor sets like the Sun: it stays in the same sky region and only",
  "se mece un poco": "wobbles slightly",
  "(libración). En la cara oculta nunca se ve.": "(libration). From the far side it is never visible.",

  "El eje de la Luna casi no está inclinado (": "The Moon's axis is barely tilted (",
  "El eje de la Luna casi no está inclinado": "The Moon's axis is barely tilted",
  "), así que en el polo el Sol da vueltas rozando el horizonte. Los fondos de los cráteres nunca reciben luz y guardan":
    "), so at the pole the Sun circles right along the horizon. Crater floors never get sunlight and trap",
  ", así que en el polo el Sol da vueltas rozando el horizonte. Los fondos de los cráteres nunca reciben luz y guardan":
    ", so at the pole the Sun circles right along the horizon. Crater floors never get sunlight and trap",
  "hielo": "water ice",
  "; las crestas tienen luz casi siempre.": "; high ridges stay sunlit almost continuously.",

  "Prueba esto:": "Try this:",
  "mira Shackleton y luego cambia a Apollo 11 en \"": "check Shackleton and then switch to Apollo 11 in \"",
  "mira Shackleton y luego cambia a Apollo 11 en": "check Shackleton and then switch to Apollo 11 in",
  "\". En el polo el Sol nunca pasa de ~2° de altura; en el ecuador sube hasta casi 90°. Abre \"":
    "\". At the pole the Sun never rises above ~2°; at the equator it climbs to nearly 90°. Open \"",
  ". En el polo el Sol nunca pasa de ~2° de altura; en el ecuador sube hasta casi 90°. Abre":
    ". At the pole the Sun never rises above ~2°; at the equator it climbs to nearly 90°. Open",
  "\" para ver dónde da el Sol.": "\" to see where sunlight hits.",
  "para ver dónde da el Sol.": "to see where sunlight hits.",

  // KPIs Operativos
  "El Sol ahora": "Sun Right Now",
  "SOL AHORA": "SUN RIGHT NOW",
  "Elevación Solar": "Solar Elevation",
  "TAPADO": "BLOCKED",
  "VISIBLE": "VISIBLE",
  "ILUMINADO": "SUNLIT",
  "DE NOCHE": "NIGHTTIME",
  "SOMBRA / NOCHE": "SHADOW / NIGHT",
  "El Sol está en el cielo, pero": "The Sun is above the horizon, but",
  "una montaña lo tapa:": "a mountain blocks it:",
  "una montaña lo tapa": "a mountain blocks it",
  ": el lander está en sombra y sin energía solar.": ": the lander is in shadow with no solar power.",
  "el lander está en sombra y sin energía solar.": "the lander is in shadow with no solar power.",
  "El Sol ilumina directamente el sitio": "Direct sunlight is hitting the landing site",
  "El Sol está debajo del horizonte": "The Sun is below the horizon",
  "Eficiencia Paneles:": "Solar Array Efficiency:",

  "¿Cuándo se pone el Sol?": "When Does the Sun Set?",
  "Tiempo hasta Sunset": "Time to Sunset",
  "Ya está oscuro": "Already dark",
  "Luz continua (>30d)": "Continuous light (>30d)",
  "El Sol vuelve a salir en": "Sun rises again in",
  "El Sol se oculta en": "Sun sets in",
  "Luz en ventana (30d):": "Window Sunlight (30d):",
  "Luz total en ventana (30d):": "Total Sunlight (30d):",

  "¿Hablamos con la Tierra?": "Can We Talk to Earth?",
  "Enlace Tierra (DTE)": "Earth Link (DTE)",
  "SIN SEÑAL": "NO SIGNAL",
  "CON SEÑAL": "SIGNAL OK",
  "ACTIVO": "ACTIVE",
  "DTE ACTIVO": "DTE ACTIVE",
  "SIN LÍNEA DE VISTA": "NO LINE OF SIGHT",
  "La Tierra está": "Earth is",
  "debajo del horizonte:": "below the horizon:",
  "debajo del horizonte": "below the horizon",
  ": sin contacto directo por ahora.": ": no direct contact right now.",
  "sin contacto directo por ahora.": "no direct contact right now.",
  "Una montaña bloquea la señal con la Tierra.": "A mountain ridge blocks the signal to Earth.",
  "Enlace directo despejado con la Tierra.": "Clear direct-to-Earth communication link.",
  "Disponibilidad DTE:": "DTE Availability:",
  "Disponibilidad DTE (30d):": "DTE Availability (30d):",

  "¿Cuándo se oculta la Tierra?": "When Does Earth Set?",
  "Tiempo hasta Earthset": "Time to Earthset",
  "Ya está oculta": "Already hidden",
  "Siempre visible": "Always visible",
  "La Tierra vuelve a verse en": "Earth becomes visible again in",
  "La Tierra se oculta en": "Earth sets in",
  "Horizonte local (Az Tierra):": "Local Horizon (Earth Az):",
  "Bloqueo topográfico local:": "Local Topographic Mask:",

  // Timeline y Visor 3D
  "Simular Ciclo": "Simulate Cycle",
  "Pausar": "Pause",
  "Instante seleccionado:": "Selected timestamp:",
  "Simulador Topográfico 3D y Sombras en Tiempo Real (WebGL · DEM sintético de demostración)":
    "3D Topographic Simulator & Real-Time Shadows (WebGL · Synthetic Demo DEM)",
  "Simulador Topográfico 3D y Sombras en Tiempo Real (WebGL / LOLA DEM)":
    "3D Topographic Simulator & Real-Time Shadows (WebGL / LOLA DEM)",
  "Arrastra para girar y usa la rueda para acercarte. La línea amarilla va al Sol y la azul a la Tierra; si una montaña las tapa, se vuelven rojas y punteadas.":
    "Drag to orbit and scroll to zoom. The yellow line points to the Sun and the blue one to Earth; if blocked by a mountain, they turn red and dashed.",
  "Fase 3": "Phase 3",
  "Local Terrain": "Local Terrain",
  "Terreno local": "Local Terrain",
  "Full Moon": "Full Moon",
  "Luna completa": "Full Moon",
  "Vista Orbital": "Orbital View",
  "Superficie (Lander)": "Surface (Lander)",
  "Cenital (N ↑)": "Top-Down (N ↑)",
  "Mirar al Sol": "Look at Sun",
  "Mirar a la Tierra": "Look at Earth",

  // Leyenda del visor 3D
  "Vector Sol": "Sun Vector",
  "Vector Tierra (DTE)": "Earth Vector (DTE)",
  "Tramo bloqueado por relieve": "Terrain-blocked segment",
  "Punto de bloqueo": "Occlusion point",
  "Horizonte topográfico": "Topographic horizon",
  "Horizonte geométrico 0°": "0° geometric horizon",
  "Trayectorias del período": "Period trajectories",
  "Trayectorias del periodo": "Period trajectories",
  "Domo y horizonte": "Sky-dome & horizon",
  "Rayos X (ver tras relieve)": "X-Ray (see through terrain)",

  // HUD dentro del canvas 3D y Mini-Globo
  "ESCENA LOCAL:": "LOCAL SCENE:",
  "disco Ø 36 km · lander ×100": "36 km Ø disc · lander ×100",
  "ESTADO SOMBRA LANDER:": "LANDER SHADOW STATE:",
  "ILUMINADO (SOL DIRECTO)": "SUNLIT (DIRECT SUNLIGHT)",
  "EN SOMBRA TOPOGRÁFICA": "IN TOPOGRAPHIC SHADOW",
  "LÍNEA DE VISTA DTE:": "DTE LINE OF SIGHT:",
  "ACTIVO (LÍNEA DESPEJADA)": "ACTIVE (CLEAR LOS)",
  "BLOQUEADO POR RELIEVE": "BLOCKED BY TERRAIN",
  "Sol · tapado por una montaña": "Sun · blocked by a mountain",
  "Sol · iluminando el sitio": "Sun · illuminating site",
  "El Sol está bajo el horizonte: es de noche en el sitio.": "Sun is below the horizon: nighttime at landing site.",
  "La Tierra está bajo el horizonte: sin señal directa.": "Earth is below the horizon: no direct signal.",
  "La Tierra está sobre el horizonte con enlace despejado.": "Earth is above the horizon with a clear link.",
  "LUNA · clic para ampliar": "MOON · click to expand",
  "LUNA · clic para reducir": "MOON · click to shrink",
  "LUNA · clic para cerrar": "MOON · click to close",

  // Gráficos 2D
  "Perfil Panorámico del Horizonte 360°": "360° Panoramic Horizon Profile",
  "Lo que verías girando 360° desde el lander: lo gris son montañas. Si el Sol o la Tierra quedan debajo de la silueta, están tapados.":
    "What you would see turning 360° from the lander: gray is mountains. If the Sun or Earth falls below the silhouette, it is blocked.",
  "Sol": "Sun",
  "Tierra": "Earth",
  "Relieve": "Terrain",
  "Domo Celeste Polar (Sky-Dome)": "Polar Sky-Dome",
  "El cielo visto desde arriba: el centro está justo encima del lander y el borde es el horizonte.":
    "The sky seen from above: the center is directly overhead and the outer ring is the horizon.",

  // Comparador Multi-Escenario
  "Compara sitios y fechas": "Compare Sites & Dates",
  "Comparador Multi-Escenario (Trade-off Ciencia vs. Ingeniería)":
    "Multi-Scenario Comparator (Science vs. Engineering Trade-off)",
  "Pon lado a lado hasta 3 sitios o fechas y mira cuál tiene más luz y más contacto con la Tierra.":
    "Place up to 3 sites or dates side by side to see which gets more sunlight and Earth contact.",
  "Hasta 3 Escenarios": "Up to 3 Scenarios",
  "+ Añadir": "+ Add",
  "Limpiar": "Clear",
  "No hay escenarios fijados para comparar": "No pinned scenarios to compare",
  "Usa el botón superior \"": "Use the top button \"",
  "\" o selecciona un sitio y fecha arriba y pulsa \"": "\" or select a site and date above and click \"",
  "\" para contrastar hasta 3 planes de alunizaje lado a lado.":
    "\" to compare up to 3 landing plans side by side.",
  "Comparativa de Elevación Solar a lo largo del Ciclo (30 días)":
    "Solar Elevation Comparison Across Cycle (30 Days)",
  "Quitar": "Remove",
  "Disponibilidad Solar:": "Solar Availability:",
  "Enlace Tierra (DTE):": "Earth Link (DTE):",
  "Elevación Solar Máx:": "Max Solar Elevation:",
  "Sombra continua máx:": "Max Continuous Shadow:",
  "Requiere satélite relé orbital (sin DTE)": "Requires orbital relay satellite (no DTE)",
  "Alta viabilidad energética y de telemetría": "High power & telemetry feasibility",
  "Viabilidad moderada: revisar reservas de batería": "Moderate feasibility: check battery reserves",

  // Consola de Misión (Modo Ingeniería)
  "paneles verticales con seguimiento (cos el)": "vertical tracking panels (cos el)",
  "los umbrales deciden el veredicto (aquí y en el comparador)":
    "thresholds determine the verdict (here and in comparator)",
  "Ver tabla horaria": "View hourly table",
  "Ocultar tabla horaria": "Hide hourly table",
  "Margen solar mín. (°)": "Min solar margin (°)",
  "Margen DTE mín. (°)": "Min DTE margin (°)",
  "Luz útil mín. (%)": "Min usable light (%)",
  "DTE útil mín. (%)": "Min usable DTE (%)",
  "Sombra máx. (h)": "Max shadow (h)",
  "Restaurar umbrales": "Reset thresholds",

  "VEREDICTO": "VERDICT",
  "VIABLE": "VIABLE",
  "NO VIABLE": "NOT VIABLE",
  "INVIABLE": "UNVIABLE",
  "MARGINAL": "MARGINAL",
  "Luz útil": "Usable sunlight",
  "Enlace DTE útil": "Usable DTE link",
  "Sombra continua máx.": "Max continuous shadow",
  "Máx. sin enlace DTE:": "Max without DTE link:",
  "Eficiencia media con luz:": "Avg sunlit efficiency:",
  "Elevación solar máx.:": "Max solar elevation:",

  "Ventanas de luz útil": "Usable sunlight windows",
  "Ventanas de enlace DTE": "DTE link windows",
  "Inicio (UTC)": "Start (UTC)",
  "Fin": "End",
  "Margen mín.": "Min margin",
  "◀ ya iniciada / ▶ continúa después del período": "◀ already started / ▶ continues after period",
  "◀ ya iniciada / ▶ continúa después del periodo": "◀ already started / ▶ continues after period",
  "Sin ventanas en este período": "No windows in this period",
  "Sin ventanas en este periodo": "No windows in this period",
  "Ninguna ventana cumple los umbrales.": "No window meets the thresholds.",

  // Tabla horaria desplegable (Modo Ingeniería)
  "Consola de Ingeniería de Misión y Análisis de Viabilidad":
    "Mission Engineering Console & Feasibility Analysis",
  "Define márgenes operativos de potencia/telemetría y exporta efemérides topocéntricas":
    "Set operational power/telemetry margins and export topocentric ephemeris",
  "Elev. Solar Mín (°):": "Min Solar Elev (°):",
  "Margen DTE (°):": "DTE Margin (°):",
  "Exportar CSV": "Export CSV",
  "Exportar JSON": "Export JSON",
  "Horizonte Sol": "Sun Horizon",
  "Potencia PV": "PV Power",
  "Estado DTE": "DTE Status",
  "Sunset en": "Sunset in",
  "NOMINAL": "NOMINAL",
  "RASANTE": "GRAZING",
  "OCLUIDO": "OCCLUDED"
};

const LOWERCASE_DICTIONARY = {};
for (const [es, en] of Object.entries(RAW_DICTIONARY)) {
  LOWERCASE_DICTIONARY[es.toLowerCase()] = en;
}

const REGEX_RULES = [
  [/^Consola de Misión\s*·\s*(.+)$/i, "Mission Console · $1"],
  [
    /^Desde\s+([^\s·]+)\s*·\s*(\d+\s*h)\s*·\s*paneles verticales con seguimiento \(cos el\)\s*·\s*los umbrales deciden el veredicto \(aquí y en el comparador\)$/i,
    "From $1 · $2 · vertical tracking panels (cos el) · thresholds determine the verdict (here and in comparator)"
  ],
  [/^Desde\s+(.+)$/i, "From $1"],
  [/^\(margen\s*≥\s*([^)]+)\)$/i, "(margin ≥ $1)"],
  [
    /^(\d+)\s+ventana\(s\)\s*·\s*(\d+\s*h)\s+en total\s*·\s*◀\s*ya iniciada\s*\/\s*▶\s*continúa después del per[íi]odo$/i,
    "$1 window(s) · $2 total · ◀ already started / ▶ continues after period"
  ],
  [/^(\d+)\s+ventana\(s\)$/i, "$1 window(s)"],
  [/^(\d+\s*h)\s+en total$/i, "$1 total"],
  [/^Día\s+(\d+)\s+de\s+(\d+)$/i, "Day $1 of $2"],
  [/^Hora\s+(\d+)\s*\/\s*(\d+)$/i, "Hour $1 / $2"],
  [/^Máx:\s*(.+)$/i, "Max: $1"],
  [/^Máx ciclo:\s*(.+)$/i, "Cycle max: $1"],
  [/^(\d+)\s+días?\s+y\s+(\d+)\s+h$/i, "$1d $2h"],
  [/^a\s+([-\d\.]+°)\s+sobre el horizonte$/i, "$1 above horizon"],
  [/^a\s+([-\d\.]+°)\s+bajo el horizonte$/i, "$1 below horizon"],
  [/^\.?\s*En este mes hay luz el\s+(\d+(?:\.\d+)?)%\s+del tiempo\.?$/i, ". This month has sunlight $1% of the time."],
  [/^\.?\s*Hay contacto directo el\s+(\d+(?:\.\d+)?)%\s+del mes\.?$/i, ". Direct contact available $1% of the month."],
  [/^ESCENARIO #(\d+)$/i, "SCENARIO #$1"],
  [/^Inicio:\s*(.+)$/i, "Start: $1"],
  [/^Coordenada Personalizada\s*\((.+)\)$/i, "Custom Coordinate ($1)"],
  [
    /^\* Mostrando muestras cada 12h del primer escenario fijado \((.+)\)\. Exporta CSV\/JSON para obtener las 720 horas completas\.$/i,
    "* Showing 12h samples of the first pinned scenario ($1). Export CSV/JSON for all 720 hours."
  ]
];

class AppTranslator {
  constructor() {
    this.lang = localStorage.getItem("lunar_nav_lang") || "es";
    this.originalTextMap = new WeakMap();
    this.isApplying = false;
    this.observer = null;
  }

  init() {
    this.injectLanguageButton();
    this.setupObserver();
    if (this.lang === "en") {
      this.applyLanguage("en");
      // Refuerzos para tarjetas cargadas de forma asíncrona tras la recarga
      setTimeout(() => this.applyLanguage("en"), 350);
      setTimeout(() => this.applyLanguage("en"), 1000);
    }
  }

  injectLanguageButton() {
    const header = document.querySelector("header");
    if (!header || document.getElementById("langToggleBtn")) return;

    const btn = document.createElement("button");
    btn.id = "langToggleBtn";
    btn.type = "button";
    btn.className =
      "mono text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 transition flex items-center gap-1.5 cursor-pointer";
    btn.title = "Switch language / Cambiar idioma";
    this.updateButtonLabel(btn);

    btn.addEventListener("click", () => {
      const nextLang = this.lang === "es" ? "en" : "es";
      this.setLanguage(nextLang);
    });

    const statusBadge = document.getElementById("statusBadge");
    if (statusBadge && statusBadge.parentElement) {
      const wrapper = document.createElement("div");
      wrapper.className = "flex items-center gap-2.5";
      statusBadge.parentElement.insertBefore(wrapper, statusBadge);
      wrapper.appendChild(btn);
      wrapper.appendChild(statusBadge);
    } else {
      header.appendChild(btn);
    }
  }

  updateButtonLabel(btn = document.getElementById("langToggleBtn")) {
    if (!btn) return;
    btn.innerHTML =
      this.lang === "es"
        ? `<span>🌐</span><span class="text-sky-300">ES</span><span class="text-slate-500">|</span><span class="text-slate-400">EN</span>`
        : `<span>🌐</span><span class="text-slate-400">ES</span><span class="text-slate-500">|</span><span class="text-sky-300">EN</span>`;
  }

  setLanguage(newLang) {
    this.lang = newLang;
    localStorage.setItem("lunar_nav_lang", newLang);
    window.location.reload();
  }

  translateCore(text) {
    if (LOWERCASE_DICTIONARY[text.toLowerCase()]) {
      return LOWERCASE_DICTIONARY[text.toLowerCase()];
    }
    for (const [regex, replacement] of REGEX_RULES) {
      if (regex.test(text)) {
        return text.replace(regex, replacement);
      }
    }
    return null;
  }

  translateString(rawText) {
    if (!rawText || !rawText.trim()) return rawText;

    const leadingSpace = rawText.match(/^\s*/)[0];
    const trailingSpace = rawText.match(/\s*$/)[0];
    const clean = rawText.trim().replace(/\uFE0F/g, "").replace(/\s+/g, " ");

    // 1. Búsqueda directa o por regex completo
    const direct = this.translateCore(clean);
    if (direct !== null) {
      return leadingSpace + direct + trailingSpace;
    }

    // 2. Separar emoji/símbolo inicial (ej. "🛰️ ", "☀ ", "📡 ", "✓ ", "▶ ")
    const prefixMatch = clean.match(/^([^\p{L}\p{N}¿¡"'(\[]+)\s*(.+)$/u);
    if (prefixMatch) {
      const iconPrefix = prefixMatch[1];
      const coreText = prefixMatch[2];
      const translatedCore = this.translateCore(coreText);
      if (translatedCore !== null) {
        return leadingSpace + iconPrefix + " " + translatedCore + trailingSpace;
      }
    }

    return rawText;
  }

  processNode(node) {
    if (!node) return;

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.id === "langToggleBtn" || node.tagName === "SCRIPT" || node.tagName === "STYLE") {
        return;
      }
      ["title", "placeholder"].forEach((attr) => {
        if (node.hasAttribute && node.hasAttribute(attr)) {
          const val = node.getAttribute(attr);
          const origKey = `data-orig-${attr}`;
          if (this.lang === "en") {
            if (!node.hasAttribute(origKey)) node.setAttribute(origKey, val);
            node.setAttribute(attr, this.translateString(node.getAttribute(origKey)));
          } else if (node.hasAttribute(origKey)) {
            node.setAttribute(attr, node.getAttribute(origKey));
          }
        }
      });
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const currentVal = node.nodeValue;
      if (!currentVal || !currentVal.trim()) return;

      if (this.lang === "en") {
        if (!this.originalTextMap.has(node)) {
          this.originalTextMap.set(node, currentVal);
        }
        const sourceEs = this.originalTextMap.get(node);
        const translated = this.translateString(sourceEs);
        if (translated !== currentVal) {
          node.nodeValue = translated;
        }
      } else {
        if (this.originalTextMap.has(node)) {
          const originalEs = this.originalTextMap.get(node);
          if (node.nodeValue !== originalEs) {
            node.nodeValue = originalEs;
          }
        }
      }
      return;
    }

    for (const child of node.childNodes) {
      this.processNode(child);
    }
  }

  applyLanguage(targetLang) {
    this.isApplying = true;
    try {
      this.processNode(document.body);
      document.documentElement.lang = targetLang;
    } finally {
      this.isApplying = false;
    }
  }

  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (this.isApplying) return;
      this.isApplying = true;
      try {
        for (const m of mutations) {
          if (m.type === "characterData") {
            if (this.lang === "en") {
              this.originalTextMap.set(m.target, m.target.nodeValue);
              this.processNode(m.target);
            }
          } else if (m.type === "childList") {
            m.addedNodes.forEach((n) => this.processNode(n));
          }
        }
      } finally {
        this.isApplying = false;
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

window.AppI18n = new AppTranslator();
window.addEventListener("DOMContentLoaded", () => {
  window.AppI18n.init();
});