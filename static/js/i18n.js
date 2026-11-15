// static/js/i18n.js — Traducción ES/EN sin recargar la página.
//
// Cómo funciona:
//   - Todos los textos viven en STRINGS como clave → [español, inglés].
//   - El HTML estático usa atributos:  data-i18n="clave"        → textContent
//                                       data-i18n-html="clave"   → innerHTML (textos con <b>, etc.)
//                                       data-i18n-title="clave"  → atributo title
//   - El código JS genera los textos dinámicos con I18N.t('clave', { variables }).
//   - Al cambiar de idioma se emite 'lunar:langchange' y cada módulo vuelve a dibujar sus textos
//     (tarjetas, visor 3D, gráficas, consola y comparador) SIN perder el estado.
//
// Se carga como script clásico en <head>, antes de los módulos, para que window.I18N ya exista.
(function () {
  const STRINGS = {
    // ---------- Página / encabezado ----------
    'page.title': ['Lunar Landing Site Navigator — Simulador 3D y temporal', 'Lunar Landing Site Navigator — 3D & Temporal Simulator'],
    'header.subtitle': ['Simulador Topográfico 3D, Sombras Polares y Enlace Directo Tierra (DTE)', '3D Topographic Simulator, Polar Shadows & Direct-to-Earth (DTE) Link'],
    'lang.tip': ['Cambiar idioma / Switch language', 'Switch language / Cambiar idioma'],

    'badge.init': ['INICIALIZANDO...', 'INITIALIZING...'],
    'badge.loading': ['CONSULTANDO JPL HORIZONS...', 'QUERYING JPL HORIZONS...'],
    'badge.ready': ['ESCENA 3D Y EFEMÉRIDES LISTAS', '3D SCENE & EPHEMERIS READY'],
    'badge.noDataPrev': ['SIN DATOS · MOSTRANDO ESCENARIO ANTERIOR', 'NO DATA · SHOWING PREVIOUS SCENARIO'],
    'badge.noData': ['SIN DATOS', 'NO DATA'],

    // ---------- Controles ----------
    'controls.site': ['Sitio de Alunizaje', 'Landing Site'],
    'controls.lat': ['Latitud (°)', 'Latitude (°)'],
    'controls.lon': ['Longitud (°)', 'Longitude (°)'],
    'controls.alt': ['Elev. (km)', 'Elev. (km)'],
    'controls.date': ['Fecha Inicio Misión (UTC)', 'Mission Start Date (UTC)'],
    'controls.prevLunar': ['-1 Día Lunar', '−1 Lunar Day'],
    'controls.halfLunar': ['+½ Día Lunar', '+½ Lunar Day'],
    'controls.nextLunar': ['+1 Día Lunar', '+1 Lunar Day'],
    'controls.season': ['+90d', '+90d'],
    'controls.evaluate': ['Evaluar', 'Evaluate'],
    'controls.customOption': ['★ Ingresar Coordenadas Personalizadas...', '★ Enter Custom Coordinates...'],

    // ---------- Errores ----------
    'err.title': ['No se pudo cargar el escenario', 'Could not load the scenario'],
    'err.server': ['No hay conexión con el servidor local (¿está corriendo api.py?).', 'No connection to the local server (is api.py running?).'],
    'err.offline': [
      'Sin datos para {site} desde {date}: no hay conexión con JPL Horizons y esta combinación sitio/fecha no está en la caché. Corre prefetch_demo.py con internet.',
      'No data for {site} from {date}: there is no connection to JPL Horizons and this site/date combination is not cached. Run prefetch_demo.py with internet access.',
    ],
    'err.badCoords': ['Coordenadas fuera de rango: lat ∈ [-90, 90], lon ∈ [-180, 360].', 'Coordinates out of range: lat ∈ [-90, 90], lon ∈ [-180, 360].'],
    'err.horizons': ['JPL Horizons respondió con un error. Intenta de nuevo en unos minutos.', 'JPL Horizons returned an error. Try again in a few minutes.'],
    'err.generic': ['Error {code} al evaluar el escenario.', 'Error {code} while evaluating the scenario.'],

    // ---------- Sitio ----------
    'site.loading': ['Cargando sitio...', 'Loading site...'],
    'site.coords': ['Lat: {lat}° | Lon: {lon}° | Elev: {alt} km', 'Lat: {lat}° | Lon: {lon}° | Elev: {alt} km'],
    'site.custom.name': ['Coordenada personalizada ({lat}°, {lon}°)', 'Custom coordinate ({lat}°, {lon}°)'],
    'site.custom.desc': ['Punto de aterrizaje definido manualmente por el usuario.', 'Landing point entered manually by the user.'],
    'site.change-4.name': ["Von Kármán Crater (Cara Oculta)", "Von Kármán Crater (Far Side)"],
    'site.shackleton-rim.desc': ['Cresta con iluminación solar casi continua cerca de depósitos de hielo permanente.', 'Ridge with near-continuous sunlight close to permanent ice deposits.'],
    'site.malapert-massif.desc': ['Macizo elevado con excelente línea de vista directa hacia la Tierra (DTE).', 'Elevated massif with an excellent direct line of sight to Earth (DTE).'],
    'site.mons-mouton.desc': ['Meseta elevada con pendientes suaves y ventanas extendidas de luz solar.', 'High plateau with gentle slopes and extended sunlight windows.'],
    'site.haworth-rim.desc': ['Borde de cráter polar con acceso cercano a regiones permanentemente en sombra (PSR).', 'Polar crater rim close to Permanently Shadowed Regions (PSRs).'],
    'site.apollo-11.desc': ['Primer alunizaje tripulado; ciclo ecuatorial clásico de ~14.7 días de luz y 14.7 de noche.', 'First crewed landing; classic equatorial cycle of ~14.7 days of light and 14.7 of night.'],
    'site.apollo-15.desc': ['Zona rodeada por los Montes Apeninos, ideal para probar bloqueo topográfico local.', 'Area surrounded by the Apennine Mountains, ideal for testing local terrain blocking.'],
    'site.chandrayaan-3.desc': ['Primer alunizaje exitoso en latitudes altas del sur lunar.', 'First successful landing at high southern lunar latitudes.'],
    'site.change-4.desc': ['Ubicado en la cara oculta: elevación terrestre siempre negativa (requiere satélite relé).', 'On the far side: Earth elevation is always negative (relay satellite required).'],

    'cat.South Pole': ['Polo Sur', 'South Pole'],
    'cat.Historical': ['Histórico', 'Historical'],
    'cat.International': ['Internacional', 'International'],
    'cat.Custom': ['Personalizado', 'Custom'],

    // ---------- Tarjetas (KPI) ----------
    'kpi.sun.tip': ['Altura del Sol sobre el horizonte. En el polo sur casi nunca pasa de 2°.', 'Height of the Sun above the horizon. At the south pole it rarely exceeds 2°.'],
    'kpi.sun.eng': ['Elevación Solar', 'Solar Elevation'],
    'kpi.sun.exp': ["☀️ ¿Le llega el Sol?", "☀️ Is the Sun reaching it?"],
    'kpi.max': ['Máx: {v}°', 'Max: {v}°'],
    'kpi.panels': ['Paneles', 'Panels'],
    'kpi.panels.tip': ['Tipo de panel solar', 'Solar panel type'],
    'panel.auto': ['auto', 'auto'],
    'panel.vertical': ['verticales', 'vertical'],
    'panel.horizontal': ['horizontales', 'horizontal'],
    'kpi.panelNote.vertical': ['Verticales siguiendo el acimut del Sol · eficiencia = cos(elevación)', "Vertical, tracking the Sun's azimuth · efficiency = cos(elevation)"],
    'kpi.panelNote.horizontal': ['Horizontales · eficiencia = sen(elevación)', 'Horizontal · efficiency = sin(elevation)'],
    'kpi.sunMargin': ['Margen sobre relieve: {m} (horizonte {h}° @ Az {az}°)', 'Margin above terrain: {m} (horizon {h}° @ Az {az}°)'],
    'kpi.margin': ['Margen sobre relieve: {m}', 'Margin above terrain: {m}'],
    'pill.visible': ['VISIBLE', 'VISIBLE'],
    'pill.sunOnExp': ['HAY LUZ', 'SUNLIT'],
    'pill.sunOnEng': ['ILUMINADO', 'SUNLIT'],
    'pill.sunBlocked': ['TAPADO', 'BLOCKED'],
    'pill.night': ['NOCHE', 'NIGHT'],
    'pill.sunOffEng': ['SOMBRA / NOCHE', 'SHADOW / NIGHT'],
    'kpi.sunset.tip': ['Cuánto falta para que el Sol quede debajo del horizonte o detrás del relieve.', 'Time left until the Sun drops below the horizon or behind the terrain.'],
    'kpi.sunset.eng': ['Tiempo hasta Sunset', 'Time to Sunset'],
    'kpi.sunset.exp': ["🌇 ¿Cuándo se va el Sol?", "🌇 When does the Sun leave?"],
    'kpi.sunlitWindow': ['Luz en ventana (30d):', 'Sunlight in window (30d):'],
    'sunset.darkExp': ["Ya se fue", "Already gone"],
    'sunset.darkEng': ['0.0 h (En sombra)', '0.0 h (In shadow)'],
    'sunset.noneExp': ["No se va", "It stays"],
    'sunset.noneEng': ['Sin sunset hasta fin del periodo', 'No sunset before end of period'],
    'kpi.dte.tip': ['Comunicación directa con la Tierra (DTE): necesita ver la Tierra sobre el relieve.', 'Direct-to-Earth communication (DTE): Earth must be visible above the terrain.'],
    'kpi.dte.eng': ['Enlace Tierra (DTE)', 'Earth Link (DTE)'],
    'kpi.dte.exp': ["📡 ¿Puede hablar con la Tierra?", "📡 Can it talk to Earth?"],
    'kpi.dteAvail': ['Disponibilidad DTE:', 'DTE availability:'],
    'pill.active': ['ACTIVO', 'ACTIVE'],
    'pill.earthOnExp': ['HAY SEÑAL', 'SIGNAL'],
    'pill.earthOnEng': ['DTE ACTIVO', 'DTE ACTIVE'],
    'pill.earthOffExp': ['SIN SEÑAL', 'NO SIGNAL'],
    'pill.earthOffEng': ['SIN LÍNEA DE VISTA', 'NO LINE OF SIGHT'],
    'kpi.earthset.tip': ['Cuánto falta para que la Tierra quede debajo del horizonte o detrás del relieve.', 'Time left until Earth drops below the horizon or behind the terrain.'],
    'kpi.earthset.eng': ['Tiempo hasta Earthset', 'Time to Earthset'],
    'kpi.earthset.exp': ["🌍 ¿Cuándo deja de ver la Tierra?", "🌍 When does it lose sight of Earth?"],
    'kpi.localHorizon': ['Horizonte local (Az Tierra):', 'Local horizon (Earth Az):'],
    'earthset.hiddenExp': ["Ya no la ve", "Out of sight"],
    'earthset.hiddenEng': ['0.0 h (Ocluida)', '0.0 h (Occluded)'],
    'earthset.noneExp': ["La sigue viendo", "Still in view"],
    'earthset.noneEng': ['Sin earthset hasta fin del periodo', 'No earthset before end of period'],

    // Frases sencillas (modo Explorador)
    'plain.sun.low': ["El Sol está <b>muy bajito</b>, casi pegado al horizonte. Por eso cualquier montaña lo puede tapar. Ahora los paneles solares cargan al <b>{eff}%</b>.", "The Sun is <b>very low</b>, almost touching the horizon. That is why any mountain can block it. Right now the solar panels charge at <b>{eff}%</b>."],
    'plain.sun.high': ["El Sol está <b>alto en el cielo</b>. Los paneles solares cargan al <b>{eff}%</b>.", "The Sun is <b>high in the sky</b>. The solar panels charge at <b>{eff}%</b>."],
    'plain.sun.blocked': ["⛰️ El Sol sí salió, pero <b>una montaña lo tapa</b>. El robot está en la sombra y no puede cargarse.", "⛰️ The Sun is up, but <b>a mountain blocks it</b>. The robot is in the shade and cannot charge."],
    'plain.sun.night': ["🌑 <b>Es de noche</b> en este lugar. El robot funciona con sus baterías hasta que vuelva el Sol.", "🌑 <b>It is night</b> here. The robot runs on its batteries until the Sun comes back."],
    'plain.sunset.never': ["El Sol <b>no se va</b> en lo que queda del mes.", "The Sun <b>does not leave</b> for the rest of the month."],
    'plain.sunset.in': ["El Sol se va en <b>{d}</b>.", "The Sun leaves in <b>{d}</b>."],
    'plain.sunrise.never': ["El Sol <b>no vuelve</b> en lo que queda del mes.", "The Sun <b>does not come back</b> for the rest of the month."],
    'plain.sunrise.in': ["El Sol vuelve en <b>{d}</b>.", "The Sun comes back in <b>{d}</b>."],
    'plain.sunPct': ["Este mes hay Sol unos {days} de 30 días.", "This month there is sunlight about {days} of 30 days."],
    'plain.dte.on': ["La Tierra se ve en el cielo, así que <b>el robot puede mandarnos mensajes</b>.", "Earth is visible in the sky, so <b>the robot can send us messages</b>."],
    'plain.dte.never': ["🌑 Desde aquí <b>la Tierra nunca se ve</b> (es el lado de la Luna que no da hacia nosotros). Haría falta un satélite que pase los mensajes.", "🌑 From here <b>Earth is never visible</b> (this side of the Moon faces away from us). A satellite would be needed to pass the messages along."],
    'plain.dte.blocked': ["⛰️ La Tierra está <b>detrás de una montaña</b>. Por ahora el robot no puede mandarnos mensajes.", "⛰️ Earth is <b>behind a mountain</b>. For now the robot cannot send us messages."],
    'plain.dte.below': ["🌍 La Tierra está <b>debajo del horizonte</b>. Por ahora el robot no puede mandarnos mensajes.", "🌍 Earth is <b>below the horizon</b>. For now the robot cannot send us messages."],
    'plain.earthset.never': ["La Tierra <b>se sigue viendo</b> todo lo que queda del mes.", "Earth <b>stays visible</b> for the rest of the month."],
    'plain.earthset.in': ["Deja de ver la Tierra en <b>{d}</b>.", "It loses sight of Earth in <b>{d}</b>."],
    'plain.earthrise.never': ["La Tierra <b>no vuelve a verse</b> en lo que queda del mes.", "Earth <b>does not reappear</b> for the rest of the month."],
    'plain.earthrise.in': ["La Tierra vuelve a verse en <b>{d}</b>.", "Earth reappears in <b>{d}</b>."],
    'plain.dtePct': ["Este mes hay señal unos {days} de 30 días.", "This month there is signal about {days} of 30 days."],

    // ---------- Línea de tiempo ----------
    'play.start': ['▶ Simular Ciclo', '▶ Simulate Cycle'],
    'play.pause': ['⏸ Pausar', '⏸ Pause'],
    'step.day': ['Día {d} de {n}', 'Day {d} of {n}'],
    'step.hour': ['Hora {h} / {n}', 'Hour {h} / {n}'],

    // ---------- Visor 3D ----------
    'viewer.title': ['Simulador Topográfico 3D y Sombras en Tiempo Real (WebGL · DEM sintético de demostración)', '3D Topographic Simulator & Real-Time Shadows (WebGL · synthetic demo DEM)'],
    'viewer.phase': ['Fase 3', 'Phase 3'],
    'viewer.subEng': ['Arrastra para rotar • Rueda para zoom • Sombras duras sin dispersión atmosférica y vectores Sol/Tierra', 'Drag to rotate • Scroll to zoom • Hard shadows with no atmospheric scattering and Sun/Earth vectors'],
    'viewer.subExp': ["Arrastra con el mouse para girar y usa la rueda para acercarte. El robot está en el centro.", "Drag with the mouse to rotate and use the wheel to zoom in. The robot is in the center."],
    'viewer.local': ['Terreno local', 'Local terrain'],
    'viewer.globe': ['🌕 Luna completa', '🌕 Whole Moon'],
    'cam.orbit': ['Vista Orbital', 'Orbital view'],
    'cam.lander': ['Superficie (Lander)', 'Surface (lander)'],
    'cam.top': ['Cenital (N ↑)', 'Top-down (N ↑)'],
    'cam.sun': ['Mirar al Sol', 'Look at the Sun'],
    'cam.earth': ['Mirar a la Tierra', 'Look at Earth'],
    'leg.sun': ['Vector Sol', 'Sun vector'],
    'leg.earth': ['Vector Tierra (DTE)', 'Earth vector (DTE)'],
    'leg.blocked': ['Tramo bloqueado por relieve', 'Segment blocked by terrain'],
    'leg.hit': ['Punto de bloqueo', 'Blocking point'],
    'leg.topoHorizon': ['Horizonte topográfico', 'Topographic horizon'],
    'leg.geoHorizon': ['Horizonte geométrico 0°', '0° geometric horizon'],
    'layer.paths': ['Trayectorias del periodo', 'Paths over the period'],
    'layer.dome': ['Domo y horizonte', 'Sky dome & horizon'],
    'layer.xray': ['Rayos X (ver tras relieve)', 'X-ray (see through terrain)'],
    'hud.local': ['ESCENA LOCAL', 'LOCAL SCENE'],
    'hud.localValue': ['disco Ø 36 km · lander ×100', '36 km Ø disc · lander ×100'],
    'hud.global': ['VISTA GLOBAL', 'GLOBAL VIEW'],
    'hud.globalValue': ['Luna R = 1737.4 km · luz solar del instante', 'Moon R = 1737.4 km · sunlight at this instant'],
    'hud.shadow': ['ESTADO SOMBRA LANDER:', 'LANDER SHADOW STATE:'],
    'hud.dte': ['LÍNEA DE VISTA DTE:', 'DTE LINE OF SIGHT:'],
    'hud.sunlit': ['ILUMINADO (SOL DIRECTO)', 'SUNLIT (DIRECT SUN)'],
    'hud.shadowed': ['EN SOMBRA TOPOGRÁFICA', 'IN TOPOGRAPHIC SHADOW'],
    'hud.dteOn': ['ACTIVO (LÍNEA DESPEJADA)', 'ACTIVE (CLEAR LINE OF SIGHT)'],
    'hud.dteOff': ['BLOQUEADO POR RELIEVE', 'BLOCKED BY TERRAIN'],
    'hud.axesLocal': ['Norte (-Z) | Este (+X) | Curvatura Lunar Activa', 'North (−Z) | East (+X) | Lunar curvature on'],
    'hud.axesGlobe': ['Arrastra para girar la Luna • Polo Sur abajo • Línea azul = 80° S', 'Drag to rotate the Moon • South Pole at the bottom • Blue line = 80° S'],
    'hud.sunNums': ['SOL    Az {az}° · El {el} · margen {m}', 'SUN    Az {az}° · El {el} · margin {m}'],
    'hud.earthNums': ['TIERRA Az {az}° · El {el} · margen {m}', 'EARTH  Az {az}° · El {el} · margin {m}'],
    'inset.label': ['LUNA · clic para ampliar', 'MOON · click to enlarge'],
    'inset.tip': ['Ver la Luna completa', 'View the whole Moon'],
    'cap.sunOn': ["☀️ La <b class=\"text-amber-300\">línea amarilla</b> llega al Sol sin chocar con nada: el robot tiene luz.", "☀️ The <b class=\"text-amber-300\">yellow line</b> reaches the Sun without hitting anything: the robot has light."],
    'cap.sunBlocked': ["⛰️ La línea hacia el Sol <b class=\"text-rose-300\">choca con una montaña</b> a {km} km: por eso el robot está en la sombra.", "⛰️ The line to the Sun <b class=\"text-rose-300\">hits a mountain</b> {km} km away: that is why the robot is in the shade."],
    'cap.sunNight': ["🌑 El Sol está debajo del horizonte: aquí es de noche.", "🌑 The Sun is below the horizon: it is night here."],
    'cap.earthOn': ["📡 La <b class=\"text-sky-300\">línea azul</b> llega a la Tierra: la antena puede mandar mensajes.", "📡 The <b class=\"text-sky-300\">blue line</b> reaches Earth: the antenna can send messages."],
    'cap.earthBlocked': ["⛰️ La línea hacia la Tierra <b class=\"text-rose-300\">choca con una montaña</b> a {km} km: no hay señal.", "⛰️ The line to Earth <b class=\"text-rose-300\">hits a mountain</b> {km} km away: no signal."],
    'cap.earthBelow': ["🌍 La Tierra está debajo del horizonte: no hay señal.", "🌍 Earth is below the horizon: no signal."],
    'body.sun': ['Sol', 'Sun'],
    'body.earth': ['Tierra', 'Earth'],
    'vec.statusSunOn': ['ILUMINA', 'SUNLIT'],
    'vec.statusEarthOn': ['DTE OK', 'DTE OK'],
    'vec.statusBelow': ['BAJO HORIZONTE', 'BELOW HORIZON'],
    'vec.statusBlocked': ['BLOQUEADO', 'BLOCKED'],
    'vec.plainSunOn': ["se ve: hay luz", "visible: light"],
    'vec.plainEarthOn': ["se ve: hay señal", "visible: signal"],
    'vec.plainBelow': ['bajo el horizonte', 'below the horizon'],
    'vec.plainBlocked': ['tapado por una montaña', 'blocked by a mountain'],
    'vec.above': ["{el}° de altura", "{el}° high"],
    'vec.elaz': ['El {el}° · Az {az}°', 'El {el}° · Az {az}°'],
    'vec.margin': ['Margen sobre relieve: {m}°', 'Margin above terrain: {m}°'],
    'hit.exp.sun': ["⛰️ esta montaña tapa el Sol ({km} km)", "⛰️ this mountain blocks the Sun ({km} km)"],
    'hit.exp.earth': ["⛰️ esta montaña tapa la Tierra ({km} km)", "⛰️ this mountain blocks Earth ({km} km)"],
    'hit.eng': ['{icon} bloqueo a {km} km · relieve {m} m', '{icon} blocked at {km} km · terrain {m} m'],
    'dir.N': ['N', 'N'],
    'dir.E': ['E', 'E'],
    'dir.S': ['S', 'S'],
    'dir.W': ['O', 'W'],

    // ---------- Panorama y domo ----------
    'pano.title': ['Perfil Panorámico del Horizonte 360°', '360° Panoramic Horizon Profile'],
    'pano.subEng': ['Silueta topográfica exacta calculada desde el punto del Lander', 'Exact topographic silhouette computed from the lander position'],
    'pano.subExp': ["La parte gris son las montañas. El punto amarillo es el Sol y el azul la Tierra: si quedan dentro de lo gris, una montaña los tapa.", "The gray area is the mountains. The yellow dot is the Sun and the blue one is Earth: if they fall inside the gray area, a mountain is blocking them."],
    'dome.title': ['Domo Celeste Polar (Sky-Dome)', 'Polar Sky Dome'],
    'dome.subEng': ['Proyección cenital 360° y libración terrestre', '360° zenith projection and Earth libration'],
    'dome.subExp': ['El cielo visto desde arriba: el centro está justo encima del lander y el borde es el horizonte.', 'The sky seen from above: the center is right above the lander and the edge is the horizon.'],

    // ---------- Luna completa ----------
    'globe.sun': ['☀ Sol', '☀ Sun'],
    'globe.earth': ['🌍 Tierra <span style="opacity:.6">(no a escala)</span>', '🌍 Earth <span style="opacity:.6">(not to scale)</span>'],

    // ---------- Barra de perfil ----------
    'mode.label': ["¿Cómo quieres verlo?", "How do you want to see it?"],
    'mode.explorer': ["🎓 Modo Explorador (fácil)", "🎓 Explorer Mode (easy)"],
    'mode.engineering': ["🛰️ Modo Ingeniería (técnico)", "🛰️ Engineering Mode (technical)"],
    'mode.hintExp': ["Explicado con palabras sencillas, para cualquier persona.", "Explained in plain words, for anyone."],
    'mode.hintEng': ['Márgenes sobre el relieve, ventanas operativas, umbrales de viabilidad y exportación.', 'Terrain margins, operating windows, feasibility thresholds and export.'],
    'pin.button': ['📌 Fijar Escenario Actual al Comparador', '📌 Pin Current Scenario to Comparator'],

    // ---------- Guía (Explorador) ----------
    'guide.title': ["🌙 ¿Por qué es difícil poner un robot en el Polo Sur de la Luna?", "🌙 Why is it hard to put a robot at the Moon's South Pole?"],
    'guide.sub': ["Lee estas 4 ideas y luego mueve la barra de tiempo para verlas en acción.", "Read these 4 ideas, then move the timeline to see them in action."],
    'guide.badge': ["Fácil de entender", "Easy to understand"],
    'guide.c1.title': ["☀️ Días y noches larguísimos", "☀️ Super long days and nights"],
    'guide.c1.body': ["En la Luna un día dura <b>casi un mes</b>: unas 2 semanas de Sol y 2 semanas de noche. Sin Sol, el robot se queda sin energía y se congela.", "On the Moon one day lasts <b>almost a month</b>: about 2 weeks of sunlight and 2 weeks of night. Without sunlight, the robot runs out of power and freezes."],
    'guide.c2.title': ["🌑 Sombras totalmente negras", "🌑 Pitch-black shadows"],
    'guide.c2.body': ["La Luna <b>no tiene aire</b>. Por eso no hay atardecer: cuando una montaña tapa el Sol, todo queda <b>completamente oscuro</b> de golpe.", "The Moon <b>has no air</b>, so there is no sunset glow: when a mountain blocks the Sun, everything goes <b>completely dark</b> at once."],
    'guide.c3.title': ["🌍 La Tierra casi no se mueve", "🌍 Earth barely moves"],
    'guide.c3.body': ["Desde la Luna, la Tierra se ve <b>siempre en el mismo lugar</b> del cielo. Si una montaña la tapa, el robot no puede mandarnos mensajes.", "From the Moon, Earth always appears <b>in the same spot</b> in the sky. If a mountain blocks it, the robot cannot send us messages."],
    'guide.c4.title': ["🔦 En el Polo Sur el Sol va casi pegado al suelo", "🔦 At the South Pole the Sun stays close to the ground"],
    'guide.c4.body': ["Es como alumbrar el piso con una linterna de lado: la luz llega <b>muy bajita</b> y hasta una loma hace sombra. Pero en los cráteres que nunca reciben luz hay <b>hielo</b>, ¡y por eso queremos ir!", "It is like shining a flashlight sideways across the floor: the light comes in <b>very low</b> and even a small hill casts a shadow. But craters that never get light hold <b>ice</b>, and that is why we want to go!"],
    'guide.try': ["💡 <b class=\"text-slate-200\">Prueba esto:</b> cambia el lugar a <b>Apollo 11</b> (cerca del centro de la Luna) y compara: allá el Sol sube muy alto, pero las noches duran 2 semanas.", "💡 <b class=\"text-slate-200\">Try this:</b> switch the place to <b>Apollo 11</b> (near the middle of the Moon) and compare: there the Sun climbs very high, but nights last 2 weeks."],

    // ---------- Consola de misión (Ingeniería) ----------
    'eng.waiting': ['🛰️ Consola de misión: esperando el escenario…', '🛰️ Mission console: waiting for the scenario…'],
    'eng.title': ['🛰️ Consola de Misión · {site}', '🛰️ Mission Console · {site}'],
    'eng.sub': ['Desde {start} · {h} h · paneles {panel} · los umbrales deciden el veredicto (aquí y en el comparador)', 'From {start} · {h} h · panels: {panel} · thresholds decide the verdict (here and in the comparator)'],
    'eng.panelVertical': ['verticales con seguimiento (cos el)', 'vertical tracking (cos el)'],
    'eng.panelHorizontal': ['horizontales (sen el)', 'horizontal (sin el)'],
    'eng.showHourly': ['Ver tabla horaria', 'Show hourly table'],
    'eng.hideHourly': ['Ocultar tabla horaria', 'Hide hourly table'],
    'th.sunMargin': ['Margen solar mín. (°)', 'Min solar margin (°)'],
    'th.dteMargin': ['Margen DTE mín. (°)', 'Min DTE margin (°)'],
    'th.minSunPct': ['Luz útil mín. (%)', 'Min usable light (%)'],
    'th.minDtePct': ['DTE útil mín. (%)', 'Min usable DTE (%)'],
    'th.maxDarkHours': ['Sombra máx. (h)', 'Max shadow (h)'],
    'eng.reset': ['Restaurar umbrales', 'Reset thresholds'],
    'eng.verdict': ['Veredicto', 'Verdict'],
    'verdict.VIABLE': ['VIABLE', 'VIABLE'],
    'verdict.MARGINAL': ['MARGINAL', 'MARGINAL'],
    'verdict.NO VIABLE': ['NO VIABLE', 'NOT VIABLE'],
    'crit.sun': ['Luz útil', 'Usable sunlight'],
    'crit.dte': ['Enlace DTE útil', 'Usable DTE link'],
    'crit.dark': ['Sombra continua máx.', 'Longest continuous shadow'],
    'crit.short.sun': ['Luz', 'Light'],
    'crit.short.dte': ['Enlace', 'Link'],
    'crit.short.dark': ['Sombra', 'Shadow'],
    'eng.maxNoDte': ['Máx. sin enlace DTE:', 'Longest without DTE:'],
    'eng.meanEff': ['Eficiencia media con luz:', 'Mean efficiency while lit:'],
    'eng.maxEl': ['Elevación solar máx.:', 'Max solar elevation:'],
    'eng.relay': ['⚠ Sin enlace DTE útil: requiere satélite relé', '⚠ No usable DTE link: relay satellite required'],
    'eng.sunWin': ['☀ Ventanas de luz útil', '☀ Usable sunlight windows'],
    'eng.dteWin': ['📡 Ventanas de enlace DTE', '📡 DTE link windows'],
    'eng.marginGe': ['(margen ≥ {m}°)', '(margin ≥ {m}°)'],
    'eng.noSunWin': ['Sin ventanas de luz útil con este margen en el periodo.', 'No usable sunlight windows with this margin in the period.'],
    'eng.noDteWin': ['Sin ventanas de enlace directo con este margen: se necesita un satélite relé.', 'No direct-link windows with this margin: a relay satellite is needed.'],
    'win.start': ['Inicio (UTC)', 'Start (UTC)'],
    'win.end': ['Fin', 'End'],
    'win.dur': ['Dur.', 'Dur.'],
    'win.minMargin': ['Margen mín.', 'Min margin'],
    'win.more': ['… y {n} ventanas más', '… and {n} more windows'],
    'win.footer': ['{n} ventana(s) · {h} h en total · ◀ ya iniciada / ▶ continúa después del periodo', '{n} window(s) · {h} h total · ◀ already under way / ▶ continues after the period'],
    'hourly.ts': ['Timestamp (UTC)', 'Timestamp (UTC)'],
    'hourly.sun': ['Sol Az / El', 'Sun Az / El'],
    'hourly.sunHorizon': ['Horizonte Sol', 'Sun horizon'],
    'hourly.pv': ['Potencia PV', 'PV power'],
    'hourly.earth': ['Tierra Az / El', 'Earth Az / El'],
    'hourly.dte': ['Estado DTE', 'DTE status'],
    'hourly.sunset': ['Sunset en', 'Sunset in'],
    'hourly.nominal': ['NOMINAL', 'NOMINAL'],
    'hourly.grazing': ['RASANTE', 'GRAZING'],
    'hourly.occluded': ['OCLUIDO', 'OCCLUDED'],
    'hourly.endPeriod': ['fin periodo', 'end of period'],
    'hourly.note': ['* Muestras cada 12 h. Exporta CSV/JSON para obtener todas las horas.', '* Samples every 12 h. Export CSV/JSON to get every hour.'],

    // ---------- Comparador ----------
    'comp.titleExp': ["Compara lugares o fechas", "Compare places or dates"],
    'comp.titleEng': ['Comparador Multi-Escenario (Trade-off Ciencia vs. Ingeniería)', 'Multi-Scenario Comparator (Science vs. Engineering Trade-off)'],
    'comp.max3': ['Hasta 3 Escenarios', 'Up to 3 Scenarios'],
    'comp.subExp': ["Guarda hasta 3 lugares o fechas y mira cuál tiene más Sol y más contacto con la Tierra.", "Save up to 3 places or dates and see which one gets more sunlight and more contact with Earth."],
    'comp.subEng': ['Evalúa sitios candidatos o impactos por retrasos de lanzamiento lado a lado (veredicto con los umbrales de la consola).', 'Evaluate candidate sites or launch-delay impacts side by side (verdict uses the console thresholds).'],
    'comp.add': ['+ Añadir', '+ Add'],
    'comp.clear': ['Limpiar', 'Clear'],
    'comp.emptyTitle': ['No hay escenarios fijados para comparar', 'No pinned scenarios to compare yet'],
    'comp.emptyBody': [
      'Usa el botón superior <strong>"📌 Fijar Escenario Actual"</strong> o selecciona un sitio y fecha arriba y pulsa <strong>"+ Añadir"</strong> para contrastar hasta 3 planes de alunizaje lado a lado.',
      'Use the <strong>"📌 Pin Current Scenario"</strong> button at the top, or pick a site and date above and press <strong>"+ Add"</strong> to compare up to 3 landing plans side by side.',
    ],
    'comp.evaluating': ['Evaluando escenario…', 'Evaluating scenario…'],
    'card.scenario': ['ESCENARIO #{n}', 'SCENARIO #{n}'],
    'card.remove': ['✕ Quitar', '✕ Remove'],
    'card.start': ['Inicio: {d} • Lat {lat}°', 'Start: {d} • Lat {lat}°'],
    'card.sunPct': ["☀️ Tiene Sol unos <b class=\"text-white\">{days} de 30 días</b>{star}", "☀️ Sunlight about <b class=\"text-white\">{days} of 30 days</b>{star}"],
    'card.dtePct': ["📡 Puede hablar con la Tierra unos <b class=\"text-white\">{days} de 30 días</b>{star}", "📡 Can talk to Earth about <b class=\"text-white\">{days} of 30 days</b>{star}"],
    'card.longestShadow': ["🌑 La oscuridad más larga dura <b class=\"text-white\">{d}</b>", "🌑 The longest darkness lasts <b class=\"text-white\">{d}</b>"],
    'card.maxEl': ["⬆️ ¿Qué tan alto sube el Sol? <b class=\"text-white\">{desc}</b>", "⬆️ How high does the Sun get? <b class=\"text-white\">{desc}</b>"],
    'card.good': ["✅ Buen lugar para esta fecha: tiene suficiente Sol y contacto con la Tierra.", "✅ Good place for this date: enough sunlight and contact with Earth."],
    'card.risky': ["⚠️ Se puede, pero con riesgo", "⚠️ Possible, but risky"],
    'card.hard': ["❌ Muy difícil", "❌ Very hard"],
    'reason.sun': ["poco Sol para cargar los paneles", "too little sunlight to charge the panels"],
    'reason.relay': ["nunca ve la Tierra, necesitaría un satélite que pase los mensajes", "it never sees Earth, it would need a satellite to relay messages"],
    'reason.dte': ["poco tiempo para hablar con la Tierra", "too little time to talk to Earth"],
    'reason.dark': ["oscuridad de hasta {d} seguidos", "darkness lasting up to {d}"],
    'card.usableSun': ['Luz útil (≥{m}°):', 'Usable sunlight (≥{m}°):'],
    'card.usableDte': ['DTE útil (≥{m}°):', 'Usable DTE (≥{m}°):'],
    'card.maxElEng': ['Elevación solar máx.:', 'Max solar elevation:'],
    'card.longestShadowEng': ['Sombra continua máx.:', 'Longest continuous shadow:'],
    'card.maxNoDte': ['Máx. sin DTE:', 'Longest without DTE:'],
    'card.panels': ['Paneles:', 'Panels:'],
    'card.relay': ['⚠ Requiere satélite relé (sin DTE útil)', '⚠ Relay satellite required (no usable DTE)'],
    'chart.titleExp': ["¿Qué tan alto sube el Sol cada día?", "How high does the Sun get each day?"],
    'chart.titleEng': ['Elevación solar a lo largo del periodo (30 días)', 'Solar elevation over the period (30 days)'],
    'chart.zoom': ['Zoom horizonte ±10°', 'Horizon zoom ±10°'],
    'chart.full': ['Escala completa', 'Full scale'],
    'chart.legendExp': ["Línea = altura del Sol · punteada = altura de las montañas · barras de abajo = días con Sol", "Line = Sun height · dashed = mountain height · bars below = days with sunlight"],
    'chart.legendEng': ['Línea sólida = elevación del Sol · punteada = horizonte topográfico en esa dirección · franjas inferiores = horas con Sol visible (cada escenario)', 'Solid line = solar elevation · dashed = topographic horizon in that direction · bottom bands = hours with the Sun visible (each scenario)'],
    'chart.day': ['día {d}', 'day {d}'],
    'comp.max3Exp': ["Hasta 3 opciones", "Up to 3 options"],
    'card.startExp': ["📅 {d}", "📅 {d}"],
    'header.subtitleExp': ["Descubre dónde y cuándo un robot en la Luna tiene Sol para cargarse y puede comunicarse con la Tierra", "Find out where and when a robot on the Moon gets sunlight to charge and can talk to Earth"],
    'pin.buttonExp': ["📌 Guardar para comparar", "📌 Save to compare"],
    'badge.loadingExp': ["CARGANDO DATOS DE LA NASA…", "LOADING NASA DATA…"],
    'badge.readyExp': ["✓ LISTO", "✓ READY"],
    'exp.controls.site': ["¿Dónde aterriza el robot?", "Where does the robot land?"],
    'exp.controls.date': ["¿Cuándo llega?", "When does it arrive?"],
    'exp.controls.prev': ["◀ 1 mes antes", "◀ 1 month earlier"],
    'exp.controls.half': ["+2 semanas", "+2 weeks"],
    'exp.controls.next': ["1 mes después ▶", "1 month later ▶"],
    'exp.controls.season': ["+3 meses", "+3 months"],
    'exp.controls.evaluate': ["Ver resultado", "Show result"],
    'now.title': ["Ahora mismo en este lugar", "Right now at this spot"],
    'now.headline.sunDte': ["☀️ El robot <b>tiene Sol</b> y 📡 <b>puede hablar con la Tierra</b>. ¡Todo va bien!", "☀️ The robot <b>has sunlight</b> and 📡 <b>can talk to Earth</b>. All good!"],
    'now.headline.sunNoDte': ["☀️ El robot <b>tiene Sol</b>, pero 📡 <b>no puede hablar con la Tierra</b> en este momento.", "☀️ The robot <b>has sunlight</b>, but 📡 <b>cannot talk to Earth</b> right now."],
    'now.headline.noSunDte': ["🌑 El robot <b>está a oscuras</b>, pero 📡 <b>sí puede hablar con la Tierra</b>.", "🌑 The robot <b>is in the dark</b>, but 📡 <b>can still talk to Earth</b>."],
    'now.headline.none': ["🌑 El robot <b>está a oscuras</b> y 📡 <b>sin comunicación</b>. Tiene que aguantar con sus baterías.", "🌑 The robot <b>is in the dark</b> and 📡 <b>has no contact</b>. It has to hold on with its batteries."],
    'now.energyOn': ["🔋 Energía: <b class=\"text-emerald-300\">se está cargando con el Sol</b>", "🔋 Power: <b class=\"text-emerald-300\">charging with sunlight</b>"],
    'now.energyOff': ["🔋 Energía: <b class=\"text-rose-300\">sin Sol, usa sus baterías</b>", "🔋 Power: <b class=\"text-rose-300\">no sunlight, running on batteries</b>"],
    'now.commsOn': ["📡 Comunicación: <b class=\"text-emerald-300\">puede mandar mensajes a la Tierra</b>", "📡 Communication: <b class=\"text-emerald-300\">can send messages to Earth</b>"],
    'now.commsOff': ["📡 Comunicación: <b class=\"text-rose-300\">no ve la Tierra, sin señal directa</b>", "📡 Communication: <b class=\"text-rose-300\">cannot see Earth, no direct signal</b>"],
    'now.month': ["En los próximos 30 días: ☀️ habrá Sol unos <b>{sun} días</b> · 📡 habrá señal unos <b>{dte} días</b> · 🌑 la oscuridad más larga dura <b>{dark}</b>.", "Over the next 30 days: ☀️ about <b>{sun} days</b> of sunlight · 📡 about <b>{dte} days</b> of signal · 🌑 the longest darkness lasts <b>{dark}</b>."],
    'exp.sunYes': ["Sí ☀️", "Yes ☀️"],
    'exp.sunNo': ["No 🌑", "No 🌑"],
    'exp.earthYes': ["Sí 📡", "Yes 📡"],
    'exp.earthNo': ["No ✖", "No ✖"],
    'exp.play': ["▶ Ver cómo cambia", "▶ Watch it change"],
    'exp.dateLabel': ["Fecha:", "Date:"],
    'exp.sliderHint': ["👆 Mueve la barra para avanzar o regresar en el tiempo (30 días). Con \"Ver cómo cambia\" se mueve sola.", "👆 Drag the bar to move forward or back in time (30 days). \"Watch it change\" moves it for you."],
    'exp.viewer.title': ["🌙 Así se ve el lugar de aterrizaje", "🌙 This is what the landing spot looks like"],
    'exp.viewer.local': ["Este lugar", "This spot"],
    'exp.viewer.globe': ["🌕 Toda la Luna", "🌕 Whole Moon"],
    'exp.cam.orbit': ["Vista general", "Overview"],
    'exp.cam.lander': ["Ver el robot de cerca", "See the robot up close"],
    'exp.cam.sun': ["☀️ ¿Dónde está el Sol?", "☀️ Where is the Sun?"],
    'exp.cam.earth': ["🌍 ¿Dónde está la Tierra?", "🌍 Where is Earth?"],
    'exp.leg.sun': ["Línea hacia el Sol", "Line to the Sun"],
    'exp.leg.earth': ["Línea hacia la Tierra", "Line to Earth"],
    'exp.leg.blocked': ["Roja y punteada = una montaña la tapa", "Red and dashed = a mountain blocks it"],
    'exp.leg.hit': ["Montaña que estorba", "Blocking mountain"],
    'exp.pano.title': ["🏔️ Lo que vería el robot si diera una vuelta completa", "🏔️ What the robot would see turning all the way around"],
    'gloss.title': ["📖 Palabras que te ayudan", "📖 Helpful words"],
    'gloss.items': ["<li><b>Robot (lander):</b> la nave que aterriza en la Luna y trabaja ahí.</li><li><b>Horizonte:</b> la línea donde parece que se juntan el cielo y el suelo.</li><li><b>Paneles solares:</b> placas que convierten la luz del Sol en energía.</li><li><b>Baterías:</b> guardan energía para cuando no hay Sol.</li><li><b>Señal directa:</b> cuando el robot ve la Tierra y nos manda mensajes sin ayuda.</li><li><b>Satélite relé:</b> un satélite que pasa los mensajes cuando la Tierra no se ve.</li><li><b>Cráter:</b> hoyo que dejó el choque de una roca espacial.</li>", "<li><b>Robot (lander):</b> the spacecraft that lands on the Moon and works there.</li><li><b>Horizon:</b> the line where the sky seems to meet the ground.</li><li><b>Solar panels:</b> plates that turn sunlight into power.</li><li><b>Batteries:</b> store power for when there is no sunlight.</li><li><b>Direct signal:</b> when the robot can see Earth and send us messages on its own.</li><li><b>Relay satellite:</b> a satellite that passes messages along when Earth is out of sight.</li><li><b>Crater:</b> a hole left by a space rock crashing into the Moon.</li>"],
    'guide.steps': ["<b class=\"text-white\">Cómo usar esta página:</b> 1️⃣ Elige un lugar de la Luna · 2️⃣ Elige una fecha · 3️⃣ Mira si al robot le llega el Sol ☀️ y si puede hablar con la Tierra 📡", "<b class=\"text-white\">How to use this page:</b> 1️⃣ Pick a place on the Moon · 2️⃣ Pick a date · 3️⃣ See if the robot gets sunlight ☀️ and can talk to Earth 📡"],
    'comp.emptyTitleExp': ["Todavía no has guardado nada para comparar", "You have not saved anything to compare yet"],
    'comp.emptyBodyExp': ["Pulsa <b>\"📌 Guardar para comparar\"</b> arriba, o elige un lugar y una fecha aquí y pulsa <b>\"+ Añadir\"</b>.", "Press <b>\"📌 Save to compare\"</b> at the top, or pick a place and a date here and press <b>\"+ Add\"</b>."],
    'card.scenarioExp': ["OPCIÓN {n}", "OPTION {n}"],
    'sunHeight.veryLow': ["muy poco, casi pegado al horizonte ({el}°)", "barely, almost touching the horizon ({el}°)"],
    'sunHeight.low': ["poco ({el}°)", "not much ({el}°)"],
    'sunHeight.high': ["muy alto ({el}°)", "very high ({el}°)"],
  };

  const STORAGE_KEY = 'lunar_nav_lang';
  let lang = 'es';
  try { lang = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'; } catch (_) { /* sin almacenamiento */ }

  const missing = new Set();
  function t(key, vars) {
    const entry = STRINGS[key];
    let s;
    if (!entry) {
      if (!missing.has(key)) { missing.add(key); console.warn('[i18n] falta la clave:', key); }
      s = key;
    } else {
      s = entry[lang === 'en' ? 1 : 0] ?? entry[0];
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  }

  // 153 h → "6 días y 9 h" / "6 days 9 h"
  function fmtDuration(hours) {
    const h = Math.round(hours);
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24), r = h % 24;
    if (lang === 'en') return r ? `${d} ${d === 1 ? 'day' : 'days'} ${r} h` : `${d} ${d === 1 ? 'day' : 'days'}`;
    return r ? `${d} ${d === 1 ? 'día' : 'días'} y ${r} h` : `${d} ${d === 1 ? 'día' : 'días'}`;
  }

  // 122 h → "5.1 días" / "5.1 days"; 12 h → "12 horas" / "12 hours"
  function fmtDays(hours) {
    if (hours < 24) return lang === 'en' ? `${hours} hours` : `${hours} horas`;
    const d = hours / 24;
    return `${d.toFixed(d < 10 ? 1 : 0)} ${lang === 'en' ? 'days' : 'días'}`;
  }

  // "2026-Nov-24 05:00" (formato de Horizons) → "24 de noviembre de 2026, 05:00 h" / "November 24, 2026, 05:00"
  const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const MONTH_NAMES = {
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  };
  function fmtDate(ts, withTime) {
    const m = /^(\d{4})-([A-Za-z]{3})-(\d{1,2})(?:\s+(\d{2}:\d{2}))?/.exec(ts || '');
    if (!m || !(m[2] in MONTHS)) return ts || '';
    const [, y, mon, d, hm] = m;
    const name = MONTH_NAMES[lang][MONTHS[mon]];
    const day = parseInt(d, 10);
    const date = lang === 'en' ? `${name} ${day}, ${y}` : `${day} de ${name} de ${y}`;
    if (!withTime || !hm) return date;
    return lang === 'en' ? `${date}, ${hm}` : `${date}, ${hm} h`;
  }

  function applyStatic(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    scope.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.documentElement.lang = lang;
    document.title = t('page.title');
  }

  function renderButton() {
    const btn = document.getElementById('langToggleBtn');
    if (!btn) return;
    btn.title = t('lang.tip');
    btn.innerHTML = lang === 'es'
      ? '<span>🌐</span><span class="text-sky-300">ES</span><span class="text-slate-500">|</span><span class="text-slate-400">EN</span>'
      : '<span>🌐</span><span class="text-slate-400">ES</span><span class="text-slate-500">|</span><span class="text-sky-300">EN</span>';
  }

  function injectButton() {
    const badge = document.getElementById('statusBadge');
    if (!badge || document.getElementById('langToggleBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'langToggleBtn';
    btn.type = 'button';
    btn.className = 'mono text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 transition flex items-center gap-1.5 cursor-pointer';
    btn.addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-2.5';
    badge.parentElement.insertBefore(wrapper, badge);
    wrapper.appendChild(btn);
    wrapper.appendChild(badge);
    renderButton();
  }

  function setLang(next) {
    if (next !== 'es' && next !== 'en') return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* sin almacenamiento */ }
    applyStatic();
    renderButton();
    window.dispatchEvent(new CustomEvent('lunar:langchange', { detail: { lang } }));
  }

  window.I18N = {
    t, setLang, fmtDuration, fmtDays, fmtDate, applyStatic,
    get lang() { return lang; },
    has: key => key in STRINGS,
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectButton();
    applyStatic();
  });
})();
