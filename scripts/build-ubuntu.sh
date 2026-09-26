#!/usr/bin/env bash
# Build a self-contained Linux x86_64 (amd64) binary release for PriceSheet.
# Auto-detects Podman or Docker; forces linux/amd64 so macOS/ARM hosts still
# produce an x86_64 package with a native better-sqlite3 + bundled Node.js.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="pricesheet"
VERSION="$(node -p "require('./package.json').version")"
TARGET_OS="linux"
TARGET_ARCH="x86_64"
PLATFORM="linux/amd64"
DIST_ROOT="$ROOT/dist"
PKG_NAME="${NAME}-${VERSION}-${TARGET_OS}-${TARGET_ARCH}"
PKG_DIR="$DIST_ROOT/$PKG_NAME"
TAR_PATH="$DIST_ROOT/${PKG_NAME}.tar.gz"
IMAGE="${NODE_IMAGE:-docker.io/library/node:20-bookworm}"
NODE_DIST_VERSION="${NODE_DIST_VERSION:-20.19.0}"
SQLITE_VERSION="$(node -p "require('./package.json').dependencies['better-sqlite3'].replace(/^[^\d]*/, '')")"

detect_runtime() {
  if [[ -n "${CONTAINER_RUNTIME:-}" ]]; then
    if command -v "$CONTAINER_RUNTIME" >/dev/null 2>&1; then
      echo "$CONTAINER_RUNTIME"
      return
    fi
    echo "ERROR: CONTAINER_RUNTIME=$CONTAINER_RUNTIME not found in PATH" >&2
    exit 1
  fi
  if command -v podman >/dev/null 2>&1; then
    echo "podman"
    return
  fi
  if command -v docker >/dev/null 2>&1; then
    echo "docker"
    return
  fi
  echo ""
}

RUNTIME="$(detect_runtime)"

echo "==> Building binary release: $PKG_NAME"
echo "==> Platform: $PLATFORM (Ubuntu/glibc x86_64)"
if [[ -n "$RUNTIME" ]]; then
  echo "==> Container runtime: $RUNTIME"
else
  echo "==> Container runtime: none (Linux host fallback only)"
fi

rm -rf "$PKG_DIR" "$TAR_PATH"
mkdir -p "$DIST_ROOT"

container_run() {
  # Usage: container_run [extra args...] -- image command...
  local -a extra=()
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "--" ]]; then
      shift
      break
    fi
    extra+=("$1")
    shift
  done
  local image="$1"
  shift

  if [[ "$RUNTIME" == "podman" ]]; then
    # Keep volume ownership usable on the host
    podman run --rm --platform "$PLATFORM" \
      --security-opt label=disable \
      -v "$ROOT:/app:Z" \
      -w /app \
      "${extra[@]}" \
      "$image" \
      "$@"
  else
    docker run --rm --platform "$PLATFORM" \
      -v "$ROOT:/app" \
      -w /app \
      "${extra[@]}" \
      "$image" \
      "$@"
  fi
}

