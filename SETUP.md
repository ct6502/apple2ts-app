# Apple2TS Electron App Setup

## What was configured:

### 1. Download Script (`scripts/download-apple2ts.ts`)
- TypeScript implementation with proper type safety
- Downloads Apple2TS from GitHub automatically
- Cross-platform support (Windows/macOS/Linux)
- Caches downloads for 24 hours to avoid unnecessary re-downloads
- Force download option with `--force` flag
- Proper error handling and cleanup
- Uses `tsx` to run TypeScript files directly

### 2. Package.json Scripts
- `prestart`: Automatically downloads Apple2TS before starting the app (using tsx)
- `premake`: Automatically downloads Apple2TS before building/packaging (using tsx)
- `download-apple2ts`: Manual download command (using tsx)
- `download-apple2ts-force`: Force re-download even if files exist (using tsx)

### 3. Main Process Updates (`src/main.ts`)
- Updated to load Apple2TS files instead of default index.html
- Larger default window size (1200x800) suitable for Apple II emulator
- Better security with `nodeIntegration: false` and `contextIsolation: true`
- Fallback error handling if Apple2TS files are missing
- Only opens DevTools in development mode

### 4. Git Configuration (`.gitignore`)
- Excludes downloaded Apple2TS files (`apple2ts-dist/`)
- Excludes temporary download directory (`temp-apple2ts/`)

## Usage:

### Development
```bash
npm start        # Downloads Apple2TS (if needed) and starts the app
```

### Building
```bash
npm run make     # Downloads Apple2TS (if needed) and creates distributables
```

### Manual Download
```bash
npm run download-apple2ts        # Download if older than 24 hours
npm run download-apple2ts-force  # Force download regardless of age
```

## File Structure:
```
apple2ts-app/
├── scripts/
│   └── download-apple2ts.ts     # TypeScript download automation script
├── apple2ts-dist/               # Downloaded Apple2TS files (gitignored)
├── src/
│   └── main.ts                  # Updated to load Apple2TS
└── package.json                 # Updated with new scripts and tsx dependency
```

## For GitHub Actions:
The setup is ready for CI/CD with:
- npm scripts that handle downloads automatically
- TypeScript download script with proper type safety
- Cross-platform download script
- Proper caching (can cache `apple2ts-dist/` directory)
- tsx dependency for running TypeScript files in CI
- No external dependencies beyond Node.js and common CLI tools

## Notes:
- Downloads happen automatically before start/build
- The app will show an error if Apple2TS files are missing
- All downloaded files are excluded from git tracking