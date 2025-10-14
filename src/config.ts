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
 * Load configuration from apple2ts_config.json file located next to the app
 */
export function loadConfig(): Apple2TSConfig {
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
    } else {
      console.log('No config file found, using defaults')
      return DEFAULT_CONFIG
    }
  } catch (error) {
    console.error('Error loading config:', error)
    console.log('Using default config due to error')
    return DEFAULT_CONFIG
  }
}

/**
 * Get the path to assets based on config
 * For custom games, looks next to the config file
 * Falls back to default assets
 */
export function getAssetPath(config: Apple2TSConfig, assetName: string): string {
  if (config.name && config.name !== 'Apple2TS') {
    // Look for custom game asset next to config file
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
  }
  
  // Fall back to default assets
  return app.isPackaged 
    ? path.join(process.resourcesPath, 'assets', assetName)
    : path.join(__dirname, '../../assets', assetName)
}

/**
 * Get the disk image path if specified in config
 */
export function getDiskImagePath(config: Apple2TSConfig): string | null {
  if (!config.diskImage) {
    return null
  }

  // Look for disk image next to the config file
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

  console.warn(`Disk image not found: ${config.diskImage} at ${diskImagePath}`)
  return null
}