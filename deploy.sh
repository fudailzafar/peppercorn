#!/bin/sh
# Builds the app for the browser, puts it in the website, and deploys both, with the Android app to download.
set -e
cd "$(dirname "$0")"
# A link to a file that isn't there would be worse than no link.
APK=$(node -p "(require('./website/src/lib/release.json') || {}).file || ''")
[ -z "$APK" ] || [ -f "website/public/download/$APK" ] || { echo "website/public/download/$APK is missing: see app/scripts/publish-apk.sh" >&2; exit 1; }
(cd app && sh scripts/build-web.sh)
(cd website && vercel deploy --prod --yes)
