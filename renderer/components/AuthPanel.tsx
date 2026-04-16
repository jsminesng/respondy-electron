'use client'

import { useEffect, useMemo, useState } from 'react'
import { getRespondy } from '../lib/respondy-client'
import type { AuthState } from '../../shared/respondy-types'

type Mode = 'login' | 'signup'

const unauthenticatedState: AuthState = {
  isAuthenticated: false,
  user: null,
}

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>('login')
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const respondy = getRespondy()
    if (!respondy) {
      setAuthState(unauthenticatedState)
      return
    }

    void (async () => {
      try {
        const next = await respondy.getAuthState()
        setAuthState(next)
      } catch (e) {
        setAuthState(unauthenticatedState)
        setError(e instanceof Error ? e.message : '인증 상태를 불러오지 못했습니다.')
      }
    })()
  }, [])

  const title = useMemo(
    () => (authState?.isAuthenticated ? '로그인됨' : '백엔드 로그인'),
    [authState],
  )

  const submit = async () => {
    const respondy = getRespondy()
    if (!respondy) {
      setError('Electron 환경에서만 인증을 사용할 수 있습니다.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const next =
        mode === 'login'
          ? await respondy.login({ username, password })
          : await respondy.signup({ username, email, password })
      setAuthState(next)
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증 요청에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    const respondy = getRespondy()
    if (!respondy) return

    setBusy(true)
    setError(null)
    try {
      await respondy.logout()
      setAuthState(unauthenticatedState)
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그아웃에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (!authState) {
    return <p className="text-sm text-slate-500">인증 상태를 확인하는 중…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-500">
            Django JWT 백엔드에 로그인하면 이후 세션/메시지 저장을 연결할 수
            있습니다.
          </p>
        </div>
      </div>

      {authState.isAuthenticated && authState.user ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div>
            <p className="text-sm font-medium text-white">
              {authState.user.username}
            </p>
            <p className="text-xs text-slate-400">
              {authState.user.email || '이메일 정보 없음'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {(['login', 'signup'] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode(value)
                  setError(null)
                }}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  mode === value
                    ? 'bg-violet-500 text-white'
                    : 'border border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                {value === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">아이디</span>
              <input
                type="text"
                value={username}
                disabled={busy}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
              />
            </label>

            {mode === 'signup' && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">이메일</span>
                <input
                  type="email"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                />
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">비밀번호</span>
              <input
                type="password"
                value={password}
                disabled={busy}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !username.trim() || !password.trim()}
            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '요청 중…' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
    </div>
  )
}
