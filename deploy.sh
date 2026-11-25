#!/bin/sh
# Builds the app for the browser, puts it in the website, and deploys both.
set -e
cd "$(dirname "$0")"
(cd app && sh scripts/build-web.sh)
(cd website && vercel deploy --prod --yes)
