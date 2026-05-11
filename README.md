# Kashaf 🛡️ — AI Football Scouting Platform

> **Discover the Next Star.** Kashaf is a full-stack football intelligence platform that transforms raw match footage into AI-powered player profiles. Analysts tag events during a match, the Kashaf AI engine clusters the player into positional archetypes, finds statistical twins from the StatsBomb dataset, and surfaces everything through a modern scouting dashboard.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [User Roles](#user-roles)
- [Core Workflows](#core-workflows)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)

---

## Project Structure

```
Kashaf/
├── backend/                    # Python AI engine
│   ├── integration/            # HTTP API server + async job runner
│   │   ├── api.py              # FastAPI-style endpoints (/jobs, /profile, /health)
│   │   └── service.py          # Payload validation + report execution
│   ├── inference/              # ML profiling + twin-finding logic
│   ├── extractors/             # Feature extractors (per-position-unit)
│   ├── features/               # Feature engineering pipeline
│   ├── models/                 # Trained ML models (scaler, classifier per unit)
│   ├── training/               # Model training scripts
│   ├── data/                   # StatsBomb reference datasets
│   ├── report/                 # Report builder
│   ├── config/                 # Position-unit configs + feature definitions
│   ├── tools/                  # Utility scripts (retrain, rebuild index)
│   ├── tests/                  # Unit/integration tests
│   └── main.py                 # CLI entry point for batch profiling
│
├── frontend/                   # Next.js 16 + Convex real-time backend
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Sign-in / Sign-up pages
│   │   ├── (dashboard)/        # Authenticated dashboards (player, analyst, scout)
│   │   ├── (public)/           # Public player profiles + reports
│   │   ├── admin/              # Admin panel
│   │   ├── api/engine/         # Engine proxy + callback API routes
│   │   ├── analysis/           # Analyst tagging workspace
│   │   ├── onboarding/         # Role selection + profile setup
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── admin/              # Admin panel tabs (Overview, Users, Analysts, Matches, Scouts)
│   │   ├── analysis/           # Pitch map, event timeline, tagging UI
│   │   ├── analyst/            # Analyst-specific UI
│   │   ├── dashboard/          # Shared dashboard components
│   │   ├── landing/            # Landing page sections (Hero, Features, etc.)
│   │   ├── player/             # Player dashboard components
│   │   ├── public/             # Public profile components (ArcDiagram, etc.)
│   │   ├── scout/              # Scout dashboard (FilterPanel, HighlightsViewer)
│   │   ├── shared/             # Shared/reusable components
│   │   └── ui/                 # shadcn/ui primitives
│   ├── convex/                 # Convex backend (schema, queries, mutations, actions)
│   │   ├── schema.ts           # Database schema definition
│   │   ├── users.ts            # User CRUD, search, admin ops
│   │   ├── matches.ts          # Match CRUD, assignment, admin reassignment
│   │   ├── analysisEvents.ts   # Event tagging (log, update, delete, aggregate)
│   │   ├── analysisRequests.ts # Analysis request lifecycle
│   │   ├── matchSummaries.ts   # Analyst-written match summaries
│   │   ├── autoAssign.ts       # Least-busy round-robin analyst assignment
│   │   ├── engine.ts           # Engine payload builder + job queuing action
│   │   ├── engineJobs.ts       # Engine job tracking (create, update, query)
│   │   ├── engineProfiles.ts   # Aggregated player engine profiles
│   │   ├── positionProfiles.ts # Position profile aggregation
│   │   ├── notifications.ts    # In-app notification system
│   │   ├── ratings.ts          # Player/analyst rating system
│   │   ├── savedFilters.ts     # Scout saved search filters
│   │   ├── auth.ts             # Convex Auth configuration
│   │   └── auth.config.ts      # Auth provider config
│   └── public/                 # Static assets
│
└── README.md                   # This file
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KASHAF PLATFORM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────────┐  │
│  │   Next.js    │◄───►│   Convex Cloud   │     │  Python Engine │  │
│  │  Frontend    │     │  (Real-time DB)   │     │  (ML Pipeline) │  │
│  │              │     │                  │     │                │  │
│  │  • Pages     │     │  • Schema        │     │  • Profiling   │  │
│  │  • Components│     │  • Queries       │     │  • Clustering  │  │
│  │  • API Routes│────►│  • Mutations     │     │  • Twins       │  │
│  │              │     │  • Actions       │     │  • Reporting   │  │
│  └──────┬───────┘     └──────────────────┘     └───────▲────────┘  │
│         │                                              │           │
│         │    POST /api/engine/proxy                     │           │
│         └──────────────────────────────────────────────►│           │
│                                                        │           │
│         ◄──────────────────────────────────────────────┘           │
│              POST /api/engine/callback (results)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Player** uploads a YouTube match link → match record created in Convex
2. **Auto-assign** picks the least-busy analyst via round-robin → analyst gets notified
3. **Analyst** opens the analysis workspace, watches the video, tags events on the pitch map
4. **Analyst** submits a summary (rating, strengths, weaknesses, written analysis)
5. Match status → `completed`, and the **browser fires the engine job**:
   - Convex `action` collects events from up to 10 matches for the player
   - Payload is sent via the Next.js `/api/engine/proxy` route to the Python engine
   - Engine processes asynchronously, then POSTs results back via `/api/engine/callback`
   - Callback saves the report to Convex → the report page updates in real-time
6. **Scout** can browse and filter player profiles, view reports, and watch highlight clips

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| [Bun](https://bun.sh) | ≥ 1.1 | Frontend package manager + runtime |
| Python | ≥ 3.10 | AI engine runtime |
| Git | any | Version control |

> **Note:** No Node.js or npm required. Bun handles everything on the frontend side.

---

### 1. Clone the Repository

```bash
git clone https://github.com/Alucardo-0/Kashaf1.0.git
cd Kashaf1.0
```

### 2. Backend Setup (Python Engine)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup (Next.js + Convex)

```bash
cd frontend

# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local
```

Fill in `frontend/.env.local` — see [Environment Variables](#environment-variables) below.

### 4. Convex Setup

If this is your first time setting up the project, Convex will walk you through team/project selection:

```bash
cd frontend
bunx convex dev --configure
```

Choose your team, select (or create) the project, and select "cloud deployment".

### 5. Convex Dashboard Environment Variables

Go to [dashboard.convex.dev](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables** and add:

| Variable | Description |
|---|---|
| `JWKS` | JSON Web Key Set URL for auth (set automatically by Convex Auth) |
| `JWT_PRIVATE_KEY` | Private key for JWT signing (set automatically by Convex Auth) |
| `SITE_URL` | Your deployment URL (e.g., `http://localhost:3000`) |
| `ENGINE_CALLBACK_TOKEN` | Must match the value in `.env.local` |
| `KASHAF_ENGINE_TOKEN` | Must match the value used when starting the Python engine |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses |

### 6. Start Development

```bash
cd frontend
bun dev
```

This runs everything in parallel via `concurrently`:
- **Next.js** frontend → `http://localhost:3000`
- **Convex** live sync → pushes schema/functions to your dev deployment
- **Python engine** → `http://localhost:8080`

---

## Local Development

- Run `bun dev` from `frontend/` to start all services at once
- Every developer gets their own isolated Convex dev deployment — your data won't conflict with teammates
- The admin panel is at `/admin` (requires your email in `ADMIN_EMAILS`)
- Use the Convex Dashboard at [dashboard.convex.dev](https://dashboard.convex.dev) to inspect data, view logs, and manage environment variables

---

## Environment Variables

### `frontend/.env.local`

```env
# ── Convex (auto-set by `bunx convex dev`) ──
CONVEX_DEPLOYMENT=dev:your-project-name
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-project.convex.site

# ── Engine Communication ──
ENGINE_BASE_URL=http://localhost:8080
ENGINE_CALLBACK_TOKEN=<random-64-char-hex-secret>
KASHAF_ENGINE_TOKEN=<random-64-char-hex-secret>
DNS_PUBLIC_URL=http://localhost:3000
```

### Token Alignment Rules

| Token | Set In | Must Match |
|---|---|---|
| `KASHAF_ENGINE_TOKEN` | `.env.local` + Convex Dashboard | `$env:KASHAF_ENGINE_TOKEN` when starting Python engine |
| `ENGINE_CALLBACK_TOKEN` | `.env.local` + Convex Dashboard | The `X-Engine-Token` header the engine sends back in callbacks |

---

## User Roles

| Role | Access | Key Actions |
|---|---|---|
| **Player** | Player dashboard, public profile | Upload YouTube match links, view analysis reports, view engine profile |
| **Analyst** | Analyst dashboard, analysis workspace | Tag events on pitch map, submit match summaries, trigger engine jobs |
| **Scout** | Scout dashboard | Browse/filter player database, view profiles and reports, save search filters |
| **Admin** | Admin panel (`/admin`) | Manage users, create analyst accounts, approve scouts, view/reassign matches |

> Admin access is controlled via the `ADMIN_EMAILS` environment variable in the Convex Dashboard. Any user whose email appears in that comma-separated list gains admin privileges.

---

## Core Workflows

### Match Upload → Analysis → Report

```
Player uploads YouTube URL
        ↓
Match created (status: pending_analyst)
        ↓
autoAssign picks least-busy analyst
        ↓
Match status → analyst_assigned
        ↓
Analyst opens /analysis/[matchId]
  • Watches embedded YouTube video
  • Tags events on interactive pitch map
  • Each event: type, outcome, origin, destination, timestamp
        ↓
Analyst submits summary (rating, strengths, weaknesses, written analysis)
        ↓
Match status → completed
        ↓
Browser fires engine job:
  1. Convex action collects ALL events across player's matches (up to 10)
  2. Payload sent to Python engine via /api/engine/proxy
  3. Engine runs ML pipeline (feature extraction → classification → twin search)
  4. Engine POSTs results to /api/engine/callback
        5. Convex mutation logs the job and materializes the aggregated data into `playerEngineProfiles`
                                ↓
Scout database and Player report pages update instantly via reactive queries
```

### Auto-Assignment Algorithm

The system uses a **least-busy round-robin** strategy:

1. Fetch all analysts with `onboardingComplete = true`
2. Exclude analysts who previously declined this match
3. Count active workload (pending + accepted requests) per analyst
4. Sort by workload ascending → then by registration date (earliest first)
5. Assign the top result

If an analyst declines, `reassignOnDecline` re-runs the same algorithm (skipping all who declined).

### Admin Match Reassignment

Admins can manually reassign any match to a different analyst from the **Matches** tab in the admin panel. This:
- Updates the match's `analystId`
- Creates a new `analysisRequest` with status `accepted`
- Notifies the new analyst and the player

---

## Database Schema

All data is stored in **Convex** (real-time cloud database). Tables and their key fields:

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | All platform users | `email`, `role`, `playerProfile`, `analystProfile`, `scoutProfile` |
| `matches` | Match records | `playerId`, `analystId`, `youtubeUrl`, `status`, `matchDate` |
| `analysisEvents` | Tagged events on pitch | `matchId`, `eventType`, `outcome`, `originX/Y`, `destinationX/Y`, `videoTimestamp` |
| `analysisRequests` | Analyst assignment lifecycle | `playerId`, `analystId`, `matchId`, `status` (pending/accepted/declined/completed) |
| `matchSummaries` | Analyst-written assessments | `matchId`, `overallRating`, `strengths`, `weaknesses`, `writtenSummary` |
| `engineJobs` | Engine job tracking | `jobId`, `matchId`, `playerId`, `status`, `report`, `error` |
| `playerEngineProfiles` | Aggregated engine profiles | `playerId`, `topArchetype`, `archetypes`, `coreFeatures`, `twins` |
| `playerPositionProfiles` | Position distribution | `playerId`, `profiles[]`, `totalMatchesAnalyzed` |
| `notifications` | In-app notifications | `userId`, `type`, `message`, `isRead` |
| `ratings` | User ratings | `raterId`, `ratedId`, `matchId`, `score` |
| `savedFilters` | Scout saved searches | `scoutId`, `filterName`, `filters` |

### Match Status Lifecycle

```
pending_analyst → analyst_assigned → analysis_in_progress → completed
```

### Engine Job Status Lifecycle

```
queued → running → completed | failed
```

---

## API Reference

### Next.js API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/engine/proxy` | POST | Forwards engine job payloads to the Python engine (adds auth headers) |
| `/api/engine/callback` | POST | Receives completed/failed job results from the Python engine |

### Python Engine Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/engine/jobs` | POST | Submit async profiling job (recommended) |
| `/api/v1/engine/profile` | POST | Synchronous profiling (blocking) |
| `/api/v1/engine/jobs/{job_id}` | GET | Check job status |
| `/health` | GET | Health check |

### Engine Job Payload

```json
{
  "job_id": "dns-<matchId>-<playerId>-<unit>",
  "player_name": "Player Name",
  "unit": "mf",
  "events": [
    {
      "eventType": "pass",
      "outcome": "Successful",
      "originX": 45.5,
      "originY": 32.1,
      "destinationX": 60.0,
      "destinationY": 28.3,
      "videoTimestamp": 142,
      "notes": "",
      "isSetPiece": false
    }
  ],
  "callback_url": "https://your-domain/api/engine/callback",
  "callback_headers": {
    "X-Engine-Token": "<ENGINE_CALLBACK_TOKEN>"
  },
  "metadata": {
    "matchId": "...",
    "playerId": "...",
    "analystId": "...",
    "matchCount": 3
  }
}
```

### Coordinate System

The frontend pitch map uses a **portrait** layout (X=width, Y=length). The engine expects **landscape** (X=length, Y=width). Coordinate transformation happens in `convex/engine.ts`:

```
Engine X = 100 - Frontend Y  (invert length axis, own goal → opponent goal)
Engine Y = Frontend X         (width axis stays the same)
```

All coordinates are clamped to `[0, 100]`.

### Position Units

| Unit ID | Position |
|---|---|
| `cb` | Center Back |
| `fb` | Full Back / Wing Back |
| `mf` | Midfielder |
| `wg` | Winger |
| `st` | Striker / Forward |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **Real-time DB** | Convex (cloud, real-time reactive queries) |
| **Auth** | Convex Auth (email OTP) |
| **AI Engine** | Python 3.10+, scikit-learn, pandas, CatBoost |
| **UI Components** | shadcn/ui, Recharts, Lucide React |
| **Runtime** | Bun (frontend), CPython (backend) |
| **Charts** | Recharts (radar charts, pie charts) |
| **Smooth Scroll** | Lenis |


