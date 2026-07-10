#!/usr/bin/env bash
# Lightweight load test against the live Render API using autocannon (via npx, no install needed).
#
# Usage:
#   ./scripts/loadtest.sh                 # default: 10 connections, 20s per endpoint
#   ./scripts/loadtest.sh 20 30           # 20 connections, 30s per endpoint
#
# Notes:
# - Hits the REAL deployed API (https://fco-hub.onrender.com). Run during low-traffic hours.
# - Only exercises safe, read-only GET endpoints. Never targets admin/auth/write routes.
# - Render free tier has shared CPU — expect latency to degrade well before "failure".

set -euo pipefail

BASE_URL="https://fco-hub.onrender.com"
CONNECTIONS="${1:-10}"
DURATION="${2:-20}"

ENDPOINTS=(
  "/api/health"
  "/api/events"
  "/api/players?limit=20"
  "/api/players/meta"
  "/api/monetization/feed?placement=squad_top"
  "/api/assets/public-map"
)

echo "== FCO Hub load test =="
echo "Target:       $BASE_URL"
echo "Connections:  $CONNECTIONS"
echo "Duration:     ${DURATION}s per endpoint"
echo "Endpoints:    ${#ENDPOINTS[@]}"
echo

for path in "${ENDPOINTS[@]}"; do
  url="${BASE_URL}${path}"
  echo "----------------------------------------"
  echo "GET $path"
  echo "----------------------------------------"
  npx --yes autocannon -c "$CONNECTIONS" -d "$DURATION" -m GET "$url"
  echo
done

echo "== Done =="
echo "Look at: latency (avg/p99), req/sec, and non-2xx/timeout counts per endpoint."
echo "If p99 latency blows up or errors appear well before your target connection count,"
echo "that's your free-tier ceiling."
