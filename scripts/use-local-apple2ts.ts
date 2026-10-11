import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const LOCAL_APPLE2TS_PATH = path.join(__dirname, '..', '..', 'apple2ts')
const DIST_DIR = path.join(__dirname, '..', 'apple2ts-dist')

// npm exports this repo's .npmrc allow-* settings as env vars, which a nested install in another project rejects
const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !/^npm_config_allow_/i.test(key))
)

async function copyLocalApple2TS(): Promise<void> {
  // Check if local Apple2TS exists
  if (!fs.existsSync(LOCAL_APPLE2TS_PATH)) {
    console.error('❌ Local Apple2TS not found at:', LOCAL_APPLE2TS_PATH)
    console.error('Please ensure your apple2ts directory is at the same level as apple2ts-app')
    process.exit(1)
  }
  
  // Remove existing dist directory if it exists
  if (fs.existsSync(DIST_DIR)) {
    console.log('🧹 Removing existing apple2ts-dist directory...')
    fs.rmSync(DIST_DIR, { recursive: true, force: true })
  }
  
  console.log('📁 Copying local Apple2TS from:', LOCAL_APPLE2TS_PATH)
  console.log('📁 To:', DIST_DIR)
  
  try {
    // Copy the entire directory
    if (process.platform === 'win32') {
      execSync(`xcopy "${LOCAL_APPLE2TS_PATH}" "${DIST_DIR}" /E /I /H /Y`, { stdio: 'inherit' })
    } else {
      execSync(`cp -R "${LOCAL_APPLE2TS_PATH}" "${DIST_DIR}"`, { stdio: 'inherit' })
    }
    
    console.log('✅ Local Apple2TS copied successfully')
    
    // Build the Apple2TS project to create distribution files
    console.log('🔨 Building Apple2TS project...')
    try {
      // Install dependencies and build
      execSync('npm install', { cwd: DIST_DIR, stdio: 'inherit', env: childEnv })
      execSync('npm run build', { cwd: DIST_DIR, stdio: 'inherit', env: childEnv })
      
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
        } else {
          console.warn('⚠️  Warning: Built index.html not found')
        }
      } else {
        console.warn('⚠️  Warning: Build dist directory not found')
      }
      
    } catch (buildError: unknown) {
      const buildMessage = buildError instanceof Error ? buildError.message : String(buildError)
      console.error('❌ Failed to build Apple2TS:', buildMessage)
      process.exit(1)
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Failed to copy local Apple2TS:', errorMessage)
    process.exit(1)
  }
}

copyLocalApple2TS().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error('Unexpected error:', errorMessage)
  process.exit(1)
})