#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:8123}"
BASE_URL="${BASE_URL%/}"
: "${ADMIN_API_KEY:?Set ADMIN_API_KEY to the Rust-eze API key first}"
api(){ curl --fail-with-body -sS -H "X-API-Key: $ADMIN_API_KEY" "$@"; echo; }
execop(){ api -X POST "$BASE_URL/api/execute" -H 'Content-Type: application/json' -d "$1"; }
echo '== Health =='; curl --fail-with-body -sS "$BASE_URL/health"; echo
echo '== Plugins =='; api "$BASE_URL/api/plugins"
echo '== MySQL insert =='; execop '{"pluginId":"mysql","operation":"addNote","input":{"text":"Rust-eze standalone 8123 SDK test"}}'
echo '== MySQL retrieve =='; execop '{"pluginId":"mysql","operation":"listNotes","input":{}}'
echo '== Storage write =='; execop '{"pluginId":"storage","operation":"writeFile","input":{"name":"rusteze-test.txt","content":"Shiny SDK"}}'
echo '== Storage read =='; execop '{"pluginId":"storage","operation":"readFile","input":{"name":"rusteze-test.txt"}}'
echo '== Storage list =='; execop '{"pluginId":"storage","operation":"listFiles","input":{}}'
echo '== Notifications simulate =='; execop '{"pluginId":"notifications","operation":"send","input":{"recipient":"interviewer@example.com","message":"Rust-eze test (simulation)"}}'
echo '== Notification history =='; execop '{"pluginId":"notifications","operation":"history","input":{}}'
echo '== Events =='; api "$BASE_URL/api/events"
