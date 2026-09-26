# Deploy on Ubuntu with Caddy automatic HTTPS

Domain is configurable (default: `example.com`).

## One-click (recommended)

```bash
tar -xzf pricesheet-*-linux-x86_64.tar.gz
cd pricesheet-*-linux-x86_64
nano one-click.sh          # change DOMAIN="example.com"
sudo ./one-click.sh
```

## Manual

```bash
export DOMAIN=example.com
sudo -E ./deploy/install-ubuntu.sh "$(pwd)"
```

## 1. DNS

Point these records to your server's public IP:

| Type | Name | Value |
|------|------|--------|
| A | `@` (`your.domain`) | server IP |
| A | `www` | server IP |

Open firewall ports **80** and **443** (required for Let's Encrypt).

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw enable
```

## 2. What the installer does

- Install **Caddy** (automatic Let's Encrypt certificates)
- Install the app under `/opt/pricesheet`
- Create systemd service `pricesheet` (listens on `127.0.0.1:3000`)
- Write `/etc/caddy/Caddyfile` for `$DOMAIN` + `www.$DOMAIN`
- Enable and start both services

## 3. Verify

```bash
systemctl status pricesheet
systemctl status caddy
curl -I "https://your.domain"
```

Certificates are issued automatically by Caddy once DNS resolves to this host.

## 4. Change domain / upgrade

Edit `DOMAIN` in `one-click.sh`, then run again:

```bash
sudo ./one-click.sh
```

## Files

| File | Purpose |
|------|---------|
| `one-click.sh` | Edit domain + one-click install/update |
| `Caddyfile` | Reverse proxy + auto HTTPS (`__DOMAIN__` placeholder) |
| `pricesheet.service` | systemd unit for the Node app |
| `install-ubuntu.sh` | Underlying installer (`DOMAIN` env) |

## Notes

- Domain: `https://your.domain` (auto certificate)
- IP plaintext: `http://SERVER_IP/` (no TLS; for debug / before DNS)
- App binds to localhost only; public traffic goes through Caddy
- `SESSION_SECRET` is auto-generated on first install if still the placeholder
- Default admin remains `admin` / `admin123` — change it after first login
