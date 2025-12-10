@echo off
echo 🚀 Iniciando Backend...
cd /d %~dp0
echo Verificando archivo .env...
if exist .env (
    echo ✅ Archivo .env encontrado
) else (
    echo ❌ Archivo .env NO encontrado
    echo Verifica que el archivo .env exista en este directorio
    pause
    exit /b 1
)
echo.
echo Iniciando servidor...
node server.js
pause

