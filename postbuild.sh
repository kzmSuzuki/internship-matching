#!/bin/bash
# Generate dummy .nft.json files for API routes to fix OpenNext build error
# Error: ENOENT: no such file or directory, stat .../.nft.json

echo "Generating dummy .nft.json for App Router API routes..."
find .next/server/app/api -name "route.js" -exec sh -c 'echo "{\"version\":1,\"files\":[]}" > "${1}.nft.json"' _ {} \;
echo "Done."
