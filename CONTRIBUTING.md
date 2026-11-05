# Contributing

Issues and pull requests are welcome. Direct pushes to `main` are blocked; open a PR.

1. Fork the repository (or use a branch) and start from `main`.
2. Keep the change focused. Use a conventional commit such as `feat:`, `fix:`, `docs:`, or `chore:`.
3. Install deps and smoke-check a build:

```bash
npm install
npm run build
```

Optional: run the app locally with `npm run dev` or `npm start`, and hit the API:

```bash
curl -sk https://127.0.0.1:3927/health
```

4. Do not commit secrets, machine-local `cadence.json` data, API tokens, or `release/` / `dist/` build products.
5. Open a pull request that says what changed and how you tested it (macOS, Windows, or both).

## Layout

| Path | Role |
|---|---|
| `electron/` | Main process, tray, scheduler, runner, localhost API |
| `src/ui/` | Panel UI |
| `assets/` | Icons |
| `scripts/` | `install.sh` (macOS), `install.ps1` (Windows) |

User-facing behavior belongs in the README when install steps, scheduling, or the API change.

## Platforms

Cadence targets macOS 13+ and Windows 10+. Prefer cross-platform Node/`path` APIs. When a change is OS-specific, say so in the PR and test that OS if you can.
