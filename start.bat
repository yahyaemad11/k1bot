@echo off
chcp 65001 >nul
title KeyOne - تشغيل
echo ╔════════════════════════════════════════╗
echo ║   تشغيل KeyOne                          ║
echo ╚════════════════════════════════════════╝
echo.
echo  Backend  → http://localhost:4000
echo  Frontend → http://localhost:3000
echo.
echo  دخول: admin@keyone.local / admin1234
echo.

start "KeyOne Backend"  cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3 /nobreak >nul
start "KeyOne Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ✓ تم التشغيل. النوافذ مفتوحة. أغلقها لإيقاف النظام.
echo (يمكنك إغلاق هذه النافذة)
timeout /t 5
exit /b 0
