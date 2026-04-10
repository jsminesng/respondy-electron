import type { OcrSettings } from '../../shared/respondy-types'
import { captureScreenRegion } from './ocr-screen-capture'
import { recognizeImageText, terminateOcrWorker } from './ocr-tesseract'

export type OcrLoopHandle = { stop: () => void }

function stripKakaoTime(text: string): string {
  return text
    .replace(/\b(오전|오후)\s*\d{1,2}:\d{2}\b/g, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
}

/**
 * 주기적으로 화면 영역을 캡처해 OCR → 텍스트가 바뀌었을 때만 콜백.
 */
export function startOcrLoop(
  getSettings: () => OcrSettings,
  onText: (text: string) => void,
  onError?: (err: Error) => void,
): OcrLoopHandle {
  let timer: ReturnType<typeof setInterval> | null = null
  let lastNormalized = ''
  let busy = false

  const tick = async () => {
    const s = getSettings()
    if (!s.enabled) return
    if (s.region.width < 8 || s.region.height < 8) return
    if (busy) return
    busy = true
    try {
      const buf = await captureScreenRegion(s.region, s.incomingOnly)
      const raw = await recognizeImageText(buf)
      const cleaned = stripKakaoTime(raw)
      const norm = cleaned.replace(/\s+/g, ' ').trim()
      if (norm.length < 2) return
      if (norm === lastNormalized) return
      lastNormalized = norm
      onText(norm)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      onError?.(err)
    } finally {
      busy = false
    }
  }

  const arm = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    const s = getSettings()
    if (!s.enabled) return
    const ms = Math.max(500, Math.min(15000, s.intervalMs || 1800))
    void tick()
    timer = setInterval(() => {
      void tick()
    }, ms)
  }

  arm()

  return {
    stop: () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      lastNormalized = ''
      void terminateOcrWorker()
    },
  }
}
