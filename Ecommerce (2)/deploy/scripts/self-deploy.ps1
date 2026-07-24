# Single local deployment script (PowerShell wrapper).
# Cloudflare Tunnel is authorized first, then the app stack is deployed.
#
# Usage:
#   .\deploy\scripts\self-deploy.ps1
#   .\deploy\scripts\self-deploy.ps1 --no-build
#   .\deploy\scripts\self-deploy.ps1 --seed-admin
#   .\deploy\scripts\self-deploy.ps1 --skip-tunnel

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

$bashCandidates = @(
  'C:\Program Files\Git\bin\bash.exe',
  'C:\Program Files (x86)\Git\bin\bash.exe',
  "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
)

$bash = $null
foreach ($candidate in $bashCandidates) {
  if (Test-Path $candidate) { $bash = $candidate; break }
}

if (-not $bash) {
  $bash = (Get-Command bash -ErrorAction SilentlyContinue).Source
}

if (-not $bash) {
  Write-Error 'bash.exe not found. Install Git for Windows or run deploy/scripts/self-deploy.sh from Git Bash.'
  exit 1
}

$scriptDir = Split-Path -Parent $PSCommandPath
$target    = Join-Path $scriptDir 'self-deploy.sh'

if (-not (Test-Path $target)) {
  Write-Error "Script not found: $target"
  exit 1
}

$bashPath = $target -replace '\\', '/' -replace '^([A-Za-z]):', '/$1'.ToLower()
$bashPath = $bashPath.Substring(0, 2).ToLower() + $bashPath.Substring(2)

& $bash -lc "$bashPath $($Args -join ' ')"
exit $LASTEXITCODE
