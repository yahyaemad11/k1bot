#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "╔════════════════════════════════════════╗"
echo "║   تشغيل KeyOne                          ║"
echo "║   Backend  → http://localhost:4000      ║"
echo "║   Frontend → http://localhost:3000      ║"
echo "║   دخول: admin@keyone.local / admin1234  ║"
echo "╚════════════════════════════════════════╝"

# Trap to kill children on exit
trap 'kill 0' EXIT

( cd backend && npm start ) &
sleep 3
( cd frontend && npm run dev ) &

wait
