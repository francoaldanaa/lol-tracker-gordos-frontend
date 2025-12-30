#!/usr/bin/env bash
set -e

set -a
source /etc/gordos-tracker-frontend.env
set +a

cd /opt/lol-tracker-gordos-frontend
exec pnpm start
