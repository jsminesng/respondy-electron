import type { OcrSettings } from '../../shared/respondy-types'
import {
  captureScreenRegion,
  createFrameSignature,
  getFrameDifferenceRatio,
  type FrameSignature,
} from './ocr-screen-capture'
import { extractTextFromImage } from './backend-ocr'

export type OcrLoopHandle = { stop: () => void }
const FRAME_CHANGE_THRESHOLD = 0.035

function stripKakaoTime(text: string): string {
  return text
    .replace(/\b(오전|오후)\s*\d{1,2}:\d{2}\b/g, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
}

/**
 * 주기적으로 화면 영역을 캡처해 프레임 변화가 감지될 때만 OCR을 실행.
 */
export function startOcrLoop(
  getSettings: () => OcrSettings,
  onText: (text: string) => void,
  onError?: (err: Error) => void,
): OcrLoopHandle {
  let timer: ReturnType<typeof setInterval> | null = null
  let lastFrameSignature: FrameSignature | null = null
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
      const signature = await createFrameSignature(buf)
      if (lastFrameSignature) {
        const diffRatio = getFrameDifferenceRatio(lastFrameSignature, signature)
        if (diffRatio < FRAME_CHANGE_THRESHOLD) return
      }
      lastFrameSignature = signature

      const raw = await extractTextFromImage(buf)
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
      lastFrameSignature = null
      lastNormalized = ''
    },
  }
}
