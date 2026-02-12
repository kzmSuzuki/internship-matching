#!/bin/bash
# Patch handler.mjs to replace Function() calls that are disallowed in Cloudflare Workers
# These calls come from styled-jsx's PostCSS runtime and lodash's globalThis polyfill

HANDLER=".open-next/server-functions/default/handler.mjs"

if [ ! -f "$HANDLER" ]; then
  echo "ERROR: handler.mjs not found at $HANDLER"
  exit 1
fi

echo "Patching handler.mjs to remove disallowed Function() calls..."

# 1. Replace Function("return this")() -> globalThis
#    Used by lodash and other libraries as a globalThis polyfill
perl -pi -e 's/Function\("return this"\)\(\)/globalThis/g' "$HANDLER"

# 2. Replace eval("quire".replace(/^/,"re")) -> (function(){throw new Error("No require")})
#    Used as a dynamic require polyfill
perl -pi -e 's/eval\("quire"\.replace\(\/\^\/,"re"\)\)/\(function\(\)\{throw new Error\(\"No require\"\)\}\)/g' "$HANDLER"

# 3. Replace new Function(...) constructor -> factory returning function that returns empty object {}
#    This prevents "Cannot convert undefined or null to object" errors if the caller expects an object
perl -pi -e 's/\bnew Function\b/\(function\(\)\{return function\(\)\{return\{\}\}\}\)/g' "$HANDLER"

# 4. Replace Function.apply(null,h).apply(null,i) -> safe no-op
#    Used by CJS module loader in PostCSS bundle
perl -pi -e 's/(?<![.\w])Function\.apply\(/\(function\(\)\{return function\(\)\{return\{\}\}\}\)\.apply\(/g' "$HANDLER"

# 5. Replace remaining bare Function(variable)() -> no-op
#    Used by CJS module loader to evaluate module code strings
perl -pi -e 's/(?<![.\w])Function\(([a-zA-Z0-9_]+)\)\(\)/\(function\(\)\{return\{\}\}\)\(\)/g' "$HANDLER"

# 6. Patch 'merge' utility function to prevent crash on null/undefined source
#    Fixes "TypeError: Cannot convert undefined or null to object" when deep merging objects
perl -pi -e 's/function i\(e2,t2,r2\)\{for\(var n2=Object\.keys\(t2\)/function i(e2,t2,r2){if(!t2)return e2;for(var n2=Object.keys(t2)/g' "$HANDLER"

echo "Patching complete!"
# Verify no remaining problematic patterns
REMAINING=$(grep -oP '(?<![.\w])Function\s*\(' "$HANDLER" | wc -l)
echo "Remaining Function( calls: $REMAINING"
