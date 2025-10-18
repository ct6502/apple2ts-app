import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export interface Apple2TSConfig {
  name?: string
  diskImage?: string
  parameters?: Record<string, string>
  about?: {
    subtitle?: string
    description?: string
    version?: string
    author?: string
    website?: string
    repository?: string
  }
}

const DEFAULT_CONFIG: Apple2TSConfig = {
  name: 'Apple2TS',
  parameters: {}
}

/**
 * Load configuration from a specific asset folder
 */
export function loadConfigFromAssetFolder(folderName: string): Apple2TSConfig | null {
  let configPath: string

  if (app.isPackaged) {
    configPath = path.join(process.resourcesPath, 'assets', folderName, 'config.json')
  } else {
    configPath = path.join(__dirname, '../../assets', folderName, 'config.json')
  }

  console.log(`Looking for asset config at: ${configPath}`)

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configData) as Apple2TSConfig
      console.log('Loaded asset config:', config)
      return config
    } else {
      console.log(`No config found in asset folder: ${folderName}`)
      return null
    }
  } catch (error) {
    console.error('Error loading asset config:', error)
    return null
  }
}

/**
 * Load configuration from apple2ts_config.json file located next to the app
 */
/**
 * Load configuration from apple2ts_config.json file located next to the app,
 * or from asset folders as fallback
 */
export function loadConfig(): Apple2TSConfig {
  // First, try to load from next to the app (highest priority)
  let configPath: string

  if (app.isPackaged) {
    // In packaged app, look next to the executable
    if (process.platform === 'darwin') {
      // On macOS, the executable is inside the .app bundle
      // Go up from Apple2TS.app/Contents/MacOS/Apple2TS to find config next to .app
      configPath = path.join(process.execPath, '../../../../apple2ts_config.json')
    } else if (process.platform === 'win32') {
      // On Windows, look next to the .exe file
      configPath = path.join(path.dirname(process.execPath), 'apple2ts_config.json')
    } else {
      // On Linux, look next to the executable
      configPath = path.join(path.dirname(process.execPath), 'apple2ts_config.json')
    }
  } else {
    // In development, look in the project root
    configPath = path.join(__dirname, '../../apple2ts_config.json')
  }

  console.log('Looking for config at:', configPath)

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configData) as Apple2TSConfig
      console.log('Loaded config:', config)
      
      // Merge with defaults
      return {
        ...DEFAULT_CONFIG,
        ...config
      }
    }
  } catch (error) {
    console.error('Error loading config:', error)
  }

  // If no config next to app, check for APPLE2TS_CONFIG environment variable
  const configFolder = process.env.APPLE2TS_CONFIG
  if (configFolder) {
    console.log(`Checking for config in asset folder: ${configFolder}`)
    const assetConfig = loadConfigFromAssetFolder(configFolder)
    if (assetConfig) {
      return {
        ...DEFAULT_CONFIG,
        ...assetConfig
      }
    }
  }

  // Finally, try to load default asset config
  console.log('No external config found, trying default asset config')
  const defaultAssetConfig = loadConfigFromAssetFolder('default')
  if (defaultAssetConfig) {
    return {
      ...DEFAULT_CONFIG,
      ...defaultAssetConfig
    }
  }

  console.log('No config file found, using basic defaults')
  return DEFAULT_CONFIG
}

/**
 * Get the path to assets based on config
 * For custom disk images, looks next to the config file, then in asset folders
 * Falls back to default assets
 */
export function getAssetPath(config: Apple2TSConfig, assetName: string): string {
  if (config.name && config.name !== 'Apple2TS') {
    // First, look for custom disk asset next to config file
    let customAssetPath: string
    
    if (app.isPackaged) {
      // In packaged app, look next to the executable
      if (process.platform === 'darwin') {
        // On macOS, go up from Apple2TS.app/Contents/MacOS/Apple2TS to find asset next to .app
        customAssetPath = path.join(process.execPath, '../../../../', assetName)
      } else if (process.platform === 'win32') {
        // On Windows, look next to the .exe file
        customAssetPath = path.join(path.dirname(process.execPath), assetName)
      } else {
        // On Linux, look next to the executable
        customAssetPath = path.join(path.dirname(process.execPath), assetName)
      }
    } else {
      // In development, look in the project root (next to where config would be)
      customAssetPath = path.join(__dirname, '../../', assetName)
    }
    
    if (fs.existsSync(customAssetPath)) {
      return customAssetPath
    }

    // If not found next to config, try the disk's asset folder
    const diskAssetFolder = config.name.toLowerCase().replace(/\s+/g, '')
    let diskAssetPath: string
    
    if (app.isPackaged) {
      diskAssetPath = path.join(process.resourcesPath, 'assets', diskAssetFolder, assetName)
    } else {
      diskAssetPath = path.join(__dirname, '../../assets', diskAssetFolder, assetName)
    }
    
    if (fs.existsSync(diskAssetPath)) {
      return diskAssetPath
    }
  }
  
  // Fall back to default assets folder
  return app.isPackaged 
    ? path.join(process.resourcesPath, 'assets', 'default', assetName)
    : path.join(__dirname, '../../assets/default', assetName)
}