build_in_container() {
  echo "==> Building inside $RUNTIME ($IMAGE @ $PLATFORM)"
  container_run \
    -e npm_config_cache=/tmp/npm-cache \
    -e SQLITE_VERSION="$SQLITE_VERSION" \
    -e PKG_NAME="$PKG_NAME" \
    -e NODE_DIST_VERSION="$NODE_DIST_VERSION" \
    -- "$IMAGE" \
    bash -lc '
      set -euo pipefail
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -qq
      apt-get install -y -qq python3 make g++ ca-certificates curl xz-utils >/dev/null

      uname -m | grep -Eq "x86_64|amd64" || {
        echo "ERROR: container is not x86_64 (got $(uname -m))" >&2
        exit 1
      }

      if [[ -f package-lock.json ]]; then
        npm ci
      else
        npm install
      fi
      npm run build

      PKG_DIR="/app/dist/${PKG_NAME}"
      rm -rf "$PKG_DIR"
      mkdir -p /app/dist "$PKG_DIR"

      if [[ ! -f .next/standalone/server.js ]]; then
        echo "ERROR: standalone output missing (enable output: standalone)" >&2
        exit 1
      fi

      cp -a .next/standalone/. "$PKG_DIR/"
      mkdir -p "$PKG_DIR/.next"
      cp -a .next/static "$PKG_DIR/.next/static"
      if [[ -d public ]]; then
        cp -a public "$PKG_DIR/public"
      fi

      mkdir -p "$PKG_DIR/data"
      touch "$PKG_DIR/data/.gitkeep"
      if [[ -f .env.example ]]; then
        cp .env.example "$PKG_DIR/.env.example"
      fi

      # Native module for linux x86_64 (compile with container Node first)
      echo "==> Installing better-sqlite3@${SQLITE_VERSION} (linux/amd64)"
      (cd "$PKG_DIR" && npm install "better-sqlite3@${SQLITE_VERSION}" --omit=dev --no-audit --no-fund)

      # Bundle official Node.js linux-x64 binary (no system Node needed on server)
      NODE_TGZ="node-v${NODE_DIST_VERSION}-linux-x64.tar.xz"
      NODE_URL="https://nodejs.org/dist/v${NODE_DIST_VERSION}/${NODE_TGZ}"
      echo "==> Downloading Node ${NODE_DIST_VERSION} linux-x64"
      curl -fsSL "$NODE_URL" -o "/tmp/${NODE_TGZ}"
      mkdir -p "$PKG_DIR/runtime"
      tar -xJf "/tmp/${NODE_TGZ}" -C "$PKG_DIR/runtime"
      mv "$PKG_DIR/runtime/node-v${NODE_DIST_VERSION}-linux-x64" "$PKG_DIR/runtime/node"
      rm -f "/tmp/${NODE_TGZ}"
      rm -rf "$PKG_DIR/runtime/node/include" \
             "$PKG_DIR/runtime/node/share" \
             "$PKG_DIR/runtime/node/lib/node_modules/npm" \
             "$PKG_DIR/runtime/node/lib/node_modules/corepack" \
             "$PKG_DIR/runtime/node/CHANGELOG.md" \
             "$PKG_DIR/runtime/node/README.md" \
             "$PKG_DIR/runtime/node/LICENSE" || true

      cat > "$PKG_DIR/.env" <<EOF
SESSION_SECRET=change-me-to-a-long-random-secret-at-least-32-chars
NEXT_PUBLIC_SITE_NAME=PriceSheet
NEXT_PUBLIC_SITE_TAGLINE=Online Price Spreadsheet
PORT=3000
HOSTNAME=0.0.0.0
EOF

      cat > "$PKG_DIR/start.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "\$(dirname "\$0")"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export PORT="\${PORT:-3000}"
export HOSTNAME="\${HOSTNAME:-0.0.0.0}"
export NODE_ENV=production

NODE_BIN="./runtime/node/bin/node"
if [[ ! -x "\$NODE_BIN" ]]; then
  echo "ERROR: bundled Node binary missing: \$NODE_BIN" >&2
  exit 1
fi

echo "Starting PriceSheet (linux-x86_64) on http://\${HOSTNAME}:\${PORT}"
exec "\$NODE_BIN" server.js
EOF
      chmod +x "$PKG_DIR/start.sh"

      cat > "$PKG_DIR/README.txt" <<EOF
PriceSheet binary release
=========================
Target : Linux x86_64 (Ubuntu 20.04+ / glibc)
Package: ${PKG_NAME}

Quick start
-----------
  nano .env
  ./start.sh

Default admin: admin / admin123  (change immediately)
Data file    : ./data/app.db

Bundled Node.js: ./runtime/node (no system Node required)
EOF

      cat > "$PKG_DIR/BUILD_INFO.txt" <<EOF
name=${PKG_NAME}
platform=linux/amd64
node=${NODE_DIST_VERSION}
better-sqlite3=${SQLITE_VERSION}
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
arch=$(uname -m)
runtime_builder=container
EOF
    '
}

