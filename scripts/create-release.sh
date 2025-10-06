#!/bin/bash

# Apple2TS Release Script
# Automates the process of creating new releases

set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "🚀 Apple2TS Release Creator"
echo "=========================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Working directory has uncommitted changes"
    echo "Please commit or stash your changes first"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: v$CURRENT_VERSION"

# Ask for release type
echo ""
echo "Select release type:"
echo "1) Patch (bug fixes)     - $CURRENT_VERSION → $(npm version --preid=beta patch --dry-run 2>/dev/null | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+')"
echo "2) Minor (new features)  - $CURRENT_VERSION → $(npm version --preid=beta minor --dry-run 2>/dev/null | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+')"
echo "3) Major (breaking)      - $CURRENT_VERSION → $(npm version --preid=beta major --dry-run 2>/dev/null | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+')"
echo "4) Custom version"
echo "5) Cancel"

read -p "Choice (1-5): " choice

case $choice in
    1)
        RELEASE_TYPE="patch"
        ;;
    2)
        RELEASE_TYPE="minor"
        ;;
    3)
        RELEASE_TYPE="major"
        ;;
    4)
        read -p "Enter custom version (e.g., 1.2.3): " CUSTOM_VERSION
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "❌ Invalid version format. Use semantic versioning (e.g., 1.2.3)"
            exit 1
        fi
        RELEASE_TYPE="--new-version $CUSTOM_VERSION"
        ;;
    5)
        echo "❌ Release cancelled"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Update version
echo ""
echo "📝 Updating version..."
if [ "$choice" = "4" ]; then
    npm version $CUSTOM_VERSION --no-git-tag-version
    NEW_VERSION=$CUSTOM_VERSION
else
    NEW_VERSION=$(npm version $RELEASE_TYPE --no-git-tag-version | sed 's/v//')
fi

echo "✅ Version updated to: v$NEW_VERSION"

# Ask for release notes
echo ""
read -p "📝 Enter release notes (optional): " RELEASE_NOTES

# Commit version change
echo ""
echo "💾 Committing version change..."
git add package.json package-lock.json
git commit -m "chore: bump version to v$NEW_VERSION"

# Create and push tag
echo "🏷️  Creating tag..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION${RELEASE_NOTES:+

$RELEASE_NOTES}"

echo "📤 Pushing changes..."
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "🎉 Release v$NEW_VERSION created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check GitHub Actions for build progress:"
echo "   https://github.com/ct6502/apple2ts-app/actions"
echo ""
echo "2. Once builds complete, the release will be available at:"
echo "   https://github.com/ct6502/apple2ts-app/releases/tag/v$NEW_VERSION"
echo ""
echo "3. If builds fail, you can:"
echo "   - Check the Actions logs for errors"
echo "   - Re-run failed jobs from the GitHub UI"
echo "   - Build locally with: npm run make"