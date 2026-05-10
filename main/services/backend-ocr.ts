import { requestJson } from './backend-client'

type CaptureMessage = {
  content?: unknown
}

type CaptureAnalysisResponse = {
  success?: unknown
  data?: {
    messages?: CaptureMessage[]
  }
}

function getCaptureEndpoint(sessionId: number): string {
  const template =
    process.env.OCR_EXTRACT_ENDPOINT?.trim() || '/sessions/{session_id}/captures/'
  if (template.includes('{session_id}')) {
    return template.replace('{session_id}', String(sessionId))
  }
  return `/sessions/${sessionId}/captures/`
}

function extractText(body: CaptureAnalysisResponse): string {
  const messages = body.data?.messages
  if (!Array.isArray(messages) || messages.length === 0) return ''
  return messages
    .map((item) => (typeof item?.content === 'string' ? item.content.trim() : ''))
    .filter(Boolean)
    .join('\n')
}

export async function extractTextFromImage(
  image: Buffer,
  sessionId: number,
): Promise<string> {
  const body = await requestJson<CaptureAnalysisResponse>(
    getCaptureEndpoint(sessionId),
    {
    method: 'POST',
    auth: true,
    body: {
      image_base64: `data:image/png;base64,${image.toString('base64')}`,
      source_type: 'electron',
      screen_context: {
        masked: true,
      },
    },
    },
  )

  return extractText(body)
}
