import { createWorker, type Worker } from 'tesseract.js'

let worker: Worker | null = null
let workerPromise: Promise<Worker> | null = null
const OCR_BASE_PARAMS = {
  preserve_interword_spaces: '1',
  user_defined_dpi: '300',
} as const

function scoreRecognizedText(text: string, confidence: number): number {
  const compact = text.replace(/\s+/g, '')
  if (!compact) return -Infinity

  const hangulCount = (compact.match(/[가-힣]/g) ?? []).length
  const digitCount = (compact.match(/\d/g) ?? []).length
  const weirdCount = (
    compact.match(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9.,!?'"()\-\s]/g) ?? []
  ).length

  const hangulRatio = hangulCount / compact.length
  return (
    confidence +
    hangulRatio * 35 +
    hangulCount * 0.8 -
    weirdCount * 2.5 -
    digitCount * 0.2
  )
}

async function recognizeWithPsm(
  w: Worker,
  image: Buffer,
  psm: '6' | '11',
): Promise<{ text: string; confidence: number; score: number }> {
  await w.setParameters({
    ...OCR_BASE_PARAMS,
    tessedit_pageseg_mode: psm,
  })
  const { data } = await w.recognize(image)
  const text = (data.text ?? '').trim()
  const confidence = Number(data.confidence ?? 0)
  return {
    text,
    confidence,
    score: scoreRecognizedText(text, confidence),
  }
}

async function getWorker(): Promise<Worker> {
  if (worker) return worker
  if (!workerPromise) {
    workerPromise = createWorker('kor', 1, {
      logger: () => {},
    }).then(async (w) => {
      await w.setParameters(OCR_BASE_PARAMS)
      worker = w
      return w
    })
  }
  return workerPromise
}

export async function recognizeImageText(image: Buffer): Promise<string> {
  const w = await getWorker()
  const block = await recognizeWithPsm(w, image, '6')

  // 여러 말풍선이 띄엄띄엄 있는 경우를 대비해 sparse 모드도 한 번 더 본다.
  if (block.score < 70) {
    const sparse = await recognizeWithPsm(w, image, '11')
    return sparse.score > block.score ? sparse.text : block.text
  }

  return block.text
}

export async function terminateOcrWorker(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
    workerPromise = null
  }
}
