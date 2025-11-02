# Apple2TS Game Asset Configuration Guide

This guide explains how to create a branded version of Apple2TS for your Apple II game.

## Overview

Each game configuration lives in its own folder under `assets/`. The folder name should be lowercase with no spaces (e.g., `noxarchaist`, `mygame`).

To build a branded build of your game:
```bash
APPLE2TS_CONFIG=yourgame npm run package
```

This will create a fully branded app with your game's name, icons, splash screen, and configuration baked in.

## Folder Structure

```
assets/
  yourgame/          # Your game's asset folder (lowercase, no spaces)
    config.json      # Game configuration (required)
    MacOS.icns       # macOS app icon (required)
    Windows.ico      # Windows app icon (required)
    App.png          # App icon for runtime & Linux (required)
    splash.jpg       # Splash screen image (required)
    Header.png       # Header image for About dialog (required)
```

---

## Required Files

### 1. config.json

The main configuration file for your game.

**Example:**
```json
{
  "name": "Your Game Name",
  "diskImage": "YourGame*.hdv",
  "parameters": {
    "appmode": "game",
    "machine": "apple2ee"
  },
  "about": {
    "subtitle": "Tagline for your game",
    "description": "Full description of your game that appears in the About dialog.",
    "version": "1.0",
    "author": "Your Name or Studio",
    "website": "https://yourgame.com",
    "repository": "https://github.com/you/yourgame"
  }
}
```

**Configuration Fields:**

- **`name`** (required): The display name of your game. This appears in:
  - The app bundle name (e.g., "Your Game Name.app")
  - Menu bar and menu items ("About Your Game Name", "Quit Your Game Name")
  - Window titles
  - About dialog

- **`diskImage`** (optional): Disk image filename or pattern to auto-load
  - Can use wildcards: `"YourGame*.hdv"` matches `YourGame_v1.0.hdv`, `YourGame_v2.0.hdv`, etc.
  - Looks for the disk image next to the app bundle
  - First matching file is loaded automatically
  - Allows updating the disk image without rebuilding the app
  - Note: This disk image is only loaded once - See note below about local storage

