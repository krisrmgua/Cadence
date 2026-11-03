# Cadence

Local job scheduler with a dark tray / system-tray panel for **macOS** and **Windows**.

Schedule shell commands for specific days and times, run them on demand, keep stdout/stderr history, and let AI agents (or anything on your machine) create and trigger jobs through a **localhost-only** HTTP API.

Cadence stays in the menu bar (Mac) or system tray (Windows). Click the icon to open the panel. It does not need a browser tab or a cloud account.

---

## What it does

| Feature | Behavior |
|---|---|
| Jobs | Named shell commands with optional working directory |
| Schedule | Local wall-clock times (`HH:MM`) on chosen weekdays |
| Run now | Fire a job immediately from the UI or API |
| History | Recent runs with exit code, stdout, stderr |
| Local API | JSON over `http://127.0.0.1:<port>` for agents / scripts |
| Persistence | Jobs + history in a local JSON file under app data |

Commands run in:

- **macOS:** your login shell (`$SHELL`, usually `/bin/zsh`) with `-lc`
- **Windows:** `cmd.exe` with `/c`

So Mac jobs can use zsh/bash syntax and your usual PATH; Windows jobs should be valid `cmd` lines (or call `powershell -NoProfile -Command "..."` explicitly).

---

## Requirements

### Both platforms

