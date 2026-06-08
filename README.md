# Kashaf — AI Football Scouting Platform

> **Discover the Next Star.** Kashaf transforms raw match footage into AI-powered player profiles. Analysts tag events, the engine clusters players into positional archetypes, finds statistical twins from professional reference data, and surfaces everything through a modern scouting dashboard.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      KASHAF PLATFORM                         │
│                                                              │
│  ┌────────────┐    ┌───────────────┐    ┌────────────────┐  │
│  │  Next.js   │◄──►│ Convex Cloud  │    │ Python Engine  │  │
│  │  Frontend  │    │ (Real-time DB)│    │ (ML Pipeline)  │  │
│  └─────┬──────┘    └───────────────┘    └──────▲─────────┘  │
│        │                                       │             │
│        └───── /api/engine/proxy ──────────────►│             │
│        ◄───── /api/engine/callback ───────────┘             │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Player** uploads a YouTube match link
2. **Auto-assign** picks the least-busy analyst
3. **Analyst** tags events on an interactive pitch map while watching the match
4. On completion, the **engine** collects events across up to 10 matches, runs the ML pipeline (feature extraction → archetype classification → twin search), and returns the report in real-time
5. **Scouts** browse filtered player profiles ranked by data reliability tiers

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| [Bun](https://bun.sh) | ≥ 1.1 |
| Python | ≥ 3.10 |
| Git | any |

### Setup

```bash
# Clone
git clone <your-repo-url>
cd Kashaf

# Backend
cd backend
python -m venv .venv
.venv/Scripts/activate       # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt

# Frontend
cd ../frontend
bun install
cp .env.example .env.local   # Fill in your values
bunx convex dev --configure  # First-time Convex setup
```

### Run

```bash
cd frontend
bun dev
```

This starts everything in parallel:
- **Next.js** → `http://localhost:3000`
- **Convex** live sync → pushes schema/functions to your dev deployment
- **Python engine** → `http://localhost:8080`

---

## Project Structure

```
Kashaf/
├── backend/                 # Python AI engine
│   ├── integration/         # HTTP API server + async job runner
│   ├── inference/           # ML profiling + twin-finding
│   ├── extractors/          # Per-position feature extractors
│   ├── features/            # Feature engineering pipeline
│   ├── models/              # Trained ML models (per position unit)
│   ├── training/            # Model training scripts
│   ├── data/                # Reference datasets
│   ├── config/              # Position-unit configs + feature definitions
│   ├── tools/               # Utility scripts (retrain, rebuild index)
│   └── main.py              # CLI entry point
│
├── frontend/                # Next.js + Convex
│   ├── app/                 # App Router (auth, dashboards, public pages, API)
│   ├── components/          # React components (admin, analysis, scout, etc.)
│   ├── convex/              # Convex backend (schema, queries, mutations)
│   └── public/              # Static assets
│
└── README.md
```

---

## User Roles

| Role | Description |
|------|-------------|
| **Player** | Uploads YouTube match links, views analysis reports and engine profile |
| **Analyst** | Tags events on pitch map, submits match summaries, triggers engine |
| **Scout** | Browses/filters player database by archetype, physical traits, and reliability tier |
| **Admin** | Manages users, approves scouts, reassigns matches |

---

## Engine

The AI engine processes tagged events through a per-position ML pipeline:

1. **Feature Extraction** — Computes per-90 statistics and tactical metrics from tagged events
2. **Archetype Classification** — Clusters the player into positional archetypes (e.g., Ball-Playing Defender, Destroyer, Inside Forward)
3. **Twin Search** — Finds the most statistically similar players from the professional reference pool, displayed with their season context (e.g., "Virgil van Dijk (2019/2020)")
4. **Reliability Ranking** — Results are tiered by match data volume:

| Tier | Confidence | Matches |
|------|-----------|---------|
| 1 | High | 8–10 |
| 2 | Medium | 5–7 |
| 3 | Low | 3–4 |

A sliding window caps data at 10 matches — uploading an 11th evicts the oldest.

### Season Isolation

Players are treated as distinct entities per season. A player with matches in 2020/2021 and 2021/2022 produces two independent profiles in the reference pool. Multiple competitions within the same season (e.g., league + continental) are automatically merged into a single player-season entry.

### Position Units

| Unit | Position |
|------|----------|
| `cb` | Center Back |
| `fb` | Full Back / Wing Back |
| `mf` | Midfielder |
| `wg` | Winger |
| `st` | Striker / Forward |

---

## Environment Variables

### `frontend/.env.local`

```env
# Convex (auto-set by `bunx convex dev`)
CONVEX_DEPLOYMENT=dev:your-project-name
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Engine communication
ENGINE_BASE_URL=http://localhost:8080
ENGINE_CALLBACK_TOKEN=<random-secret>
KASHAF_ENGINE_TOKEN=<random-secret>
DNS_PUBLIC_URL=http://localhost:3000
```

### Convex Dashboard Variables

Set these in [dashboard.convex.dev](https://dashboard.convex.dev) → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Your deployment URL |
| `ENGINE_CALLBACK_TOKEN` | Must match `.env.local` |
| `KASHAF_ENGINE_TOKEN` | Must match `.env.local` |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Real-time DB | Convex |
| Auth | Convex Auth (email OTP) |
| AI Engine | Python, scikit-learn, CatBoost, pandas |
| Runtime | Bun (frontend), CPython (backend) |
