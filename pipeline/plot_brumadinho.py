"""Gera o gráfico-uau: série SAR real de Brumadinho (pré/pós colapso)."""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime

base = os.path.dirname(__file__)
d = json.load(open(os.path.join(base, "output", "brumadinho_serie_real.json")))
serie = d["serie"]

dates = [datetime.strptime(s["data"], "%Y-%m-%d") for s in serie]
vals = [s["backscatter_vv_dB"] for s in serie]
fases = [s["fase"] for s in serie]
colapso = datetime.strptime(d["evento_colapso"], "%Y-%m-%d")

plt.style.use("dark_background")
fig, ax = plt.subplots(figsize=(12, 6.5))
fig.patch.set_facecolor("#0a0e1a")
ax.set_facecolor("#0a0e1a")

# linha principal
ax.plot(dates, vals, "-", color="#4fd1c5", lw=2, zorder=3, alpha=0.7)
for dt, v, f in zip(dates, vals, fases):
    c = "#63b3ed" if f == "pre" else "#fc8181"
    ax.scatter(dt, v, s=90, color=c, edgecolor="white", lw=1.2, zorder=4)

# linha do colapso
ax.axvline(colapso, color="#f56565", ls="--", lw=2.5, zorder=2)
ax.text(colapso, max(vals) + 0.4, " COLAPSO\n 25/jan/2019", color="#f56565",
        fontsize=11, fontweight="bold", va="bottom")

# baseline
ax.axhline(d["baseline_pre_dB"], color="#a0aec0", ls=":", lw=1, alpha=0.6)
ax.text(dates[0], d["baseline_pre_dB"] - 0.5, " baseline pré-desastre",
        color="#a0aec0", fontsize=9)

ax.set_title("Brumadinho — Backscatter SAR real (Sentinel-1 VV)\n"
             "Dados abertos ESA/Copernicus · janela ~1 km na Barragem B1",
             fontsize=14, fontweight="bold", color="white", pad=14)
ax.set_xlabel("Data", color="#cbd5e0")
ax.set_ylabel("Backscatter VV (dB)", color="#cbd5e0")
ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%b"))
ax.grid(True, alpha=0.12)
ax.tick_params(colors="#cbd5e0")

from matplotlib.patches import Patch
ax.legend(handles=[
    Patch(color="#63b3ed", label="Pré-desastre"),
    Patch(color="#fc8181", label="Pós-desastre (deposição de rejeito)"),
], loc="lower right", framealpha=0.2)

fig.text(0.99, 0.01, "Phygo Research · OrbitalGuard", ha="right", va="bottom",
         fontsize=8, color="#4a5568", style="italic")
plt.tight_layout()
out = os.path.join(base, "output", "brumadinho_sar_real.png")
plt.savefig(out, dpi=140, facecolor="#0a0e1a")
print("✅ Gráfico salvo:", out)
