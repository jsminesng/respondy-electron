import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { OcrRegion } from '../../shared/respondy-types'
import { Jimp, ResizeStrategy } from 'jimp'

const execFileAsync = promisify(execFile)
const INCOMING_ONLY_WIDTH_RATIO = 0.68

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function getIncomingOnlyWidth(width: number): number {
  return Math.max(32, Math.floor(width * INCOMING_ONLY_WIDTH_RATIO))
}

async function preprocessForOcr(imageBuffer: Buffer): Promise<Buffer> {
  const image = await Jimp.read(imageBuffer)
  const targetWidth = Math.min(2200, Math.max(64, image.bitmap.width * 3))
  const targetHeight = Math.min(2200, Math.max(64, image.bitmap.height * 3))

  // 작은 한글 UI 글자는 확대 + 명암 강화 후 이진화해야 인식률이 좋아진다.
  image
    .greyscale()
    .resize({
      w: targetWidth,
      h: targetHeight,
      mode: ResizeStrategy.BEZIER,
    })
    .contrast(0.45)
    .normalize()
    .convolute([
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ])
    .threshold({ max: 195 })

  const out = await image.getBuffer('image/png')
  return Buffer.isBuffer(out) ? out : Buffer.from(out)
}

function cropIncomingOnly(image: Jimp): Jimp {
  image.crop({
    x: 0,
    y: 0,
    w: getIncomingOnlyWidth(image.bitmap.width),
    h: image.bitmap.height,
  })
  return image
}

/**
 * macOS: `screencapture -R` (화면 기록 권한 필요)
 * Windows: 전체 화면 캡처 후 Jimp로 크롭
 */
export async function captureScreenRegion(
  region: OcrRegion,
  incomingOnly = false,
): Promise<Buffer> {
  const w = Math.max(8, Math.floor(region.width))
  const h = Math.max(8, Math.floor(region.height))
  const x = Math.floor(region.x)
  const y = Math.floor(region.y)
  const captureWidth = incomingOnly ? getIncomingOnlyWidth(w) : w

  if (process.platform === 'darwin') {
    const out = path.join(
      os.tmpdir(),
      `respondy-ocr-${process.pid}-${Date.now()}.png`,
    )
    try {
      await execFileAsync('/usr/sbin/screencapture', [
        '-x',
        '-R',
        `${x},${y},${captureWidth},${h}`,
        '-t',
        'png',
        out,
      ])
      const buf = fs.readFileSync(out)
      return preprocessForOcr(buf)
    } finally {
      try {
        fs.unlinkSync(out)
      } catch {
        /* ignore */
      }
    }
  }

  if (process.platform === 'win32') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const screenshot =
      require('screenshot-desktop') as typeof import('screenshot-desktop')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const full = await screenshot({ format: 'png' })
    const image = await Jimp.read(full)
    const iw = image.bitmap.width
    const ih = image.bitmap.height
    const cx = clamp(x, 0, Math.max(0, iw - 1))
    const cy = clamp(y, 0, Math.max(0, ih - 1))
    const cw = clamp(w, 8, iw - cx)
    const ch = clamp(h, 8, ih - cy)
    image.crop({ x: cx, y: cy, w: cw, h: ch })
    if (incomingOnly) {
      cropIncomingOnly(image)
    }
    const out = await image.getBuffer('image/png')
    const cropped = Buffer.isBuffer(out) ? out : Buffer.from(out)
    return preprocessForOcr(cropped)
  }

  throw new Error(
    '이 플랫폼에서는 화면 OCR 캡처를 지원하지 않습니다. macOS 또는 Windows를 사용하세요.',
  )
}
