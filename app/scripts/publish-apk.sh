#!/bin/sh
# Puts a finished APK on the website: sh scripts/publish-apk.sh <file.apk>
# Then deploy (../deploy.sh). Only the newest is kept there.
set -e
APK="$1"
[ -f "$APK" ] || { echo "Which file? sh scripts/publish-apk.sh <file.apk>" >&2; exit 1; }
VERSION=$(node -p "require('./app.json').expo.version")
FILE="peppercorn-$VERSION.apk"
OUT=../website/public/download
BYTES=$(stat -f %z "$APK")
# Vercel takes 100 MB in all from the command line, and the rest of the site needs some of it.
[ "$BYTES" -lt 80000000 ] || { echo "Too large for the website: $BYTES bytes" >&2; exit 1; }
mkdir -p "$OUT"
rm -f "$OUT"/*.apk
cp "$APK" "$OUT/$FILE"
printf '{ "version": "%s", "file": "%s", "bytes": %s, "sha256": "%s" }\n' "$VERSION" "$FILE" "$BYTES" "$(shasum -a 256 "$APK" | cut -d ' ' -f 1)" > ../website/src/lib/release.json
cat ../website/src/lib/release.json
