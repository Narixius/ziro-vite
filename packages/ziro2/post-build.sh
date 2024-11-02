#!/bin/bash

# Find all .d.ts files and replace occurrences (macOS-compatible)
find . -type f -name "*.d.ts" -exec sed -i '' 's/TPath extends never/TPath extends keyof RouteFilesByRouteId/g' {} +
find . -type f -name "*.d.ts" -exec sed -i '' 's/TPath extends string & {}/TPath extends keyof RouteFilesByRouteId/g' {} +

echo "Replacement completed for .d.ts files."
