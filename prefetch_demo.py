import json
from pathlib import Path

try:
    from ephemeris_fetcher import get_site_ephemeris
except ImportError:
    from PY.ephemeris_fetcher import get_site_ephemeris

SITES_PATH = Path("data/sites.json")

# Fechas clave para pre-cargar (fecha nominal y escenarios de retraso de lanzamiento)
WINDOWS = [
    ("2026-11-15 00:00", "2026-12-15 00:00"),
    ("2026-11-30 00:00", "2026-12-30 00:00"),  # +15 días (medio día lunar)
    ("2026-12-15 00:00", "2027-01-14 00:00"),  # +30 días (ciclo completo)
]


def main():
    sites = json.loads(SITES_PATH.read_text(encoding="utf-8"))
    total = len(sites) * len(WINDOWS)
    count = 0

    print(f"Iniciando pre-carga de {total} combinaciones Sitio/Fecha desde JPL Horizons...\n")
    for site in sites:
        for start_utc, stop_utc in WINDOWS:
            count += 1
            print(f"[{count}/{total}] Cacheando {site['name']} ({start_utc[:10]})...", end=" ")
            get_site_ephemeris(
                lat=site["lat"],
                lon=site["lon"],
                alt_km=site["elevation_km"],
                start_utc=start_utc,
                stop_utc=stop_utc,
                step="1 h",
            )
            print("OK")

    print("\nCaché completada. La aplicación ya puede operar 100% offline en la presentación.")


if __name__ == "__main__":
    main()