- **`parameters`** (optional): URL parameters passed to Apple2TS emulator
  - `appmode`: `"game"` - display a streamlined user interface
  - `machine`: `"apple2ee" or "apple2eu"` - Apple IIe enhanced or unenhanced
  - See the [Apple2TS web app](https://apple2ts.com) for all supported parameters
  - Parameters are passed as a URL query string to the emulator

- **`about`** (optional): Information displayed in the About dialog
  - `subtitle`: Short tagline
  - `description`: Full game description
  - `version`: Game version number
  - `author`: Developer/studio name
  - `website`: Game website URL
  - `repository`: Source code repository URL

---

### 2. MacOS.icns

macOS application icon in ICNS format.

**Specifications:**
- **Format:** Apple Icon Image (.icns)
- **Required sizes:** 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- **Color depth:** 32-bit RGBA
- **Purpose:** App icon in Finder, Dock, and app bundle

**How to create:**
1. Start with a 1024x1024 PNG image
2. Use Icon Composer (Xcode) or online tools like [cloudconvert.com](https://cloudconvert.com/png-to-icns)
3. Or use `iconutil` command-line tool on macOS

---

### 3. Windows.ico

Windows application icon in ICO format.

**Specifications:**
- **Format:** Windows Icon (.ico)
- **Required sizes:** 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- **Color depth:** 32-bit RGBA
- **Purpose:** App icon in Windows Explorer and taskbar

**How to create:**
1. Start with a 256x256 PNG image
2. Use online tools like [convertio.co](https://convertio.co/png-ico/) or GIMP
3. Include multiple sizes in the same .ico file

---

### 4. App.png

Standard PNG icon for runtime use and Linux builds.

**Specifications:**
- **Format:** PNG
- **Dimensions:** 256x256 pixels
- **Color depth:** 32-bit RGBA with transparency
- **Purpose:** 
  - Window icon at runtime (all platforms)
  - Dock icon on macOS during development
  - Linux application icon

**Recommendations:**
- Use a transparent background
- Ensure the icon looks good at small sizes (16x16, 32x32)
- Use your game's logo or main character

---

### 5. splash.jpg

Splash screen displayed when the app launches.

**Specifications:**
- **Format:** JPEG
- **Dimensions:** 616x353 pixels (exact)
- **File size:** Under 500KB recommended
- **Purpose:** Shows for 4 seconds while app initializes

**Design tips:**
- Use high-quality artwork representing your game
- Include your game logo/title
- Avoid text that's too small (may be hard to read)
- The splash window has rounded corners (10px radius)
- A 2px border is applied automatically

---

### 6. Header.png

Header image displayed in the About dialog.

**Specifications:**
- **Format:** PNG
- **Dimensions:** 460x215 pixels (exact)
- **Color depth:** 32-bit RGBA
- **Purpose:** Top of the About dialog

**Design tips:**
- Usually contains your game logo/wordmark
- Can use transparency
- Should work well on dark background (#212121)
- Keep important content centered and within safe margins

---

## Building Your Branded App

### 1. Create Your Asset Folder

```bash
cd assets
mkdir yourgame
cd yourgame
```

### 2. Add Required Files

Place all 6 required files in your folder:
- `config.json`
- `MacOS.icns`
- `Windows.ico`
- `App.png`
- `splash.jpg`
- `Header.png`

### 3. Build the App

```bash
# Package the app
APPLE2TS_CONFIG=yourgame npx electron-forge package

# Or create distributables
APPLE2TS_CONFIG=yourgame npx electron-forge make
```

### 4. Distribute

Your branded app will be in:
- `out/Your Game Name-darwin-arm64/Your Game Name.app` (macOS)
- `out/Your Game Name-win32-x64/` (Windows)
- `out/Your Game Name-linux-x64/` (Linux)

Place your disk image (matching the pattern in config.json) next to the app bundle before distributing.

---

## Example: Nox Archaist Configuration

The `noxarchaist` folder provides a complete working example:

```
assets/noxarchaist/
  config.json          # Name: "Nox Archaist", diskImage: "NoxArchaist*.hdv"
  MacOS.icns          # App icon for macOS
  Windows.ico         # App icon for Windows  
  App.png             # Runtime icon
  splash.jpg          # 616x353 splash screen
  Header.png          # 460x215 header for About dialog
```

Build it with:
```bash
APPLE2TS_CONFIG=noxarchaist npx electron-forge package
```

---

## Disk Images and Local Storage

When Apple2TS-App starts the Apple2TS emulator, it constructs a URL with any
optional parameters, along with a URL "fragment" containing the disk image file
location on the user's local drive, with the form `file://` or `/MyPath/...`
followed by the disk image name. For example, for Nox Archaist this would
look like:

```
...index.html?color=nofringe&appmode=game&machine=apple2ee&ramdisk=64#/MyPath/Nox%20Archaist.hdv
```

The first time that Apple2TS sees a fragment with this pattern, it will
read the binary disk data and copy it into the browser's local storage.
From that point onwards, any changes that the Apple II makes to the disk
will be written out to local storage. The original disk image is never changed.

There are two keys in local storage:
* `GAME_DATA-DRIVE` - contains the drive number (usually 0 for a hard disk)
* `GAME_DATA-DATA` - contains the Base64-encoded disk image data

The next time the application is loaded, it will check if there is a key
named `GAME_DATA-DRIVE` in local storage. If it exists then it will load the
disk image from local storage instead of reading from the file.

---

## Troubleshooting

**App doesn't show my branding:**
- Verify `APPLE2TS_CONFIG=yourgame` is set during build
- Check that your asset folder name matches (lowercase, no spaces)
- Ensure all 6 required files are present

**Icons don't appear:**
- Check file formats (.icns, .ico, .png)
- Verify image dimensions match specifications
- Rebuild the app after updating icons

**Disk image not loading:**
- Ensure disk image is next to the .app bundle (not inside it)
- Check filename matches pattern in config.json
- Look for console messages about disk loading

**Splash screen doesn't show:**
- Verify splash.jpg is exactly 616x353 pixels
- Check file size (should be under 1MB)
- Ensure it's a valid JPEG file

---

## Resources

- **Icon Generators:**
  - macOS: [cloudconvert.com/png-to-icns](https://cloudconvert.com/png-to-icns)
  - Windows: [convertio.co/png-ico](https://convertio.co/png-ico/)
  - Multi-platform: [icoconvert.com](https://icoconvert.com/)

- **Image Editing:**
  - [GIMP](https://www.gimp.org/) - Free, cross-platform
  - [Photoshop](https://www.adobe.com/photoshop) - Professional
  - [Pixelmator](https://www.pixelmator.com/) - macOS only

- **Testing:**
  - Use `npm start` for quick iteration during development
  - Test packaged builds before distribution
  - Verify on actual hardware when possible

---

## Default Configuration

The `default` folder contains the standard Apple2TS branding.
This is used when no `APPLE2TS_CONFIG` is specified during build.

To modify the default branding, edit files in `assets/default/`.

---

## Questions?

For more information about the Apple2TS emulator and available parameters, visit:
- [Apple2TS Repository](https://github.com/ct6502/apple2ts)
- [Apple2TS App Repository](https://github.com/ct6502/apple2ts-app)
