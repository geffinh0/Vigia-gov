@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  Vigia-Gov - script de teste local (Windows)
REM  Sobe Postgres (Docker), instala dependencias, roda as
REM  migrations, gera dados de exemplo e abre API + Frontend.
REM ============================================================

cd /d "%~dp0"

echo.
echo === Vigia-Gov: preparando ambiente local ===
echo.

REM --- 1. Checa Node.js -----------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado no PATH.
    echo        Instale o Node 20+ em https://nodejs.org e rode este script de novo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo Node encontrado: %%v

REM --- 2. Checa/instala pnpm -------------------------------------------
where pnpm >nul 2>&1
if errorlevel 1 (
    echo pnpm nao encontrado, tentando habilitar via corepack...
    call corepack enable >nul 2>&1
    call corepack prepare pnpm@10.28.0 --activate >nul 2>&1
    where pnpm >nul 2>&1
    if errorlevel 1 (
        echo corepack falhou ^(comum em instalacoes novas do Node^), tentando "npm install -g pnpm"...
        call npm install -g pnpm
        REM o PATH da sessao atual pode nao ter o diretorio global do npm ainda;
        REM pede pro Windows reler o PATH antes de checar de novo.
        call refreshenv >nul 2>&1
        where pnpm >nul 2>&1
        if errorlevel 1 (
            echo [ERRO] Nao foi possivel instalar o pnpm automaticamente.
            echo        Abra um novo terminal e rode: npm install -g pnpm
            echo        Depois rode este script de novo.
            pause
            exit /b 1
        )
    )
)
for /f "tokens=*" %%v in ('pnpm -v') do echo pnpm encontrado: %%v

REM --- 3. Garante o .env -------------------------------------------------
if not exist ".env" (
    echo Criando .env a partir de .env.example...
    copy /y ".env.example" ".env" >nul
    echo [AVISO] Ajuste a ADMIN_API_KEY em .env se for expor a API alem da sua maquina.
)

REM --- 4. Sobe o Postgres via Docker -------------------------------------
where docker >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Docker nao encontrado no PATH.
    echo         Sem ele, este script nao consegue subir o banco sozinho.
    echo         Opcoes:
    echo           1^) Instale o Docker Desktop: https://www.docker.com/products/docker-desktop
    echo              e rode este script de novo.
    echo           2^) Ou instale o PostgreSQL direto: https://www.postgresql.org/download/windows/
    echo              crie um banco "vigiagov" e ajuste a DATABASE_URL em .env.
    echo         Continuando sem banco - as proximas etapas provavelmente vao falhar.
    timeout /t 5 /nobreak >nul
) else (
    echo Subindo Postgres ^(docker compose^)...
    docker compose up -d postgres
    if errorlevel 1 (
        echo "docker compose" falhou, tentando "docker-compose"...
        docker-compose up -d postgres
        if errorlevel 1 (
            echo [ERRO] Falha ao subir o Postgres via Docker. Verifique se o Docker Desktop esta rodando.
            pause
            exit /b 1
        )
    )
    echo Aguardando o Postgres aceitar conexoes...
    timeout /t 5 /nobreak >nul
)

REM --- 5. Instala dependencias --------------------------------------------
echo.
echo Instalando dependencias (pnpm install)...
call pnpm install
if errorlevel 1 (
    echo [ERRO] pnpm install falhou.
    pause
    exit /b 1
)

REM --- 6. Gera o Prisma Client e aplica as migrations ---------------------
echo.
echo Gerando Prisma Client...
call pnpm db:generate
if errorlevel 1 (
    echo [ERRO] Falha ao gerar o Prisma Client.
    pause
    exit /b 1
)

echo Aplicando migrations no banco...
call pnpm db:migrate:deploy
if errorlevel 1 (
    echo [ERRO] Falha ao aplicar as migrations. Confira a DATABASE_URL em .env.
    pause
    exit /b 1
)

REM --- 7. Pergunta se quer popular com dados reais -------------------------
echo.
set /p RODAR_SYNC="Popular o banco agora com dados reais (Camara/Senado/TSE)? [s/N] "
if /i "%RODAR_SYNC%"=="s" (
    echo Rodando sincronizacao inicial, isso pode levar alguns minutos...
    call pnpm sync
)

REM --- 8. Sobe API e Frontend em janelas separadas -------------------------
echo.
echo Subindo API em http://localhost:3333 ...
start "Vigia-Gov API" cmd /k "cd /d %~dp0 && pnpm dev:api"

timeout /t 3 /nobreak >nul

echo Subindo Frontend em http://localhost:5173 ...
start "Vigia-Gov Web" cmd /k "cd /d %~dp0 && pnpm dev:web"

timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ================================================================
echo  Tudo no ar:
echo    API ......... http://localhost:3333
echo    Frontend .... http://localhost:5173
echo.
echo  Duas janelas novas foram abertas com os logs da API e do Web.
echo  Feche-as (ou rode stop-local.bat) quando terminar de testar.
echo ================================================================
echo.
pause
