#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-8000}"

echo "Serving Resume at http://localhost:${PORT}"
python3 -m http.server "${PORT}"
