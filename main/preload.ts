import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type {
  DisplayBounds,
  NotificationPayload,
  OcrSettings,
  RespondyApi,
  SentimentResult,
} from '../shared/respondy-types'

const respondy: RespondyApi = {
  onNotification(callback: (payload: NotificationPayload) => void) {
    const subscription = (_event: IpcRendererEvent, payload: NotificationPayload) =>
      callback(payload)
    ipcRenderer.on('notification-detected', subscription)
    return () => {
      ipcRenderer.removeListener('notification-detected', subscription)
    }
  },
  analyzeSentiment(text: string): Promise<SentimentResult> {
    return ipcRenderer.invoke('analyze-sentiment', text)
  },
  generateReplies(payload) {
    return ipcRenderer.invoke('generate-replies', payload)
  },
  hideOverlay() {
    ipcRenderer.send('overlay:hide')
  },
  showOverlay() {
    ipcRenderer.send('overlay:show')
  },
  getOcrSettings(): Promise<OcrSettings> {
    return ipcRenderer.invoke('ocr:get-settings')
  },
  setOcrSettings(partial: Partial<OcrSettings>): Promise<void> {
    return ipcRenderer.invoke('ocr:set-settings', partial)
  },
  getDisplayBounds(): Promise<DisplayBounds> {
    return ipcRenderer.invoke('ocr:get-display-bounds')
  },
}

contextBridge.exposeInMainWorld('respondy', respondy)

const legacyIpc = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

contextBridge.exposeInMainWorld('ipc', legacyIpc)

export type { RespondyApi }
export type IpcHandler = typeof legacyIpc
