import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export interface Apple2TSConfig {
  path?: string
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
const loadConfigFromAssetFolder = (folderName: string): Apple2TSConfig | null => {
  let configPath: string

  if (app.isPackaged) {
    configPath = path.join(process.resourcesPath, folderName, 'config.json')
  } else {
    configPath = path.join(__dirname, '../..', folderName, 'config.json')
  }

  console.log(`Looking for asset config at: ${configPath}`)

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configData) as Apple2TSConfig
      console.log('Loaded asset config:', config)
      config.path = path.dirname(configPath)
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
 * Load configuration from asset folder
 */
export function loadConfig(): Apple2TSConfig {

  let assetConfig = loadConfigFromAssetFolder('apple2ts-assets')
  if (assetConfig) {
    return {
      ...DEFAULT_CONFIG,
      ...assetConfig
    }
  }

  assetConfig = loadConfigFromAssetFolder('assets/apple2ts')
  if (assetConfig) {
    return {
      ...DEFAULT_CONFIG,
      ...assetConfig
    }
  }

  console.log('No config file found, using basic defaults')
  return DEFAULT_CONFIG
}

/**
 * Get the path to assets based on config
 */
export function getAssetPath(config: Apple2TSConfig, assetName: string): string {
  if (config.path) {
    return path.join(config.path, assetName)
  }
  return app.isPackaged 
    ? path.join(process.resourcesPath, 'apple2ts-assets', assetName)
    : path.join(__dirname, '../../apple2ts-assets', assetName)
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

  console.warn(`Disk image not found matching pattern: ${config.diskImage} in ${searchDirectories.join(', ')}`)
  return null
}