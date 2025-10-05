# Apple2TS App

An Electron desktop application wrapper for the Apple2TS progressive web app, providing a native desktop experience for the Apple II emulator.

## About

Apple2TS App is a cross-platform Electron application that wraps the Apple2TS progressive web app, bringing the Apple II emulator experience to your desktop. This wrapper provides enhanced functionality and integration with the operating system while maintaining the full functionality of the web-based emulator.

## Features

- **Native Desktop Experience**: Run Apple2TS as a standalone desktop application
- **Cross-Platform**: Available for Windows, macOS, and Linux
- **Full Apple II Emulation**: Complete access to all Apple2TS emulator features
- **System Integration**: Better file system access and native OS integration
- **Offline Capability**: Run the emulator without requiring a web browser

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/ct6502/apple2ts-app.git
   cd apple2ts-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm start
   ```

## Development

### Building for Development

To run the application in development mode with hot reload:

```bash
npm start
```

### Building for Production

To create a distributable package:

```bash
npm run make
```

## Distribution

### Creating Releases

To create a release with GitHub publishing:

```bash
npm run publish
```

This will build for all platforms and create a GitHub release with downloadable assets.

### macOS Security Notice

**Important for macOS users**: Downloaded apps may show a "damaged and can't be opened" error due to macOS Gatekeeper security. This is normal for unsigned applications.

#### Quick Fix for Users:
1. **Download and run our fix script**: [fix-macos-app.sh](./fix-macos-app.sh)
2. **Or manually run**: `xattr -d com.apple.quarantine /path/to/Apple2TS.app`
3. **Or right-click method**: Right-click the app → "Open" → "Open" in security dialog

#### For Developers:
See [CODE_SIGNING.md](./CODE_SIGNING.md) for complete code signing and notarization setup.

### Build Commands

- `npm run make` - Build distributables for your current platform
- `npm run publish` - Build and publish to GitHub releases

## Planned Features

- Auto-updater support (planned)

This will create platform-specific distributables in the `out` directory.

### Available Scripts

- `npm start` - Start the application in development mode
- `npm run package` - Package the application without creating distributables
- `npm run make` - Create distributable packages
- `npm run publish` - Publish the application (requires additional configuration)
- `npm run lint` - Run ESLint on TypeScript files

## Project Structure

```
apple2ts-app/
├── src/
│   ├── main.ts          # Main Electron process
│   ├── preload.ts       # Preload script for renderer security
│   ├── renderer.ts      # Renderer process logic
│   └── index.css        # Application styles
├── forge.config.ts      # Electron Forge configuration
├── vite.*.config.ts     # Vite build configurations
├── package.json         # Project dependencies and scripts
└── index.html          # Main application HTML
```

## Technology Stack

- **Electron**: Desktop application framework
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Electron Forge**: Application packaging and distribution

## Apple2TS Integration

This application serves as a wrapper for the Apple2TS progressive web app, which is a TypeScript-based Apple II emulator. The wrapper provides:

- Enhanced file system access for disk images
- Better keyboard and input handling
- Native window management
- System tray integration (planned)
- Auto-updater support (planned)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Follow TypeScript best practices
2. Use ESLint for code formatting
3. Test your changes on multiple platforms when possible
4. Update documentation as needed

## License

This project is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License. See the [LICENSE](LICENSE) file for details.

## Related Projects

- [Apple2TS](https://github.com/ct6502/apple2ts) - The original TypeScript Apple II emulator
- [Electron](https://electronjs.org) - The desktop application framework used

## Author

**Chris Torrence** - [ct6502](https://github.com/ct6502)

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

---

*Bringing the Apple II experience to modern desktops through the power of web technologies and Electron.*