import json
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from PY.horizon_engine import (
    compute_360_horizon_profile,
    evaluate_mission_scenario,
)

app = FastAPI(title="Lunar Landing Site Navigator API")
app.mount("/static", StaticFiles(directory="static"), name="static")

SITES_PATH = Path("data/sites.json")


def get_dem_for_coordinates(lat: float, lon: float, size: int = 600, pixel_scale_m: float = 60.0) -> np.ndarray:
    """
    Genera una malla topográfica determinista basada en las coordenadas hasta integrar GeoTIFF LOLA.
    En el Polo Sur (|lat| > 80) simula cráteres profundos y crestas; en latitudes medias, relieve suave.
    """
    seed = int(abs(lat * 1000) + abs(lon * 1000)) % (2**31)
    rng = np.random.default_rng(seed)

    y, x = np.ogrid[:size, :size]
    center = size // 2
    dist_m = np.sqrt((x - center) ** 2 + (y - center) ** 2) * pixel_scale_m
    angle = np.arctan2(y - center, x - center)

    is_polar = abs(lat) >= 80.0
    relief_amp = 480.0 if is_polar else 110.0
    slope = -0.035 if is_polar else -0.005

    phase1 = rng.uniform(0, 2 * np.pi)
    phase2 = rng.uniform(0, 2 * np.pi)
    freq1 = rng.integers(2, 5)
    freq2 = rng.integers(5, 9)

    dem = 1500.0 + slope * dist_m
    dem += relief_amp * np.sin(angle * freq1 + phase1) * np.exp(-((dist_m - 10000) ** 2) / (2 * 6000**2))
    dem += (relief_amp * 0.45) * np.cos(angle * freq2 + phase2) * np.exp(-((dist_m - 16000) ** 2) / (2 * 8000**2))
    return dem


@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")


@app.get("/api/sites")
def list_sites():
    if not SITES_PATH.exists():
        raise HTTPException(status_code=404, detail="No se encontró data/sites.json")
    return json.loads(SITES_PATH.read_text(encoding="utf-8"))


@app.get("/api/evaluate")
def evaluate_site(
    site_id: str = Query(default="shackleton-rim"),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    alt_km: float | None = Query(default=None),
    start_date: str = Query(default="2026-11-15"),
    days: int = Query(default=30, ge=1, le=60),
):
    sites = json.loads(SITES_PATH.read_text(encoding="utf-8"))
    selected_site = next((s for s in sites if s["id"] == site_id), None)

    if site_id == "custom" or selected_site is None:
        if lat is None or lon is None:
            raise HTTPException(status_code=400, detail="Coordenadas lat y lon requeridas para sitio personalizado.")
        selected_site = {
            "id": "custom",
            "name": f"Coordenada Personalizada ({lat:.2f}°, {lon:.2f}°)",
            "program": "Custom Mission Target",
            "category": "Custom",
            "lat": lat,
            "lon": lon,
            "elevation_km": alt_km if alt_km is not None else 0.0,
            "description": "Punto de aterrizaje definido manualmente por el usuario.",
        }

    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usa YYYY-MM-DD.")

    dt_stop = dt_start + timedelta(days=days)
    start_utc = dt_start.strftime("%Y-%m-%d 00:00")
    stop_utc = dt_stop.strftime("%Y-%m-%d 00:00")

    dem = get_dem_for_coordinates(selected_site["lat"], selected_site["lon"])
    horizon_360 = compute_360_horizon_profile(dem, observer_row=300, observer_col=300)

    try:
        report = evaluate_mission_scenario(
            site=selected_site,
            start_utc=start_utc,
            stop_utc=stop_utc,
            horizon_profile_360=horizon_360,
            step_hours=1.0,
        )
        return report
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error consultando efemérides JPL Horizons: {exc}")