#!/bin/sh
# Export the web build and make it deployable to Vercel, which skips any path containing "node_modules".
set -e
rm -rf dist
npx expo export -p web
mv dist/assets/node_modules dist/assets/vendor
grep -rl "assets/node_modules" dist | xargs sed -i '' 's#assets/node_modules#assets/vendor#g'
echo '{ "cleanUrls": true }' > dist/vercel.json
# Re-link dist/ to the existing Vercel project (dist is wiped on every build).
mkdir -p dist/.vercel
cp deploy/vercel-project.json dist/.vercel/project.json
