#!/bin/bash
set -e

# Build the project
npm run build:cf

# Create a clean deployment directory
rm -rf deploy-output
mkdir -p deploy-output

# Copy static assets
cp -r .open-next/assets/* deploy-output/

# Copy worker script
cp .open-next/worker.js deploy-output/_worker.js

# Copy runtime dependencies required by _worker.js
# Note: These are referenced as ./server-functions/..., ./.build/..., etc.
cp -r .open-next/server-functions deploy-output/
cp -r .open-next/.build deploy-output/
cp -r .open-next/middleware deploy-output/
cp -r .open-next/cloudflare deploy-output/
cp -r .open-next/cache deploy-output/ || true


# Helper: Patch handler.mjs to remove dangerous eval call (OpenNext/Next.js polyfill workaround)
# -0777 enables slurp mode to handle multi-line regex matches if needed
perl -0777 -pi -e 's/eval\("quire"\.replace\(\/\^\/,"re"\)\)/\(function\(\)\{throw new Error\("No require"\)\}\)/g' deploy-output/server-functions/default/handler.mjs

# Helper: Patch handler.mjs to remove new Function call
# Replaces "new Function" constructor globally with a factory that returns a no-op function.
perl -0777 -pi -e 's/\bnew Function\b/\(function\(\)\{return function\(\)\{\}\}\)/g' deploy-output/server-functions/default/handler.mjs

# Patch bare Function("return this") — common globalThis polyfill (lodash etc)
perl -0777 -pi -e 's/Function\("return this"\)/\(function\(\)\{return globalThis\}\)/g' deploy-output/server-functions/default/handler.mjs

# Patch bare Function.apply(null,...) — dynamic code generation
perl -0777 -pi -e 's/(?<![.\w])Function\.apply\(/\(function\(\)\{return function\(\)\{\}\}\)\.apply\(/g' deploy-output/server-functions/default/handler.mjs

# Patch remaining bare Function( used as constructor (e.g. Function(r2))
perl -0777 -pi -e 's/(?<![.\w])Function\((?!"return this")/\(function\(\)\{return function\(\)\{\}\}\)\(/g' deploy-output/server-functions/default/handler.mjs

echo "Deployment package prepared in deploy-output/"
