@echo off
chcp 65001 >nul
title KeyOne - تثبيت الحزم
echo ╔════════════════════════════════════════╗
echo ║   KeyOne — تثبيت الحزم (Backend+Frontend)
echo ╚════════════════════════════════════════╝
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [خطأ] Node.js غير مثبت. حمّل من: https://nodejs.org
  pause
  exit /b 1
)

echo [1/4] تثبيت حزم الباك إند...
cd /d "%~dp0backend"
call npm install --omit=dev
if errorlevel 1 goto fail

echo.
echo [2/4] تجهيز ملف البيئة للباك إند...
if not exist .env (
  copy .env.example .env >nul
  echo     ✓ تم إنشاء .env  (افتحه وعدّل المفاتيح قبل التشغيل)
) else (
  echo     ✓ .env موجود مسبقاً
)

echo.
echo [3/4] تثبيت حزم الفرونت إند...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto fail

echo.
echo [4/4] تجهيز ملف البيئة للفرونت...
if not exist .env.local (
  copy .env.local.example .env.local >nul
  echo     ✓ تم إنشاء .env.local
) else (
  echo     ✓ .env.local موجود مسبقاً
)

echo.
echo ╔════════════════════════════════════════╗
echo ║   ✓ تم التثبيت بنجاح                    ║
echo ║   شغّل start.bat للبدء                  ║
echo ╚════════════════════════════════════════╝
pause
exit /b 0

:fail
echo.
echo [✗] فشل التثبيت. راجع الرسائل أعلاه.
pause
exit /b 1
