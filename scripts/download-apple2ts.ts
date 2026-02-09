import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import * as https from 'https'
import * as http from 'http'

const APPLE2TS_URL = 'https://github.com/ct6502/apple2ts/archive/refs/heads/main.zip'
const DIST_DIR = path.join(__dirname, '..', 'apple2ts-dist')

const DOWNLOAD_TIMEOUT_MS = 120_000
const MAX_REDIRECTS = 5

function downloadFile(url: string, destPath: string, redirectCount = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Too many redirects while downloading Apple2TS'))
      return
    }

    const client = url.startsWith('https') ? https : http
    const request = client.get(
      url,
      {
        headers: {
          'User-Agent': 'apple2ts-app-downloader',
          Accept: 'application/zip, application/octet-stream, */*'
        },
        timeout: DOWNLOAD_TIMEOUT_MS
      },
      response => {
        const statusCode = response.statusCode ?? 0
        const location = response.headers.location

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume()
          const nextUrl = location.startsWith('http')
            ? location
            : new URL(location, url).toString()
          downloadFile(nextUrl, destPath, redirectCount + 1).then(resolve).catch(reject)
          return
        }

        if (statusCode !== 200) {
          response.resume()
          reject(new Error(`Download failed with status code ${statusCode}`))
          return
        }

        const fileStream = fs.createWriteStream(destPath)
        response.pipe(fileStream)

        fileStream.on('finish', () => {
          fileStream.close()
          resolve()
        })

        fileStream.on('error', error => {
          try {
            if (fs.existsSync(destPath)) {
              fs.unlinkSync(destPath)
            }
          } catch {
            // ignore cleanup errors
          }
          reject(error)
        })
      }
    )

    request.on('timeout', () => {
      request.destroy(new Error('Download timed out'))
    })

    request.on('error', error => {
      reject(error)
    })
  })
}

