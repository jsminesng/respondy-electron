import path from 'path'
import dotenv from 'dotenv'
import { app, ipcMain, BrowserWindow, screen } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { createOverlayWindow } from './helpers/create-overlay-window'
import {
  analyzeSentimentKorean,
  generateReplySuggestions,
} from './services/ai-service'
import type { NotificationPayload, OcrSettings } from '../shared/respondy-types'
import { ocrSettingsStore } from './services/ocr-settings'
import { startOcrLoop } from './services/ocr-loop'

const isProd = process.env.NODE_ENV === 'production'

const envDir = path.join(__dirname, '..')
dotenv.config({ path: path.join(envDir, '.env') })
dotenv.config({ path: path.join(envDir, '.env.local') })

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let ocrLoopHandle: ReturnType<typeof startOcrLoop> | null = null

function sendToRenderer(
  win: BrowserWindow | null,
  channel: string,
  payload: NotificationPayload,
) {
  if (!win || win.isDestroyed()) return
  try {
    win.webContents.send(channel, payload)
  } catch {
    // 창이 닫히는 순간 레이스로 webContents가 이미 파괴된 경우
  }
}

function broadcastNotification(payload: NotificationPayload) {
  const channel = 'notification-detected'
  sendToRenderer(mainWindow, channel, payload)
  sendToRenderer(overlayWindow, channel, payload)
}

function showOverlayFromPayload() {
  const ov = overlayWindow
  if (ov && !ov.isDestroyed()) {
    try {
      ov.show()
      ov.focus()
    } catch {
      /* 창 파괴 직후 */
    }
  }
}

function restartOcrLoop() {
  ocrLoopHandle?.stop()
  ocrLoopHandle = null
  const s = ocrSettingsStore.store
  if (!s.enabled) return
  ocrLoopHandle = startOcrLoop(
    () => ocrSettingsStore.store,
    (text) => {
      broadcastNotification({
        sender: 'OCR',
        message: text.slice(0, 8000),
        source: 'ocr',
        receivedAt: Date.now(),
      })
      showOverlayFromPayload()
    },
    (err) => {
      console.error('[Respondy] OCR:', err.message)
    },
  )
}

;(async () => {
  await app.whenReady()

  mainWindow = createWindow('main', {
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Respondy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  overlayWindow = createOverlayWindow({
    width: 400,
    height: 580,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  /* loadURL 전에 등록해야 렌더러 첫 invoke 시 핸들러가 없다는 오류가 나지 않음 */
  ipcMain.handle('analyze-sentiment', async (_evt, text: string) => {
    return analyzeSentimentKorean(String(text ?? ''))
  })

  ipcMain.handle(
    'generate-replies',
    async (
      _evt,
      payload: {
        sender: string
        message: string
        sentimentSummary: string
        dominantLabel: string
      },
    ) => {
      return generateReplySuggestions(payload)
    },
  )

  ipcMain.on('overlay:hide', () => {
    const ov = overlayWindow
    if (ov && !ov.isDestroyed()) {
      try {
        ov.hide()
      } catch {}
    }
  })

  ipcMain.on('overlay:show', () => {
    const ov = overlayWindow
    if (ov && !ov.isDestroyed()) {
      try {
        ov.show()
        ov.focus()
      } catch {}
    }
  })

  ipcMain.handle('ocr:get-settings', () => ocrSettingsStore.store)

  ipcMain.handle('ocr:set-settings', (_evt, partial: Partial<OcrSettings>) => {
    const cur = ocrSettingsStore.store
    const next: OcrSettings = {
      ...cur,
      ...partial,
      region: partial.region
        ? { ...cur.region, ...partial.region }
        : cur.region,
    }
    ocrSettingsStore.set(next)
    restartOcrLoop()
  })

  ipcMain.handle('ocr:get-display-bounds', () => {
    const { bounds } = screen.getPrimaryDisplay()
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    }
  })

  if (isProd) {
    await mainWindow.loadURL('app://./')
    await overlayWindow.loadURL('app://./overlay/')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    await overlayWindow.loadURL(`http://localhost:${port}/overlay/`)
  }

  restartOcrLoop()

  app.on('before-quit', () => {
    ocrLoopHandle?.stop()
    ocrLoopHandle = null
  })
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})
