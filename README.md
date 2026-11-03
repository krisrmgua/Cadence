# Cadence

Local job scheduler with a dark tray panel, for **macOS** and **Windows**.

Schedule shell commands for days and times, run them on demand, keep history, and let AI agents create or trigger jobs through a localhost HTTP API.

## Why Electron

TokenPulse-style Swift/AppKit is macOS-only. Cadence needs the same tray + panel feel on Windows, so it is one TypeScript codebase:

- Electron tray / menu bar
- Vite UI (dark panel)
- In-process scheduler + job runner (`cmd` on Windows, login shell on macOS)
- `127.0.0.1` JSON API for agents

## Requirements

- Node.js 20+
- macOS 13+ or Windows 10+

## Install

### macOS

```bash
git clone https://github.com/krisrmgua/Cadence.git
cd Cadence
./scripts/install.sh
```

Builds a zip app via electron-builder, copies `Cadence.app` to `~/Applications`, and starts it. CLI helper:

```bash
cadence status
cadence start
cadence stop
```

### Windows

```powershell
git clone https://github.com/krisrmgua/Cadence.git
cd Cadence
.\scripts\install.ps1
```

That builds an NSIS installer under `release/` and launches it.

### Dev

```bash
npm install
npm run dev
```

## Local API

Default bind: `http://127.0.0.1:3927` (auto-bumps if busy). Bound to localhost only.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/jobs` | List jobs |
| POST | `/jobs` | Create job |
| GET/PATCH/DELETE | `/jobs/:id` | Read / update / delete |
| POST | `/jobs/:id/run` | Run now |
| GET | `/runs` | Recent history |
| GET | `/runs/:id` | One run |

### Create job example

```bash
curl -s http://127.0.0.1:3927/jobs -H 'content-type: application/json' -d '{
  "name": "Morning ping",
  "command": "echo hello from cadence",
  "schedule": { "times": ["09:00"], "days": [1,2,3,4,5] }
}'
```

`days` uses JS weekday numbers: `0` Sunday … `6` Saturday. Empty `days` means every day. Times are local `HH:MM`.

### Run now

```bash
curl -s -X POST http://127.0.0.1:3927/jobs/<id>/run
```

## Data

Jobs and run history live in the Electron userData folder as `data/cadence.json`:

- macOS: `~/Library/Application Support/Cadence/data/cadence.json`
- Windows: `%APPDATA%\Cadence\data\cadence.json`

## Bundle id

`com.kris.cadence`
