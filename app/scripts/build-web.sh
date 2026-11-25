#!/bin/sh
# Builds the browser version to run under /app, and puts it in the website.
set -e
WEB_BASE=/app
export WEB_BASE
OUT=../website/public/app
rm -rf dist "$OUT"
npx expo export -p web
# Vercel skips any path containing "node_modules". pnpm nests a second one inside .pnpm, so both levels go:
# assets/node_modules/.pnpm/<pkg>/node_modules/... becomes assets/vendor/<pkg>/...
mv dist/assets/node_modules dist/assets/vendor
for dir in dist/assets/vendor/.pnpm/*/; do
  mv "${dir}node_modules" "dist/assets/vendor/$(basename "$dir")"
done
rm -rf dist/assets/vendor/.pnpm
grep -rlE "assets/node_modules" dist | xargs sed -i '' -E 's#assets/node_modules/\.pnpm/([^/"]+)/node_modules/#assets/vendor/\1/#g; s#assets/node_modules#assets/vendor#g'
if find dist -path '*node_modules*' | grep -q .; then echo "dist still has a node_modules path" >&2; exit 1; fi
cp -R dist "$OUT"
