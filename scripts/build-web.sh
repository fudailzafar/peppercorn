#!/bin/sh
# Export the web build and make it deployable to Vercel, which skips any path containing "node_modules".
set -e
rm -rf dist
npx expo export -p web
# pnpm nests a second node_modules inside .pnpm (also skipped), so both levels go:
# assets/node_modules/.pnpm/<pkg>/node_modules/... becomes assets/vendor/<pkg>/...
mv dist/assets/node_modules dist/assets/vendor
for dir in dist/assets/vendor/.pnpm/*/; do
  mv "${dir}node_modules" "dist/assets/vendor/$(basename "$dir")"
done
rm -rf dist/assets/vendor/.pnpm
grep -rlE "assets/node_modules" dist | xargs sed -i '' -E 's#assets/node_modules/\.pnpm/([^/"]+)/node_modules/#assets/vendor/\1/#g; s#assets/node_modules#assets/vendor#g'
if find dist -path '*node_modules*' | grep -q .; then echo "dist still has a node_modules path" >&2; exit 1; fi
# /metals passes on the gold and silver rate page, which browsers may not read from another site (src/data/app.ts).
# Its headers stop that page's scripts from running here, where people's entries are stored, if someone opens it directly.
cat > dist/vercel.json <<'JSON'
{
  "cleanUrls": true,
  "rewrites": [{ "source": "/metals", "destination": "https://www.livechennai.com/gold_silverrate.asp" }],
  "headers": [
    {
      "source": "/metals",
      "headers": [
        { "key": "Content-Security-Policy", "value": "sandbox; default-src 'none'" },
        { "key": "Content-Disposition", "value": "attachment" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Robots-Tag", "value": "noindex" }
      ]
    }
  ]
}
JSON
# Re-link dist/ to the existing Vercel project (dist is wiped on every build).
mkdir -p dist/.vercel
cp deploy/vercel-project.json dist/.vercel/project.json
