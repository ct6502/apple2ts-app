# GitHub Actions Setup Guide

This document explains how to set up automated building and publishing of your Apple2TS app using GitHub Actions.

## Workflows Created

1. **Build and Test** (`.github/workflows/build.yml`)
   - Triggers on every push to `main`/`develop` branches and pull requests
   - Builds unsigned versions for testing
   - Uploads build artifacts

2. **Build and Release** (`.github/workflows/release.yml`)
   - Triggers when you create a version tag (e.g., `v1.0.0`)
   - Can be manually triggered from GitHub UI
   - Builds signed versions (if certificates are configured)
   - Publishes to GitHub Releases

## Quick Start (Unsigned Builds)

The workflows will work immediately for unsigned builds:

1. Push code to trigger builds
2. Create a version tag to trigger releases:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

## Setting Up Code Signing (Optional but Recommended)

To enable automatic code signing, you need to add secrets to your GitHub repository.

### Repository Secrets Setup

Go to your GitHub repository → Settings → Secrets and variables → Actions

### For macOS Code Signing

Add these secrets:

#### `APPLE_CERTIFICATE`
```bash
# Export your Developer ID certificate from Keychain as .p12
# Then convert to base64:
base64 -i YourCertificate.p12 | pbcopy
# Paste the result as the secret value
```

#### `APPLE_CERTIFICATE_PASSWORD`
The password you used when exporting the .p12 certificate

#### `APPLE_ID`
Your Apple ID email address (e.g., `your-email@example.com`)

#### `APPLE_ID_PASSWORD`
Your app-specific password (not your regular Apple ID password):
1. Go to https://appleid.apple.com
2. Sign in and go to Security section
3. Generate an app-specific password
4. Use that password here

#### `APPLE_TEAM_ID`
Your 10-character Apple Developer Team ID:
```bash
# Find it with:
security find-identity -v -p codesigning
# Or check your Apple Developer account
```

### For Windows Code Signing (Optional)

If you have a Windows code signing certificate:

#### `WINDOWS_CERTIFICATE`
```bash
# Convert your .p12/.pfx certificate to base64:
base64 -i YourWindowsCertificate.p12 | pbcopy
# Or on Windows:
certutil -encode YourCertificate.p12 temp.txt
# Copy the content between BEGIN/END lines
```

#### `WINDOWS_CERTIFICATE_PASSWORD`
The password for your Windows certificate

## Usage

### Automatic Builds
- Every push to `main` or `develop` triggers a build
- Pull requests also trigger builds
- Build artifacts are uploaded and available for download

### Creating Releases
1. **Tag-based release** (recommended):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Manual release**:
   - Go to Actions tab in GitHub
   - Select "Build and Release" workflow
   - Click "Run workflow"

### Version Numbering
The version number comes from your `package.json`. Update it before creating tags:
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0  
npm version major  # 1.0.0 → 2.0.0
git push origin main
git push origin --tags
```

## Troubleshooting

### Build Fails
- Check the Actions tab for detailed logs
- Ensure all dependencies are in `package.json`
- Verify the Apple2TS download script works

### Code Signing Fails
- Verify all secrets are set correctly
- Check that certificate hasn't expired
- Ensure Team ID matches your certificate

### Notarization Fails
- Verify Apple ID and app-specific password
- Check that Team ID is correct
- Review Apple's notarization logs

## Security Notes

- Never commit certificates or passwords to your repository
- Use GitHub secrets for all sensitive data
- App-specific passwords are safer than your main Apple ID password
- Certificates should be exported with strong passwords

## Manual Override

If you need to build locally without the automated system:
```bash
# Build unsigned (no certificates needed)
npm run make:unsigned

# Build signed (requires local certificates)
npm run make

# Publish unsigned
npm run publish:unsigned

# Publish signed
npm run publish
```