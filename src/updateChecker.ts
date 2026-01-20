import { app, dialog, shell } from 'electron'
import { debug } from './debug'
import Store from 'electron-store'

const store = new Store()

interface GitHubRelease {
  tag_name: string
  name: string
  html_url: string
  published_at: string
}

/**
 * Compare version strings (e.g., "1.0.4" vs "1.0.5")
 * Returns true if newVersion is greater than currentVersion
 */
function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  // Remove 'v' prefix if present
  const current = currentVersion.split('.').map(Number)
  const latest = newVersion.split('.').map(Number)
  
  for (let i = 0; i < Math.max(current.length, latest.length); i++) {
    const curr = current[i] || 0
    const next = latest[i] || 0
    
    if (next > curr) return true
    if (next < curr) return false
  }
  
  return false
}

/**
 * Check for updates from GitHub releases
 */
export async function checkForUpdates(showNoUpdateDialog = false): Promise<void> {
  try {
    let currentVersion = app.getVersion()
    debug.log(`Current version: ${currentVersion}`)
    
    // Fetch latest release from GitHub
    const response = await fetch('https://api.github.com/repos/ct6502/apple2ts-app/releases/latest')
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }
    
    const release: GitHubRelease = await response.json()
    let latestVersion = release.tag_name

    // Remove the "v" prefix if present
    currentVersion = currentVersion.replace(/^v/, '')
    latestVersion = latestVersion.replace(/^v/, '')
    
    debug.log(`Latest version: ${latestVersion}`)
    
    if (isNewerVersion(currentVersion, latestVersion)) {
      debug.log('New version available!')
      
      // Check if user has already dismissed this version
      // @ts-expect-error - electron-store typing issue
      const dismissedVersion = store.get('dismissedUpdateVersion')
      if (dismissedVersion === latestVersion && !showNoUpdateDialog) {
        debug.log(`User already dismissed version ${latestVersion}`)
        return
      }
      
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version of Apple2TS is available!`,
        detail: `You are running version ${currentVersion}.\nVersion ${latestVersion} is now available.\n\nWould you like to download it?`,
        buttons: ['Download', 'Ignore'],
        defaultId: 0,
        cancelId: 1
      })
      
      if (result.response === 0) {
        // Open the download page
        shell.openExternal('https://ct6502.org/apple2ts/')
        // Clear dismissed version since user is downloading
        // @ts-expect-error - electron-store typing issue
        store.delete('dismissedUpdateVersion')
      } else {
        // User clicked "Later" - remember they dismissed this version
        // @ts-expect-error - electron-store typing issue
        store.set('dismissedUpdateVersion', latestVersion)
        debug.log(`User dismissed version ${latestVersion}`)
      }
    } else {
      debug.log('You are running the latest version')
      
      if (showNoUpdateDialog) {
        await dialog.showMessageBox({
          type: 'info',
          title: 'No Updates Available',
          message: 'You are running the latest version',
          detail: `Current version: ${currentVersion}`,
          buttons: ['OK']
        })
      }
    }
  } catch (error) {
    debug.error('Error checking for updates:', error)
    
    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Update Check Failed',
        message: 'Unable to check for updates',
        detail: 'Please check your internet connection and try again.',
        buttons: ['OK']
      })
    }
  }
}
