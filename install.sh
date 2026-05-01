#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "╔════════════════════════════════════════╗"
echo "║   KeyOne — تثبيت الحزم                  ║"
echo "╚════════════════════════════════════════╝"

if ! command -v node >/dev/null 2>&1; then
  echo "[خطأ] Node.js غير مثبت. ثبّت من: https://nodejs.org"
  exit 1
fi

echo "[1/4] تثبيت حزم الباك إند..."
( cd backend && npm install --omit=dev )

echo "[2/4] تجهيز ملف البيئة للباك إند..."
[ -f backend/.env ] || cp backend/.env.example backend/.env

echo "[3/4] تثبيت حزم الفرونت إند..."
( cd frontend && npm install )

echo "[4/4] تجهيز ملف البيئة للفرونت..."
[ -f frontend/.env.local ] || cp frontend/.env.local.example frontend/.env.local

echo
echo "✓ تم التثبيت بنجاح. شغّل ./start.sh للبدء"
