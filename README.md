# PriceSheet — Online Spreadsheet

A FortuneSheet-based price spreadsheet. Visitors can view; admins can edit after login. Data and multi-admin accounts are stored in SQLite (`data/app.db`).

## Features

- Full Excel-like spreadsheet (FortuneSheet): multiple sheets, merge cells, zoom, styling
- Public read-only view; logged-in admins can edit and save manually
- Multi-admin management (create / change password / delete)
- Optional WhatsApp / WeChat contact buttons
- Admin-only **Import Excel (.xlsx)** appends new sheets (does not replace existing); click Save to publish

## Setup

```bash
npm install
cp .env.example .env.local   # if needed; a .env.local is already provided for local dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Default admin

On first run the database is created and seeded with:

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

Change this password immediately via **Admin → Change password**.

## Environment

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Cookie encryption key (32+ characters) |
| `NEXT_PUBLIC_SITE_NAME` | Header brand name |
| `NEXT_PUBLIC_SITE_TAGLINE` | Header subtitle |

## Data directory

SQLite file lives at `data/app.db` (created automatically). Keep this directory backed up; it holds users, spreadsheet JSON, and contact settings. The `data/` folder is gitignored.

## Scripts

```bash
npm run dev            # development
npm run build          # production build
npm run start          # run production server
npm run build:linux-x64  # linux-x86_64 binary tarball (Podman/Docker/host)
```

### Linux x86_64 binary release

Auto-detects **Podman** or **Docker** (override with `CONTAINER_RUNTIME=podman|docker`). Always builds for `linux/amd64`.

On Linux x86_64 (including GitHub Actions) it builds natively; set `FORCE_CONTAINER=1` to force Podman/Docker.

```bash
npm run build:linux-x64
# → dist/pricesheet-<version>-linux-x86_64.tar.gz
```

Package includes:
- Next.js standalone server
- Bundled Node.js linux-x64 under `runtime/node`
- `better-sqlite3` compiled for Linux x86_64

On the Ubuntu x86_64 server:

```bash
tar -xzf pricesheet-*-linux-x86_64.tar.gz
cd pricesheet-*-linux-x86_64
nano .env          # set SESSION_SECRET
./start.sh         # no system Node.js required
```

### GitHub Actions

Workflow: [`.github/workflows/release-linux-x64.yml`](.github/workflows/release-linux-x64.yml)

| Trigger | Result |
|---------|--------|
| Push / PR to `main` | Build + upload artifact |
| Tag `v*` (e.g. `v0.1.0`) | Build + create GitHub Release with `.tar.gz` |
| Manual `workflow_dispatch` | Same as push |

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create pricesheet --private --source=. --remote=origin --push
# later, publish a release:
git tag v0.1.0 && git push origin v0.1.0
```

Artifacts: GitHub → Actions → run → **Artifacts** → `pricesheet-linux-x86_64`.
Releases: GitHub → **Releases** (after pushing a `v*` tag).

## Routes

| Path | Access |
|------|--------|
| `/` | Public spreadsheet (edit if logged in) |
| `/login` | Admin login |
| `/admin` | Manage admins & contact settings |

## Notes

- Native module `better-sqlite3` requires a Node.js runtime (not Edge). Deploy on a Node host or container with build tools for native addons.
- Sample sheet content is placeholder demo data, not real commercial prices.
