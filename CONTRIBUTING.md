# Contributing to Apple2TS App

## Code Style Guidelines

### TypeScript/JavaScript Style
- **No semicolons**: This project uses automatic semicolon insertion (ASI)
- **Imports**: No trailing semicolons on import statements
- **Statements**: No trailing semicolons on any statements
- **ESLint**: The project is configured to enforce no semicolons automatically

### Examples

✅ **Correct:**
```typescript
import { app, BrowserWindow } from 'electron'
import path from 'node:path'

const window = new BrowserWindow({
  width: 800,
  height: 600
})

app.on('ready', () => {
  createWindow()
})
```

❌ **Incorrect:**
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const window = new BrowserWindow({
  width: 800,
  height: 600;
});
```

### CSS Style
- External CSS files are used for styling (splash.css, about.css)
- CSS files are located in the `src/` directory
- Avoid inline styles in TypeScript files

### File Organization
- Main application logic: `src/main.ts`
- About dialog: `src/about.ts` + `src/about.css`
- Splash screen: `src/splash.ts` + `src/splash.css`
- Assets: `assets/` directory (images, icons)

## Development

### Running the App
```bash
npm start
```

### Linting
```bash
npm run lint
```

The ESLint configuration will automatically catch and flag semicolon usage.

## AI Assistant Instructions

When working with this codebase:
1. **Never use semicolons** in TypeScript/JavaScript code
2. Use external CSS files instead of inline styles
3. Follow the existing modular file structure
4. Maintain the #212121 background color for the About dialog
5. Keep emoji icons working properly in UI elements