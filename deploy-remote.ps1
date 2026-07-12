# =============================================================================
#  DFA Remote Deploy — trigger VPS pull/deploy from local Windows PowerShell
#  Usage: .\deploy-remote.ps1
# =============================================================================

$VPS = if ($env:VPS) { $env:VPS } else { "dfa-admin@AI-Agentic" }
$VPS_PATH = if ($env:VPS_PATH) { $env:VPS_PATH } else { "~/ai-forensics-assistant" }

Write-Host "[PUSH] Pushing latest local changes to GitHub..." -ForegroundColor Green
git push origin main

Write-Host ""
Write-Host "[DEPLOY] Logging into VPS via SSH and triggering update..." -ForegroundColor Green
ssh $VPS "cd $VPS_PATH && chmod +x update-vps.sh && ./update-vps.sh"

Write-Host ""
Write-Host "Remote deployment finished." -ForegroundColor Green
