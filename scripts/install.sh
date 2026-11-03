#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null; then
  echo "npm is required" >&2
  exit 1
fi

npm install
npm run pack:mac

APP_SRC="$(find "$ROOT/release/mac"* -maxdepth 2 -name 'Cadence.app' -type d 2>/dev/null | head -1 || true)"
if [[ -z "${APP_SRC}" ]]; then
  APP_SRC="$(find "$ROOT/release" -maxdepth 3 -name 'Cadence.app' -type d | head -1 || true)"
fi
if [[ -z "${APP_SRC}" ]]; then
  echo "Cadence.app not found under release/" >&2
  exit 1
fi

mkdir -p "$HOME/Applications"
rm -rf "$HOME/Applications/Cadence.app"
cp -R "$APP_SRC" "$HOME/Applications/Cadence.app"

mkdir -p "$HOME/bin"
cat >"$HOME/bin/cadence" <<'EOF'
#!/usr/bin/env bash
APP="$HOME/Applications/Cadence.app"
case "${1:-}" in
  start) open -a "$APP" ;;
  stop) pkill -f "Cadence.app/Contents/MacOS/Cadence" 2>/dev/null || true ;;
  status)
    if pgrep -f "Cadence.app/Contents/MacOS/Cadence" >/dev/null; then
      echo "running"
    else
      echo "stopped"
    fi
    ;;
  *)
    echo "usage: cadence {start|stop|status}"
    exit 1
    ;;
esac
EOF
chmod +x "$HOME/bin/cadence"

open -a "$HOME/Applications/Cadence.app"
echo "Installed ~/Applications/Cadence.app"
echo "CLI: cadence start|stop|status (ensure ~/bin is on PATH)"
