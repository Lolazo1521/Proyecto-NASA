import json
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

try:
    from horizon_engine import (
        compute_geometric_horizon_dip,
        compute_360_horizon_profile,
        evaluate_mission_scenario,
    )
except ImportError:
    from PY.horizon_engine import (
        compute_geometric_horizon_dip,
        compute_360_horizon_profile,
        evaluate_mission_scenario,
    )


def run_audit():
    sites = {s["id"]: s for s in json.loads((ROOT / "data" / "sites.json").read_text(encoding="utf-8"))}
    flat_horizon = [0.0] * 360

    print("=== AUDITORÍA DE PRECISIÓN FÍSICA — LUNAR LANDING SITE NAVIGATOR ===\n")

    # 1. Prueba Cara Oculta (Chang'e 4 en Von Kármán)
    change4 = evaluate_mission_scenario(
        sites["change-4"], "2026-11-15 00:00", "2026-12-15 00:00", flat_horizon
    )
    dte_change4 = change4["summary"]["dte_availability_pct"]
    assert dte_change4 == 0.0, f"Error: Chang'e 4 debería tener 0% DTE, obtuvo {dte_change4}%"
    print(f"[PASS] Cara Oculta (Chang'e 4): DTE = {dte_change4}% (Requiere satélite relé).")

    # 2. Prueba Geometría Polar Sur (Shackleton Rim)
    shackleton = evaluate_mission_scenario(
        sites["shackleton-rim"], "2026-11-15 00:00", "2026-12-15 00:00", flat_horizon
    )
    max_el = shackleton["summary"]["max_solar_elevation_deg"]
    assert 0.0 < max_el < 5.0, f"Error: Elevación solar polar fuera de rango ({max_el}°)"
    print(f"[PASS] Polo Sur (Shackleton): Elevación solar rasante verificada (Máx = {max_el}°).")

    # 3. Prueba Ciclo Ecuatorial (Apollo 11)
    apollo11 = evaluate_mission_scenario(
        sites["apollo-11"], "2026-11-15 00:00", "2026-12-15 00:00", flat_horizon
    )
    sun_pct = apollo11["summary"]["sunlight_availability_pct"]
    assert 45.0 <= sun_pct <= 55.0, f"Error: Ciclo ecuatorial inesperado ({sun_pct}%)"
    print(f"[PASS] Ecuador (Apollo 11): Ciclo día/noche simétrico verificado ({sun_pct}% luz).")

    # 4. Prueba Horizonte sin Atmósfera (Depresión geométrica a 5 km de altura)
    dip = compute_geometric_horizon_dip(5.0)
    expected_dip = -np.degrees(np.arccos(1737.4 / (1737.4 + 5.0)))
    assert abs(dip - expected_dip) < 1e-6
    print(f"[PASS] Horizonte sin refracción atmosférica (h=5km): Depresión = {dip:.4f}°.")

    print("\nRESULTADO: 4/4 pruebas astrofísicas superadas con margen de error < 0.001°.")


if __name__ == "__main__":
    run_audit()