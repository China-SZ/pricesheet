#!/usr/bin/env bash
# Install PriceSheet + Caddy on Ubuntu with automatic HTTPS for 168899.club
# Usage (as root):
#   ./install-ubuntu.sh /path/to/pricesheet-*-linux-x86_64
set -euo pipefail

DOMAIN="${DOMAIN:-168899.club}"
APP_USER="${APP_USER:-pricesheet}"
APP_DIR="${APP_DIR:-/opt/pricesheet}"
SRC_DIR="${1:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0 /path/to/extracted-release" >&2
  exit 1
fi

if [[ -z "$SRC_DIR" || ! -f "$SRC_DIR/start.sh" ]]; then
  echo "Usage: $0 /path/to/pricesheet-VERSION-linux-x86_64" >&2
  exit 1
fi

SRC_DIR="$(cd "$SRC_DIR" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Domain: $DOMAIN"
echo "==> Install dir: $APP_DIR"
echo "==> Source: $SRC_DIR"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates debian-keyring debian-archive-keyring apt-transport-https

# --- Caddy (official apt repo) ---
if ! command -v caddy >/dev/null 2>&1; then
  echo "==> Installing Caddy"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq caddy
fi

# --- App user & files ---
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$APP_DIR" /var/log/caddy

# Preserve runtime state across reinstalls/upgrades
rsync -a \
  --exclude '.env' \
  --exclude 'data/' \
  "$SRC_DIR"/ "$APP_DIR"/

# Copy deploy helpers into app dir for later upgrades
mkdir -p "$APP_DIR/deploy"
rsync -a "$SCRIPT_DIR"/ "$APP_DIR/deploy/"

# Keep existing .env / data if present
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env" 2>/dev/null || true
fi
if [[ ! -f "$APP_DIR/.env" ]]; then
  cat > "$APP_DIR/.env" <<EOF
SESSION_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SITE_NAME=PriceSheet
NEXT_PUBLIC_SITE_TAGLINE=Online Price Spreadsheet
PORT=3000
HOSTNAME=127.0.0.1
EOF
else
  # Ensure app binds to localhost behind Caddy
  if grep -q '^HOSTNAME=' "$APP_DIR/.env"; then
    sed -i 's/^HOSTNAME=.*/HOSTNAME=127.0.0.1/' "$APP_DIR/.env"
  else
    echo 'HOSTNAME=127.0.0.1' >> "$APP_DIR/.env"
  fi
  if grep -q '^PORT=' "$APP_DIR/.env"; then
    sed -i 's/^PORT=.*/PORT=3000/' "$APP_DIR/.env"
  else
    echo 'PORT=3000' >> "$APP_DIR/.env"
  fi
  if grep -q 'change-me-to-a-long-random-secret' "$APP_DIR/.env"; then
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$(openssl rand -hex 32)/" "$APP_DIR/.env"
  fi
fi

chmod +x "$APP_DIR/start.sh" "$APP_DIR/runtime/node/bin/node" 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"

# --- systemd: app ---
install -m 644 "$SCRIPT_DIR/pricesheet.service" /etc/systemd/system/pricesheet.service

# --- Caddy site config ---
install -m 644 "$SCRIPT_DIR/Caddyfile" /etc/caddy/Caddyfile
# Allow overriding domain via env at install time
if [[ "$DOMAIN" != "168899.club" ]]; then
  sed -i "s/168899\\.club/${DOMAIN//./\\.}/g" /etc/caddy/Caddyfile
  sed -i "s/admin@.*/admin@${DOMAIN}/" /etc/caddy/Caddyfile
fi

mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy 2>/dev/null || true

systemctl daemon-reload
systemctl enable --now pricesheet.service
systemctl enable --now caddy.service
systemctl reload caddy || systemctl restart caddy

echo
echo "Installed."
echo "  App:    systemctl status pricesheet"
echo "  Proxy:  systemctl status caddy"
echo "  Site:   https://${DOMAIN}"
echo
echo "DNS checklist (before certs work):"
echo "  A     ${DOMAIN}     -> this server public IP"
echo "  A     www.${DOMAIN} -> this server public IP"
echo "  Ports 80 and 443 open in firewall"
echo
echo "Caddy will obtain Let's Encrypt certificates automatically after DNS propagates."
echo "Edit secrets: nano ${APP_DIR}/.env && systemctl restart pricesheet"
