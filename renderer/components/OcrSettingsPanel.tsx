'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { getRespondy } from '../lib/respondy-client'
import type { OcrSettings } from '../../shared/respondy-types'

export function OcrSettingsPanel() {
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<OcrSettings | null>(null)
  const [bounds, setBounds] = useState<{
    width: number
    height: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = getRespondy()
    if (!r) return
    try {
      const [s, b] = await Promise.all([
        r.getOcrSettings(),
        r.getDisplayBounds(),
      ])
      setSettings(s)
      setBounds({ width: b.width, height: b.height })
    } catch (e) {
      setError(e instanceof Error ? e.message : '설정을 불러오지 못했습니다.')
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    void load()
  }, [mounted, load])

  const update = async (partial: Partial<OcrSettings>) => {
    const r = getRespondy()
    if (!r || !settings) return
    setSaving(true)
    setError(null)
    try {
      await r.setOcrSettings(partial)
      const s = await r.getOcrSettings()
      setSettings(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const pickRegion = async () => {
    const r = getRespondy()
    if (!r) return
    setPicking(true)
    setError(null)
    try {
      const picked = await r.pickOcrRegion()
      if (!picked) return
      const s = await r.getOcrSettings()
      setSettings(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : '영역 선택에 실패했습니다.')
    } finally {
      setPicking(false)
    }
  }

  /* SSR과 첫 클라이언트 페인트는 동일한 문구로 맞춰 hydration 오류를 방지 */
  if (!mounted) {
    return (
      <p className="text-sm text-slate-500">OCR 설정을 불러오는 중…</p>
    )
  }

  if (!getRespondy()) {
    return (
      <p className="text-sm text-slate-500">
        Electron 환경에서만 OCR 설정을 사용할 수 있습니다.
      </p>
    )
  }

  if (!settings) {
    return (
      <div className="space-y-2">
        {error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : (
          <p className="text-sm text-slate-500">OCR 설정을 불러오는 중…</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">화면 OCR</h3>
          <p className="text-sm text-slate-500">
            지정한 사각형을 주기적으로 캡처해 글자를 읽습니다. macOS는{' '}
            <strong className="text-slate-400">시스템 설정 → 개인정보 보호 → 화면 기록</strong>
            에서 Respondy를 허용해야 합니다.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="rounded border-white/20"
            checked={settings.enabled}
            disabled={saving}
            onChange={(e) => void update({ enabled: e.target.checked })}
          />
          OCR 사용
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">간격 (ms)</span>
          <input
            type="number"
            min={500}
            max={15000}
            step={100}
            className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
            value={settings.intervalMs}
            disabled={saving}
            onChange={(e) =>
              setSettings((prev) =>
                prev
                  ? { ...prev, intervalMs: Number(e.target.value) || 1800 }
                  : prev,
              )
            }
            onBlur={() => void update({ intervalMs: settings.intervalMs })}
          />
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-slate-300">
          <input
            type="checkbox"
            className="rounded border-white/20"
            checked={settings.incomingOnly}
            disabled={saving}
            onChange={(e) => void update({ incomingOnly: e.target.checked })}
          />
          상대방 메시지만 분석
        </label>
        {bounds && (
          <p className="text-xs text-slate-500 sm:col-span-2">
            기본 디스플레이 크기: {bounds.width} × {bounds.height} (픽셀). Retina
            에서 좌표가 어긋나면 값을 조정하세요.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-4">
          {(['x', 'y', 'width', 'height'] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">
                {key === 'x'
                  ? 'X'
                  : key === 'y'
                    ? 'Y'
                    : key === 'width'
                      ? '너비'
                      : '높이'}
              </span>
              <input
                type="number"
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                value={settings.region[key]}
                disabled={saving}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          region: {
                            ...prev.region,
                            [key]: Number(e.target.value) || 0,
                          },
                        }
                      : prev,
                  )
                }
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={saving || picking}
          onClick={() => void update({ region: settings.region })}
          className="rounded-xl border border-violet-500/40 bg-violet-600/30 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600/50"
        >
          영역 적용
        </button>
        <button
          type="button"
          disabled={saving || picking}
          onClick={() => void pickRegion()}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
        >
          {picking ? '선택 창 여는 중…' : '화면에서 영역 선택'}
        </button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-slate-500"
      >
        카카오톡 대화가 보이는 영역만 잡는 것이 좋습니다. 상대방 메시지만 분석을 켜면
        OCR 영역의 오른쪽 일부를 제외해 내 말풍선을 덜 읽습니다. 첫 실행 시
        Tesseract가 한국어 데이터를 내려받을 수 있습니다(네트워크).
      </motion.p>
    </div>
  )
}
