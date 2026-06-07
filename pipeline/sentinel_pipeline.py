"""
OrbitalGuard — Busca de imagens Sentinel-1 SAR (Copernicus Data Space)

Credenciais via variáveis de ambiente (NUNCA hardcode):
    export COPERNICUS_USER="seu-email@exemplo.com"
    export COPERNICUS_PASS="sua-senha"
ou crie um arquivo .env (veja .env.example) — ignorado pelo git.
"""
import os
from pathlib import Path

from cdsetool.query import query_features, geojson_to_wkt  # noqa: F401
from cdsetool.credentials import Credentials
from cdsetool.download import download_features

# carrega .env se existir (opcional)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

# ─── CONFIG ──────────────────────────────────────────────────────────────────
COPERNICUS_USER = os.environ.get("COPERNICUS_USER")
COPERNICUS_PASS = os.environ.get("COPERNICUS_PASS")
DOWNLOAD_DIR = Path("./data/raw")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Área de interesse: região de Brumadinho/MG
AOI_WKT = "POLYGON((-44.20 -20.20, -43.90 -20.20, -43.90 -20.00, -44.20 -20.00, -44.20 -20.20))"


def _checar_credenciais():
    if not COPERNICUS_USER or not COPERNICUS_PASS:
        raise SystemExit(
            "❌ Credenciais Copernicus não configuradas.\n"
            "   Defina COPERNICUS_USER e COPERNICUS_PASS no ambiente ou no arquivo .env\n"
            "   (veja .env.example)."
        )


# ─── BUSCA ───────────────────────────────────────────────────────────────────
def buscar_imagens(data_inicio, data_fim, limite=5):
    """Busca imagens Sentinel-1 SLC modo IW na área de Brumadinho."""
    print(f"\n🛰️  Buscando imagens de {data_inicio} até {data_fim}...")
    resultados = list(query_features(
        "SENTINEL-1",
        {
            "contentDateStartGe": data_inicio,
            "contentDateEndLt":   data_fim,
            "productType":        "SLC",
            "operationalMode":    "IW",
            "geometry":           AOI_WKT,
            "top":                limite,
        },
        options={"expand_attributes": True}
    ))
    print(f"✅ {len(resultados)} imagem(ns) encontrada(s)")
    return resultados


# ─── LISTAGEM ─────────────────────────────────────────────────────────────────
def listar_imagens(imagens):
    if not imagens:
        print("  ⚠️  Nenhuma imagem encontrada para este período.\n")
        return
    print()
    for i, img in enumerate(imagens):
        inicio = img.get("ContentDate", {}).get("Start", "N/A")[:10]
        tamanho_gb = img.get("ContentLength", 0) / (1024 ** 3)
        online = "✓ Online" if img.get("Online") else "✗ Offline"
        print(f"  [{i+1}] {img.get('Name', 'sem nome')}")
        print(f"       Data:     {inicio}")
        print(f"       Tamanho:  {tamanho_gb:.2f} GB")
        print(f"       Status:   {online}")
        print(f"       ID:       {img.get('Id', 'N/A')}\n")


# ─── DOWNLOAD ─────────────────────────────────────────────────────────────────
def baixar_imagens(imagens, limite=1):
    """Baixa imagens. Atenção: cada SLC tem ~4-8 GB."""
    _checar_credenciais()
    selecionadas = [img for img in imagens[:limite] if img.get("Online")]
    if not selecionadas:
        print("⚠️  Nenhuma imagem online disponível para download.")
        return
    print(f"⬇️  Baixando {len(selecionadas)} imagem(ns) para {DOWNLOAD_DIR}...")
    credenciais = Credentials(COPERNICUS_USER, COPERNICUS_PASS)
    download_features(iter(selecionadas), DOWNLOAD_DIR, credentials=credenciais)
    print("✅ Download concluído")


# ─── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  ORBITALGUARD — Busca de imagens Sentinel-1 SAR")
    print("=" * 55)

    print("\n📅 PRÉ-DESASTRE")
    pre = buscar_imagens("2018-12-01", "2019-01-24")
    listar_imagens(pre)

    print("📅 PÓS-DESASTRE")
    pos = buscar_imagens("2019-01-26", "2019-02-28")
    listar_imagens(pos)

    # Para baixar (precisa de credenciais + espaço em disco), descomente:
    # baixar_imagens(pre, limite=1)
    # baixar_imagens(pos, limite=1)
