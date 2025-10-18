/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  })
 * ```
 */

import './index.css'

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
)

// Add a status bar to show the current URL
window.addEventListener('DOMContentLoaded', () => {
  const statusBar = document.createElement('div')
  statusBar.id = 'status-bar'
  statusBar.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    color: #0f0;
    font-family: monospace;
    font-size: 11px;
    padding: 4px 8px;
    z-index: 10000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-top: 1px solid #0f0;
  `
  statusBar.textContent = `URL: ${window.location.href}`
  document.body.appendChild(statusBar)
  
  console.log('Status bar added. Current URL:', window.location.href)
})
