#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-8000}"

echo "Serving Resume app at http://localhost:${PORT}"
PORT="${PORT}" node server.js
