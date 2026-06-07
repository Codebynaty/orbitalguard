# 🚀 Guia de Deploy — OrbitalGuard (tudo na Vercel)

Frontend **e** backend rodam num **único projeto Vercel**.
- Frontend (React) → site estático
- Backend (FastAPI) → serverless Python em `/api`

---

## 0. Segurança 🔒

⚠️ As credenciais do Copernicus estiveram expostas no código original.
**Troque a senha** em https://dataspace.copernicus.eu antes de publicar.
Nunca comite `.env` (já está no `.gitignore`).

---

## 1. Subir no GitHub

```bash
cd orbitalguard-repo
git remote add origin https://github.com/SEU_USUARIO/orbitalguard.git
git push -u origin main
```

> Deixe o repo **público** em Settings → Visibility (pra banca acessar).

---

## 2. Deploy na Vercel (5 min) — só isso

1. Acesse https://vercel.com → login com GitHub
2. **Add New → Project** → importe o repo `orbitalguard`
3. **NÃO mude o Root Directory** — deixe a raiz do repo (`./`).
   O `vercel.json` já cuida de tudo:
   - builda o dashboard (`dashboard/build`)
   - expõe a API Python em `/api`
4. Clique **Deploy**
5. Aguarde (~2-3 min) → pronto! Link público no ar 🎉

Exemplo de URLs depois do deploy:
- Site: `https://orbitalguard.vercel.app`
- API:  `https://orbitalguard.vercel.app/api/stats`
- Docs: `https://orbitalguard.vercel.app/api/docs`

> O frontend chama `/api` automaticamente (mesma origem) — **não precisa
> configurar nenhuma variável de ambiente** pro básico funcionar.

---

## 3. Como funciona (arquitetura Vercel)

```
orbitalguard.vercel.app
├── /                    → React (dashboard/build)
├── /api/stats           → FastAPI serverless (api/index.py)
├── /api/barragens       → ...
├── /api/reportar        → gamificação
└── /api/docs            → Swagger da API
```

Arquivos-chave:
- `vercel.json` — roteamento (frontend + função Python)
- `api/index.py` — backend FastAPI (root_path=/api)
- `api/requirements.txt` — deps Python do serverless
- `api/output/*.pkl` — modelos de IA (treinados em sklearn 1.3.2)

---

## 4. Regenerar os modelos de IA (opcional)

```bash
cd ml
pip install -r requirements.txt
python train_models.py        # gera .pkl em backend/output/
cp backend/output/*.pkl ../api/output/   # espelha pra função Vercel
```

---

## 5. Pipeline SAR real — Sentinel-1 (opcional, local)

```bash
cd pipeline
pip install -r requirements.txt
cp ../.env.example ../.env     # preencha COPERNICUS_USER e COPERNICUS_PASS
python process_brumadinho_real.py   # extrai backscatter real de Brumadinho
python plot_brumadinho.py           # gera o gráfico
```

---

## ✅ Checklist

- [ ] Senha do Copernicus trocada
- [ ] Repo público no GitHub
- [ ] Projeto importado na Vercel (root = raiz do repo)
- [ ] Deploy concluído
- [ ] `https://SEU-PROJETO.vercel.app/api/docs` abre o Swagger
- [ ] Site abre, mapa carrega, clicar numa barragem mostra a ficha
- [ ] Reportar dá pontos (gamificação)

> 💡 Dica de apresentação: serverless na Vercel **não dorme** como o Render,
> então o primeiro acesso é rápido. Mesmo assim, abra o link 1 min antes do pitch.
