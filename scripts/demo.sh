#!/usr/bin/env bash
set -euo pipefail
API="${API_URL:-http://localhost:8080}"
KEY="${ADMIN_API_KEY:-demo-admin-key-change-me}"
echo '== Plugin list =='
curl -fsS "$API/api/plugins"; echo
echo '== Store a note in MySQL =='
curl -fsS -X POST "$API/api/execute" -H 'Content-Type: application/json' -H "X-API-Key: $KEY" -d '{"pluginId":"mysql","operation":"addNote","input":{"text":"Hello from the interview demo"}}'; echo
echo '== Read notes =='
curl -fsS -X POST "$API/api/execute" -H 'Content-Type: application/json' -H "X-API-Key: $KEY" -d '{"pluginId":"mysql","operation":"listNotes"}'; echo
echo '== Write a file =='
curl -fsS -X POST "$API/api/execute" -H 'Content-Type: application/json' -H "X-API-Key: $KEY" -d '{"pluginId":"storage","operation":"writeFile","input":{"name":"demo.txt","content":"SDK plugin demo"}}'; echo
echo '== Simulate notification =='
curl -fsS -X POST "$API/api/execute" -H 'Content-Type: application/json' -H "X-API-Key: $KEY" -d '{"pluginId":"notifications","operation":"send","input":{"recipient":"interviewer@example.com","message":"SDK demo succeeded"}}'; echo
echo '== Events =='
curl -fsS "$API/api/events"; echo
