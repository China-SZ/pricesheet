# PriceSheet — Online Spreadsheet

A FortuneSheet-based price spreadsheet. Visitors can view; admins can edit after login. Data and multi-admin accounts are stored in SQLite (`data/app.db`).

## Features

- Full Excel-like spreadsheet (FortuneSheet): multiple sheets, merge cells, zoom, styling
- Public read-only view; logged-in admins can edit and save manually
- Multi-admin management (create / change password / delete)
- Optional WhatsApp / WeChat contact QR buttons
- Admin-only **Import Excel (.xlsx)** appends new sheets (does not replace existing); click Save to publish

## Setup

```bash
npm install
cp .env.example .env.local
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
| `SESSION_SECRET` | Cookie encryption key (32+ characters), **not** the login password |
| `NEXT_PUBLIC_SITE_NAME` | Header brand name |
| `NEXT_PUBLIC_SITE_TAGLINE` | Header subtitle |

## Data directory

SQLite file lives at `data/app.db` (created automatically). Keep this directory backed up; it holds users, spreadsheet JSON, and contact settings. The `data/` folder is gitignored.

## Scripts

```bash
npm run dev      # development
npm run build    # production build
npm run start    # run production server
```

## Linux x86_64 binary release (GitHub Actions)

Release packages are built only by GitHub Actions.

Workflow: [`.github/workflows/release-linux-x64.yml`](.github/workflows/release-linux-x64.yml)

| Trigger | Result |
|---------|--------|
| Push / PR to `main` | Build + upload artifact |
| Tag `v*` (e.g. `v0.1.0`) | Build + GitHub Release with `.tar.gz` |
| Manual **Run workflow** | Same as push |

Download: **Actions** → Artifacts → `pricesheet-linux-x86_64`, or **Releases** after tagging.

## Production domain: 168899.club

Automatic HTTPS via **Caddy** (Let's Encrypt). See [deploy/README.md](deploy/README.md).

```bash
# DNS: A records for 168899.club and www → server IP; open ports 80/443
tar -xzf pricesheet-*-linux-x86_64.tar.gz
cd pricesheet-*-linux-x86_64
sudo ./deploy/install-ubuntu.sh "$(pwd)"
# → https://168899.club
```

## Routes

| Path | Access |
|------|--------|
| `/` | Public spreadsheet (edit if logged in) |
| `/login` | Admin login |
| `/admin` | Manage admins & contact settings |

## Notes

- Sample sheet content is placeholder demo data, not real commercial prices.
