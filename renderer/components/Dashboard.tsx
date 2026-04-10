'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { getRespondy } from '../lib/respondy-client'
import { OcrSettingsPanel } from './OcrSettingsPanel'
import type { NotificationPayload } from '../../shared/respondy-types'

type StatRow = { label: string; value: string; hint: string }

export function Dashboard() {
  const [recent, setRecent] = useState<NotificationPayload[]>([])
  const [stats, setStats] = useState<StatRow[] | null>(null)

  useEffect(() => {
    const respondy = getRespondy()
    if (!respondy) return
    return respondy.onNotification((payload) => {
      setRecent((prev) => [payload, ...prev].slice(0, 12))
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supabaseConfigured || !supabase) {
        setStats([
          {
            label: 'Supabase',
            value: '미연결',
            hint: '.env에 NEXT_PUBLIC_SUPABASE_* 를 설정하세요.',
          },
          {
            label: 'OCR',
            value: '대기 중',
            hint: '화면 영역에서 글자를 읽어오면 여기에 표시됩니다.',
          },
          {
            label: '관계 인사이트',
            value: '준비됨',
            hint: '테이블을 만들면 관계별 통계를 연동할 수 있습니다.',
          },
        ])
        return
      }
      const { data, error } = await supabase
        .from('respondy_stats')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setStats([
          {
            label: 'Supabase',
            value: '연결됨',
            hint:
              'respondy_stats 테이블이 없으면 대시보드는 데모 모드로 동작합니다.',
          },
          {
            label: '관계 수',
            value: '—',
            hint: '스키마를 추가하면 집계됩니다.',
          },
          {
            label: '최근 톤',
            value: '—',
            hint: '답장 톤 분포를 저장하면 표시됩니다.',
          },
        ])
        return
      }

      setStats([
        {
          label: '관계 수',
          value: String((data as { relation_count?: number }).relation_count ?? '—'),
          hint: 'Supabase에 저장된 관계 수',
        },
        {
          label: '긍정 비율',
          value: String((data as { positive_ratio?: number }).positive_ratio ?? '—'),
          hint: '최근 감정 분석 요약',
        },
        {
          label: '세션',
          value: String((data as { sessions?: number }).sessions ?? '—'),
          hint: '누적 코칭 세션',
        },
      ])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const subtitle = useMemo(
    () =>
      '화면 OCR로 대화 텍스트를 읽고, 감정을 분석해 답장 가이드를 제안합니다.',
    [],
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-8 py-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm uppercase tracking-[0.2em] text-violet-300/80"
          >
            Respondy
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 text-4xl font-semibold text-white md:text-5xl"
          >
            관계별 감정 인사이트
          </motion.h1>
          <p className="mt-3 max-w-xl text-sm text-slate-400 md:text-base">
            {subtitle}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => getRespondy()?.showOverlay()}
            className="rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-400"
          >
            오버레이 열기
          </button>
          <Link
            href="/overlay/"
            className="rounded-full border border-white/10 px-5 py-2 text-sm text-slate-200 transition hover:border-white/30"
          >
            오버레이 경로
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {(stats ?? []).map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {s.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">{s.value}</p>
            <p className="mt-2 text-xs text-slate-500">{s.hint}</p>
          </motion.div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur">
        <OcrSettingsPanel />
      </section>

      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">최근 OCR</h2>
            <p className="text-sm text-slate-500">
              화면에서 읽어온 텍스트가 여기에 쌓입니다.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {recent.length === 0 && (
            <p className="text-sm text-slate-500">
              아직 OCR로 읽어온 텍스트가 없습니다. 위에서 OCR을 켜고 채팅이 보이는
              영역을 맞춰 보세요.
            </p>
          )}
          {recent.map((n, idx) => (
            <div
              key={`${n.receivedAt}-${idx}`}
              className="rounded-2xl border border-white/5 bg-slate-950/60 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{n.sender}</p>
                <span className="text-xs text-slate-500">
                  {new Date(n.receivedAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{n.message}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
