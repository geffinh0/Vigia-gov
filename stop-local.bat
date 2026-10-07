@echo off
REM ============================================================
REM  Vigia-Gov - para o Postgres local (Docker) subido pelo
REM  start-local.bat. As janelas da API/Web devem ser fechadas
REM  manualmente (ou feche-as e rode este script).
REM ============================================================

cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Docker nao encontrado no PATH, nada para parar por aqui.
    pause
    exit /b 0
)

echo Parando Postgres (docker compose down)...
docker compose down
if errorlevel 1 docker-compose down

echo.
echo Postgres parado. Os dados continuam salvos no volume Docker
echo (vigiagov_postgres_data) para a proxima vez que voce rodar start-local.bat.
echo.
pause
