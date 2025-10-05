# Code Signing Setup for macOS Distribution

To properly distribute your Apple2TS app on macOS without the "damaged" error, you need to set up code signing and notarization. This requires an Apple Developer account ($99/year).

## Prerequisites

1. **Apple Developer Account**: Sign up at https://developer.apple.com
2. **Developer ID Certificate**: Create a "Developer ID Application" certificate in your Apple Developer account
3. **App-Specific Password**: Generate one for notarization

## Setup Steps

### 1. Install Certificates
Download and install your Developer ID Application certificate from the Apple Developer portal to your macOS Keychain.

### 2. Set Environment Variables
Add these to your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
# Apple Developer Credentials for Code Signing
export APPLE_ID="your-apple-id@example.com"
export APPLE_TEAM_ID="YOUR_10_CHAR_TEAM_ID"
export APPLE_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"

# App-specific password for notarization (store in keychain for security)
# Run: security add-generic-password -a "your-apple-id@example.com" -w "your-app-specific-password" -s "Apple ID Password"
export APPLE_ID_PASSWORD="@keychain:Apple ID Password"
```

### 3. Find Your Team ID
```bash
# List available signing identities
security find-identity -v -p codesigning

# Your Team ID is the 10-character string in parentheses
```

### 4. Create App-Specific Password
1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. In the Security section, generate an app-specific password
4. Store it in your keychain:
```bash
security add-generic-password -a "your-apple-id@example.com" -w "your-app-specific-password" -s "Apple ID Password"
```

### 5. Test Code Signing
```bash
npm run make
```

The build process will now:
1. Code sign your app with your Developer ID
2. Upload to Apple for notarization
3. Staple the notarization ticket to your app
4. Create a properly signed, notarized app that users can run without issues

## Alternative: Self-Signed Certificate (Development Only)

For development/testing without an Apple Developer account, you can create a self-signed certificate:

```bash
# Create a self-signed certificate
security create-certificate -p \
  -c "Apple2TS Developer" \
  -k ~/Library/Keychains/login.keychain-db \
  -S /System/Library/Keychains/SystemRootCertificates.keychain \
  -T /usr/bin/codesign
```

Then set:
```bash
export APPLE_IDENTITY="Apple2TS Developer"
```

**Note**: Self-signed apps will still show security warnings to users.

## Troubleshooting

- **"No identity found"**: Make sure your certificate is installed and `APPLE_IDENTITY` matches exactly
- **Notarization fails**: Check that your Apple ID, password, and Team ID are correct
- **"Developer cannot be verified"**: The app is signed but not notarized - check notarization logs

## For Users (Without Code Signing)

If you distribute unsigned builds, users need to run this command after downloading:

```bash
xattr -d com.apple.quarantine /path/to/Apple2TS.app
```

Or right-click the app, select "Open", and click "Open" in the security dialog.