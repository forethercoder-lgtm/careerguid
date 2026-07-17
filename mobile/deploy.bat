@echo off
set /p RAILWAY_URL="Вставь Railway URL (например https://xxx.up.railway.app): "

echo Обновляю config.js...
(
echo // Railway backend URL
echo export const API_URL = '%RAILWAY_URL%';
) > "%~dp0src\config.js"

echo Публикую на Expo...
cd /d "%~dp0"
npx eas update --branch production --message "Release" --non-interactive

echo.
echo Готово! Открой Expo Go на телефоне и скопируй ссылку выше.
pause
