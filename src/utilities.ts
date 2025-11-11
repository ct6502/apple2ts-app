import { app, dialog } from 'electron'

export const isRunningFromQuarantine = (): boolean => {
  if (process.platform !== 'darwin') {
    return false
  }
  const appPath = app.getAppPath()
  if (appPath.includes('private/var')) {
    return true
  }
}

export const showQuarantineWarning = async () => {
  const appName = app.getName()
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Security Notice',
    message: `${appName} is running from quarantine`,
    detail: `macOS has quarantined this app, which will prevent it from loading the disk image.

To fix this, open Terminal and run:
xattr -rd com.apple.quarantine "/Applications/${appName}.app"

You may need to adjust the path if ${appName} is not in the Applications folder.

Then restart the application.

Would you like to continue anyway?`,
    buttons: ['Continue Anyway', 'Quit'],
    defaultId: 0,
    cancelId: 1,
    icon: undefined
  })

  if (result.response === 1) {
    setTimeout(() => {
      process.exit(0)  // Clean exit without Electron cleanup
    }, 100)  // Give dialog time to close
  }
}

