import { requestJson } from './backend-client'

type OcrExtractResponse = {
  text?: unknown
  message?: unknown
  transcript?: unknown
}

function getOcrExtractEndpoint(): string {
  return process.env.OCR_EXTRACT_ENDPOINT?.trim() || '/ocr/extract/'
}

function extractText(body: OcrExtractResponse): string {
  const value = body.text ?? body.message ?? body.transcript
  return typeof value === 'string' ? value.trim() : ''
}

export async function extractTextFromImage(image: Buffer): Promise<string> {
  const body = await requestJson<OcrExtractResponse>(getOcrExtractEndpoint(), {
    method: 'POST',
    auth: true,
    body: {
      imageBase64: image.toString('base64'),
      mimeType: 'image/png',
    },
  })

  return extractText(body)
}
