import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { PublisherGithub } from '@electron-forge/publisher-github';
import fs from 'fs';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/apple2ts', // path without extension
    executableName: 'apple2ts', // Ensure consistent executable name across platforms
    extraResource: [
      'apple2ts-dist',
      'assets', // Include assets folder for splash image and icons
      'src', // Include src folder for CSS files
      // Include macOS helper files for unsigned app installation
      'scripts/fix-macos-app.sh',
      'resources/macos-README.md'
    ],
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
    postPackage: async (forgeConfig, options) => {
      if (options.platform === 'darwin') {
        // Copy macOS helper files to package root for easy user access
        const packageDir = options.outputPaths[0];
        const resourcesDir = path.join(packageDir, 'Apple2TS.app', 'Contents', 'Resources');
        
        // Copy fix script
        const fixScriptSrc = path.join(resourcesDir, 'fix-macos-app.sh');
        const fixScriptDest = path.join(packageDir, 'fix-macos-app.sh');
        if (fs.existsSync(fixScriptSrc)) {
          fs.copyFileSync(fixScriptSrc, fixScriptDest);
          fs.chmodSync(fixScriptDest, '755'); // Make executable
        }
        
        // Copy README
        const readmeSrc = path.join(resourcesDir, 'macos-README.md');
        const readmeDest = path.join(packageDir, 'README.md');
        if (fs.existsSync(readmeSrc)) {
          fs.copyFileSync(readmeSrc, readmeDest);
        }
      }
    }
  },
  makers: [
    new MakerZIP({}, ['darwin']),
    new MakerSquirrel({
      options: {
        name: 'apple2ts',
        exe: 'apple2ts.exe'
      }
    }),
    new MakerRpm({
      options: {
        bin: 'apple2ts'
      }
    }),
    new MakerDeb({
      options: {
        bin: 'apple2ts'
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
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
