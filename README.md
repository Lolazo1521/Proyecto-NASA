# Lunar Landing Site Navigator

Herramienta web para comparar rápidamente sitios y fechas de alunizaje: muestra dónde están el
**Sol** y la **Tierra** respecto al horizonte local, cuánto falta para el *sunset* / *earthset* y qué
tan viable es un escenario en **energía solar** y **comunicación directa con la Tierra (DTE)**.
Pensada para planeadores de misión, docentes y público general, con foco en el **Polo Sur lunar**.

## Qué incluye

- **Sitios curados** (Apollo, CLPS/Artemis, Chandrayaan-3, Chang'e 4) y **coordenadas personalizadas**.
- **Fechas flexibles**: calendario y saltos de ±1 día lunar, +½ día lunar y +90 días.
- **Indicadores**: elevación solar, eficiencia de paneles, % de luz y de DTE en 30 días, cuenta
  regresiva a sunset y earthset, horizonte local en la dirección de la Tierra.
- **Visor 3D**: terreno local redondo con curvatura lunar y cráteres, lander CLPS detallado (antena
  que apunta a la Tierra y paneles que siguen al Sol), vectores Sol/Tierra con el punto exacto donde
  el relieve bloquea la línea de vista, domo celeste y trayectorias del periodo.
- **Luna completa**: esfera con mares y cráteres iluminada con la dirección real del Sol del
  instante elegido (se ve el terminador moverse).
- **Panorama 360°** del horizonte y **domo celeste** cenital.
- **Comparador** de hasta 3 escenarios lado a lado, con gráfica de elevación solar (zoom al
  horizonte para sitios polares) y franjas de visibilidad.
- **Dos perfiles de interfaz** que cambian toda la página (se recuerda la última elección):
  - **Explorador** (cualquier persona, sin conocimientos técnicos): pasos de uso, 4 ideas explicadas
    con analogías, tarjeta "Ahora mismo en este lugar" con semáforos de energía y comunicación,
    respuestas Sí/No, fechas y duraciones en palabras ("24 de noviembre", "unos 20 de 30 días"),
    visor 3D con explicación en vivo y solo lo esencial, glosario de palabras clave y comparador sin jerga.
  - **Ingeniería** (planeadores): consola de misión con **ventanas de luz y de enlace DTE** (inicio,
    fin, duración, margen mínimo sobre el relieve), **umbrales que deciden el veredicto**
    VIABLE / MARGINAL / NO VIABLE (también en el comparador), tabla horaria, exportar CSV/JSON del
    escenario actual, márgenes en los indicadores y todas las capas técnicas del 3D.

- **Bienvenida y recorrido guiado**: la primera vez explica en dos frases para qué sirve la página y
  ofrece un recorrido de 10 pasos que ilumina cada sección y explica qué hace. El botón
  "❓ ¿Cómo se usa?" del encabezado lo repite cuando quieras.
- **Español / inglés**: botón 🌐 ES | EN en el encabezado. Cambia todos los textos al instante
  (tarjetas, visor 3D, Luna completa, gráficas, consola y comparador) sin recargar y sin perder
  los escenarios fijados ni la posición en la línea de tiempo. Se recuerda la última elección.

## Cómo correrlo

Requisitos: **Python 3.10 o superior**.

```bash
pip install -r requirements.txt
python api.py
```

Abre <http://127.0.0.1:8000>. Se puede arrancar desde cualquier carpeta (las rutas son absolutas).

## Demo sin internet

El frontend no usa CDNs (three.js y Tailwind están en `static/vendor/`), pero las **efemérides** se
piden a JPL Horizons y se guardan en `cache/`. Antes de la presentación, **con internet**, corre:

```bash
python prefetch_demo.py                    # fecha base 2026-11-15
python prefetch_demo.py --base 2027-01-10  # si vas a presentar con otra fecha base
```

Descarga los 8 sitios × las ventanas que usan los botones (base, +15 d, +30 d, −30 d, +90 d).
Si una combinación sitio/fecha no está en caché y no hay internet, la interfaz lo dice con un
mensaje en lugar de fallar en silencio.

## Estructura

```
api.py                      API FastAPI: /api/sites, /api/evaluate; genera el DEM y el perfil de horizonte
PY/ephemeris_fetcher.py     Consulta topocéntrica a JPL Horizons (observador en la Luna) + caché
PY/horizon_engine.py        Horizonte 360° por trazado de rayos, visibilidad, eficiencia, cuentas regresivas
data/sites.json             Catálogo de sitios
cache/                      Efemérides descargadas (JSON)
static/index.html           Interfaz principal
static/js/                  Visor 3D: Luna completa, terreno, lander, shader de cráteres, comparador,
                            traducción (i18n.js) y recorrido guiado (guided_tour.js)
static/vendor/              three.js 0.160 (MIT) y Tailwind compilado
prefetch_demo.py            Pre-carga de caché para la demo
validate_accuracy.py        Pruebas de coherencia física (requieren caché o internet)
```

## Datos de la NASA utilizados

| Dato | Fuente | Uso en el proyecto |
|---|---|---|
| Efemérides del Sol y la Tierra vistas desde la superficie lunar (acimut y elevación, cada hora) | [JPL Horizons System](https://ssd.jpl.nasa.gov/horizons/), NASA/JPL | Base de todos los cálculos de luz, comunicación directa (DTE), cuentas regresivas y de la iluminación del visor 3D y de la Luna completa |
| Sitios de alunizaje (Artemis / CLPS, Apollo) | Programas públicos de la NASA | Catálogo de sitios en `data/sites.json` |

Pendiente para la siguiente versión: sustituir el terreno sintético por un DEM real de
**LOLA** (Lunar Orbiter Laser Altimeter, misión LRO de la NASA), que es el recurso que sugiere el reto.

## Modelo y supuestos

- **Efemérides**: JPL Horizons, `CENTER = coord@301` (observador sobre la Luna), acimut/elevación
  aparentes cada hora. Sin atmósfera, no hay refracción. La libración de la Tierra viene incluida.
- **Visibilidad**: el Sol o la Tierra son visibles si su elevación supera el horizonte topográfico en
  ese acimut. El horizonte se calcula trazando 360 rayos sobre el DEM con corrección por curvatura
  (caída = d² / 2R). El Sol y la Tierra se tratan como puntos (radio angular del Sol ≈ 0.27°).
- **Paneles solares** (selector en la tarjeta "Elevación Solar"):
  - *verticales*, girando con el acimut del Sol: eficiencia = cos(elevación). Es el diseño típico en
    el polo, donde el Sol va rasante.
  - *horizontales*: eficiencia = sen(elevación).
  - *auto*: verticales si |lat| ≥ 60°, horizontales en otro caso.

### Umbrales de viabilidad (modo Ingeniería)

Valores de partida para la demo (no son requisitos oficiales; se cambian en la consola):

| Umbral | Por defecto | Significado |
|---|---|---|
| Margen solar mín. | 0° | Grados del Sol sobre el relieve para contar como luz útil |
| Margen DTE mín. | 0.5° | Grados de la Tierra sobre el relieve para un enlace estable |
| Luz útil mín. | 50 % | Horas del periodo con luz útil |
| DTE útil mín. | 25 % | Horas del periodo con enlace útil |
| Sombra máx. | 168 h | Sombra continua máxima (≈ 7 días de baterías) |

Veredicto: sin criterios fallados = VIABLE, uno = MARGINAL, dos o más = NO VIABLE.

## Limitaciones conocidas

- **El terreno es un DEM sintético de demostración** (`get_dem_for_coordinates` en `api.py`), no datos
  LOLA. Los valores de luz y DTE dependen de ese terreno, así que son ilustrativos. Para usar
  topografía real, reemplaza esa función por un recorte del DEM polar de LOLA (GeoTIFF) centrado en el
  sitio, con la misma forma (malla en metros, fila 0 = Norte). El resto del sistema no cambia.
- El radio del DEM es de ~18 km. En el polo, montañas a más de 100 km también definen el horizonte.
- El lander está a escala ×100 para que se vea en una escena de 36 km.

## Agregar o cambiar textos (traducción)

Todos los textos están en `static/js/i18n.js` como `'clave': ['español', 'inglés']`.
- En el HTML: `data-i18n="clave"` (texto), `data-i18n-html="clave"` (texto con etiquetas) o
  `data-i18n-title="clave"` (tooltip).
- En JavaScript: `I18N.t('clave', { variable: valor })`; en el texto se escribe `{variable}`.
- Si falta una clave, la consola del navegador muestra `[i18n] falta la clave: …`.

## Modificar estilos

Las clases de Tailwind están precompiladas en `static/vendor/tailwind.css`. Si agregas clases nuevas,
regenera el archivo (requiere Node.js):

```bash
npx tailwindcss@3 -c tailwind.config.js -i static/tailwind.input.css -o static/vendor/tailwind.css --minify
```

## Créditos

- Efemérides: [JPL Horizons System](https://ssd.jpl.nasa.gov/horizons/), NASA/JPL-Caltech.
- Gráficos 3D: [three.js](https://threejs.org) (licencia MIT).
