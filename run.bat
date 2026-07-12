@echo off
setlocal enabledelayedexpansion
:: =============================================================================
::  DFA — Digital Forensics Assistant | VPS Deployment (Windows)
::  Usage: run.bat               [deploy: pull + build + restart services]
::         run.bat setup         [first-time full setup]
::         run.bat build         [pull + build only, no restart]
:: =============================================================================

title DFA Deployment

:: ── Config ──
set "PROJECT_DIR=%~dp0"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=3000"

:: ── Colors (PowerShell) ──
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

:: ── Jump to mode ──
if /i "%~1"=="setup"  goto :SETUP
if /i "%~1"=="build"  goto :BUILD
if /i "%~1"=="-h"     goto :HELP
if /i "%~1"=="--help" goto :HELP
goto :DEPLOY

:: =============================================================================
:HELP
echo Usage: run.bat [setup^|build^|-h]
echo.
echo   (no flag)   Full deploy: pull + install + build + restart
echo   setup       First-time setup: clone, env, deps, DB, build, PM2
echo   build       Pull + rebuild only (no restart)
echo   -h          This help
exit /b 0

:: =============================================================================
:SETUP
echo %BLUE%=========================================%NC%
echo %BLUE%  DFA First-Time VPS Setup (Windows)%NC%
echo %BLUE%=========================================%NC%

:: --- Check tools ---
echo %BLUE%[CHECK]%NC% Checking dependencies...
where python >nul 2>&1 || ( echo %RED%python not installed%NC% & exit /b 1 )
where node >nul 2>&1 || ( echo %RED%node not installed%NC% & exit /b 1 )
where npm >nul 2>&1 || ( echo %RED%npm not installed%NC% & exit /b 1 )
where git >nul 2>&1 || ( echo %RED%git not installed%NC% & exit /b 1 )
echo %GREEN%[OK]%NC% All tools found

:: --- Environment files ---
echo %BLUE%[ENV]%NC% Setting up environment files...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo %YELLOW%[WARN]%NC% Created backend\.env from template — EDIT IT: notepad backend\.env
) else (
    echo %GREEN%[OK]%NC% backend\.env exists
)
if not exist "frontend\.env.local" (
    copy "frontend\.env.example" "frontend\.env.local" >nul
    echo %YELLOW%[WARN]%NC% Created frontend\.env.local — EDIT IF NEEDED
) else (
    echo %GREEN%[OK]%NC% frontend\.env.local exists
)

:: --- Backend venv ---
echo %BLUE%[BACKEND]%NC% Setting up Python venv...
cd /d "%PROJECT_DIR%backend"
if not exist "venv\Scripts\activate.bat" (
    python -m venv venv
    echo %GREEN%[OK]%NC% venv created
) else (
    echo %GREEN%[OK]%NC% venv exists
)
call venv\Scripts\activate.bat
pip install --upgrade pip -q
pip install -r requirements.txt
echo %GREEN%[OK]%NC% Python dependencies installed

:: --- Frontend deps ---
echo %BLUE%[FRONTEND]%NC% Installing Node dependencies...
cd /d "%PROJECT_DIR%frontend"
call npm install
echo %GREEN%[OK]%NC% Node dependencies installed

:: --- Frontend build ---
echo %BLUE%[BUILD]%NC% Building frontend...
call npm run build
echo %GREEN%[OK]%NC% Frontend built

cd /d "%PROJECT_DIR%"

:: --- Start services ---
echo %BLUE%[START]%NC% Starting services...
start "DFA-Backend" cmd /c "cd /d %PROJECT_DIR%backend && venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT%"
echo %GREEN%[OK]%NC% Backend started on :%BACKEND_PORT%

start "DFA-Frontend" cmd /c "cd /d %PROJECT_DIR%frontend && npx next start --port %FRONTEND_PORT%"
echo %GREEN%[OK]%NC% Frontend started on :%FRONTEND_PORT%

echo.
echo %BLUE%=========================================%NC%
echo %GREEN%  SETUP COMPLETE%NC%
echo %BLUE%=========================================%NC%
echo %BLUE%  Backend  : http://localhost:%BACKEND_PORT%%NC%
echo %BLUE%  Frontend : http://localhost:%FRONTEND_PORT%%NC%
echo %BLUE%=========================================%NC%
echo %YELLOW%  NEXT: Edit backend\.env with DB credentials%NC%
echo %YELLOW%        notepad %PROJECT_DIR%backend\.env%NC%
echo %BLUE%=========================================%NC%
pause
exit /b 0

:: =============================================================================
:BUILD
cd /d "%PROJECT_DIR%"

echo %BLUE%[PULL]%NC% Pulling latest changes...
git pull origin main
echo %GREEN%[OK]%NC% Git pull done

echo %BLUE%[DEPS]%NC% Installing frontend dependencies...
cd /d "%PROJECT_DIR%frontend"
call npm install
echo %GREEN%[OK]%NC% Dependencies up to date

echo %BLUE%[BUILD]%NC% Building frontend...
call npm run build
echo %GREEN%[OK]%NC% Frontend built

cd /d "%PROJECT_DIR%"
echo %GREEN%BUILD DONE — run 'run.bat' to restart services%NC%
exit /b 0

:: =============================================================================
:DEPLOY
cd /d "%PROJECT_DIR%"

:: ── Pull ──
echo %BLUE%[PULL]%NC% Pulling latest changes...
git pull origin main
echo %GREEN%[OK]%NC% Git pull done

:: ── Backend deps ──
echo %BLUE%[BACKEND]%NC% Checking backend dependencies...
cd /d "%PROJECT_DIR%backend"
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    pip install -r requirements.txt -q
    echo %GREEN%[OK]%NC% Backend dependencies up to date
) else (
    echo %YELLOW%[WARN]%NC% venv not found — skipping backend deps
)

:: ── Frontend deps + build ──
echo %BLUE%[FRONTEND]%NC% Installing dependencies...
cd /d "%PROJECT_DIR%frontend"
call npm install
echo %GREEN%[OK]%NC% Dependencies up to date

echo %BLUE%[BUILD]%NC% Building frontend...
call npm run build
echo %GREEN%[OK]%NC% Frontend built

cd /d "%PROJECT_DIR%"

:: ── Kill old services ──
echo %BLUE%[RESTART]%NC% Stopping old services...
taskkill /fi "WINDOWTITLE eq DFA-Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq DFA-Frontend" /f >nul 2>&1
:: Also kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo %GREEN%[OK]%NC% Old services stopped

:: ── Start services ──
echo %BLUE%[START]%NC% Starting services...
start "DFA-Backend" cmd /c "cd /d %PROJECT_DIR%backend && venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT%"
echo %GREEN%[OK]%NC% Backend started on :%BACKEND_PORT%

start "DFA-Frontend" cmd /c "cd /d %PROJECT_DIR%frontend && npx next start --port %FRONTEND_PORT%"
echo %GREEN%[OK]%NC% Frontend started on :%FRONTEND_PORT%

echo.
echo %BLUE%=========================================%NC%
echo %GREEN%  DEPLOY COMPLETE%NC%
echo %BLUE%=========================================%NC%
echo %BLUE%  Backend  : http://localhost:%BACKEND_PORT%%NC%
echo %BLUE%  Frontend : http://localhost:%FRONTEND_PORT%%NC%
echo %BLUE%=========================================%NC%
exit /b 0
