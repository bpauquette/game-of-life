#!/bin/bash
# Build with minification disabled for debugging
DISABLE_ESLINT_PLUGIN=true \
GENERATE_SOURCEMAP=true \
TERSER_ENABLED=false \
npm run build
