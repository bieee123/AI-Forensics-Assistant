@echo off
:: =============================================================================
::  DFA Remote Deploy — trigger VPS deploy from local Windows
::  Usage: deploy-remote.bat
:: =============================================================================

set VPS=dfa-admin@AI-Agentic
set VPS_PATH=~/ai-forensics-assistant

echo [PUSH] Pushing latest to GitHub...
git push origin main

echo.
echo [DEPLOY] Triggering deploy on VPS...
ssh %VPS% "cd %VPS_PATH% && chmod +x deploy.sh && ./deploy.sh"

echo.
echo Done.
pause