/**
 * Helper function to find files matching a wildcard pattern
 */
function findMatchingFile(directory: string, pattern: string): string | null {
  console.log('findMatchingFile called with directory:', directory, 'pattern:', pattern)
  
  // Check if pattern contains wildcard
  if (!pattern.includes('*')) {
    const fullPath = path.join(directory, pattern)
    const exists = fs.existsSync(fullPath)
    console.log('No wildcard, checking exact path:', fullPath, 'exists:', exists)
    return exists ? fullPath : null
  }

  // Convert wildcard pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  const regex = new RegExp(`^${regexPattern}$`, 'i') // Case-insensitive
  console.log('Using regex:', regex)

  try {
    if (!fs.existsSync(directory)) {
      console.log('Directory does not exist:', directory)
      return null
    }

    const files = fs.readdirSync(directory)
    console.log('Files in directory:', files)
    const matchingFile = files.find(file => {
      const matches = regex.test(file)
      console.log(`Testing ${file} against regex: ${matches}`)
      return matches
    })
    
    if (matchingFile) {
      const fullPath = path.join(directory, matchingFile)
      console.log('Found matching file:', fullPath)
      return fullPath
    }
    console.log('No matching file found')
  } catch (error) {
    console.log('Error searching for wildcard match:', error)
  }

  return null
}

/**
 * Get the disk image path if specified in config
 * Supports wildcard patterns like "NoxArchaist*.hdv"
 */
export function getDiskImagePath(config: Apple2TSConfig): string | null {
  if (!config.diskImage) {
    console.log('No disk image specified in config')
    return null
  }

  console.log('Looking for disk image:', config.diskImage)

  // Determine the directories to search in
  const searchDirectories: string[] = []

  if (app.isPackaged) {
    if (process.platform === 'darwin') {
  // 1. Directory containing the .app bundle (Finder launches)
  const containingDir = path.join(process.execPath, '../../../..')
  searchDirectories.push(containingDir)
  // 2. Parent of the .app bundle (Terminal launches)
  const parentDir = path.join(process.execPath, '../../../../')
  searchDirectories.push(parentDir)
    } else if (process.platform === 'win32') {
      searchDirectories.push(path.dirname(process.execPath))
    } else {
      searchDirectories.push(path.dirname(process.execPath))
    }
  } else {
    searchDirectories.push(path.join(__dirname, '../../'))
  }

  for (const dir of searchDirectories) {
    console.log('Searching for disk in directory:', dir)
    const diskImagePath = findMatchingFile(dir, config.diskImage)
    if (diskImagePath) {
      console.log(`✅ Found disk image: ${diskImagePath}`)
      return diskImagePath
    }
  }
  console.log('❌ No disk image found in primary location')

  // If not found next to app, try the disk's asset folder (for development)
  if (config.name && config.name !== 'Apple2TS') {
    const diskAssetFolder = config.name.toLowerCase().replace(/\s+/g, '')
    let assetSearchDir: string
    
    if (app.isPackaged) {
      assetSearchDir = path.join(process.resourcesPath, 'assets', diskAssetFolder)
    } else {
      assetSearchDir = path.join(__dirname, '../../assets', diskAssetFolder)
    }
    
    const diskAssetDiskPath = findMatchingFile(assetSearchDir, config.diskImage)
    if (diskAssetDiskPath) {
      console.log(`Found disk image in assets: ${diskAssetDiskPath}`)
      return diskAssetDiskPath
    }
  }

  console.warn(`Disk image not found matching pattern: ${config.diskImage} in ${searchDirectories.join(', ')}`)
  return null
}