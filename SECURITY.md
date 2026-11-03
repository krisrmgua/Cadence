# Security

Cadence runs shell commands that you (or a local agent) schedule. Treat the localhost API like shell access on your account.

## Reporting

Open a GitHub issue, or contact the maintainer, for a vulnerability in this repository. Do not paste API keys, tokens, private job output, or the contents of `cadence.json`. Describe the file or endpoint, the behavior, and the impact.

## What the app stores

| Data | Where | Notes |
|---|---|---|
| Jobs, run history, API port | macOS: `~/Library/Application Support/Cadence/data/cadence.json`; Windows: `%APPDATA%\Cadence\data\cadence.json` | Written by Cadence; file mode `600` on macOS |
| Preferences / Electron state | Electron `userData` for `com.kris.cadence` | Standard Electron app data |

Cadence does not ship a cloud account and does not sync jobs off the machine.

## Local API

- Binds to `127.0.0.1` only (default port `3927`, with fallbacks).
- Anyone who can reach that port as your user can create jobs and run commands as you.
- Do not expose the port through port-forwarding, reverse proxies, or container publish rules.

## Command execution

Scheduled and “run now” jobs use:

- macOS: login shell (`$SHELL -lc`)
- Windows: `cmd.exe /c`

Commands inherit your user environment and privileges. Review jobs created by agents before leaving them enabled.

## Network

Cadence’s own HTTP server is localhost-only. Individual job commands may reach the network if you write them that way; that is outside Cadence’s control.

## Out of scope

The packaged app is not a sandboxed Mac App Store build. A local program running as you already has the same access to your files whether or not Cadence is installed.
