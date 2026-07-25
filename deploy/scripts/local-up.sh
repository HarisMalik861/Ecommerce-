#!/usr/bin/env bash
# Deprecated: use self-deploy.sh (tunnel authorized first).
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/self-deploy.sh" "$@"
