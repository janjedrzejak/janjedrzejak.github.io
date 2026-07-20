#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for file in index.html home.css home.js; do
  cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
  printf 'Updated %s\n' "$TARGET_DIR/$file"
done
