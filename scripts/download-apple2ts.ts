import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const APPLE2TS_URL = 'https://github.com/ct6502/apple2ts/archive/refs/heads/main.zip';
const DIST_DIR = path.join(__dirname, '..', 'apple2ts-dist');

async function downloadAndExtract(): Promise<void> {
  // Check if Apple2TS already exists
  if (fs.existsSync(DIST_DIR)) {
    console.log('✅ Apple2TS already exists at:', DIST_DIR);
    console.log('Skipping download and install. Delete folder to force a reinstall.');
    return;
  }
  
  console.log('Downloading Apple2TS from GitHub...');
  
  const tempDir = path.join(__dirname, '..', 'temp-apple2ts');
  
  try {
    
    // Cross-platform download and extraction
    if (process.platform === 'win32') {
      console.log('Using PowerShell for Windows...');
      execSync(`powershell -Command "Invoke-WebRequest -Uri '${APPLE2TS_URL}' -OutFile 'apple2ts.zip'"`, { cwd: __dirname });
      execSync(`powershell -Command "Expand-Archive -Path 'apple2ts.zip' -DestinationPath '${tempDir}' -Force"`, { cwd: __dirname });
    } else {
      console.log('Using curl and unzip for Unix-like systems...');
      execSync(`curl -L "${APPLE2TS_URL}" -o apple2ts.zip`, { cwd: __dirname });
      execSync(`mkdir -p "${tempDir}"`, { cwd: __dirname });
      execSync(`unzip -q apple2ts.zip -d "${tempDir}"`, { cwd: __dirname });
    }
    
    // Move the extracted directory to the final location
    const extractedDir = path.join(tempDir, 'apple2ts-main');
    if (fs.existsSync(extractedDir)) {
      fs.renameSync(extractedDir, DIST_DIR);
    } else {
      throw new Error('Extracted directory not found');
    }
    
    // Clean up
    const zipPath = path.join(__dirname, 'apple2ts.zip');
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('✅ Apple2TS downloaded and extracted successfully to:', DIST_DIR);
    
    // Build the Apple2TS project to create distribution files
    console.log('🔨 Building Apple2TS project...');
    try {
      // Install dependencies and build
      execSync('npm install', { cwd: DIST_DIR, stdio: 'inherit' });
      execSync('npm run build', { cwd: DIST_DIR, stdio: 'inherit' });
      
      // Verify that the build created the dist directory
      const distPath = path.join(DIST_DIR, 'dist');
      if (fs.existsSync(distPath)) {
        console.log('✅ Apple2TS build completed successfully');
        
        // Check for index.html in the dist directory
        const builtIndexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(builtIndexPath)) {
          console.log('✅ Built index.html found at:', builtIndexPath);
          
          // Fix asset references in JavaScript files
          const assetsDir = path.join(distPath, 'assets');
          if (fs.existsSync(assetsDir)) {
            const assetFiles = fs.readdirSync(assetsDir);
            const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
            
            // Create a mapping of original names to final paths
            const assetMap: Record<string, string> = {};
            
            // First, add hashed assets
            assetFiles.forEach(file => {
              // Extract the original name before the hash
              const match = file.match(/^(.+?)-[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)$/);
              if (match) {
                const originalName = match[1] + match[2];
                assetMap[originalName] = `./assets/${file}`;
              }
            });
            
            // Then, add non-hashed assets (public directory files)
            assetFiles.forEach(file => {
              // If it doesn't match the hash pattern, it's a public file
              const isHashed = /^(.+?)-[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)$/.test(file);
              if (!isHashed) {
                assetMap[file] = `./assets/${file}`;
              }
            });
            
            console.log('✅ Asset mapping:', assetMap);
          }
        } else {
          console.warn('⚠️  Warning: Built index.html not found');
        }
      } else {
        console.warn('⚠️  Warning: Build dist directory not found');
      }
      
    } catch (buildError: unknown) {
      const buildMessage = buildError instanceof Error ? buildError.message : String(buildError);
      console.warn('⚠️  Warning: Failed to build Apple2TS:', buildMessage);
      console.warn('Will use source files instead of built files');
    }
    
    // Verify that we have the necessary files
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.warn('⚠️  Warning: index.html not found in downloaded files');
    } else {
      console.log('✅ Verified: index.html found in downloaded files');
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to download Apple2TS:', errorMessage);
    
    // Clean up on failure
    try {
      const zipPath = path.join(__dirname, 'apple2ts.zip');
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError: unknown) {
      const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.error('Error during cleanup:', cleanupMessage);
    }
    
    process.exit(1);
  }
}

downloadAndExtract().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Unexpected error:', errorMessage);
  process.exit(1);
});