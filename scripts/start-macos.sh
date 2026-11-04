#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env || ! -f config/database.env ]]; then
  echo 'Create .env and config/database.env from their example templates first.' >&2
  exit 1
fi
set -a
source .env
source config/database.env
if [[ -f config/tls.env ]]; then
  source config/tls.env
fi
set +a
export PORT="${PORT:-8123}"
export API_HOST="${API_HOST:-127.0.0.1}"
if [[ -n "${TLS_CERT_FILE:-}" && -n "${TLS_KEY_FILE:-}" ]]; then
  echo "Rust-eze TLS enabled on port ${PORT}"
else
  echo "Rust-eze HTTP enabled on port ${PORT}"
fi
exec npm run start -w @upp/api