- [Node.js](https://nodejs.org/) **20 or newer** (includes `npm`) — needed to build/install from source
- Git (to clone)

### macOS

- macOS **13** (Ventura) or later
- Apple Silicon or Intel (installer builds for the machine you run it on)

### Windows

- Windows **10** or **11**
- PowerShell 5+ (built in) to run the install script
- Ability to run an unsigned / locally built NSIS installer (SmartScreen may warn on first run)

---

## Install on macOS

### 1. Install Node if needed

```bash
node -v   # should print v20.x or newer
```

If missing, install from [nodejs.org](https://nodejs.org/) or Homebrew:

```bash
brew install node
```

### 2. Clone and install

```bash
git clone https://github.com/krisrmgua/Cadence.git
cd Cadence
./scripts/install.sh
```

What `install.sh` does:

1. `npm install`
2. `npm run pack:mac` (electron-builder → `release/mac-arm64/Cadence.app` or similar)
3. Copies the app to `~/Applications/Cadence.app` (replaces any previous copy)
4. Writes a helper CLI to `~/bin/cadence`
5. Launches Cadence

First build downloads Electron (~100 MB) and can take a few minutes.

### 3. Put `~/bin` on your PATH (once)

If `cadence` is not found after install:

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

### 4. Confirm it is running

```bash
cadence status
# → running

curl -s http://127.0.0.1:3927/health
# → {"ok":true,"service":"cadence",...}
```

Look for the Cadence icon in the **menu bar** (top right). Click it to open the panel. Right-click (or Control-click) the icon for **Open Cadence**, the API port line, and **Quit**.

### macOS CLI

```bash
cadence start    # open ~/Applications/Cadence.app
cadence stop     # quit the running app
cadence status   # running | stopped
```

### Update on macOS

```bash
cd /path/to/Cadence
git pull
./scripts/install.sh
```

Your jobs and history stay in Application Support (see [Data](#data)); reinstalling the app does not wipe them.

### Gatekeeper / first launch

This is an ad-hoc local build (not notarized with an Apple Developer ID). If macOS blocks it:

1. System Settings → Privacy & Security → allow Cadence, or
2. Right-click `Cadence.app` → Open → Open

---

## Install on Windows

### 1. Install Node if needed

1. Download the **LTS** installer from [nodejs.org](https://nodejs.org/)
2. Run it with the default options (includes npm)
3. Open a **new** PowerShell window and check:

```powershell
node -v
npm -v
```

### 2. Clone the repo

In PowerShell:

```powershell
git clone https://github.com/krisrmgua/Cadence.git
cd Cadence
```

Or download the ZIP from GitHub → Extract → `cd` into the folder.

### 3. Run the installer script

```powershell
.\scripts\install.ps1
```

If PowerShell blocks scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\scripts\install.ps1
```

What `install.ps1` does:

1. `npm install`
2. `npm run pack:win` (builds an NSIS setup `.exe` under `release\`)
3. Launches that setup wizard and waits for it to finish

In the wizard: pick an install folder (or accept the default), finish, then start Cadence if prompted.

### 4. Confirm it is running

- Cadence should appear in the **system tray** (near the clock). Click the icon for the panel; right-click for Quit / Open.
- Windows often hides new tray icons: click the **^** overflow arrow and drag Cadence onto the taskbar notification area.
- Health check from PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3927/health
```

### SmartScreen

On first run of the setup `.exe`, Windows may say “Windows protected your PC” because the binary is not signed with a purchased code-signing cert. Choose **More info** → **Run anyway** if you built it yourself from this repo.

### Update on Windows

```powershell
cd path\to\Cadence
git pull
.\scripts\install.ps1
```

Or build only:

```powershell
npm install
npm run pack:win
# then run the new Cadence Setup *.exe under release\
```

### Uninstall on Windows

Use **Settings → Apps → Cadence → Uninstall**, or the uninstaller from the Start Menu folder. Job data under `%APPDATA%\Cadence` is left in place unless you delete that folder yourself.

---

## How to use the panel

1. **Click the tray / menu-bar icon** to open the dark panel.
2. Tabs:
   - **Jobs** — list, enable/disable, run now, delete
   - **History** — recent runs with status, exit code, and captured output
   - **New** — create a job
3. The subtitle under **Cadence** shows the live API URL and platform, e.g. `API http://127.0.0.1:3927 · darwin`.
4. Click outside the panel (or lose focus) to hide it on a normal build; the app keeps running in the tray.

### Create a job (UI)

On **New**:

| Field | Meaning |
|---|---|
| **Name** | Label shown in Jobs and History |
| **Command** | Shell / cmd line to execute |
| **Working directory** | Optional. Blank = your home folder |
| **Times** | Comma-separated local 24h times, e.g. `09:00, 17:30` |
| **Days** | Weekdays that should fire. If none are checked, Cadence treats that as **every day** (same as API `"days": []`) |
| **Enabled** | When on, the scheduler will fire at matching times |

**Save job** adds it to the list. Use **Run now** on Jobs to test without waiting for the clock.

### Enable / disable / delete

On a job card:

- **Disable** / **Enable** — paused jobs keep their schedule but do not fire
- **Run now** — immediate run; shows up in History
- **Delete** — removes the job (past runs stay in History until trimmed)

### Schedule rules

- Times are **local machine time**, format `HH:MM` (24-hour), e.g. `09:00`, `17:30`.
- Or set **`intervalMinutes`** (API / New form) to run every N minutes instead of wall-clock times (launchd `StartInterval` style).
- The scheduler checks about every **15 seconds**. Calendar jobs fire **once per matching minute**; interval jobs fire when N minutes have elapsed since the last run.
- **Days** use JavaScript weekday numbers when set via API: `0` = Sunday … `6` = Saturday. Days are ignored for interval jobs.
- Empty `days` array (`[]`) means **every day** for calendar jobs.
- Cadence must be **running** (tray process alive) for scheduled jobs to fire. It is not a separate OS cron/Task Scheduler entry (yet).

### Example commands

macOS:

```bash
echo "hello from cadence"
~/bin/backup.sh
osascript -e 'display notification "done" with title "Cadence"'
```

Windows (`cmd`):

```bat
echo hello from cadence
C:\Tools\backup.bat
powershell -NoProfile -Command "Write-Output 'hello'"
```

---

## Local API (for AI agents and scripts)

While Cadence is running it listens on **127.0.0.1 only** (not reachable from other machines).

- Default port: **3927**
- If 3927 is busy it tries 3928, 3929, then an ephemeral port, and remembers the chosen port
- Current port is in the panel subtitle and on the tray tooltip

All responses are JSON. Errors look like `{ "error": "..." }` with HTTP 4xx/5xx.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness + port + platform |
| `GET` | `/jobs` | List all jobs |
| `POST` | `/jobs` | Create a job |
| `GET` | `/jobs/:id` | One job |
| `PATCH` | `/jobs/:id` | Update fields |
| `DELETE` | `/jobs/:id` | Delete job |
| `POST` | `/jobs/:id/run` | Run now (waits until the process exits) |
| `GET` | `/runs?limit=50` | Recent history (newest first) |
| `GET` | `/runs/:id` | One run including stdout/stderr |

### Health

```bash
curl -s http://127.0.0.1:3927/health
```

```json
{
  "ok": true,
  "service": "cadence",
  "port": 3927,
  "platform": "darwin"
}
```

PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3927/health
```

### Create a job

```bash
curl -s http://127.0.0.1:3927/jobs \
  -H 'content-type: application/json' \
  -d '{
    "name": "Morning ping",
    "command": "echo hello from cadence",
    "cwd": "/Users/you/projects",
    "enabled": true,
    "schedule": {
      "times": ["09:00", "17:30"],
      "days": [1, 2, 3, 4, 5]
    }
  }'
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Non-empty string |
| `command` | yes | Shell / cmd line |
| `schedule.times` | yes* | Array of `HH:MM`. Required unless `intervalMinutes` is set |
| `schedule.days` | no | Array of `0`–`6`; omit or `[]` = every day (calendar jobs) |
| `schedule.intervalMinutes` | no | Integer ≥ 1; when set, runs every N minutes instead of `times` |
| `cwd` | no | Working directory; default home |
| `enabled` | no | Default `true` |

`createdBy` is set to `"api"` automatically for HTTP creates (`"ui"` for panel creates).

### List / get / patch / delete

```bash
# list
curl -s http://127.0.0.1:3927/jobs

# get one
curl -s http://127.0.0.1:3927/jobs/<id>

# pause
curl -s -X PATCH http://127.0.0.1:3927/jobs/<id> \
  -H 'content-type: application/json' \
  -d '{"enabled": false}'

# change schedule
curl -s -X PATCH http://127.0.0.1:3927/jobs/<id> \
  -H 'content-type: application/json' \
  -d '{"schedule":{"times":["12:00"],"days":[1,3,5]}}'

# delete
curl -s -X DELETE http://127.0.0.1:3927/jobs/<id>
```

### Run now

```bash
curl -s -X POST http://127.0.0.1:3927/jobs/<id>/run
```

The HTTP call **blocks until the command finishes**, then returns the run object (`status`, `exitCode`, `stdout`, `stderr`, timestamps).

### History

```bash
curl -s 'http://127.0.0.1:3927/runs?limit=20'
curl -s http://127.0.0.1:3927/runs/<run-id>
```

Cadence keeps roughly the newest **200** runs on disk; older ones are dropped.

### Agent-oriented tip

Point an agent at:

1. `GET /health` — confirm Cadence is up and learn the port if you probe nearby ports
2. `POST /jobs` — schedule work
3. `POST /jobs/:id/run` — run immediately when you need the result in-session
4. `GET /runs/:id` — inspect output later

---

## Data

Everything lives in one JSON file:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Cadence/data/cadence.json` |
| Windows | `%APPDATA%\Cadence\data\cadence.json` |

Includes jobs, recent runs, and the remembered API port. File mode on macOS is restricted (`600`). Back up or delete this file to migrate or reset.

Bundle / app id: `com.kris.cadence`.

---

## Develop from source

```bash
git clone https://github.com/krisrmgua/Cadence.git
cd Cadence
npm install
npm run dev
```

`npm run dev` builds the Electron main process, starts the Vite UI on `http://127.0.0.1:5173`, and launches Electron with `CADENCE_DEV=1` (panel stays easier to inspect; blur-to-hide is relaxed).

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run build` | Production UI + Electron compile |
| `npm start` | Build then run Electron against `dist/` |
| `npm run pack:mac` | macOS `.app` + zip under `release/` |
| `npm run pack:win` | Windows NSIS installer under `release/` |
| `npm run pack` | Both (needs a machine/toolchain that can build both) |

Layout:

```
electron/     main process, tray, scheduler, runner, API
src/ui/       panel HTML/CSS/TS
assets/       tray + app icons
scripts/      install.sh, install.ps1
```

---

## Troubleshooting

| Symptom | What to try |
|---|---|
| No icon | Confirm process is running (`cadence status` / Task Manager). On Windows check the tray overflow (^). |
| API connection refused | App not running, or port bumped — read the panel subtitle / tray tooltip. |
| Job never fires | Job **Enabled**? Correct `HH:MM` and weekday? App must stay open in the tray. |
| Command fails on Windows | Reminder: default shell is `cmd`, not PowerShell. Wrap PowerShell explicitly. |
| Command fails on Mac | Test the same line in Terminal; Cadence uses a login shell (`-lc`). |
| Blank panel | Rebuild (`npm run build` / reinstall). Check Console / DevTools if in `npm run dev`. |
| Port already in use | Cadence will try the next ports; restart after killing a stale Cadence process. |

---

## Privacy

- No cloud sync, no analytics, no account.
- The HTTP API binds to **localhost only**.
- Commands you schedule run with **your user privileges** — treat API access on your machine like shell access.

---

## License

MIT. See [LICENSE](LICENSE).

## Contributing

Cadence is open source. Issues and pull requests are welcome.

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to build, branch, and open a PR
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md) — how to report vulnerabilities

`main` is protected: changes land through a pull request (direct pushes to `main` are blocked).
