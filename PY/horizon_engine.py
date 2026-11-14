import json
import numpy as np
from ephemeris_fetcher import get_site_ephemeris

MOON_RADIUS_KM = 1737.4


def compute_geometric_horizon_dip(alt_km: float) -> float:
    """
    Calcula el ángulo del horizonte geométrico (en grados) sin refracción atmosférica.
    Si el observador está elevado respecto al radio medio, el horizonte cae por debajo de 0°.
    """
    if alt_km <= 0:
        return 0.0
    dip_rad = np.arccos(MOON_RADIUS_KM / (MOON_RADIUS_KM + alt_km))
    return -float(np.degrees(dip_rad))


def compute_360_horizon_profile(
    dem_grid_m: np.ndarray,
    observer_row: int,
    observer_col: int,
    pixel_scale_m: float = 60.0,
    max_radius_m: float = 30000.0,
) -> list[float]:
    """
    Traza rayos en 360 grados (1 por grado de acimut, 0°=Norte, 90°=Este) sobre una malla LOLA DEM.
    Devuelve una lista de 360 ángulos mínimos de elevación (en grados) para librar el relieve.
    """
    rows, cols = dem_grid_m.shape
    z0 = dem_grid_m[observer_row, observer_col]
    moon_radius_m = MOON_RADIUS_KM * 1000.0

    # Distancias de muestreo a lo largo de cada rayo
    steps = np.arange(pixel_scale_m, max_radius_m, pixel_scale_m)
    horizon_angles = []

    for az_deg in range(360):
        az_rad = np.radians(az_deg)
        # En coordenadas de matriz: Norte (-fila), Este (+columna)
        d_rows = -np.cos(az_rad) * (steps / pixel_scale_m)
        d_cols = np.sin(az_rad) * (steps / pixel_scale_m)

        sample_r = np.round(observer_row + d_rows).astype(int)
        sample_c = np.round(observer_col + d_cols).astype(int)

        # Filtrar puntos dentro de los límites de la matriz
        valid = (sample_r >= 0) & (sample_r < rows) & (sample_c >= 0) & (sample_c < cols)
        if not np.any(valid):
            horizon_angles.append(0.0)
            continue

        r_valid = sample_r[valid]
        c_valid = sample_c[valid]
        dist_valid = steps[valid]

        z_terrain = dem_grid_m[r_valid, c_valid]
        # Corrección por curvatura de la esfera lunar: caída = d^2 / (2 * R_moon)
        curvature_drop = (dist_valid ** 2) / (2.0 * moon_radius_m)
        effective_dz = (z_terrain - z0) - curvature_drop

        angles_deg = np.degrees(np.arctan2(effective_dz, dist_valid))
        horizon_angles.append(float(np.max(angles_deg)))

    return horizon_angles


def generate_mock_south_pole_dem(size: int = 1000, pixel_scale_m: float = 60.0) -> np.ndarray:
    """
    Genera una malla de elevación topográfica sintética (cráteres y crestas) para pruebas rápidas
    antes de cargar los archivos GeoTIFF reales de LOLA.
    """
    y, x = np.ogrid[:size, :size]
    center = size // 2
    dist_m = np.sqrt((x - center) ** 2 + (y - center) ** 2) * pixel_scale_m

    # Simula estar en el borde elevado de un cráter tipo Shackleton con montañas al Sur/Oeste
    dem = 1800.0 - 0.04 * dist_m
    dem += 450.0 * np.sin(np.arctan2(y - center, x - center) * 3.0) * np.exp(-((dist_m - 12000) ** 2) / (2 * 5000 ** 2))
    return dem


