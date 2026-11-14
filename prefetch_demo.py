"""
Pre-carga la caché de efemérides (JPL Horizons) para poder hacer la demo SIN internet.

Uso (con internet, desde cualquier carpeta):
    python prefetch_demo.py                     # fecha base 2026-11-15
    python prefetch_demo.py --base 2027-01-10   # otra fecha base

Descarga, para cada sitio de data/sites.json, las ventanas de 30 días que la interfaz pide con
sus botones: fecha base, +½ día lunar (+15 d), +1 día lunar (+30 d), -1 día lunar (-30 d) y +90 d.
"""
import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "PY"))
from ephemeris_fetcher import get_site_ephemeris  # noqa: E402

SITES_PATH = ROOT / "data" / "sites.json"
WINDOW_DAYS = 30
# Desplazamientos que usan los botones de la interfaz (shiftDateDays redondea 29.53 → 30 y 14.77 → 15)
OFFSETS_DAYS = [0, 15, 30, -30, 90]


def windows_for(base: datetime) -> list[tuple[str, str]]:
    out = []
    for off in OFFSETS_DAYS:
        start = base + timedelta(days=off)
        stop = start + timedelta(days=WINDOW_DAYS)
        out.append((start.strftime("%Y-%m-%d 00:00"), stop.strftime("%Y-%m-%d 00:00")))
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="2026-11-15", help="Fecha base YYYY-MM-DD (por defecto 2026-11-15)")
    args = parser.parse_args()

    base = datetime.strptime(args.base, "%Y-%m-%d")
    sites = json.loads(SITES_PATH.read_text(encoding="utf-8"))
    windows = windows_for(base)
    total = len(sites) * len(windows)
    ok, failed = 0, []

    print(f"Pre-cargando {total} combinaciones sitio/fecha desde JPL Horizons...\n")
    for site in sites:
        for start_utc, stop_utc in windows:
            label = f"{site['name']} ({start_utc[:10]})"
            print(f"[{ok + len(failed) + 1}/{total}] {label}...", end=" ", flush=True)
            try:
                get_site_ephemeris(
                    lat=site["lat"], lon=site["lon"], alt_km=site["elevation_km"],
                    start_utc=start_utc, stop_utc=stop_utc, step="1 h",
                )
                ok += 1
                print("OK")
            except Exception as exc:  # seguir con las demás aunque una falle
                failed.append(label)
                print(f"FALLÓ ({exc.__class__.__name__})")

    print(f"\nListo: {ok}/{total} combinaciones en caché.")
    if failed:
        print("No se pudieron descargar (vuelve a correr el script para reintentar):")
        for f in failed:
            print("  -", f)
        sys.exit(1)
    print("La aplicación ya puede operar sin internet para estas fechas.")


if __name__ == "__main__":
    main()
