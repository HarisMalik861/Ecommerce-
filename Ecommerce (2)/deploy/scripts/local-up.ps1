# Deprecated: use self-deploy.ps1 (tunnel authorized first).
& (Join-Path (Split-Path -Parent $PSCommandPath) 'self-deploy.ps1') @args
exit $LASTEXITCODE
