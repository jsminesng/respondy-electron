import type { AnalysisHistoryRecord } from '../../shared/respondy-types'
import { requestJson } from './backend-client'

type AvatarShape = {
  name?: unknown
  current_relation?: unknown
  target_relation?: unknown
}

type SessionShape = {
  id?: unknown
  title?: unknown
  situation_context?: unknown
  created_at?: unknown
  updated_at?: unknown
  avatar?: AvatarShape | null
}

type CaptureMessageShape = {
  content?: unknown
}

type CaptureAnalysisShape = {
  summary?: unknown
  emotion?: unknown
  tone?: unknown
  strategy?: unknown
  recommended_replies?: unknown
}

type CaptureShape = {
  id?: unknown
  created_at?: unknown
  detected_at?: unknown
  processing_completed_at?: unknown
  messages?: CaptureMessageShape[]
  analysis_results?: CaptureAnalysisShape[]
}

type ListEnvelope<T> =
  | T[]
  | {
      data?: unknown
      results?: unknown
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

function extractAnalysisItem(body: unknown): CaptureAnalysisShape | null {
  const list = extractList<CaptureAnalysisShape>(
    body as ListEnvelope<CaptureAnalysisShape>,
  )
  if (list.length > 0) return list[0] ?? null
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data
    if (data && typeof data === 'object') {
      const nestedList = extractList<CaptureAnalysisShape>(
        data as ListEnvelope<CaptureAnalysisShape>,
      )
      if (nestedList.length > 0) return nestedList[0] ?? null
      return data as CaptureAnalysisShape
    }
    return body as CaptureAnalysisShape
  }
  return null
}

async function readCaptureMessages(captureId: number): Promise<CaptureMessageShape[]> {
  try {
    const body = await requestJson<unknown>(`/captures/${captureId}/messages/`, {
      method: 'GET',
      auth: true,
    })
    return extractList<CaptureMessageShape>(body as ListEnvelope<CaptureMessageShape>)
  } catch {
    return []
  }
}

async function readCaptureAnalysis(
  captureId: number,
): Promise<CaptureAnalysisShape | null> {
  try {
    const body = await requestJson<unknown>(`/captures/${captureId}/analysis/`, {
      method: 'GET',
      auth: true,
    })
    return extractAnalysisItem(body)
  } catch {
    return null
  }
}

function toHistoryRecord(
  session: SessionShape,
  capture: CaptureShape,
  messages: CaptureMessageShape[],
  analysis: CaptureAnalysisShape | null,
): AnalysisHistoryRecord | null {
  const sessionId = normalizeSessionId(session.id)
  const captureId = normalizeSessionId(capture.id)
  if (!sessionId || !captureId) return null

  if (!analysis) return null

  const messageRows =
    messages.length > 0
      ? messages
      : Array.isArray(capture.messages)
        ? capture.messages
        : []
  const receivedMessage = messageRows
    .map((item) => toStringValue(item?.content))
    .filter(Boolean)
    .join('\n')

  const replies = Array.isArray(analysis.recommended_replies)
    ? analysis.recommended_replies
        .map((item) => toStringValue(item))
        .filter(Boolean)
    : []

  const avatar = session.avatar
  const avatarName = toStringValue(avatar?.name)
  const relation = toStringValue(avatar?.current_relation) || '—'
  const goalRelation = toStringValue(avatar?.target_relation) || '—'
  const summary = toStringValue(analysis.summary)
  const emotion = toStringValue(analysis.emotion)
  const strategy = toStringValue(analysis.strategy)
  const tone = toStringValue(analysis.tone)

  return {
    id: `sv-${sessionId}-${captureId}`,
    at: toTimestamp(
      capture.processing_completed_at,
      capture.detected_at,
      capture.created_at,
      session.updated_at,
      session.created_at,
    ),
    source: 'realtime',
    title: toStringValue(session.title) || `${avatarName || '상대'} 실시간 분석`,
    relation,
    goalRelation,
    situation: toStringValue(session.situation_context) || '실시간 감지',
    receivedMessage: receivedMessage || undefined,
    emotion: summary || emotion || '분석 결과 없음',
    context: strategy || tone || '맥락 결과 없음',
    suggestions: replies.length ? replies : ['추천 답장이 아직 생성되지 않았습니다.'],
  }
}

export async function listAnalysisHistory(): Promise<AnalysisHistoryRecord[]> {
  const sessionsBody = await requestJson<ListEnvelope<SessionShape>>('/sessions/', {
    method: 'GET',
    auth: true,
  })
  const sessions = extractList(sessionsBody)

  const perSessionHistory = await Promise.all(
    sessions.map(async (session) => {
      const sessionId = normalizeSessionId(session.id)
      if (!sessionId) return []
      try {
        const capturesBody = await requestJson<ListEnvelope<CaptureShape>>(
          `/sessions/${sessionId}/captures/`,
          {
            method: 'GET',
            auth: true,
          },
        )
        const captures = extractList(capturesBody)
        const records = await Promise.all(
          captures.map(async (capture) => {
            const captureId = normalizeSessionId(capture.id)
            if (!captureId) return null

            const inlineAnalysis = Array.isArray(capture.analysis_results)
              ? capture.analysis_results[0] ?? null
              : null

            const [messages, analysis] = await Promise.all([
              readCaptureMessages(captureId),
              inlineAnalysis ? Promise.resolve(inlineAnalysis) : readCaptureAnalysis(captureId),
            ])

            return toHistoryRecord(session, capture, messages, analysis)
          }),
        )
        return records.filter((item): item is AnalysisHistoryRecord => Boolean(item))
      } catch {
        return []
      }
    }),
  )

  return perSessionHistory
    .flat()
    .sort((a, b) => b.at - a.at)
}
