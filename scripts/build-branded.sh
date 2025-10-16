#!/bin/bash

# Script to build a branded version of Apple2TS
# Usage: ./scripts/build-branded.sh [brand-name]
# Example: ./scripts/build-branded.sh noxarchaist

set -e

BRAND=$1

if [ -z "$BRAND" ]; then
  echo "Usage: $0 <brand-name>"
  echo "Example: $0 noxarchaist"
  echo ""
  echo "Available brands:"
  ls -1 assets/ | grep -v default
  exit 1
fi

CONFIG_SOURCE="assets/$BRAND/config.json"

if [ ! -f "$CONFIG_SOURCE" ]; then
  echo "Error: Config file not found at $CONFIG_SOURCE"
  echo ""
  echo "Available brands:"
  ls -1 assets/ | grep -v default
  exit 1
fi

echo "Building branded version: $BRAND"
echo "Using config from: $CONFIG_SOURCE"

# Copy the brand config to root as apple2ts_config.json
cp "$CONFIG_SOURCE" apple2ts_config.json

echo "✅ Config file created"

# Build the app
echo "Building app..."
npx electron-forge make

echo ""
echo "✅ Build complete!"
echo ""
echo "The packaged app is in: out/Apple2TS-darwin-arm64/"
echo "The distributable is in: out/make/"
echo ""
echo "To create a clean build without branding, delete apple2ts_config.json"