def evaluate_mission_scenario(
    site: dict,
    start_utc: str,
    stop_utc: str,
    horizon_profile_360: list[float],
    step_hours: float = 1.0,
) -> dict:
    """
    Cruza las efemérides con el perfil topográfico 360° y calcula métricas de potencia,
    comunicaciones y cuentas regresivas hasta Sunset / Earthset.
    """
    ephemeris = get_site_ephemeris(
        lat=site["lat"],
        lon=site["lon"],
        alt_km=site["elevation_km"],
        start_utc=start_utc,
        stop_utc=stop_utc,
        step=f"{int(step_hours)} h",
    )

    timeline = []
    for entry in ephemeris:
        sun_az_idx = int(round(entry["sun"]["az"])) % 360
        earth_az_idx = int(round(entry["earth"]["az"])) % 360

        horizon_at_sun = horizon_profile_360[sun_az_idx]
        horizon_at_earth = horizon_profile_360[earth_az_idx]

        sun_visible = entry["sun"]["el"] > horizon_at_sun
        earth_visible = entry["earth"]["el"] > horizon_at_earth

        # Eficiencia solar relativa (seno del ángulo de elevación si el Sol es visible)
        solar_efficiency_pct = (
            round(max(0.0, np.sin(np.radians(entry["sun"]["el"]))) * 100.0, 2)
            if sun_visible
            else 0.0
        )

        timeline.append(
            {
                "timestamp_utc": entry["timestamp_utc"],
                "sun": {
                    **entry["sun"],
                    "horizon_el": round(horizon_at_sun, 3),
                    "visible": sun_visible,
                    "solar_power_efficiency_pct": solar_efficiency_pct,
                },
                "earth": {
                    **entry["earth"],
                    "horizon_el": round(horizon_at_earth, 3),
                    "visible": earth_visible,
                },
            }
        )

    # Calcular cuentas regresivas hacia el próximo Sunset y Earthset desde cada instante
    n = len(timeline)
    for i in range(n):
        # Tiempo hasta Sunset
        if not timeline[i]["sun"]["visible"]:
            timeline[i]["hours_to_sunset"] = 0.0
        else:
            hours = None
            for j in range(i + 1, n):
                if not timeline[j]["sun"]["visible"]:
                    hours = (j - i) * step_hours
                    break
            timeline[i]["hours_to_sunset"] = hours  # None si permanece iluminado todo el periodo

        # Tiempo hasta Earthset
        if not timeline[i]["earth"]["visible"]:
            timeline[i]["hours_to_earthset"] = 0.0
        else:
            hours = None
            for j in range(i + 1, n):
                if not timeline[j]["earth"]["visible"]:
                    hours = (j - i) * step_hours
                    break
            timeline[i]["hours_to_earthset"] = hours

    sunlit_hours = sum(1 for t in timeline if t["sun"]["visible"]) * step_hours
    dte_hours = sum(1 for t in timeline if t["earth"]["visible"]) * step_hours
    max_sun_el = max(t["sun"]["el"] for t in timeline)

    return {
        "site": site,
        "summary": {
            "total_period_hours": n * step_hours,
            "sunlit_hours": sunlit_hours,
            "sunlight_availability_pct": round((sunlit_hours / (n * step_hours)) * 100.0, 2),
            "dte_comm_hours": dte_hours,
            "dte_availability_pct": round((dte_hours / (n * step_hours)) * 100.0, 2),
            "max_solar_elevation_deg": round(max_sun_el, 3),
        },
        "horizon_profile_360": [round(h, 3) for h in horizon_profile_360],
        "timeline": timeline,
    }


if __name__ == "__main__":
    sites = json.loads(Path("data/sites.json").read_text(encoding="utf-8"))
    shackleton = sites[0]

    # Generar perfil de horizonte de prueba (reemplazar con LOLA GeoTIFF cuando esté listo)
    dem_mock = generate_mock_south_pole_dem()
    horizon_360 = compute_360_horizon_profile(dem_mock, observer_row=500, observer_col=500)

    # Evaluar un ciclo lunar completo (29.5 días)
    report = evaluate_mission_scenario(
        site=shackleton,
        start_utc="2026-11-15 00:00",
        stop_utc="2026-12-15 00:00",
        horizon_profile_360=horizon_360,
        step_hours=1.0,
    )

    Path("data/sample_scenario_shackleton.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print("Resumen de viabilidad generado:", json.dumps(report["summary"], indent=2))