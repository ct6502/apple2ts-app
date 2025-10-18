# Building Branded Apps with GitHub Actions

This guide explains how to build branded versions of Apple2TS using GitHub Actions.

## Overview

There are two main workflows for building the app:

1. **Build and Release** (`build_release.yml`) - Main workflow for releases and standard builds
2. **Build Branded App** (`build_branded.yml`) - Dedicated workflow for building custom branded versions

## Building a Branded App (Recommended Method)

### Using the Build Branded App Workflow

This is the easiest way to build a branded version of the app.

1. **Navigate to Actions**
   - Go to your repository on GitHub
   - Click the "Actions" tab

2. **Select the Workflow**
   - Find "Build Branded App" in the left sidebar
   - Click on it

3. **Run the Workflow**
   - Click "Run workflow" button (top right)
   - Fill in the inputs:
     - **Asset folder name**: Enter the folder name (e.g., `noxarchaist`, `default`)
   - Click "Run workflow"

4. **Download Your Build**
   - Wait for the workflow to complete (about 5-10 minutes)
   - Scroll down to "Artifacts" section
   - Download your branded app:
     - `noxarchaist-macos-arm64` (for macOS)
     - `noxarchaist-windows-x64` (for Windows)
     - `noxarchaist-linux-x64` (for Linux)

### Example: Building Nox Archaist

```
Asset folder name: noxarchaist
Skip code signing: false (or true for testing)
```

This will:
- Build "Nox Archaist.app" (not "Apple2TS.app")
- Use all assets from `assets/noxarchaist/`
- Include Nox Archaist icons, splash screen, and branding
- Create platform-specific installers

## Building with Main Workflow

The main `build_release.yml` workflow also supports branded builds:

### For Tagged Releases

When you create a release tag, you can specify the configuration:

```bash
# Build and release Nox Archaist version
APPLE2TS_CONFIG=noxarchaist git tag -a v1.0.0-noxarchaist -m "Nox Archaist v1.0.0"
git push origin v1.0.0-noxarchaist
```

### For Manual Builds

1. Go to Actions → "Build and Release"
2. Click "Run workflow"
3. Select the branch
4. Enter configuration: `noxarchaist` (or leave blank for default)
5. Click "Run workflow"

## Configuration Options

The `APPLE2TS_CONFIG` environment variable controls which branding to use:

- `default` or empty - Standard Apple2TS branding
- `noxarchaist` - Nox Archaist branding
- `yourgame` - Custom game branding (must have `assets/yourgame/` folder)

## What Gets Built

When you specify a configuration like `noxarchaist`, the build process:

1. **Uses branded icons**
   - App bundle icon: `assets/noxarchaist/MacOS.icns`
   - Windows icon: `assets/noxarchaist/Windows.ico`
   - Runtime icon: `assets/noxarchaist/App.png`

2. **Applies branding**
   - Splash screen: `assets/noxarchaist/splash.jpg`
   - Header image: `assets/noxarchaist/Header.png`
   - Configuration: `assets/noxarchaist/config.json`

3. **Names the app**
   - macOS: "Nox Archaist.app" (from config.json `name` field)
   - Windows: "Nox Archaist.exe"
   - Menu items: "About Nox Archaist", "Quit Nox Archaist", etc.

4. **Outputs to**
   - `out/Nox Archaist-darwin-arm64/`
   - `out/Nox Archaist-win32-x64/`
   - `out/Nox Archaist-linux-x64/`

## Artifact Naming

Build artifacts are named based on the configuration:

- **Default build**: `build-artifacts-macos-latest`
- **Branded build**: `noxarchaist-macos-arm64`

This makes it easy to identify which build is which.

## Code Signing

### Signed Builds (Production)

For distribution, builds should be signed:

- **macOS**: Requires Apple Developer certificate and credentials
- **Windows**: Requires code signing certificate

Secrets needed:
- `APPLE_CERTIFICATE` (macOS)
- `APPLE_CERTIFICATE_PASSWORD` (macOS)
- `APPLE_ID` (macOS)
- `APPLE_ID_PASSWORD` (macOS)
- `APPLE_TEAM_ID` (macOS)
- `WINDOWS_CERTIFICATE` (Windows)
- `WINDOWS_CERTIFICATE_PASSWORD` (Windows)

## Local Development

To test branded builds locally before running in CI:

```bash
# Build Nox Archaist version
APPLE2TS_CONFIG=noxarchaist npm run package

# Test it
open "out/Nox Archaist-darwin-arm64/Nox Archaist.app"

# Create distributable
APPLE2TS_CONFIG=noxarchaist npx electron-forge make
```

## Troubleshooting

### Build fails with "Asset folder not found"

**Solution**: Make sure the asset folder exists in `assets/` and contains all required files:
- `config.json`
- `MacOS.icns`
- `Windows.ico`
- `App.png`
- `splash.jpg`
- `Header.png`

### Build succeeds but uses wrong branding

**Solution**: Check that `APPLE2TS_CONFIG` is set correctly. Look for this line in the build logs:
```
🎨 Building with configuration: noxarchaist
```

### Icons don't show up correctly

**Solution**: 
1. Verify icon files are correct format and size
2. Rebuild after updating icons
3. Check the build logs for icon-related errors

### "config.json not found" error

**Solution**: Ensure `assets/yourgame/config.json` exists and is valid JSON.

## Best Practices

1. **Test locally first** - Always test `APPLE2TS_CONFIG=yourgame npm run package` locally before running in CI

2. **Use descriptive names** - Asset folder names should be lowercase with no spaces (e.g., `noxarchaist`, `mygame`)

3. **Version your assets** - Commit asset changes to git so builds are reproducible

4. **Document your config** - Add a README in each asset folder explaining the game-specific configuration

5. **Test on all platforms** - Use the GitHub Actions workflow to build for macOS, Windows, and Linux

## Examples

### Building Multiple Games

You can build different branded versions from the same repository:

```bash
# Build Nox Archaist
APPLE2TS_CONFIG=noxarchaist npm run package

# Build another game
APPLE2TS_CONFIG=anothergame npm run package

# Build default Apple2TS
npm run package
```

### Automated Release Workflow

For releasing a branded version:

1. Update version in `assets/noxarchaist/config.json`
2. Commit changes
3. Create and push tag: `git tag v1.0.0-noxarchaist && git push --tags`
4. GitHub Actions builds and creates release automatically
5. Download and distribute the branded installers

## Related Documentation

- [Asset Configuration Guide](../../assets/README.md) - How to create game asset folders
- [Main README](../../README.md) - General project documentation
- [Code Signing Guide](../../CODE_SIGNING.md) - Setting up certificates

---

**Need Help?**

If you encounter issues:
1. Check the build logs in GitHub Actions
2. Review the [Asset Configuration Guide](../../assets/README.md)
3. Open an issue on GitHub
