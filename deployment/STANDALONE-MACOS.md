# Rust-eze standalone deployment — Intel macOS Ventura 13.7.8

Rust-eze uses a **single Node.js Fastify process** to serve the website, React dashboard and API on port 8123. No changes to existing Apache virtual hosts or a separate static file server are needed. MySQL continues to use the existing local service.

## 1. Update and build

Keep your existing `.env` and `config/database.env` when updating the ZIP. From the project directory:

```bash
npm install
npm run build
npm test
```

Set `.env` for your first **local-only** run:

```dotenv
PORT=8123
API_HOST=127.0.0.1
CORS_ORIGIN=http://127.0.0.1:8123
ADMIN_API_KEY=YOUR_LONG_RANDOM_SECRET
```

Set `config/database.env` using your local MySQL instance (`MYSQL_HOST=localhost`, `MYSQL_DATABASE=Rusteze`).

Start:

```bash
bash scripts/start-macos.sh
```

Check in another Terminal:

```bash
curl -i http://127.0.0.1:8123/health
curl -I http://127.0.0.1:8123/
```

Visit `http://127.0.0.1:8123/` and `http://127.0.0.1:8123/dashboard/`.

## 2. Access from your LAN / Internet

Set `API_HOST=0.0.0.0` and `CORS_ORIGIN=http://YOUR_SERVER_IP:8123` in `.env` and restart. `0.0.0.0` is a listen address, **not** the address to type in a browser. Use `http://SERVER_IP:8123/`. Check the macOS firewall, router port-forwarding (if external access is required), and upstream ISP rules. Use a DNS A record to reach `http://appdevdesign.com:8123/` if the hostname resolves to this server's public address. Existing Apache port 80/443 sites are unchanged.

**Security:** public HTTP is unencrypted; anyone on the network path may see requests and API keys. Do **not** enter `ADMIN_API_KEY` in a browser or Postman over the public Internet with HTTP. Keep the admin API restricted to your trusted LAN/VPN and use Browser Simulation mode for a publicly exposed demo. Use HTTPS (for example a TLS-terminating reverse proxy or secure tunnel) before opening authenticated operations to the Internet. For a quick public website preview without credentials, HTTP may be acceptable after considering these risks.

## 3. API tests from the Mac

```bash
curl http://127.0.0.1:8123/health
set -a; source .env; set +a
BASE_URL=http://127.0.0.1:8123 bash scripts/test-api.sh
```

Postman collection: `postman/Rust-eze.postman_collection.json`. Set `baseUrl` to `http://127.0.0.1:8123` for local testing and `adminApiKey` to your `.env` secret. Do not put that secret into screenshots or committed files.

## 4. launchd (optional)

Use the supplied `deployment/launchd/com.rusteze.api.plist.example`. Edit project path, macOS user, and Node/npm executable paths as appropriate, then copy the plist into `~/Library/LaunchAgents/` and load it with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.rusteze.api.plist`. Run as the intended user; do not launch the service from a publicly readable directory containing credentials. Use `launchctl kickstart -k gui/$(id -u)/com.rusteze.api` to restart after changes. LaunchAgents run when that user is logged in; for a headless always-on server use a properly configured LaunchDaemon instead.
