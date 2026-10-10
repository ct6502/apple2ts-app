import { app, BrowserWindow } from "electron"
import { autoUpdater, CancellationToken } from "electron-updater"
import Store from "electron-store"
import { debug } from "./debug"

const store = new Store()
let manualUpdateCheck = false

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

// Test mode: `npm start -- -- --fake-old-version` pretends to be v0.0.1 so the update dialog appears in dev
const fakeVersion = "0.0.1"
export const fakeOldVersion = process.argv.includes("--fake-old-version")
if (fakeOldVersion) {
  // Typings mark currentVersion read-only, but the runtime has a setter
  const mutableUpdater = autoUpdater as unknown as { currentVersion: string }
  mutableUpdater.currentVersion = fakeVersion
  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.setFeedURL({ provider: "github", owner: "ct6502", repo: "apple2ts-app" })
}

const runningVersion = () => fakeOldVersion ? fakeVersion : app.getVersion()

interface DialogButton {
  label: string
  action: string
}

interface DialogState {
  message: string
  detail?: string
  progress?: number
  buttons: DialogButton[]
}

let updateWindow: BrowserWindow | null = null
let pageLoaded = false
let lastState: DialogState = { message: "", buttons: [] }
let downloadToken: CancellationToken | null = null
let availableVersion = ""

const dialogHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f5f5f5;color:#222;user-select:none}
@media(prefers-color-scheme:dark){body{background:#2b2b2b;color:#eee}}
h3{margin:0 0 8px;font-size:16px}
#detail{font-size:13px;opacity:.8;margin-bottom:12px}
progress{width:100%;height:14px}
#pct{margin-top:6px;font-size:12px;opacity:.7}
#buttons{position:absolute;right:24px;bottom:20px;display:flex;gap:8px}
button{font:13px system-ui,sans-serif;padding:4px 16px;min-width:72px;cursor:default;color:inherit;background:#fff;border:1px solid rgba(0,0,0,.22);border-radius:4px;box-shadow:0 1px 1px rgba(0,0,0,.08)}
button:active{filter:brightness(.92)}
button.primary{background:#0067c0;border-color:#0067c0;color:#fff}
body.mac #buttons{flex-direction:row-reverse}
body.mac button{border-radius:6px;padding:3px 16px;border-color:rgba(0,0,0,.18);box-shadow:0 .5px 1px rgba(0,0,0,.2)}
body.mac button.primary{background:#007aff;border-color:#007aff}
@media(prefers-color-scheme:dark){button{background:#3a3a3c;border-color:rgba(255,255,255,.15)}button.primary{background:#0a84ff;border-color:#0a84ff}}
</style></head><body>
<h3 id="msg"></h3>
<div id="detail"></div>
<progress id="bar" max="100" value="0" hidden></progress>
<div id="pct"></div>
<div id="buttons"></div>
<script>
if(navigator.userAgent.indexOf("Mac")>=0)document.body.className="mac";
function render(s){
  document.getElementById("msg").textContent=s.message;
  document.getElementById("detail").textContent=s.detail||"";
  var bar=document.getElementById("bar");
  bar.hidden=s.progress===undefined;
  bar.value=s.progress||0;
  document.getElementById("pct").textContent=s.progress!==undefined&&s.progress<100?Math.round(s.progress)+"%":"";
  var b=document.getElementById("buttons");
  b.textContent="";
  s.buttons.forEach(function(x,i){
    var e=document.createElement("button");
    e.textContent=x.label;
    if(i===0)e.className="primary";
    e.onclick=function(){location.href="app-update://"+x.action};
    b.appendChild(e);
    if(i===0)e.focus();
  });
}
</script>
</body></html>`

function renderDialog(): void {
  const win = updateWindow
  if (!win || win.isDestroyed() || !pageLoaded) return
  win.webContents.executeJavaScript(`render(${JSON.stringify(lastState)})`).catch(error => {
    debug.error("Unable to render update dialog:", error)
  })
}

function closeDialog(): void {
  const win = updateWindow
  updateWindow = null
  win?.destroy()
}

function showDialog(state: DialogState): void {
  lastState = state

  if (updateWindow && !updateWindow.isDestroyed()) {
    renderDialog()
    updateWindow.show()
    return
  }

  const win = new BrowserWindow({
    width: 420,
    height: 200,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "Apple2TS Update",
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  })
  updateWindow = win
  pageLoaded = false
  win.setMenuBarVisibility(false)
  win.webContents.on("did-finish-load", () => {
    pageLoaded = true
    renderDialog()
  })
  win.webContents.on("will-navigate", (event, url) => {
    event.preventDefault()
    if (url.startsWith("app-update://")) {
      handleAction(url.slice("app-update://".length))
    }
  })
  win.on("closed", () => {
    if (updateWindow === win) updateWindow = null
    // Closing the window mid-download cancels it
    downloadToken?.cancel()
  })
  void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dialogHtml)}`)
}

function showMessage(message: string, detail?: string): void {
  showDialog({ message, detail, buttons: [{ label: "OK", action: "close" }] })
}

async function startDownload(): Promise<void> {
  const token = new CancellationToken()
  downloadToken = token
  showDialog({ message: "Downloading", progress: 0, buttons: [] })

  try {
    await autoUpdater.downloadUpdate(token)
  } catch (error) {
    if (token.cancelled) {
      debug.log("Update download cancelled")
    } else {
      debug.error("Unable to download update:", error)
      showMessage("Unable to download the update.", "Please check your internet connection and try again.")
    }
  } finally {
    downloadToken = null
  }
}

function handleAction(action: string): void {
  switch (action) {
    case "download":
      // @ts-expect-error - electron-store typing issue
      store.delete("dismissedUpdateVersion")
      void startDownload()
      break
    case "later":
      // @ts-expect-error - electron-store typing issue
      store.set("dismissedUpdateVersion", availableVersion)
      closeDialog()
      break
    case "install":
      debug.log("Installing update and relaunching")
      closeDialog()
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      break
    default:
      closeDialog()
  }
}

autoUpdater.on("download-progress", progress => {
  lastState = { message: "Downloading", progress: progress.percent, buttons: [] }
  renderDialog()
})

autoUpdater.on("update-downloaded", () => {
  debug.log("Update downloaded; waiting for user to install")
  showDialog({
    message: "Ready to Install",
    progress: 100,
    buttons: [{ label: "Install and Relaunch", action: "install" }]
  })
})

autoUpdater.on("update-available", info => {
  // @ts-expect-error - electron-store typing issue
  const dismissedVersion = store.get("dismissedUpdateVersion")
  if (dismissedVersion === info.version && !manualUpdateCheck && !fakeOldVersion) {
    debug.log(`User already dismissed version ${info.version}`)
    return
  }
  if (downloadToken) return

  availableVersion = info.version
  showDialog({
    message: "A new version of Apple2TS is available.",
    detail: `You are running version ${runningVersion()}. Version ${info.version} is available.`,
    buttons: [
      { label: "Install Update", action: "download" },
      { label: "Later", action: "later" }
    ]
  })
})

/**
 * Check for updates published through electron-builder's GitHub release feed.
 */
export async function checkForUpdates(showNoUpdateDialog = false): Promise<void> {
  manualUpdateCheck = showNoUpdateDialog

  if (!app.isPackaged && !fakeOldVersion) {
    if (showNoUpdateDialog) {
      showMessage("Update checks are available in packaged builds only.")
    }
    return
  }

  try {
    debug.log(`Checking for updates from version ${runningVersion()}`)
    const result = await autoUpdater.checkForUpdates()

    if (!result?.isUpdateAvailable && showNoUpdateDialog) {
      showMessage("You are running the latest version.", `Current version: ${runningVersion()}`)
    }
  } catch (error) {
    debug.error("Error checking for updates:", error)

    if (showNoUpdateDialog) {
      showMessage("Unable to check for updates.", "Please check your internet connection and try again.")
    }
  }
}
