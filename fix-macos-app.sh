#!/bin/bash

# Apple2TS App Fixer for macOS
# This script removes the quarantine attribute that causes the "damaged app" error

echo "🍎 Apple2TS macOS App Fixer"
echo "=========================="

# Find Apple2TS.app in common locations
APP_PATH=""

# Check Downloads folder
if [ -d "$HOME/Downloads/Apple2TS.app" ]; then
    APP_PATH="$HOME/Downloads/Apple2TS.app"
elif [ -d "$HOME/Desktop/Apple2TS.app" ]; then
    APP_PATH="$HOME/Desktop/Apple2TS.app"
elif [ -d "/Applications/Apple2TS.app" ]; then
    APP_PATH="/Applications/Apple2TS.app"
else
    echo "❓ Apple2TS.app not found in common locations."
    echo "Please drag and drop the Apple2TS.app file onto this script, or run:"
    echo "xattr -d com.apple.quarantine /path/to/Apple2TS.app"
    exit 1
fi

echo "📍 Found Apple2TS.app at: $APP_PATH"

# Remove quarantine attribute
echo "🔓 Removing quarantine attribute..."
xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Success! Apple2TS.app should now open without the 'damaged' error."
    echo "🚀 You can now double-click the app to run it."
else
    echo "⚠️  The app may already be fixed, or you may need to run this with sudo:"
    echo "   sudo xattr -d com.apple.quarantine '$APP_PATH'"
fi

echo ""
echo "💡 Tip: If you continue to have issues, right-click the app,"
echo "   select 'Open', then click 'Open' in the security dialog."