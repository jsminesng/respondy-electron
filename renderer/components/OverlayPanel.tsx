"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { getRespondy } from "../lib/respondy-client";
import type {
  NotificationPayload,
  ReplySuggestion,
  SentimentResult,
} from "../../shared/respondy-types";

const toneLabel: Record<string, string> = {
  warm: "다정한",
  witty: "위트있는",
  firm: "단호한",
};

export function OverlayPanel() {
  const [payload, setPayload] = useState<NotificationPayload | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [replies, setReplies] = useState<ReplySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = useCallback(async (p: NotificationPayload) => {
    const respondy = getRespondy();
    if (!respondy) {
      setError("Electron 브리지가 없습니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await respondy.analyzeSentiment(p.message);
      setSentiment(s);
      const r = await respondy.generateReplies({
        sender: p.sender,
        message: p.message,
        sentimentSummary: s.summary,
        dominantLabel: s.dominant,
      });
      setReplies(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const respondy = getRespondy();
    if (!respondy) return;
    return respondy.onNotification((p) => {
      setPayload(p);
      void runPipeline(p);
    });
  }, [runPipeline]);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <div className="pointer-events-auto flex min-h-screen items-start justify-center p-3">
      <motion.div
        layout
        className="w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-violet-500/10 backdrop-blur-xl"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-violet-300/80">
              Respondy
            </p>
            <p className="text-sm font-semibold text-white">답장 코치</p>
          </div>
          <button
            type="button"
            onClick={() => getRespondy()?.hideOverlay()}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-white/30"
          >
            닫기
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {!payload && (
            <p className="text-sm text-slate-400">
              화면 OCR로 텍스트를 읽는 중입니다. 영역에 채팅이 보이면 자동으로
              분석합니다.
            </p>
          )}

          {payload && (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-slate-400">
                발신
                <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                  OCR
                </span>
              </p>
              <p className="text-base font-medium text-white">
                {payload.sender}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {payload.message}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
              감정 분석 및 답장 생성 중…
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </p>
          )}

          {sentiment && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3">
              <p className="text-xs text-violet-200/80">감정 분석</p>
              <p className="mt-1 text-sm text-white">{sentiment.summary}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sentiment.labels.slice(0, 4).map((l) => (
                  <span
                    key={l.label}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-100"
                  >
                    {l.label}{" "}
                    <span className="text-slate-400">
                      {(l.score * 100).toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              추천 답장
            </p>
            {replies.map((r) => (
              <motion.button
                key={r.tone}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => void copy(r.text, r.tone)}
                className="relative w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-left text-sm text-slate-100 transition hover:border-violet-400/40"
              >
                <span className="text-[11px] text-violet-300">
                  {toneLabel[r.tone] ?? r.tone}
                </span>
                <p className="mt-1 leading-relaxed">{r.text}</p>
                <AnimatePresence>
                  {copied === r.tone && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200"
                    >
                      복사됨
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