async function downloadAndExtract(): Promise<void> {
  // Check if Apple2TS already exists
  if (fs.existsSync(DIST_DIR)) {
    console.log('✅ Apple2TS already exists at:', DIST_DIR)
    console.log('Skipping download and install. Delete folder to force a reinstall.')
    return
  }
  
  console.log('Downloading Apple2TS from GitHub...')
  
  const tempDir = path.join(__dirname, '..', 'temp-apple2ts')
  const zipPath = path.join(__dirname, 'apple2ts.zip')
  
  try {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath)
    }

    console.log('Using Node downloader...')
    await downloadFile(APPLE2TS_URL, zipPath)

    // Cross-platform extraction
    if (process.platform === 'win32') {
      console.log('Using PowerShell for Windows extraction...')
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`,
        { cwd: __dirname }
      )
    } else {
      console.log('Using unzip for Unix-like systems...')
      execSync(`mkdir -p "${tempDir}"`, { cwd: __dirname })
      execSync(`unzip -q "${zipPath}" -d "${tempDir}"`, { cwd: __dirname })
    }
    
    // Move the extracted directory to the final location
    const extractedDir = path.join(tempDir, 'apple2ts-main')
    if (fs.existsSync(extractedDir)) {
      fs.renameSync(extractedDir, DIST_DIR)
    } else {
      throw new Error('Extracted directory not found')
    }
    
    // Clean up
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath)
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    console.log('✅ Apple2TS downloaded and extracted successfully to:', DIST_DIR)
    
    // Build the Apple2TS project to create distribution files
    console.log('🔨 Building Apple2TS project...')
    try {
      // Read and save the apple2ts version before cleaning up
      const packageJsonPath = path.join(DIST_DIR, 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const apple2tsVersion = packageJson.version
      console.log(`📦 Apple2TS version: ${apple2tsVersion}`)
      
      // Install dependencies and build
      execSync('npm install', { cwd: DIST_DIR, stdio: 'inherit' })
      execSync('npm run build', { cwd: DIST_DIR, stdio: 'inherit' })
      
      // Verify that the build created the dist directory
      const distPath = path.join(DIST_DIR, 'dist')
      if (fs.existsSync(distPath)) {
        console.log('✅ Apple2TS build completed successfully')
        
        // Check for index.html in the dist directory
        const builtIndexPath = path.join(distPath, 'index.html')
        if (fs.existsSync(builtIndexPath)) {
          console.log('✅ Built index.html found at:', builtIndexPath)
          
          // Clean up unnecessary files - keep only the dist folder
          console.log('🧹 Cleaning up source files and node_modules...')
          const itemsToKeep = ['dist']
          const allItems = fs.readdirSync(DIST_DIR)
          
          for (const item of allItems) {
            if (!itemsToKeep.includes(item)) {
              const itemPath = path.join(DIST_DIR, item)
              console.log(`  Removing: ${item}`)
              if (fs.statSync(itemPath).isDirectory()) {
                fs.rmSync(itemPath, { recursive: true, force: true })
              } else {
                fs.unlinkSync(itemPath)
              }
            }
          }
          
          console.log('✅ Cleanup completed - only dist folder remains')
          
          // Write version.json to the dist folder
          const versionJsonPath = path.join(distPath, 'version.json')
          fs.writeFileSync(versionJsonPath, JSON.stringify({ version: apple2tsVersion }, null, 2))
          console.log(`✅ Wrote version ${apple2tsVersion} to version.json`)
          
          // Remove disks folder for branded builds
          const isBrandedBuild = process.env.APPLE2TS_CONFIG && process.env.APPLE2TS_CONFIG !== 'apple2ts'
          if (isBrandedBuild) {
            const disksPath = path.join(distPath, 'disks')
            if (fs.existsSync(disksPath)) {
              console.log('🧹 Removing disks folder for branded build...')
              fs.rmSync(disksPath, { recursive: true, force: true })
              console.log('✅ Disks folder removed')
            }
          }
          
          // Fix asset references in JavaScript files
          const assetsDir = path.join(distPath, 'assets')
          if (fs.existsSync(assetsDir)) {
            const assetFiles = fs.readdirSync(assetsDir)
            
            // Create a mapping of original names to final paths
            const assetMap: Record<string, string> = {}
            
            // First, add hashed assets
            assetFiles.forEach(file => {
              // Extract the original name before the hash
              const match = file.match(/^(.+?)-[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)$/)
              if (match) {
                const originalName = match[1] + match[2]
                assetMap[originalName] = `./assets/${file}`
              }
            })
            
            // Then, add non-hashed assets (public directory files)
            assetFiles.forEach(file => {
              // If it doesn't match the hash pattern, it's a public file
              const isHashed = /^(.+?)-[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)$/.test(file)
              if (!isHashed) {
                assetMap[file] = `./assets/${file}`
              }
            })
            
            console.log('✅ Asset mapping:', assetMap)
          }
        } else {
          console.warn('⚠️  Warning: Built index.html not found')
        }
      } else {
        console.warn('⚠️  Warning: Build dist directory not found')
      }
      
    } catch (buildError: unknown) {
      const buildMessage = buildError instanceof Error ? buildError.message : String(buildError)
      console.warn('⚠️  Warning: Failed to build Apple2TS:', buildMessage)
      console.warn('Will use source files instead of built files')
    }
    
    // Verify that we have the necessary files
    const indexPath = path.join(DIST_DIR, 'index.html')
    if (!fs.existsSync(indexPath)) {
      console.warn('⚠️  Warning: index.html not found in downloaded files')
    } else {
      console.log('✅ Verified: index.html found in downloaded files')
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Failed to download Apple2TS:', errorMessage)
    
    // Clean up on failure
    try {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath)
      }
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch (cleanupError: unknown) {
      const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
      console.error('Error during cleanup:', cleanupMessage)
    }
    
    process.exit(1)
  }
}

downloadAndExtract().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error('Unexpected error:', errorMessage)
  process.exit(1)
})