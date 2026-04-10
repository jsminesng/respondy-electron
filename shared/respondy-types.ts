export type NotificationPayload = {
  sender: string
  message: string
  raw?: string
  source: 'windows' | 'darwin' | 'simulated' | 'ocr'
  receivedAt: number
}

export type OcrRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type OcrSettings = {
  enabled: boolean
  intervalMs: number
  region: OcrRegion
  incomingOnly: boolean
}

export type SentimentLabel = {
  label: string
  score: number
}

export type SentimentResult = {
  labels: SentimentLabel[]
  dominant: string
  summary: string
}

export type ReplyTone = 'warm' | 'witty' | 'firm'

export type ReplySuggestion = {
  tone: ReplyTone
  text: string
}

export type GenerateRepliesInput = {
  sender: string
  message: string
  sentimentSummary: string
  dominantLabel: string
}

export type DisplayBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type RespondyApi = {
  onNotification: (callback: (payload: NotificationPayload) => void) => () => void
  analyzeSentiment: (text: string) => Promise<SentimentResult>
  generateReplies: (payload: GenerateRepliesInput) => Promise<ReplySuggestion[]>
  hideOverlay: () => void
  showOverlay: () => void
  getOcrSettings: () => Promise<OcrSettings>
  setOcrSettings: (partial: Partial<OcrSettings>) => Promise<void>
  getDisplayBounds: () => Promise<DisplayBounds>
}
