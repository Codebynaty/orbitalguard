"""
OrbitalGuard — Treino de Modelos (script standalone)
Extraído do notebook OrbitalGuard_MLAM.ipynb para gerar os .pkl
usados pelo backend. Roda fora do Colab.

Uso:
    cd ml && python train_models.py
Gera: ../backend/output/{modelo_rf,modelo_logistic,modelo_linear,scaler}.pkl
"""
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score, r2_score

np.random.seed(42)

# ─────────────────────────────────────────────────────────────
# 1. Dataset (mesma geração do notebook — distribuições SAR por classe)
# ─────────────────────────────────────────────────────────────
N = 2000
n0, n1, n2 = int(N * 0.60), int(N * 0.25), N - int(N * 0.60) - int(N * 0.25)

X0 = np.column_stack([
    np.random.normal(-0.5, 0.8, n0), np.random.uniform(0.1, 1.0, n0),
    np.random.normal(0.0, 0.05, n0), np.random.normal(0.0, 0.02, n0),
    np.random.uniform(-3.0, -0.5, n0), np.random.normal(-0.3, 0.5, n0),
    np.random.uniform(0, 80, n0), np.random.randint(6, 13, n0).astype(float),
])
X1 = np.column_stack([
    np.random.normal(-2.5, 1.0, n1), np.random.uniform(1.0, 2.5, n1),
    np.random.normal(-0.15, 0.08, n1), np.random.normal(-0.05, 0.03, n1),
    np.random.uniform(-6.0, -3.0, n1), np.random.normal(-1.5, 0.8, n1),
    np.random.uniform(60, 150, n1), np.random.randint(6, 13, n1).astype(float),
])
X2 = np.column_stack([
    np.random.normal(-6.0, 1.5, n2), np.random.uniform(2.5, 5.0, n2),
    np.random.normal(-0.45, 0.12, n2), np.random.normal(-0.15, 0.05, n2),
    np.random.uniform(-12.0, -6.0, n2), np.random.normal(-4.5, 1.2, n2),
    np.random.uniform(120, 300, n2), np.random.randint(6, 13, n2).astype(float),
])

FEATURES = ['deformacao_media_dB', 'deformacao_std', 'tendencia', 'aceleracao',
            'pico_negativo_dB', 'variacao_30d_dB', 'chuva_acumulada_mm', 'dias_sem_imagem']
CLASSES = ['Sem Risco', 'Atenção', 'Crítico']

X = np.vstack([X0, X1, X2])
y = np.concatenate([np.zeros(n0), np.ones(n1), np.full(n2, 2)]).astype(int)
idx = np.random.permutation(len(y))
X, y = X[idx], y[idx]
print(f"Dataset: {X.shape[0]} amostras x {X.shape[1]} features")

# ─────────────────────────────────────────────────────────────
# 2. Split + scaler
# ─────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# ─────────────────────────────────────────────────────────────
# 3. Modelos
# ─────────────────────────────────────────────────────────────
lr = LogisticRegression(max_iter=1000, solver='lbfgs', C=1.0, random_state=42)
lr.fit(X_train_sc, y_train)

rf = RandomForestClassifier(n_estimators=200, max_depth=8,
                            class_weight='balanced', random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

# Regressão (prevê deformação média a partir das demais features)
reg = LinearRegression()
reg.fit(X_train[:, 1:], X_train[:, 0])

# ─────────────────────────────────────────────────────────────
# 4. Métricas HONESTAS (test set + cross-validation 5-fold)
# ─────────────────────────────────────────────────────────────
acc_lr = accuracy_score(y_test, lr.predict(X_test_sc))
acc_rf = accuracy_score(y_test, rf.predict(X_test))
f1_lr = f1_score(y_test, lr.predict(X_test_sc), average='weighted')
f1_rf = f1_score(y_test, rf.predict(X_test), average='weighted')
cv_lr = cross_val_score(lr, X_train_sc, y_train, cv=5, scoring='f1_weighted')
cv_rf = cross_val_score(rf, X_train, y_train, cv=5, scoring='f1_weighted')
r2 = r2_score(X_test[:, 0], reg.predict(X_test[:, 1:]))

print("\n" + "=" * 60)
print("  MÉTRICAS (dataset sintético — distribuições por classe)")
print("=" * 60)
print(f"  Regressão Logística | acc {acc_lr:.1%} | F1 {f1_lr:.3f} | CV-F1 {cv_lr.mean():.3f} ±{cv_lr.std():.3f}")
print(f"  Random Forest       | acc {acc_rf:.1%} | F1 {f1_rf:.3f} | CV-F1 {cv_rf.mean():.3f} ±{cv_rf.std():.3f}")
print(f"  Regressão Linear    | R² {r2:.3f}")
print("\n  NOTA: dataset sintético com classes bem separadas →")
print("  acurácia alta é esperada. Validação real exige SAR rotulado.")

# ─────────────────────────────────────────────────────────────
# 5. Salvar onde o backend procura: backend/output/
# ─────────────────────────────────────────────────────────────
out = Path(__file__).resolve().parent.parent / "backend" / "output"
out.mkdir(parents=True, exist_ok=True)
joblib.dump(lr, out / "modelo_logistic.pkl")
joblib.dump(rf, out / "modelo_rf.pkl")
joblib.dump(reg, out / "modelo_linear.pkl")
joblib.dump(scaler, out / "scaler.pkl")

# salvar métricas pra documentação honesta
metrics = {
    "logistic": {"acc": round(acc_lr, 4), "f1": round(f1_lr, 4),
                 "cv_f1_mean": round(cv_lr.mean(), 4), "cv_f1_std": round(cv_lr.std(), 4)},
    "random_forest": {"acc": round(acc_rf, 4), "f1": round(f1_rf, 4),
                      "cv_f1_mean": round(cv_rf.mean(), 4), "cv_f1_std": round(cv_rf.std(), 4)},
    "linear_reg": {"r2": round(r2, 4)},
    "features": FEATURES, "classes": CLASSES,
    "dataset": "sintetico_2000_amostras",
}
import json
(out / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
print(f"\n✅ Modelos + metrics.json salvos em: {out}")
