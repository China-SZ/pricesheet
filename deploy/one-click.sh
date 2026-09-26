#!/usr/bin/env bash
# One-click install / update for Ubuntu (x86_64)
# ------------------------------------------------
# 1. Edit DOMAIN below
# 2. sudo ./one-click.sh
# ------------------------------------------------
set -euo pipefail

########################
# 只改这一行域名即可
DOMAIN="example.com"
########################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Allow running from release root or from deploy/
if [[ -f "$SCRIPT_DIR/start.sh" ]]; then
  APP_SRC="$SCRIPT_DIR"
  INSTALLER="$SCRIPT_DIR/deploy/install-ubuntu.sh"
elif [[ -f "$SCRIPT_DIR/../start.sh" ]]; then
  APP_SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
  INSTALLER="$SCRIPT_DIR/install-ubuntu.sh"
else
  echo "ERROR: run this script from the extracted release folder." >&2
  exit 1
fi

if [[ ! -x "$INSTALLER" && -f "$INSTALLER" ]]; then
  chmod +x "$INSTALLER"
fi
if [[ ! -f "$INSTALLER" ]]; then
  echo "ERROR: installer not found: $INSTALLER" >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-run with sudo:"
  echo "  sudo $0"
  exit 1
fi

if [[ -z "$DOMAIN" || "$DOMAIN" == "example.com" ]]; then
  echo "WARN: DOMAIN is still 'example.com'. Edit this script and set your real domain." >&2
  echo "Continue in 5 seconds… (Ctrl+C to cancel)"
  sleep 5
fi

export DOMAIN
echo "==> One-click deploy"
echo "    DOMAIN=$DOMAIN"
echo "    SRC=$APP_SRC"
exec "$INSTALLER" "$APP_SRC"
