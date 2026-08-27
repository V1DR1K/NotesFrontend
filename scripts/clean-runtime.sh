#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_root="${SITES_RUNTIME_ROOT:-${project_root}/.sites-runtime}"

rm -rf \
  "${runtime_root}/npm-cache" \
  "${runtime_root}/preflight" \
  "${runtime_root}/tmp" \
  "${runtime_root}/wrangler/logs"

mkdir -p \
  "${runtime_root}/npm-cache" \
  "${runtime_root}/tmp" \
  "${runtime_root}/wrangler/logs"

echo "[sites] cleaned generated runtime data under ${runtime_root}"
