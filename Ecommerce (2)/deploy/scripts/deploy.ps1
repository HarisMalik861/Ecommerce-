# PowerShell wrapper that runs the bash deploy scripts via Git Bash.
# Requires: Git for Windows installed (provides bash + rsync + ssh).
#
# Usage:
#   .\deploy\scripts\deploy.ps1 ssh
#   .\deploy\scripts\deploy.ps1 copy app
#   .\deploy\scripts\deploy.ps1 copy backend
#   .\deploy\scripts\deploy.ps1 build
#   .\deploy\scripts\deploy.ps1 init-db
#   .\deploy\scripts\deploy.ps1 deploy
#   .\deploy\scripts\deploy.ps1 logs
#   .\deploy\scripts\deploy.ps1 all

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet('ssh', 'copy', 'build', 'init-db', 'deploy', 'logs', 'all')]
  [string]$Command,

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
  Write-Error 'bash.exe not found. Install Git for Windows or run scripts from Git Bash / WSL directly.'
  exit 1
}

$scriptDir = Split-Path -Parent $PSCommandPath
$target    = Join-Path $scriptDir "$Command.sh"

if (-not (Test-Path $target)) {
  Write-Error "Script not found: $target"
  exit 1
}

# Convert Windows path to bash path: C:\foo -> /c/foo
$bashPath = $target -replace '\\', '/' -replace '^([A-Za-z]):', '/$1'.ToLower()
$bashPath = $bashPath.Substring(0, 2).ToLower() + $bashPath.Substring(2)

& $bash -lc "$bashPath $($Args -join ' ')"
exit $LASTEXITCODE
