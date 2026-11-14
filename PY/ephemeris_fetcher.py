import re
import json
import hashlib
from pathlib import Path
import requests

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
CACHE_DIR = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)


def query_horizons_topocentric(
    target_id: str,
    lat: float,
    lon: float,
    alt_km: float,
    start_utc: str,
    stop_utc: str,
    step: str = "1 h",
) -> list[dict]:
    """
    Consulta JPL Horizons para un observador en la superficie lunar (coord@301).
    target_id: '10' para el Sol, '399' para la Tierra.
    start_utc / stop_utc: formato 'YYYY-MM-DD HH:MM'
    """
    cache_key = hashlib.md5(
        f"{target_id}_{lat}_{lon}_{alt_km}_{start_utc}_{stop_utc}_{step}".encode()
    ).hexdigest()
    cache_file = CACHE_DIR / f"{cache_key}.json"

    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    params = {
        "format": "json",
        "COMMAND": f"'{target_id}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},{alt_km}'",
        "START_TIME": f"'{start_utc}'",
        "STOP_TIME": f"'{stop_utc}'",
        "STEP_SIZE": f"'{step}'",
        "QUANTITIES": "'4'",  # 4 = Acimut y Elevación aparente (sin refracción en cuerpos sin atmósfera)
        "ANG_FORMAT": "'DEG'",
    }

    response = requests.get(HORIZONS_URL, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()

    if "error" in payload:
        raise RuntimeError(f"Error en JPL Horizons: {payload['error']}")

    raw_result = payload.get("result", "")
    soe_match = re.search(r"\$\$SOE\s*(.*?)\s*\$\$EOE", raw_result, re.DOTALL)
    if not soe_match:
        raise ValueError("No se encontró el bloque $$SOE..$$EOE en la respuesta de Horizons.")

    records = []
    # Captura: Fecha/Hora UTC, posibles banderas solares/lunares, Acimut, Elevación
    line_pattern = re.compile(
        r"(\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2})\s+[^\d\-\+]*([-\d\.]+)\s+([-\d\.]+)"
    )

    for line in soe_match.group(1).strip().splitlines():
        match = line_pattern.search(line)
        if match:
            records.append(
                {
                    "timestamp_utc": match.group(1),
                    "azimuth_deg": float(match.group(2)),
                    "elevation_deg": float(match.group(3)),
                }
            )

    cache_file.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return records


def get_site_ephemeris(
    lat: float, lon: float, alt_km: float, start_utc: str, stop_utc: str, step: str = "1 h"
) -> list[dict]:
    """Combina las efemérides del Sol y la Tierra en una sola serie temporal."""
    sun_data = query_horizons_topocentric("10", lat, lon, alt_km, start_utc, stop_utc, step)
    earth_data = query_horizons_topocentric("399", lat, lon, alt_km, start_utc, stop_utc, step)

    combined = []
    for s, e in zip(sun_data, earth_data):
        combined.append(
            {
                "timestamp_utc": s["timestamp_utc"],
                "sun": {"az": s["azimuth_deg"], "el": s["elevation_deg"]},
                "earth": {"az": e["azimuth_deg"], "el": e["elevation_deg"]},
            }
        )
    return combined