build_on_linux_amd64_host() {
  local machine
  machine="$(uname -m)"
  if [[ "$machine" != "x86_64" && "$machine" != "amd64" ]]; then
    echo "ERROR: host arch is $machine; need x86_64 or a container runtime." >&2
    exit 1
  fi

  echo "==> Building natively on Linux x86_64 host"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build

  rm -rf "$PKG_DIR"
  mkdir -p "$PKG_DIR"
  cp -a .next/standalone/. "$PKG_DIR/"
  mkdir -p "$PKG_DIR/.next"
  cp -a .next/static "$PKG_DIR/.next/static"
  [[ -d public ]] && cp -a public "$PKG_DIR/public"
  mkdir -p "$PKG_DIR/data"
  touch "$PKG_DIR/data/.gitkeep"
  [[ -f .env.example ]] && cp .env.example "$PKG_DIR/.env.example"

  NODE_TGZ="node-v${NODE_DIST_VERSION}-linux-x64.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v${NODE_DIST_VERSION}/${NODE_TGZ}" -o "/tmp/${NODE_TGZ}"
  mkdir -p "$PKG_DIR/runtime"
  tar -xJf "/tmp/${NODE_TGZ}" -C "$PKG_DIR/runtime"
  mv "$PKG_DIR/runtime/node-v${NODE_DIST_VERSION}-linux-x64" "$PKG_DIR/runtime/node"
  rm -f "/tmp/${NODE_TGZ}"
  rm -rf "$PKG_DIR/runtime/node/include" "$PKG_DIR/runtime/node/share" \
    "$PKG_DIR/runtime/node/lib/node_modules/npm" \
    "$PKG_DIR/runtime/node/lib/node_modules/corepack" || true

  cat > "$PKG_DIR/.env" <<'EOF'
SESSION_SECRET=change-me-to-a-long-random-secret-at-least-32-chars
NEXT_PUBLIC_SITE_NAME=PriceSheet
NEXT_PUBLIC_SITE_TAGLINE=Online Price Spreadsheet
PORT=3000
HOSTNAME=0.0.0.0
EOF

  cat > "$PKG_DIR/start.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export NODE_ENV=production
NODE_BIN="./runtime/node/bin/node"
echo "Starting PriceSheet (linux-x86_64) on http://${HOSTNAME}:${PORT}"
exec "$NODE_BIN" server.js
EOF
  chmod +x "$PKG_DIR/start.sh"

  cat > "$PKG_DIR/README.txt" <<EOF
PriceSheet binary release (linux-x86_64)
Run: nano .env && ./start.sh
Default admin: admin / admin123
EOF

  (
    cd "$PKG_DIR"
    PATH="$PKG_DIR/runtime/node/bin:$PATH" \
      npm install "better-sqlite3@${SQLITE_VERSION}" --omit=dev --no-audit --no-fund
  )
}

OS="$(uname -s)"
MACHINE="$(uname -m)"

# Prefer native build when already on Linux x86_64 (GitHub Actions / Ubuntu).
# Set FORCE_CONTAINER=1 to always use Podman/Docker.
if [[ "${FORCE_CONTAINER:-}" != "1" && "${BUILD_ON_HOST:-}" == "1" ]]; then
  build_on_linux_amd64_host
elif [[ "${FORCE_CONTAINER:-}" != "1" && "$OS" == "Linux" && ( "$MACHINE" == "x86_64" || "$MACHINE" == "amd64" ) ]]; then
  echo "==> Detected Linux x86_64 host — building natively (set FORCE_CONTAINER=1 to use Podman/Docker)"
  build_on_linux_amd64_host
elif [[ -n "$RUNTIME" ]]; then
  build_in_container
elif [[ "$OS" == "Linux" ]]; then
  build_on_linux_amd64_host
else
  echo "ERROR: Need Podman or Docker to build linux-x86_64 package from $OS ($MACHINE)." >&2
  echo "  Install podman or docker, or set CONTAINER_RUNTIME=podman|docker" >&2
  exit 1
fi

if [[ ! -d "$PKG_DIR" || ! -f "$PKG_DIR/start.sh" ]]; then
  echo "ERROR: package was not created: $PKG_DIR" >&2
  exit 1
fi

# Ensure start.sh is executable even if volume mount dropped mode
chmod +x "$PKG_DIR/start.sh" "$PKG_DIR/runtime/node/bin/node" 2>/dev/null || true

echo "==> Creating tarball: $TAR_PATH"
tar -C "$DIST_ROOT" -czf "$TAR_PATH" "$PKG_NAME"

SIZE="$(du -h "$TAR_PATH" | awk '{print $1}')"
echo
echo "Done. ($SIZE)"
echo "  Runtime : ${RUNTIME:-host}"
echo "  Platform: $PLATFORM"
echo "  Package : $PKG_DIR"
echo "  Tarball : $TAR_PATH"
echo
echo "Deploy on Ubuntu x86_64:"
echo "  tar -xzf $(basename "$TAR_PATH")"
echo "  cd $PKG_NAME && nano .env && ./start.sh"
