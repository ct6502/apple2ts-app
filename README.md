# Apple2TS App

An Electron desktop application for the Apple2TS progressive web app, providing a native desktop experience for the Apple II emulator.

## About

Apple2TS App is a cross-platform Electron application that wraps the Apple2TS progressive web app, bringing the Apple II emulator experience to your desktop. This wrapper provides enhanced functionality and integration with the operating system while maintaining the full functionality of the web-based emulator.

## Features

- **Native Desktop Experience**: Run Apple2TS as a standalone desktop application with custom splash screen
- **Cross-Platform**: Available for Windows, macOS, and Linux
- **Code Signed & Notarized**: Properly signed macOS builds for enhanced security and user experience
- **Full Apple II Emulation**: Complete access to all Apple2TS emulator features
- **System Integration**: Better file system access and native OS integration
- **Offline Capability**: Run the emulator without requiring a web browser
- **Professional UI**: Custom splash screen and native application menus

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

### Automated Releases (Recommended)

The easiest way to create releases is using GitHub Actions:

1. **Update version**: `npm version patch` (or `minor`/`major`)
2. **Create and push tag**: 
   ```bash
   git push origin main
   git push origin --tags
   ```
3. **Automatic build**: GitHub Actions will automatically build and publish releases for all platforms with proper code signing

See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) for detailed setup instructions.

### Manual Releases

To create a release manually:

```bash
npm run publish
```

This will build for all platforms and create a GitHub release with downloadable assets.

### Build Commands

- `npm run make` - Build distributables for your current platform
- `npm run publish` - Build and publish to GitHub releases

### Available Scripts

- `npm start` - Start the application in development mode
- `npm run package` - Package the application without creating distributables
- `npm run make` - Create distributable packages
- `npm run publish` - Publish the application with automatic GitHub release
- `npm run lint` - Run ESLint on TypeScript files

## Project Structure

```
apple2ts-app/
├── src/
│   ├── main.ts          # Main Electron process with splash screen
│   ├── preload.ts       # Preload script for renderer security
│   ├── renderer.ts      # Renderer process logic
│   └── index.css        # Application styles
├── assets/              # Application assets (icons, splash image)
│   ├── apple2ts/        # Default assets for Apple2TS
│   ├── noxarchaist/     # Sample branded assets for Nox Archaist
├── .github/workflows/   # CI/CD automation for releases
├── forge.config.ts      # Electron Forge configuration with code signing
├── vite.*.config.ts     # Vite build configurations
├── package.json         # Project dependencies and scripts
└── index.html          # Main application HTML
```

## Technology Stack

- **Electron**: Desktop application framework
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Electron Forge**: Application packaging and distribution
- **GitHub Actions**: Automated CI/CD with cross-platform builds and code signing

## Customization

### Branded Application

See assets/README.md for details on creating a branded version of apple2ts-app,
for Nox Archaist for example.

## Apple2TS Integration

This application serves as a wrapper for the Apple2TS progressive web app, which is a TypeScript-based Apple II emulator. The wrapper provides:

- Enhanced file system access for disk images
- Better keyboard and input handling
- Native window management with custom splash screen
- Professional macOS integration with code signing and notarization
- Streamlined user experience without browser security warnings

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