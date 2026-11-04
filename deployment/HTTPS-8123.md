# Rust-eze HTTPS on port 8123 — Apache certificate reuse

Rust-eze has its **own HTTPS Node.js listener on TCP 8123**. Apache continues unchanged on ports 80 and 443.

## Existing certificate paths

The included `config/tls.env` points to the same three files Apache uses:

```dotenv
TLS_CERT_FILE=/usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com.crt
TLS_KEY_FILE=/usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com_key.txt
TLS_CHAIN_FILE=/usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com.ca-bundle
```

Fastify/Node loads the leaf certificate and appends the separate intermediate CA bundle before passing it to its HTTPS server, plus the corresponding private key. Neither certificates nor private-key **contents** are included in the ZIP.

`bash scripts/start-macos.sh` loads `.env`, `config/database.env`, then `config/tls.env` (the last file overrides old TLS path values in `.env`). Do **not** copy the private key into the project's webroot or make it world-readable. If you start the API via direct `npm run start -w @upp/api`, source all three configuration files first.

## Install and start

Preserve existing `.env` and `config/database.env` when updating the project. Set your `.env` entries as follows (and keep your actual secret `ADMIN_API_KEY`):

```dotenv
PORT=8123
API_HOST=0.0.0.0
CORS_ORIGIN=https://appdevdesign.com:8123
```

Check the three paths and file permissions:

```bash
ls -l /usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com.crt \
      /usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com_key.txt \
      /usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com.ca-bundle

# Test reading the certificate as the account that runs Node:
test -r /usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com.crt && echo 'Certificate readable'
test -r /usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com_key.txt && echo 'Private key readable'
test -r /usr/local/etc/openssl@3/certs/appdevdesigndotcom/2026/appdevdesign.com.ca-bundle && echo 'Chain readable'

npm install
npm run build
npm test
bash scripts/start-macos.sh
```

In a different Terminal:

```bash
curl -v https://127.0.0.1:8123/health # hostname mismatch is expected for 127.0.0.1
curl -v --resolve appdevdesign.com:8123:127.0.0.1 https://appdevdesign.com:8123/health
openssl s_client -connect 127.0.0.1:8123 -servername appdevdesign.com -showcerts </dev/null
```

The `--resolve` test checks the certificate for its proper hostname while connecting locally. Open `https://appdevdesign.com:8123/` from outside the network after successful local tests. Existing TCP 8123 port forwarding remains valid. The former HTTP URL will no longer work on that port.

## Security and troubleshooting

- If Node reports `EACCES` reading the private key, **do not** use `chmod 644` or grant everyone access. Arrange tightly restricted group access for the Node service account, or make a permission-restricted copy **outside** any public web directory and update `config/tls.env` to point to it.
- The .crt, .ca-bundle and .txt files must contain appropriate PEM encoded certificate, intermediate certificates and private key, respectively. Check `head -n 1` for `-----BEGIN CERTIFICATE-----` on the .crt and bundle; check only the header of the private key, not its contents.
- After a certificate renewal or rotation, restart the Rust-eze Node process so it rereads the updated certificate and chain. The directory named `2026` may change with a future renewal; update `config/tls.env` then.
- TLS secures transport; use a strong `ADMIN_API_KEY`, do not put it in website JS, and restrict access to administrative endpoints.
