#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$TARGET_DIR/blog-posts" "$TARGET_DIR/img"

for file in index.html home.css home.js projects.html blog.html privacy.html cookies-policy.html pages.css pages.js; do
  cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
  printf 'Updated %s\n' "$TARGET_DIR/$file"
done

for file in "$SOURCE_DIR"/blog-posts/*.html; do
  cp "$file" "$TARGET_DIR/blog-posts/"
  printf 'Updated %s\n' "$TARGET_DIR/blog-posts/$(basename "$file")"
done

for file in favicon.svg favicon-96x96.png favicon.ico apple-touch-icon.png icon-512.png site.webmanifest; do
  cp "$SOURCE_DIR/img/$file" "$TARGET_DIR/img/$file"
  printf 'Updated %s\n' "$TARGET_DIR/img/$file"
done

printf '\nExisting repository assets retained: img/me.jpg, img/og-image.jpg, resJanJedrzejakCV.pdf and cookie/.\n'
