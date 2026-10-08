import { app, dialog } from "electron"
import { autoUpdater } from "electron-updater"
import Store from "electron-store"
import { debug } from "./debug"

const store = new Store()
let manualUpdateCheck = false

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

autoUpdater.on("update-available", info => {
  // @ts-expect-error - electron-store typing issue
  const dismissedVersion = store.get("dismissedUpdateVersion")
  if (dismissedVersion === info.version && !manualUpdateCheck) {
    debug.log(`User already dismissed version ${info.version}`)
    return
  }

  void dialog.showMessageBox({
    type: "info",
    title: "Update Available",
    message: "A new version of Apple2TS is available.",
    detail: `You are running version ${app.getVersion()}. Version ${info.version} is ready to install. The app will restart after it downloads.`,
    buttons: ["Install Update", "Later"],
    defaultId: 0,
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      // @ts-expect-error - electron-store typing issue
      store.delete("dismissedUpdateVersion")
      return autoUpdater.downloadUpdate()
    }

    // @ts-expect-error - electron-store typing issue
    store.set("dismissedUpdateVersion", info.version)
    return undefined
  }).catch(error => {
    debug.error("Unable to download update:", error)
    return dialog.showMessageBox({
      type: "error",
      title: "Update Download Failed",
      message: "Unable to download the update.",
      detail: "Please check your internet connection and try again.",
      buttons: ["OK"]
    })
  })
})

autoUpdater.on("update-downloaded", () => {
  debug.log("Update downloaded; restarting to install")
  autoUpdater.quitAndInstall(false, true)
})

/**
 * Check for updates published through electron-builder's GitHub release feed.
 */
export async function checkForUpdates(showNoUpdateDialog = false): Promise<void> {
  manualUpdateCheck = showNoUpdateDialog

  if (!app.isPackaged) {
    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: "info",
        title: "Updates Unavailable",
        message: "Update checks are available in packaged builds only.",
        buttons: ["OK"]
      })
    }
    return
  }

  try {
    debug.log(`Checking for updates from version ${app.getVersion()}`)
    const result = await autoUpdater.checkForUpdates()

    if (!result?.isUpdateAvailable && showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: "info",
        title: "No Updates Available",
        message: "You are running the latest version.",
        detail: `Current version: ${app.getVersion()}`,
        buttons: ["OK"]
      })
    }
  } catch (error) {
    debug.error("Error checking for updates:", error)

    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: "error",
        title: "Update Check Failed",
        message: "Unable to check for updates.",
        detail: "Please check your internet connection and try again.",
        buttons: ["OK"]
      })
    }
  }
}
