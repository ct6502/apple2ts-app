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
 * Get the disk image path if specified in config
 */
export function getDiskImagePath(config: Apple2TSConfig): string | null {
  if (!config.diskImage) {
    return null
  }

  // Look for disk image next to the config file first
  let diskImagePath: string

  if (app.isPackaged) {
    // In packaged app, look next to the executable
    if (process.platform === 'darwin') {
      // On macOS, the executable is inside the .app bundle
      // Go up from Apple2TS.app/Contents/MacOS/Apple2TS to find disk next to .app
      diskImagePath = path.join(process.execPath, '../../../../', config.diskImage)
    } else if (process.platform === 'win32') {
      // On Windows, look next to the .exe file
      diskImagePath = path.join(path.dirname(process.execPath), config.diskImage)
    } else {
      // On Linux, look next to the executable
      diskImagePath = path.join(path.dirname(process.execPath), config.diskImage)
    }
  } else {
    // In development, look in the project root (next to where config would be)
    diskImagePath = path.join(__dirname, '../../', config.diskImage)
  }

  if (fs.existsSync(diskImagePath)) {
    return diskImagePath
  }

  // If not found next to config, try the disk's asset folder (for development)
  if (config.name && config.name !== 'Apple2TS') {
    const diskAssetFolder = config.name.toLowerCase().replace(/\s+/g, '')
    let diskAssetDiskPath: string
    
    if (app.isPackaged) {
      diskAssetDiskPath = path.join(process.resourcesPath, 'assets', diskAssetFolder, config.diskImage)
    } else {
      diskAssetDiskPath = path.join(__dirname, '../../assets', diskAssetFolder, config.diskImage)
    }
    
    if (fs.existsSync(diskAssetDiskPath)) {
      return diskAssetDiskPath
    }
  }

  console.warn(`Disk image not found: ${config.diskImage} at ${diskImagePath}`)
  return null
}