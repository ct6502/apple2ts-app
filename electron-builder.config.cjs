const fs = require("node:fs")
const path = require("node:path")

const assetFolder = process.env.APPLE2TS_CONFIG || "apple2ts"
const assetConfigPath = path.join(__dirname, "assets", assetFolder, "config.json")
let appName = "Apple2TS"

if (fs.existsSync(assetConfigPath)) {
  const assetConfig = JSON.parse(fs.readFileSync(assetConfigPath, "utf8"))
  appName = assetConfig.name || appName
}

const sourceAssetDir = path.join(__dirname, "assets", assetFolder)
const appAssetDir = path.join(__dirname, "assets", "apple2ts-assets")
fs.rmSync(appAssetDir, { recursive: true, force: true })
fs.mkdirSync(appAssetDir, { recursive: true })

if (fs.existsSync(sourceAssetDir)) {
  for (const file of fs.readdirSync(sourceAssetDir)) {
    if (file.toLowerCase().endsWith(".psd")) continue

    const sourcePath = path.join(sourceAssetDir, file)
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, path.join(appAssetDir, file))
    }
  }
}

const signedMacBuild = Boolean(process.env.APPLE_IDENTITY) && process.env.SKIP_CODE_SIGNING !== "true"
const notarizeMacBuild = signedMacBuild && Boolean(
  process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID
)

module.exports = {
  appId: "com.electron.app",
  productName: appName,
  directories: {
    output: "out/updates",
    buildResources: path.join("assets", assetFolder)
  },
  files: [".vite/build/**/*", "package.json"],
  extraResources: [
    { from: "apple2ts-dist", to: "apple2ts-dist" },
    { from: "assets/apple2ts-assets", to: "apple2ts-assets" },
    { from: "src/about.css", to: "about.css" },
    { from: "scripts/fix-macos-app.sh", to: "fix-macos-app.sh" },
    { from: "resources/macos-README.md", to: "macos-README.md" }
  ],
  artifactName: "${productName}-${version}-${arch}.${ext}",
  mac: {
    icon: path.join("assets", assetFolder, "MacOS.icns"),
    target: ["dmg", "zip"],
    category: "public.app-category.games",
    identity: signedMacBuild ? process.env.APPLE_IDENTITY : null,
    hardenedRuntime: signedMacBuild,
    gatekeeperAssess: false,
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: "Apple II Disk Image",
          CFBundleTypeRole: "Viewer",
          LSHandlerRank: "Default",
          CFBundleTypeExtensions: ["a2ts", "woz", "dsk", "do", "2mg", "hdv", "po"],
          CFBundleTypeIconFile: "DiskImage.icns"
        }
      ]
    },
    ...(notarizeMacBuild ? { notarize: true } : {})
  },
  win: {
    icon: path.join("assets", assetFolder, "Windows.ico"),
    target: ["nsis"],
    artifactName: "${productName}-${version}-setup.${ext}",
    fileAssociations: ["a2ts", "woz", "dsk", "do", "2mg", "hdv", "po"].map(ext => ({
      ext,
      icon: path.resolve(__dirname, "assets", "apple2ts", "DiskImage.ico")
    }))
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  linux: {
    icon: path.join("assets", assetFolder, "App.png"),
    target: ["AppImage"],
    category: "Game;Emulator;"
  },
  publish: {
    provider: "github",
    owner: "ct6502",
    repo: "apple2ts-app",
    releaseType: "release"
  }
}