import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { PublisherGithub } from '@electron-forge/publisher-github'
import fs from 'fs'
import path from 'path'

// Determine which asset folder to use for branding
// This bakes the branding into the app at build time
const assetFolder = process.env.APPLE2TS_CONFIG || 'apple2ts'
console.log(`🎨 Building with branding from: assets/${assetFolder}`)

// Load the config to get the app name
let appName = 'Apple2TS'
const configPath = path.join(__dirname, 'assets', assetFolder, 'config.json')
if (fs.existsSync(configPath)) {
  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    appName = configData.name || 'Apple2TS'
    console.log(`📱 App name: ${appName}`)
  } catch (error) {
    console.warn('Could not load config, using default app name')
  }
}

console.log(`🎨 Baking ${assetFolder} branding into the app as default...`)
const sourceAssetDir = path.join(__dirname, 'assets', assetFolder)
const appAssetDir = path.join(__dirname, 'assets', 'apple2ts-assets')
// Clean out old assets and create fresh directory
if (fs.existsSync(appAssetDir)) {
  fs.rmSync(appAssetDir, { recursive: true, force: true })
}
fs.mkdirSync(appAssetDir)

if (fs.existsSync(sourceAssetDir)) {
  const files = fs.readdirSync(sourceAssetDir)
  files.forEach(file => {
    // Skip PSD files
    if (file.toLowerCase().endsWith('.psd')) {
      console.log(`  ⏭️  Skipping ${file} (PSD file)`)
      return
    }
    const srcFile = path.join(sourceAssetDir, file)
    const destFile = path.join(appAssetDir, file)
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile)
      console.log(`  ✅ Copied ${file} to apple2ts-assets`)
    }
  })
  console.log(`🎨 Branding complete! App will use ${assetFolder} assets.`)
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: appName, // Use the name from config
    // Platform-specific icon paths - uses the selected asset folder for branding
    icon: process.platform === 'darwin' ? `assets/${assetFolder}/MacOS.icns` :
          process.platform === 'win32' ? `assets/${assetFolder}/Windows.ico` :
          `assets/${assetFolder}/App.png`,
    // Linux uses lowercase, Mac/Windows use the app name as-is
    ...(process.platform === 'linux' ? { executableName: appName.toLowerCase().replace(/\s+/g, '_') } : {}),
    extraResource: [
      'apple2ts-dist',
      'assets/apple2ts-assets', // Include assets folder for splash image and icons
      'src/about.css', // Include about CSS for About dialog
      // Include macOS helper files for unsigned app installation
      'scripts/fix-macos-app.sh',
      'resources/macos-README.md'
    ],
    // Copy icon to root for Windows app.ico
    ...(process.platform === 'win32' ? {
      win32metadata: {
        FileDescription: appName,
        ProductName: appName,
        CompanyName: 'CT6502'
      }
    } : {}),
    // macOS file associations
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
    // Code signing configuration for macOS
    ...(process.env.APPLE_IDENTITY && !process.env.SKIP_CODE_SIGNING ? {
      osxSign: {
        identity: process.env.APPLE_IDENTITY
      },
      // Only include notarization if APPLE_ID is set
      ...(process.env.APPLE_ID ? {
        osxNotarize: {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_ID_PASSWORD || '@keychain:Application Loader: your-apple-id@example.com',
          teamId: process.env.APPLE_TEAM_ID || '55W39578ES'
        }
      } : {})
    } : {})
  },
  rebuildConfig: {},
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      // Rename output files to remove version numbers
      for (const makeResult of makeResults) {
        for (let i = 0; i < makeResult.artifacts.length; i++) {
          const artifactPath = makeResult.artifacts[i]
          const fileName = path.basename(artifactPath)
          const dirName = path.dirname(artifactPath)
          
          console.log(`Processing file: ${fileName}`)
          
          // Remove version numbers from filenames
          let newFileName = fileName
          
          // Windows Setup: Apple2TS-1.0.4.Setup.exe -> Apple2TS.exe
          if (fileName.match(/^(.+)-\d+\.\d+\.\d+.Setup\.exe$/)) {
            newFileName = fileName.replace(/-\d+\.\d+\.\d+.Setup\.exe$/, '-Setup.exe')
          }

          // Windows NuGet: apple2ts-1.0.4-full.nupkg -> apple2ts-full.nupkg
          if (fileName.match(/^(.+)-\d+\.\d+\.\d+(-full\.nupkg)$/)) {
            newFileName = fileName.replace(/-\d+\.\d+\.\d+(-full\.nupkg)$/, '$1')
          }
          
          // Linux Deb: apple2ts_1.0.4_amd64.deb -> apple2ts_amd64.deb
          if (fileName.match(/^(.+)_\d+\.\d+\.\d+_(.+)\.deb$/)) {
            newFileName = fileName.replace(/_\d+\.\d+\.\d+_/, '_')
          }
          
          // Linux RPM: apple2ts-1.0.4-1.x86_64.rpm -> apple2ts.x86_64.rpm
          if (fileName.match(/^(.+)-\d+\.\d+\.\d+-\d+\.(.+)\.rpm$/)) {
            newFileName = fileName.replace(/-\d+\.\d+\.\d+-\d+\./, '.')
          }
          
          if (newFileName !== fileName) {
            const newPath = path.join(dirName, newFileName)
            console.log(`Renaming: ${fileName} -> ${newFileName}`)
            fs.renameSync(artifactPath, newPath)
            makeResult.artifacts[i] = newPath
          }
        }
      }
      return makeResults
    }
  },
  makers: [
    new MakerDMG({
      format: 'ULFO',
      icon: `assets/${assetFolder}/MacOS.icns`,
      name: appName
    }, ['darwin']),
    new MakerSquirrel({
      name: appName,
      exe: `${appName}.exe`,
      setupExe: `${appName}-Setup.exe`,
      setupIcon: path.resolve(__dirname, 'assets', assetFolder, 'Windows.ico'),
      iconUrl: 'https://github.com/ct6502/apple2ts-app/raw/refs/heads/main/assets/apple2ts/Windows.ico',
      options: {
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        fileAssociations: [
          {
            ext: "a2ts",
            name: "Apple2TS Save State",
            description: "Apple2TS Save State",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          },
          {
            ext: "woz",
            name: "Apple II Disk Image",
            description: "Apple II WOZ Disk Image",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          },
          {
            ext: "dsk",
            name: "Apple II Disk Image",
            description: "Apple II DSK Disk Image",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          },
          {
            ext: "do",
            name: "Apple II Disk Image",
            description: "Apple II DO Disk Image",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          },
          {
            ext: "2mg",
            name: "Apple II Hard Drive Image",
            description: "Apple II 2MG Hard Drive Image",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          },
          {
            ext: "hdv",
            name: "Apple II Hard Drive Image",
            description: "Apple II HDV Hard Drive Image",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          },
          {
            ext: "po",
            name: "Apple II Hard Drive Image",
            description: "Apple II PO Hard Drive Image",
            icon: path.resolve(__dirname, 'assets', 'apple2ts', 'DiskImage.ico')
          }
        ]
      }
    }),
    new MakerRpm({
      options: {
        bin: appName.toLowerCase().replace(/\s+/g, '_')
      }
    }),
    new MakerDeb({
      options: {
        bin: appName.toLowerCase().replace(/\s+/g, '_')
      }
    }),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'ct6502', // GitHub username
        name: 'apple2ts-app'  // repository name
      },
      draft: false,
      prerelease: false,
      force: true
    })
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.main.config.ts',
          target: 'preload',
        },
      ],
      renderer: [], // No renderer needed - we load Apple2TS directly via file:// URL
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: false, // Disable to avoid keychain errors
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
}

export default config
