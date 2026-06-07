"""
OrbitalGuard — Processamento SAR REAL de Brumadinho
Extrai backscatter VV (Sentinel-1 GRD) na Barragem B1 ao longo do tempo,
usando dados abertos da AWS (Earth Search STAC), pré e pós colapso (25 jan 2019).

Saída: pipeline/output/brumadinho_serie_real.json + estatísticas.
NÃO requer download das cenas (lê janela via COG/S3).
"""
import os
import json
import numpy as np
import rasterio
from rasterio.transform import from_gcps, rowcol
from rasterio.windows import Window
from pystac_client import Client

os.environ["AWS_NO_SIGN_REQUEST"] = "YES"

# Barragem B1 — Brumadinho
LAT, LON = -20.1192, -44.1228
BBOX = [-44.20, -20.20, -43.90, -20.00]
HALF = 0.01  # ~1 km de janela ao redor da barragem
COLAPSO = "2019-01-25"


def extrair_backscatter(href):
    """Lê o backscatter VV médio numa janela ~1km ao redor da barragem."""
    with rasterio.Env(AWS_NO_SIGN_REQUEST="YES"):
        with rasterio.open(href) as src:
            gcps, gcp_crs = src.gcps
            transform = from_gcps(gcps)
            # lat/lon -> (row, col) via inversa do transform geo dos GCPs
            row, col = rowcol(transform, LON, LAT)
            row, col = int(row), int(col)
            half_px = 50  # ~0.5 km (pixel GRD ~10 m)
            r0 = max(0, row - half_px); c0 = max(0, col - half_px)
            h = min(2 * half_px, src.height - r0)
            w = min(2 * half_px, src.width - c0)
            if h <= 0 or w <= 0:
                return None
            win = Window(c0, r0, w, h)
            data = src.read(1, window=win).astype("float64")
    data = data[data > 0]
    if data.size == 0:
        return None
    # GRD vem em amplitude (DN). Converte p/ intensidade e dB (sigma0 aproximado).
    db = 10 * np.log10(np.mean(data ** 2))
    return round(float(db), 3)


def main():
    cat = Client.open("https://earth-search.aws.element84.com/v1")
    s = cat.search(collections=["sentinel-1-grd"], bbox=BBOX,
                   datetime="2018-12-01/2019-02-28")
    items = sorted(s.items(), key=lambda i: i.datetime)
    print(f"🛰️  {len(items)} cenas Sentinel-1 GRD reais encontradas\n")

    serie = []
    for it in items:
        data_str = it.datetime.strftime("%Y-%m-%d")
        fase = "pre" if data_str < COLAPSO else "pos"
        try:
            db = extrair_backscatter(it.assets["vv"].href)
            if db is None:
                print(f"  {data_str} [{fase}] — sem dados válidos")
                continue
            serie.append({"data": data_str, "fase": fase, "backscatter_vv_dB": db,
                          "cena": it.id})
            print(f"  {data_str} [{fase}]  VV = {db:6.2f} dB")
        except Exception as e:
            print(f"  {data_str} [{fase}] — erro: {repr(e)[:80]}")

    if not serie:
        raise SystemExit("Nenhuma cena processada.")

    # Baseline pré-desastre e deformação relativa
    pre = [d["backscatter_vv_dB"] for d in serie if d["fase"] == "pre"]
    baseline = float(np.mean(pre)) if pre else serie[0]["backscatter_vv_dB"]
    for d in serie:
        d["deformacao_dB"] = round(d["backscatter_vv_dB"] - baseline, 3)

    pos = [d["backscatter_vv_dB"] for d in serie if d["fase"] == "pos"]
    resultado = {
        "fonte": "Sentinel-1 GRD (AWS Open Data via Earth Search STAC)",
        "barragem": "B1 — Brumadinho/MG",
        "coordenada": {"lat": LAT, "lon": LON},
        "evento_colapso": COLAPSO,
        "baseline_pre_dB": round(baseline, 3),
        "media_pos_dB": round(float(np.mean(pos)), 3) if pos else None,
        "queda_pos_vs_pre_dB": round(float(np.mean(pos)) - baseline, 3) if pos else None,
        "n_cenas": len(serie),
        "serie": serie,
    }
    out = os.path.join(os.path.dirname(__file__), "output", "brumadinho_serie_real.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(resultado, open(out, "w"), indent=2, ensure_ascii=False)
    print(f"\n📊 Baseline pré: {baseline:.2f} dB | Média pós: "
          f"{resultado['media_pos_dB']} dB | Δ: {resultado['queda_pos_vs_pre_dB']} dB")
    print(f"✅ Série real salva em: {out}")
    return resultado


if __name__ == "__main__":
    main()
