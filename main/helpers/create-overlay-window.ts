import { screen, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import path from 'path'

export function createOverlayWindow(
  options: BrowserWindowConstructorOptions,
): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { x, y, width: screenW } = display.workArea
  const margin = 16
  const posY = y + margin

  const w = typeof options.width === 'number' ? options.width : 400
  const h = typeof options.height === 'number' ? options.height : 560
  const posX2 = x + screenW - w - margin

  const win = new BrowserWindow({
    ...options,
    x: posX2,
    y: posY,
    width: w,
    height: h,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
      ...options.webPreferences,
    },
  })

  return win
}
