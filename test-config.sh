#!/bin/bash

# Test script to verify Electron Forge configuration
# This helps debug packaging issues before pushing to GitHub Actions

echo "🔧 Testing Electron Forge Configuration"
echo "======================================="

echo "📦 Current package info:"
echo "Name: $(node -p "require('./package.json').name")"
echo "Product Name: $(node -p "require('./package.json').productName")"
echo "Version: $(node -p "require('./package.json').version")"

echo ""
echo "🔍 Checking forge.config.ts..."

# Check if forge config is valid
if npx tsx -e "
try {
  const config = require('./forge.config.ts').default;
  console.log('✅ Forge config loaded successfully');
  console.log('📁 Executable name:', config.packagerConfig?.executableName || 'default');
  console.log('🎯 Makers:', config.makers?.map(m => m.constructor.name).join(', '));
} catch (e) {
  console.error('❌ Forge config error:', e.message);
  process.exit(1);
}
"; then
  echo "✅ Configuration looks good"
else
  echo "❌ Configuration has issues"
  exit 1
fi

echo ""
echo "🧪 Testing package command..."
if npm run package 2>&1 | tee /tmp/package.log; then
  echo "✅ Package command succeeded"
  
  echo ""
  echo "📁 Checking output structure..."
  find out/ -name "*apple2ts*" -o -name "*Apple2TS*" 2>/dev/null | head -10
  
else
  echo "❌ Package command failed"
  echo "📋 Last few lines of output:"
  tail -10 /tmp/package.log
  exit 1
fi

echo ""
echo "🎉 Configuration test complete!"
echo "💡 If this works locally, the GitHub Action should work too."