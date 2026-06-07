# 🚀 Guia de Deploy — OrbitalGuard

Passo a passo para colocar o OrbitalGuard **público e online** usando planos **gratuitos**.

---

## 0. Antes de tudo — Segurança 🔒

⚠️ **As credenciais do Copernicus estavam expostas no código original.**
**Troque a senha** em https://dataspace.copernicus.eu antes de publicar.

Nunca comite o arquivo `.env`. Ele já está no `.gitignore`. Use `.env.example` como modelo.

---

## 1. Subir o repositório no GitHub

```bash
cd orbitalguard-repo
git init
git add .
git commit -m "OrbitalGuard — MVP completo (backend + dashboard + ML + SAR)"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/orbitalguard.git
git push -u origin main
```

> Confirme que o repo está **público** em Settings → Visibility, se quiser que a banca acesse.

---

## 2. Deploy do Backend (FastAPI) — Render.com (free)

1. Crie conta em https://render.com (login com GitHub)
2. **New** → **Web Service** → conecte o repo `orbitalguard`
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
4. **Create Web Service** → aguarde o build (~2-3 min)
5. Anote a URL gerada, ex.: `https://orbitalguard-api.onrender.com`

> Teste: abra `https://sua-api.onrender.com/docs` — deve mostrar o Swagger com os 14 endpoints.
> ⚠️ No plano free, o serviço "dorme" após 15 min sem uso e leva ~30s pra acordar na primeira chamada. Normal.

---

## 3. Deploy do Frontend (React) — Vercel (free)

1. Crie conta em https://vercel.com (login com GitHub)
2. **Add New** → **Project** → importe o repo `orbitalguard`
3. Configure:
   - **Root Directory:** `dashboard`
   - **Framework Preset:** Create React App (detecta sozinho)
4. Em **Environment Variables**, adicione:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** a URL do backend do passo 2 (ex.: `https://orbitalguard-api.onrender.com`)
5. **Deploy** → aguarde (~1-2 min)
6. Pronto! URL pública, ex.: `https://orbitalguard.vercel.app`

---

## 4. Gerar os modelos de IA (.pkl)

Já vêm versionados em `backend/output/`. Para regenerar:

```bash
cd ml
pip install -r requirements.txt
python train_models.py
```

Gera `modelo_rf.pkl`, `scaler.pkl` etc. em `backend/output/` + `metrics.json`.

---

## 5. (Opcional) Pipeline SAR real — Sentinel-1

```bash
cd pipeline
pip install -r requirements.txt
cp ../.env.example ../.env      # preencha COPERNICUS_USER e COPERNICUS_PASS
python sentinel_pipeline.py      # busca imagens reais de Brumadinho
```

Resultado de exemplo (16 imagens pré/pós desastre) já está em
`pipeline/output/brumadinho_sar_imagens.json`.

---

## ✅ Checklist final

- [ ] Senha do Copernicus trocada
- [ ] Repo público no GitHub
- [ ] Backend no Render respondendo em `/docs`
- [ ] `REACT_APP_API_URL` configurada na Vercel
- [ ] Frontend abrindo e puxando dados do backend
- [ ] Link público testado no celular
