# Apple2TS for macOS - Installation Guide

## 🍎 Getting Started

Thank you for downloading Apple2TS! This guide will help you get the app running on macOS.

## ⚠️ "App is damaged" Error?

If macOS shows a warning that "Apple2TS.app is damaged and can't be opened", this is normal for unsigned apps. Here's how to fix it:

### Option 1: Use the included fix script (Recommended)
1. Open **Terminal** (find it in Applications > Utilities)
2. Navigate to the folder containing Apple2TS.app in Terminal:
   ```bash
   cd /path/to/your/Apple2TS/folder
   ```
   (Replace `/path/to/your/Apple2TS/folder` with the actual path where you extracted the app)
3. Run the fix script:
   ```bash
   ./fix-macos-app.sh
   ```
4. The script will automatically remove the quarantine flag and find your Apple2TS.app
5. Try launching Apple2TS.app again - it should now work!

### Option 2: Manual fix
1. Right-click on **Apple2TS.app**
2. Hold **Option** key and select **"Open"** from the menu
3. Click **"Open"** when prompted
4. The app should launch and be trusted for future use

### Option 3: Command line (Advanced users)
```bash
sudo xattr -rd com.apple.quarantine /path/to/Apple2TS.app
```

## 🚀 After First Launch

Once the app launches successfully:
- It will open in your default web browser view
- The Apple2TS emulator will load automatically
- You can use it just like the web version at apple2ts.com

## 🎮 Using Apple2TS

- **Disk Images**: The app includes several classic Apple II programs
- **Controls**: Use your keyboard - the app maps modern keys to Apple II equivalents
- **Full Screen**: Use your browser's full-screen mode for the best experience

## 🔧 Troubleshooting

### App won't start after running fix script
- Make sure you're running the script from the correct directory
- Try the manual Option+click method instead
- Ensure you have admin privileges on your Mac

### Performance issues
- Close other applications to free up memory
- The emulator works best on newer Macs (2015+)

### Need help?
- Visit: https://github.com/ct6502/apple2ts-app
- Report issues: https://github.com/ct6502/apple2ts-app/issues

## 📁 What's Included

- **Apple2TS.app** - The main application
- **fix-macos-app.sh** - Script to fix the "damaged app" warning
- **README.md** - This file

---

**Note**: This app is currently unsigned. Once we implement code signing, these installation steps won't be necessary.

Enjoy your journey back to 1977! 🍎✨