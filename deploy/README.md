# Deploy 168899.club (Ubuntu + Caddy auto HTTPS)

## 1. DNS

Point these records to your server's public IP:

| Type | Name | Value |
|------|------|--------|
| A | `@` (168899.club) | server IP |
| A | `www` | server IP |

Open firewall ports **80** and **443** (required for Let's Encrypt).

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw enable
```

## 2. Download release

From GitHub Actions artifact or Releases:

```bash
tar -xzf pricesheet-*-linux-x86_64.tar.gz
cd pricesheet-*-linux-x86_64
```

The release package includes a `deploy/` folder.

## 3. Install (app + Caddy)

```bash
sudo ./deploy/install-ubuntu.sh "$(pwd)"
```

This will:

- Install **Caddy** (automatic Let's Encrypt certificates)
- Install the app under `/opt/pricesheet`
- Create systemd service `pricesheet` (listens on `127.0.0.1:3000`)
- Configure `/etc/caddy/Caddyfile` for `168899.club` + `www`
- Enable and start both services

## 4. Verify

```bash
systemctl status pricesheet
systemctl status caddy
curl -I https://168899.club
```

Certificates are issued automatically by Caddy once DNS resolves to this host.

## 5. Update

```bash
# unpack new release, then:
sudo ./deploy/install-ubuntu.sh /path/to/new-pricesheet-*-linux-x86_64
# existing /opt/pricesheet/.env and data/ are preserved when re-rsync carefully;
# for updates prefer:
sudo systemctl stop pricesheet
sudo rsync -a --exclude '.env' --exclude 'data' ./new-release/ /opt/pricesheet/
sudo systemctl start pricesheet
sudo systemctl reload caddy
```

## Files

| File | Purpose |
|------|---------|
| `Caddyfile` | Reverse proxy + auto HTTPS |
| `pricesheet.service` | systemd unit for the Node app |
| `install-ubuntu.sh` | One-shot installer |

## Notes

- App binds to localhost only; public traffic goes through Caddy on 443.
- `SESSION_SECRET` is auto-generated on first install if still the placeholder.
- Default admin remains `admin` / `admin123` — change it after first login.
