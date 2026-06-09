# 🛰️ OrbitalGuard
### Monitoramento Inteligente de Barragens via Radar Orbital SAR + IA

[![FIAP Global Solution 2026](https://img.shields.io/badge/FIAP-Global%20Solution%202026-red)](https://www.fiap.com.br)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688)](https://fastapi.tiangolo.com)
[![Sentinel-1 SAR](https://img.shields.io/badge/Sentinel--1-SAR-orange)](https://sentinel.esa.int)
[![Google Earth Engine](https://img.shields.io/badge/Google-Earth%20Engine-4285F4)](https://earthengine.google.com)

> Sistema que usa imagens de radar orbital do satélite **Sentinel-1 (ESA/Copernicus)** combinadas com modelos de **Machine Learning** para detectar micro-deformações no solo ao redor de barragens de mineração, emitindo alertas com até 72h de antecedência.

---

## 📋 Contexto

O Brasil possui **917 barragens de mineração** cadastradas no SIGBM/ANM (Boletim ANM, fev/2025). Os desastres de **Mariana (2015)** e **Brumadinho (2019)** — que juntos causaram mais de 270 mortes e liberaram bilhões de litros de rejeitos — demonstraram que inspeções manuais periódicas são insuficientes.

O OrbitalGuard automatiza esse monitoramento usando dados SAR gratuitos que revisitam qualquer ponto do Brasil a cada **6 dias**, com resolução de **10 metros**, funcionando inclusive sob nuvens — crítico para regiões tropicais.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│              ORBITALGUARD SYSTEM                 │
├──────────────┬──────────────┬───────────────────┤
│   SENTINEL-1 │  GOOGLE EE   │    ANM/SIGBM      │
│   SAR Data   │  Processing  │    Real Data       │
└──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │                │
       ▼              ▼                ▼
┌─────────────────────────────────────────────────┐
│              FASTAPI BACKEND                     │
│   • Modelo IA (Random Forest + Logistic)         │
│   • Endpoints REST                               │
│   • Sistema de votação comunitária               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           REACT DASHBOARD                        │
│   • Mapa interativo (Leaflet)                    │
│   • Cards com foto + descrição                   │
│   • Busca + filtros por risco                    │
│   • Gráfico histórico SAR                        │
│   • Validação comunitária                        │
└─────────────────────────────────────────────────┘
```

---

## 📁 Estrutura do Repositório

```
orbitalguard/
├── backend/
│   └── backend.py          # FastAPI — API REST + modelo IA
├── dashboard/
│   ├── src/
│   │   ├── App.jsx         # Dashboard React principal
│   │   ├── index.css       # Estilos (tema espacial escuro)
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
├── pipeline/
│   ├── sentinel_pipeline.py  # Busca imagens Sentinel-1 (Copernicus)
│   └── gee_pipeline.py       # Processamento SAR via Google Earth Engine
├── ml/
│   └── OrbitalGuard_MLAM.ipynb  # Notebook ML (Google Colab)
├── docs/
│   └── architecture.png
├── .gitignore
└── README.md
```

---

## 🤖 Modelos de Machine Learning

O notebook está disponível no Google Colab:

[![Abrir no Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/nataliaalcantara/orbitalguard/blob/main/ml/OrbitalGuard_MLAM.ipynb)

> Ou rode localmente, sem Colab: `cd ml && python train_models.py` — gera os modelos `.pkl` em `backend/output/`.

### Modelos implementados

| Modelo | Tipo | F1 (test) | F1 (CV 5-fold) |
|--------|------|-----------|----------------|
| Regressão Logística | Classificação | 1.000 | 0.999 ±0.001 |
| Random Forest | Classificação | 1.000 | 1.000 ±0.000 |
| Regressão Linear | Regressão (deformação) | R² 0.79 | — |

> ⚠️ **Transparência metodológica:** os classificadores foram treinados sobre um
> **dataset sintético de 2.000 amostras** com distribuições calibradas em padrões
> SAR documentados (Sem Risco / Atenção / Crítico). As classes são bem separadas
> por construção, o que explica o F1 próximo de 1.0 — inclusive em validação
> cruzada. **Isto é uma prova de conceito**, não um modelo validado contra rótulos
> reais de campo. Validação operacional exige série histórica SAR rotulada por
> eventos confirmados (próximo passo do roadmap). Métricas reproduzíveis em
> `backend/output/metrics.json` via `python ml/train_models.py`.

### Features utilizadas (dados SAR)

| Feature | Descrição |
|---------|-----------|
| `deformacao_media_dB` | Média de variação radar no período |
| `deformacao_std` | Desvio padrão (instabilidade) |
| `tendencia` | Coeficiente angular da série temporal |
| `aceleracao` | Taxa de mudança da deformação |
| `pico_negativo_dB` | Valor mínimo de dB observado |
| `variacao_30d_dB` | Variação nos últimos 30 dias |
| `chuva_acumulada_mm` | Chuva acumulada (proxy de saturação) |
| `dias_sem_imagem` | Gap na série temporal SAR |

### Classes de risco

- 🟢 **Sem Risco** — deformação < -2.5 dB, estrutura estável
- 🟡 **Atenção** — deformação entre -2.5 e -5.0 dB, inspeção recomendada
- 🔴 **Crítico** — deformação > -5.0 dB, ação imediata necessária

---

## 🛰️ Dados Utilizados

| Fonte | Dados | Acesso |
|-------|-------|--------|
| ESA Copernicus / Sentinel-1 | Imagens SAR (radar) | Gratuito |
| Google Earth Engine | Processamento em nuvem | Gratuito (conta acadêmica) |
| ANM / SIGBM | Cadastro de barragens | Dados abertos |

---

## 📊 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/barragens` | Lista barragens (filtros: estado, risco, empresa, busca) |
| GET | `/barragens/{id}` | Detalhe de uma barragem |
| POST | `/predict` | Classifica risco com IA (Random Forest) |
| GET | `/alertas` | Barragens em Atenção ou Crítico |
| GET | `/historico/{id}` | Série histórica de deformação SAR (90 dias) |
| POST | `/votar` | Validação comunitária (confirmar/contestar) |
| GET | `/votos/{id}` | Votos de uma barragem |
| GET | `/ranking` | Barragens ordenadas por nível de risco |
| GET | `/estados` | Estatísticas agregadas por estado |
| GET | `/empresas` | Ranking de empresas por alertas |
| GET | `/mapa-dados` | Dados leves (lat/lon/risco) para o mapa |
| GET | `/busca` | Busca livre por texto + filtros |
| POST | `/atualizar` | Força re-download dos dados da ANM |
| GET | `/stats` | Estatísticas gerais do sistema |

> Documentação interativa (Swagger) em `/docs` quando a API está rodando.

---

## 🎯 ODS Alinhados

- **ODS 11** — Cidades e comunidades sustentáveis
- **ODS 13** — Ação contra a mudança global do clima
- **ODS 9** — Indústria, inovação e infraestrutura

---

## 👥 Equipe

Desenvolvido para a **Global Solution FIAP 2026.1 — Space Connect**

| Nome | Curso | GitHub |
|------|-------|--------|
| Natalia Alcantara | Ciência da Computação / IA | @nataliaalcantara |

---

## 📄 Licença

MIT License — livre para uso acadêmico e educacional.
