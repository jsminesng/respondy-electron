import type { AnalysisHistoryRecord } from '../../shared/respondy-types'
import { requestJson } from './backend-client'

type AvatarShape = {
  id?: unknown
  name?: unknown
  current_relation?: unknown
  target_relation?: unknown
}

type SessionShape = {
  id?: unknown
  title?: unknown
  analysis_type?: unknown
  avatar_name?: unknown
  latest_summary?: unknown
  latest_emotion?: unknown
  latest_tone?: unknown
  latest_risk_level?: unknown
  latest_capture_status?: unknown
  situation_context?: unknown
  created_at?: unknown
  updated_at?: unknown
  avatar?: AvatarShape | null
  latest_messages?: CaptureMessageShape[]
  latest_analysis?: CaptureAnalysisShape | null
}

type CaptureMessageShape = {
  id?: unknown
  sender_type?: unknown
  content?: unknown
  message_order?: unknown
}

type CaptureAnalysisShape = {
  id?: unknown
  summary?: unknown
  emotion?: unknown
  tone?: unknown
  risk_level?: unknown
  strategy?: unknown
  recommended_replies?: unknown
}

type ListEnvelope<T> =
  | T[]
  | {
      data?: unknown
      results?: unknown
    }

function getAnalysisHistoryEndpoint(): string {
  return process.env.ANALYSIS_HISTORY_ENDPOINT?.trim() || '/sessions/'
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toTimestamp(...candidates: unknown[]): number {
  for (const item of candidates) {
    if (typeof item !== 'string' || !item.trim()) continue
    const parsed = Date.parse(item)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}

function extractList<T>(body: ListEnvelope<T>): T[] {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    const results = (body as { results?: unknown }).results
    if (Array.isArray(results)) return results as T[]

    const data = (body as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
    if (data && typeof data === 'object') {
      const nestedResults = (data as { results?: unknown }).results
      if (Array.isArray(nestedResults)) return nestedResults as T[]
    }
  }
  return []
}

function normalizeSessionId(raw: unknown): number | null {
  const id = Number(raw)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

function toSuggestions(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => toStringValue(item))
    .filter(Boolean)
}

function toHistorySource(value: unknown): 'realtime' | 'manual' {
  const raw = toStringValue(value).toLowerCase()
  if (raw.includes('manual')) return 'manual'
  return 'realtime'
}

function toSummaryKeyword(value: unknown): string {
  const text = toStringValue(value)
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim()
  if (!text) return ''

  const firstChunk = text.split(/[.,:;()\[\]\n]/)[0]?.trim() || text
  if (firstChunk.length <= 16) return firstChunk
  return `${firstChunk.slice(0, 16).trim()}...`
}

function buildHistoryTitle(session: SessionShape, source: 'realtime' | 'manual'): string {
  const personName =
    toStringValue(session.avatar_name) || toStringValue(session.avatar?.name) || '상대'
  const keyword = toSummaryKeyword(session.latest_summary) || toSummaryKeyword(session.latest_analysis?.summary)
  if (keyword) {
    return `${personName} · ${keyword}`
  }

  const rawTitle = toStringValue(session.title)
  if (rawTitle) return rawTitle
  return `${personName} ${source === 'manual' ? '수동' : '실시간'} 분석`
}

function toHistoryRecordFromSession(session: SessionShape): AnalysisHistoryRecord | null {
  const sessionId = normalizeSessionId(session.id)
  if (!sessionId) return null

  const latestAnalysis =
    session.latest_analysis && typeof session.latest_analysis === 'object'
      ? session.latest_analysis
      : null
  const latestMessages = Array.isArray(session.latest_messages)
    ? session.latest_messages
    : []

  const receivedMessage = latestMessages
    .map((item) => toStringValue(item?.content))
    .filter(Boolean)
    .join('\n')

  const summary =
    toStringValue(session.latest_summary) || toStringValue(latestAnalysis?.summary)
  const emotion =
    toStringValue(session.latest_emotion) || toStringValue(latestAnalysis?.emotion)
  const tone = toStringValue(session.latest_tone) || toStringValue(latestAnalysis?.tone)
  const strategy = toStringValue(latestAnalysis?.strategy)
  const suggestions = toSuggestions(latestAnalysis?.recommended_replies)
  const source = toHistorySource(session.analysis_type)

  return {
    id: String(sessionId),
    at: toTimestamp(session.updated_at, session.created_at),
    source,
    title: buildHistoryTitle(session, source),
    relation: toStringValue(session.avatar?.current_relation) || '—',
    goalRelation: toStringValue(session.avatar?.target_relation) || '—',
    situation: toStringValue(session.situation_context) || '분석 기록',
    receivedMessage: receivedMessage || undefined,
    emotion: summary || emotion || '분석 결과 없음',
    context: strategy || tone || '맥락 결과 없음',
    suggestions: suggestions.length > 0 ? suggestions : ['추천 답장이 아직 생성되지 않았습니다.'],
  }
}

export async function listAnalysisHistory(): Promise<AnalysisHistoryRecord[]> {
  const sessionsBody = await requestJson<ListEnvelope<SessionShape>>('/sessions/', {
    method: 'GET',
    auth: true,
  })
  return extractList(sessionsBody)
    .map((session) => toHistoryRecordFromSession(session))
    .filter((item): item is AnalysisHistoryRecord => Boolean(item))
    .sort((a, b) => b.at - a.at)
}

export async function getAnalysisHistoryDetail(
  recordId: string,
): Promise<AnalysisHistoryRecord> {
  const id = toStringValue(recordId)
  if (!id) {
    throw new Error('분석 기록 id가 올바르지 않습니다.')
  }

  const body = await requestJson<SessionShape | { data?: unknown }>(
    `${getAnalysisHistoryEndpoint().replace(/\/+$/, '')}/${id}/`,
    {
      method: 'GET',
      auth: true,
    },
  )
  const source = body && typeof body === 'object' && 'data' in body && body.data
    ? (body.data as SessionShape)
    : (body as SessionShape)
  const normalized = toHistoryRecordFromSession(source)
  if (!normalized) {
    throw new Error('분석 기록 상세 응답 형식이 올바르지 않습니다.')
  }
  return normalized
}

export async function deleteAnalysisHistoryRecord(recordId: string): Promise<void> {
  const id = toStringValue(recordId)
  if (!id) {
    throw new Error('분석 기록 id가 올바르지 않습니다.')
  }
  await requestJson<unknown>(
    `/sessions/${id}/`,
    {
      method: 'DELETE',
      auth: true,
    },
  )
}
