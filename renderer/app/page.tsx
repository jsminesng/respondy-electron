'use client'

import { useEffect, useRef, useState } from 'react'

type AuthView = 'login' | 'signup'
type AppView = 'realtime' | 'manual' | 'chat' | 'mypage'
type Relation = '가족' | '친구' | '연인' | '썸' | '동료' | '직접 입력'
type ChatStep = 'select' | 'conversation'
type ChatRole = 'user' | 'assistant'
type ChatBubble = { id: string; role: ChatRole; text: string; at: number }

type AnalysisSource = 'realtime' | 'manual'
type PersonProfile = {
  id: string
  name: string
  birthDate: string
  currentRelation: string
  goalRelation: string
  personality: string
  notes: string
  createdAt: number
}

type AnalysisRecord = {
  id: string
  at: number
  source: AnalysisSource
  title: string
  relation: string
  goalRelation: string
  situation: string
  receivedMessage?: string
  emotion: string
  context: string
  suggestions: string[]
}

const navItems: { key: AppView; label: string }[] = [
  { key: 'realtime', label: '실시간 분석' },
  { key: 'manual', label: '수동 입력' },
  { key: 'chat', label: 'AI챗' },
  { key: 'mypage', label: '마이페이지' },
]

const relationChoices: Relation[] = ['가족', '친구', '연인', '썸', '동료', '직접 입력']

const CHAT_OPENING: Record<Relation, string> = {
  가족: '오늘 하루는 어땠어? 궁금해서 물어봤어.',
  친구: '야~ 뭐 해? 심심한데 잠깐 얘기할래?',
  연인: '보고 싶었어. 오늘은 좀 어땠어?',
  썸: '저번에 얘기했던 거 기억나? 어떻게 됐어?',
  동료: '혹시 지금 잠깐 시간 괜찮아? 짧게만 여쭤볼 게 있어.',
  '직접 입력': '편하게 시작해봐. 어떤 상황을 연습하고 싶어?',
}

const CHAT_DEMO_REPLIES = [
  '응, 그렇구나. 그다음엔 어떻게 했어?',
  '아하, 나도 비슷한 적 있어 ㅎㅎ 너는 보통 어떻게 말해?',
  '그 말 들으니까 이해가 돼. 상대한테는 어떻게 전하고 싶어?',
  '좋아, 그 톤이면 괜찮을 것 같아. 한 번 더 말해볼래?',
  '음… 그때 기분은 어땠어? 조금 더 구체적으로 말해줄 수 있어?',
]

function formatChatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const REALTIME_RESULT = {
  emotion: `-설렘 + 긴장 -> "혹시..." 같은 표현에서 조심스러운 호감 드러남\n\n-설렘 + 호감 상승 -> 관심받는 느낌에 긍정적으로 반응하고있음`,
  context: `-서로 호감을 드러내는 표현법을 사용\n\n-상대 취향을 기억하는 행동 -> 호감의 간접 표현\n\n-상대의 반응이 긍정적이라 관계가 진전될 가능성 높음`,
  suggestions: [
    '좋아~ 토요일에 만나자!',
    '내가 자주 가는 맛집 있는데 같이 갈래?',
    '이따가 또 연락해~',
    '그때 봐~ 기대된다 ㅎㅎ',
  ],
}

const MANUAL_RESULT = {
  emotion: `-기본 감정: 편안함 + 소소한 친근감\n\n-"그래~" -> 거리감 없이 부드럽게 받아주는 느낌\n\n-과제 열심히 하고 -> 부담 없는 거리 (친구처럼 한마디)\n\n-"내일 보자" -> 관계를 이어가려는 의도`,
  context: `-아직 완전 친군 아니지만 "편한 선후배"에서 "친구"로 넘어가는 중간 단계\n\n-대화가 자연스럽게 이어짐 -> "내일 보자" + 관계를 끊지 않고 이어가는 흐름`,
  suggestions: ['네 선배도요~', '넵!!', '네 내일도 만나서 같이 과제해요~~', '선배도 내일 봐요~'],
}

export default function HomePage() {
  const [authView, setAuthView] = useState<AuthView>('login')
  const [loggedIn, setLoggedIn] = useState(false)
  const [userName, setUserName] = useState('ABC')
  const [selectedView, setSelectedView] = useState<AppView>('realtime')
  const [selectedRelation, setSelectedRelation] = useState<Relation>('친구')
  const [chatCustomRelation, setChatCustomRelation] = useState('')
  const [chatStep, setChatStep] = useState<ChatStep>('select')
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatTyping, setChatTyping] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const demoReplyIdxRef = useRef(0)
  const [realtimeReceivedMessage, setRealtimeReceivedMessage] = useState('')
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([])
  const [selectedRealtimePerson, setSelectedRealtimePerson] = useState('')
  const [showPersonCreateModal, setShowPersonCreateModal] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonBirthDate, setNewPersonBirthDate] = useState('')
  const [newPersonCurrentRelation, setNewPersonCurrentRelation] = useState('')
  const [newPersonGoalRelation, setNewPersonGoalRelation] = useState('')
  const [newPersonPersonality, setNewPersonPersonality] = useState('')
  const [newPersonNotes, setNewPersonNotes] = useState('')
  const [selectedManualPerson, setSelectedManualPerson] = useState('')
  const [manualSituation, setManualSituation] = useState('')
  const [manualReceivedMessage, setManualReceivedMessage] = useState('')
  const [showRealtimeResults, setShowRealtimeResults] = useState(false)
  const [showManualResults, setShowManualResults] = useState(false)
  const [isRealtimeMonitoring, setIsRealtimeMonitoring] = useState(false)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([])
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null)
  const [copiedSuggestionId, setCopiedSuggestionId] = useState<string | null>(null)

  const copySuggestion = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSuggestionId(id)
      window.setTimeout(() => setCopiedSuggestionId(null), 1500)
    } catch {
      window.alert('클립보드에 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  useEffect(() => {
    if (selectedView !== 'chat') {
      setChatStep('select')
      setChatMessages([])
      setChatDraft('')
      setChatTyping(false)
      setChatCustomRelation('')
      demoReplyIdxRef.current = 0
    }
  }, [selectedView])

  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chatMessages, chatTyping, chatStep])

  useEffect(() => {
    if (selectedView !== 'realtime') {
      setShowRealtimeResults(false)
      setIsRealtimeMonitoring(false)
    }
  }, [selectedView])

  useEffect(() => {
    if (selectedView !== 'manual') setShowManualResults(false)
  }, [selectedView])

  useEffect(() => {
    setHistoryDetailId(null)
  }, [selectedView])

  useEffect(() => {
    if (!historyDetailId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [historyDetailId])

  const finishAuth = (opts?: { displayName?: string }) => {
    if (opts?.displayName?.trim()) {
      setUserName(opts.displayName.trim())
    }
    setRealtimeReceivedMessage('')
    setPersonProfiles([])
    setSelectedRealtimePerson('')
    setShowPersonCreateModal(false)
    setNewPersonName('')
    setNewPersonBirthDate('')
    setNewPersonCurrentRelation('')
    setNewPersonGoalRelation('')
    setNewPersonPersonality('')
    setNewPersonNotes('')
    setShowRealtimeResults(false)
    setIsRealtimeMonitoring(false)
    setSelectedManualPerson('')
    setManualSituation('')
    setManualReceivedMessage('')
    setShowManualResults(false)
    setLoggedIn(true)
    setSelectedView('realtime')
  }

  const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    finishAuth()
  }

  const handleSignupSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const nameField = form.elements.namedItem('signup-name')
    const displayName =
      nameField instanceof HTMLInputElement ? nameField.value : undefined
    finishAuth({ displayName })
  }

  const renderAuthCard = () => {
    if (authView === 'signup') {
      return (
        <form
          key="signup"
          className="respondy-card respondy-auth-card"
          onSubmit={handleSignupSubmit}
        >
          <h2 className="respondy-title">회원가입</h2>
          <label className="respondy-label" htmlFor="signup-name">
            이름
          </label>
          <input
            id="signup-name"
            name="signup-name"
            className="respondy-input"
            autoComplete="name"
          />
          <label className="respondy-label" htmlFor="signup-email">
            이메일 주소
          </label>
          <input
            id="signup-email"
            name="signup-email"
            className="respondy-input"
            type="email"
            autoComplete="email"
          />
          <label className="respondy-label" htmlFor="signup-password">
            비밀번호
          </label>
          <input
            id="signup-password"
            name="signup-password"
            className="respondy-input"
            type="password"
            autoComplete="new-password"
          />
          <button className="respondy-primary-btn" type="submit">
            회원가입
          </button>
          <p className="respondy-helper-text respondy-helper-text--compact">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              className="respondy-link-btn"
              onClick={() => setAuthView('login')}
            >
              로그인
            </button>
          </p>
        </form>
      )
    }

    return (
      <form key="login" className="respondy-card respondy-auth-card" onSubmit={handleLoginSubmit}>
        <h2 className="respondy-title">로그인</h2>
        <label className="respondy-label" htmlFor="login-email">
          이메일 주소
        </label>
        <input
          id="login-email"
          name="login-email"
          className="respondy-input"
          type="email"
          autoComplete="email"
        />
        <label className="respondy-label" htmlFor="login-password">
          비밀번호
        </label>
        <input
          id="login-password"
          name="login-password"
          className="respondy-input"
          type="password"
          autoComplete="current-password"
        />
        <button className="respondy-primary-btn" type="submit">
          로그인
        </button>
        <p className="respondy-helper-text">
          계정이 없으신가요?{' '}
          <button
            type="button"
            className="respondy-link-btn"
            onClick={() => setAuthView('signup')}
          >
            회원가입
          </button>
        </p>
      </form>
    )
  }

  const clearRealtimeResults = () => setShowRealtimeResults(false)
  const clearManualResults = () => setShowManualResults(false)

  const realtimeFormReady =
    selectedRealtimePerson.trim() && realtimeReceivedMessage.trim()

  const manualFormReady =
    selectedManualPerson.trim() && manualSituation.trim() && manualReceivedMessage.trim()

  const chatRelationLabel =
    selectedRelation === '직접 입력'
      ? chatCustomRelation.trim() || '직접 입력'
      : selectedRelation

  const startChatSession = () => {
    if (selectedRelation === '직접 입력' && !chatCustomRelation.trim()) return
    demoReplyIdxRef.current = 0
    const openingText =
      selectedRelation === '직접 입력' && chatCustomRelation.trim()
        ? `「${chatCustomRelation.trim()}」 관계로 연습하는구나. 편하게 말해줘!`
        : CHAT_OPENING[selectedRelation]
    setChatStep('conversation')
    setChatMessages([
      {
        id: `open-${Date.now()}`,
        role: 'assistant',
        text: openingText,
        at: Date.now(),
      },
    ])
    setChatDraft('')
    setChatTyping(false)
  }

  const leaveChatConversation = () => {
    setChatStep('select')
    setChatMessages([])
    setChatDraft('')
    setChatTyping(false)
    demoReplyIdxRef.current = 0
  }

  const sendChatMessage = () => {
    const text = chatDraft.trim()
    if (!text || chatTyping) return
    setChatMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text, at: Date.now() }])
    setChatDraft('')
    setChatTyping(true)
    window.setTimeout(() => {
      const reply = CHAT_DEMO_REPLIES[demoReplyIdxRef.current % CHAT_DEMO_REPLIES.length] ?? ''
      demoReplyIdxRef.current += 1
      setChatMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: reply, at: Date.now() },
      ])
      setChatTyping(false)
    }, 550 + Math.random() * 450)
  }

  const closePersonCreateModal = () => {
    setShowPersonCreateModal(false)
    setNewPersonName('')
    setNewPersonBirthDate('')
    setNewPersonCurrentRelation('')
    setNewPersonGoalRelation('')
    setNewPersonPersonality('')
    setNewPersonNotes('')
  }

  const createPersonProfile = () => {
    const personName = newPersonName.trim()
    if (!personName) return
    const existingPerson = personProfiles.find((person) => person.name === personName)
    if (existingPerson) {
      setSelectedRealtimePerson(existingPerson.name)
      closePersonCreateModal()
      return
    }
    setPersonProfiles((prev) => [
      ...prev,
      {
        id: `person-${Date.now()}`,
        name: personName,
        birthDate: newPersonBirthDate,
        currentRelation: newPersonCurrentRelation.trim(),
        goalRelation: newPersonGoalRelation.trim(),
        personality: newPersonPersonality.trim(),
        notes: newPersonNotes.trim(),
        createdAt: Date.now(),
      },
    ])
    setSelectedRealtimePerson(personName)
    closePersonCreateModal()
    clearRealtimeResults()
  }

  const renderRealtimeView = () => (
    <section className="respondy-three-column">
      <article className="respondy-card">
        <label className="respondy-label" htmlFor="realtime-person-select">
          인물 선택
        </label>
        <div className="respondy-inline-row">
          <select
            id="realtime-person-select"
            className="respondy-input respondy-select"
            value={selectedRealtimePerson}
            onChange={(e) => {
              setSelectedRealtimePerson(e.target.value)
              clearRealtimeResults()
            }}
          >
            <option value="">인물을 선택하세요</option>
            {personProfiles.map((person) => (
              <option key={person.id} value={person.name}>
                {person.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="respondy-add-btn"
            onClick={() => setShowPersonCreateModal(true)}
            aria-label="인물 생성"
            title="인물 생성"
          >
            +
          </button>
        </div>
        {personProfiles.length === 0 && (
          <p className="respondy-helper-text respondy-helper-text--inline">
            등록된 인물이 없습니다. <strong>+</strong> 버튼으로 인물을 먼저 만들어 주세요.
          </p>
        )}
        <label className="respondy-label">상황 설명</label>
        <textarea
          className="respondy-textarea"
          value={realtimeReceivedMessage}
          onChange={(e) => {
            setRealtimeReceivedMessage(e.target.value)
            clearRealtimeResults()
          }}
          placeholder="분석할 상황을 입력하세요"
          autoComplete="off"
        />
        <button
          className={`respondy-primary-btn ${isRealtimeMonitoring ? 'respondy-danger-btn' : ''}`}
          type="button"
          onClick={() => {
            if (isRealtimeMonitoring) {
              setIsRealtimeMonitoring(false)
              return
            }
            if (!realtimeFormReady) return
            const id = `rt-${Date.now()}`
            setAnalysisHistory((h) => [
              {
                id,
                at: Date.now(),
                source: 'realtime',
                title: `${selectedRealtimePerson.trim()}와의 실시간 대화`,
                relation: selectedRealtimePerson.trim(),
                goalRelation: '대화 유지',
                situation: realtimeReceivedMessage.trim(),
                receivedMessage: realtimeReceivedMessage.trim(),
                emotion: REALTIME_RESULT.emotion,
                context: REALTIME_RESULT.context,
                suggestions: [...REALTIME_RESULT.suggestions],
              },
              ...h,
            ])
            setShowRealtimeResults(true)
            setIsRealtimeMonitoring(true)
          }}
        >
          {isRealtimeMonitoring ? '종료하기' : '실시간 감지 시작'}
        </button>
      </article>

      <article className="respondy-card">
        <h3 className="respondy-card-title">AI 분석 결과</h3>
        <label className="respondy-label">감정 분석</label>
        <textarea
          className="respondy-textarea respondy-readonly-area respondy-output-area"
          readOnly
          value={showRealtimeResults ? REALTIME_RESULT.emotion : ''}
          placeholder="왼쪽 패널을 모두 입력한 뒤 실시간 감지 시작을 누르면 표시됩니다"
        />
        <label className="respondy-label">맥락 해석</label>
        <textarea
          className="respondy-textarea respondy-readonly-area respondy-output-area"
          readOnly
          value={showRealtimeResults ? REALTIME_RESULT.context : ''}
          placeholder="왼쪽 패널을 모두 입력한 뒤 실시간 감지 시작을 누르면 표시됩니다"
        />
      </article>

      <article className="respondy-card respondy-replies-panel">
        <h3 className="respondy-card-title">추천 답장</h3>
        {showRealtimeResults ? (
          <div className="respondy-suggestions-body">
            {REALTIME_RESULT.suggestions.map((message, index) => {
              const copyId = `realtime-${index}`
              return (
                <div key={message} className="respondy-suggestion">
                  <div className="respondy-readonly-box">{message}</div>
                  <button
                    className="respondy-primary-btn"
                    type="button"
                    onClick={() => void copySuggestion(message, copyId)}
                  >
                    {copiedSuggestionId === copyId ? '복사됨' : '복사하기'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="respondy-output-empty">분석 후 추천 답장이 여기에 표시됩니다.</p>
        )}
      </article>
    </section>
  )

  const renderManualView = () => (
    <section className="respondy-three-column">
      <article className="respondy-card">
        <label className="respondy-label" htmlFor="manual-person-select">
          인물 선택
        </label>
        <div className="respondy-inline-row">
          <select
            id="manual-person-select"
            className="respondy-input respondy-select"
            value={selectedManualPerson}
            onChange={(e) => {
              setSelectedManualPerson(e.target.value)
              clearManualResults()
            }}
          >
            <option value="">인물을 선택하세요</option>
            {personProfiles.map((person) => (
              <option key={person.id} value={person.name}>
                {person.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="respondy-add-btn"
            onClick={() => setShowPersonCreateModal(true)}
            aria-label="인물 생성"
            title="인물 생성"
          >
            +
          </button>
        </div>
        {personProfiles.length === 0 && (
          <p className="respondy-helper-text respondy-helper-text--inline">
            등록된 인물이 없습니다. <strong>+</strong> 버튼으로 인물을 먼저 만들어 주세요.
          </p>
        )}
        <label className="respondy-label">상황 설명</label>
        <textarea
          className="respondy-textarea"
          value={manualSituation}
          onChange={(e) => {
            setManualSituation(e.target.value)
            clearManualResults()
          }}
          placeholder="상황을 입력하세요"
        />
        <label className="respondy-label">받은 메시지</label>
        <textarea
          className="respondy-textarea"
          value={manualReceivedMessage}
          onChange={(e) => {
            setManualReceivedMessage(e.target.value)
            clearManualResults()
          }}
          placeholder="답장이 필요한 상대 메시지를 입력하세요"
        />
        <button
          className="respondy-primary-btn"
          type="button"
          onClick={() => {
            if (!manualFormReady) return
            const id = `mn-${Date.now()}`
            setAnalysisHistory((h) => [
              {
                id,
                at: Date.now(),
                source: 'manual',
                title: `${selectedManualPerson.trim()}와의 수동 입력 대화`,
                relation: selectedManualPerson.trim(),
                goalRelation: '대화 유지',
                situation: manualSituation.trim(),
                receivedMessage: manualReceivedMessage.trim(),
                emotion: MANUAL_RESULT.emotion,
                context: MANUAL_RESULT.context,
                suggestions: [...MANUAL_RESULT.suggestions],
              },
              ...h,
            ])
            setShowManualResults(true)
          }}
        >
          AI 분석 시작
        </button>
      </article>

      <article className="respondy-card">
        <h3 className="respondy-card-title">AI 분석 결과</h3>
        <label className="respondy-label">감정 분석</label>
        <textarea
          className="respondy-textarea respondy-readonly-area respondy-output-area"
          readOnly
          value={showManualResults ? MANUAL_RESULT.emotion : ''}
          placeholder="왼쪽 패널을 모두 입력한 뒤 AI 분석 시작을 누르면 표시됩니다"
        />
        <label className="respondy-label">맥락 해석</label>
        <textarea
          className="respondy-textarea respondy-readonly-area respondy-output-area"
          readOnly
          value={showManualResults ? MANUAL_RESULT.context : ''}
          placeholder="왼쪽 패널을 모두 입력한 뒤 AI 분석 시작을 누르면 표시됩니다"
        />
      </article>

      <article className="respondy-card respondy-replies-panel">
        <h3 className="respondy-card-title">추천 답장</h3>
        {showManualResults ? (
          <div className="respondy-suggestions-body">
            {MANUAL_RESULT.suggestions.map((message, index) => {
              const copyId = `manual-${index}`
              return (
                <div key={message} className="respondy-suggestion">
                  <div className="respondy-readonly-box">{message}</div>
                  <button
                    className="respondy-primary-btn"
                    type="button"
                    onClick={() => void copySuggestion(message, copyId)}
                  >
                    {copiedSuggestionId === copyId ? '복사됨' : '복사하기'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="respondy-output-empty">분석 후 추천 답장이 여기에 표시됩니다.</p>
        )}
      </article>
    </section>
  )

  const renderChatView = () => {
    if (chatStep === 'select') {
      return (
        <section className="respondy-single-wrap">
          <article className="respondy-card respondy-chat-select-card">
            <h2 className="respondy-title respondy-title--card">AI 대화 연습</h2>
            <p className="respondy-section-label">관계 선택</p>
            <div className="respondy-grid">
              {relationChoices.map((relation) => (
                <button
                  key={relation}
                  type="button"
                  className={`respondy-choice-btn ${selectedRelation === relation ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedRelation(relation)
                    if (relation !== '직접 입력') setChatCustomRelation('')
                  }}
                >
                  {relation}
                </button>
              ))}
            </div>
            {selectedRelation === '직접 입력' && (
              <div className="respondy-chat-custom-panel">
                <label className="respondy-chat-custom-label" htmlFor="chat-custom-relation">
                  관계 직접 입력
                </label>
                <textarea
                  id="chat-custom-relation"
                  className="respondy-chat-custom-textarea"
                  value={chatCustomRelation}
                  onChange={(e) => setChatCustomRelation(e.target.value)}
                  placeholder="예: 옆집 이웃, 소개팅 상대, 멘토·멘티, 전 연인…"
                  rows={3}
                />
                <p className="respondy-chat-custom-hint">원하는 관계를 자유롭게 적어 주세요.</p>
              </div>
            )}
            <button
              className="respondy-primary-btn"
              type="button"
              onClick={startChatSession}
              disabled={selectedRelation === '직접 입력' && !chatCustomRelation.trim()}
            >
              대화 시작하기
            </button>
          </article>
        </section>
      )
    }

    return (
      <section className="respondy-chat-stage" aria-label="AI 대화 연습">
        <div className="respondy-chat-messenger">
          <header className="respondy-chat-messenger-top">
            <div className="respondy-chat-messenger-title">
              <button
                type="button"
                className="respondy-chat-back-btn"
                onClick={leaveChatConversation}
                aria-label="관계 선택으로 돌아가기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div>
                <p className="respondy-chat-messenger-name">AI 대화 파트너</p>
                <p className="respondy-chat-messenger-sub">
                  연습 모드 ·{' '}
                  <span className="respondy-chat-relation-badge" title={chatRelationLabel}>
                    {chatRelationLabel}
                  </span>
                </p>
              </div>
            </div>
            <span className="respondy-chat-status-dot" aria-hidden />
          </header>

          <div ref={chatScrollRef} className="respondy-chat-messenger-body">
            <div className="respondy-chat-day-divider">
              <span>오늘</span>
            </div>
            {chatMessages.map((msg) =>
              msg.role === 'assistant' ? (
                <div key={msg.id} className="respondy-chat-msg-ai">
                  <div className="respondy-chat-avatar-ai" aria-hidden>
                    AI
                  </div>
                  <div className="respondy-chat-ai-col">
                    <div className="respondy-chat-bubble-ai">{msg.text}</div>
                    <span className="respondy-chat-meta">{formatChatTime(msg.at)}</span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="respondy-chat-msg-user">
                  <div className="respondy-chat-bubble-user">{msg.text}</div>
                  <span className="respondy-chat-meta respondy-chat-meta--user">
                    {formatChatTime(msg.at)}
                  </span>
                </div>
              ),
            )}
            {chatTyping && (
              <div className="respondy-chat-msg-ai">
                <div className="respondy-chat-avatar-ai respondy-chat-avatar-ai--typing" aria-hidden>
                  AI
                </div>
                <div className="respondy-chat-typing-bubble" aria-live="polite">
                  <span className="respondy-chat-typing-dot" />
                  <span className="respondy-chat-typing-dot respondy-chat-typing-dot--d1" />
                  <span className="respondy-chat-typing-dot respondy-chat-typing-dot--d2" />
                </div>
              </div>
            )}
          </div>

          <footer className="respondy-chat-composer-wrap">
            <div className="respondy-chat-composer-inner">
              <textarea
                className="respondy-chat-composer-input"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                  }
                }}
                placeholder="메시지를 입력하세요…"
                rows={1}
                disabled={chatTyping}
              />
              <button
                type="button"
                className="respondy-chat-send-btn"
                onClick={sendChatMessage}
                disabled={!chatDraft.trim() || chatTyping}
                aria-label="메시지 전송"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="respondy-chat-composer-hint">Enter로 전송 · Shift+Enter로 줄 바꿈</p>
          </footer>
        </div>
      </section>
    )
  }

  const renderMyPage = () => (
    <section className="respondy-three-column">
      <article className="respondy-card">
        <h3 className="respondy-title">내 정보</h3>
        <label className="respondy-label">이름</label>
        <input
          className="respondy-input"
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
        />
        <label className="respondy-label">이메일</label>
        <input className="respondy-input" defaultValue="abc@kookmin.ac.kr" />
        <label className="respondy-label">비밀번호</label>
        <input className="respondy-input" defaultValue="abc123!" type="password" />
        <button
          className="respondy-primary-btn"
          type="button"
          onClick={() => window.alert('내 정보가 수정되었습니다.')}
        >
          수정하기
        </button>
      </article>

      <article className="respondy-card">
        <h3 className="respondy-title">분석 기록</h3>
        <p className="respondy-history-hint">
          실시간 분석·수동 입력에서 분석을 실행하면 여기에 쌓입니다. 항목을 누르면 상세를 다시 볼 수 있어요.
        </p>
        {analysisHistory.length === 0 ? (
          <p className="respondy-output-empty respondy-history-empty">아직 저장된 분석 기록이 없습니다.</p>
        ) : (
          analysisHistory.map((rec) => (
            <button
              key={rec.id}
              type="button"
              className="respondy-history-item respondy-history-item--button"
              onClick={() => setHistoryDetailId(rec.id)}
            >
              <div className="respondy-history-item-top">
                <time className="respondy-history-item-date" dateTime={new Date(rec.at).toISOString()}>
                  {new Date(rec.at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <span
                  className={`respondy-history-item-badge ${rec.source === 'realtime' ? 'is-realtime' : 'is-manual'}`}
                >
                  {rec.source === 'realtime' ? '실시간 분석' : '수동 입력'}
                </span>
              </div>
              <div className="respondy-history-item-divider" aria-hidden />
              <span className="respondy-history-item-title">{rec.title || '(제목 없음)'}</span>
            </button>
          ))
        )}
      </article>
      <article className="respondy-card">
        <h3 className="respondy-title">인물 관리</h3>
        <p className="respondy-history-hint">
          실시간 분석에서 생성한 인물 정보가 저장됩니다.
        </p>
        {personProfiles.length === 0 ? (
          <p className="respondy-output-empty respondy-history-empty">저장된 인물 정보가 없습니다.</p>
        ) : (
          <div className="respondy-person-list">
            {personProfiles.map((person) => (
              <div key={person.id} className="respondy-person-item">
                <p className="respondy-person-name">{person.name}</p>
                <dl className="respondy-person-meta">
                  <dt>나이(생년월일)</dt>
                  <dd>{person.birthDate || '—'}</dd>
                  <dt>현재 관계</dt>
                  <dd>{person.currentRelation || '—'}</dd>
                  <dt>목표 관계</dt>
                  <dd>{person.goalRelation || '—'}</dd>
                  <dt>성격</dt>
                  <dd>{person.personality || '—'}</dd>
                  <dt>특이사항</dt>
                  <dd className="respondy-modal-pre">{person.notes || '—'}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )

  const renderMainContent = () => {
    if (!loggedIn) {
      return (
        <section className="respondy-center respondy-center--auth">{renderAuthCard()}</section>
      )
    }

    if (selectedView === 'manual') return renderManualView()
    if (selectedView === 'chat') return renderChatView()
    if (selectedView === 'mypage') return renderMyPage()
    return renderRealtimeView()
  }

  const historyDetail = historyDetailId
    ? analysisHistory.find((r) => r.id === historyDetailId)
    : undefined

  return (
    <div className={`respondy-shell${!loggedIn ? ' respondy-shell--auth' : ''}`}>
      <header className="respondy-header">
        <h1 className="respondy-logo">RESPONDY</h1>
        {loggedIn ? (
          <nav className="respondy-nav" aria-label="주요 메뉴">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`respondy-nav-item ${selectedView === item.key ? 'is-active' : ''}`}
                onClick={() => setSelectedView(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : (
          <div className="respondy-header-spacer-grow" aria-hidden />
        )}
        <div className="respondy-header-trailing">
          {loggedIn ? (
            <button
              className="respondy-logout-btn"
              type="button"
              onClick={() => {
                setLoggedIn(false)
                setAuthView('login')
                setSelectedView('realtime')
                setAnalysisHistory([])
                setHistoryDetailId(null)
              }}
            >
              로그아웃
            </button>
          ) : (
            <span className="respondy-header-spacer" aria-hidden />
          )}
        </div>
      </header>

      <main className="respondy-main">{renderMainContent()}</main>

      {loggedIn && showPersonCreateModal && (
        <div className="respondy-modal-backdrop" role="presentation" onClick={closePersonCreateModal}>
          <div
            className="respondy-modal respondy-person-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-create-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="respondy-modal-head">
              <div className="respondy-modal-head-text">
                <p className="respondy-modal-eyebrow">인물 생성</p>
                <h2 id="person-create-modal-title" className="respondy-modal-title">
                  새 인물 만들기
                </h2>
              </div>
              <button
                type="button"
                className="respondy-modal-close"
                onClick={closePersonCreateModal}
                aria-label="닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="respondy-modal-body">
              <div className="respondy-person-form-grid">
                <label className="respondy-label" htmlFor="person-name">
                  이름
                </label>
                <input
                  id="person-name"
                  className="respondy-input"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="예: 김민지"
                  autoComplete="off"
                />
                <label className="respondy-label" htmlFor="person-birthdate">
                  나이(생년월일)
                </label>
                <input
                  id="person-birthdate"
                  type="date"
                  className="respondy-input"
                  value={newPersonBirthDate}
                  onChange={(e) => setNewPersonBirthDate(e.target.value)}
                />
                <label className="respondy-label" htmlFor="person-current-relation">
                  현재 관계
                </label>
                <input
                  id="person-current-relation"
                  className="respondy-input"
                  value={newPersonCurrentRelation}
                  onChange={(e) => setNewPersonCurrentRelation(e.target.value)}
                  placeholder="예: 선후배"
                  autoComplete="off"
                />
                <label className="respondy-label" htmlFor="person-goal-relation">
                  목표 관계
                </label>
                <input
                  id="person-goal-relation"
                  className="respondy-input"
                  value={newPersonGoalRelation}
                  onChange={(e) => setNewPersonGoalRelation(e.target.value)}
                  placeholder="예: 친한 친구"
                  autoComplete="off"
                />
                <label className="respondy-label" htmlFor="person-personality">
                  성격
                </label>
                <textarea
                  id="person-personality"
                  className="respondy-textarea"
                  value={newPersonPersonality}
                  onChange={(e) => setNewPersonPersonality(e.target.value)}
                  placeholder="예: 조용하지만 배려심이 많음"
                />
                <label className="respondy-label" htmlFor="person-notes">
                  특이사항
                </label>
                <textarea
                  id="person-notes"
                  className="respondy-textarea"
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  placeholder="예: 주말엔 답장이 늦는 편"
                />
              </div>
              <div className="respondy-modal-actions">
                <button type="button" className="respondy-modal-secondary-btn" onClick={closePersonCreateModal}>
                  취소
                </button>
                <button
                  type="button"
                  className="respondy-primary-btn respondy-modal-primary-btn"
                  onClick={createPersonProfile}
                  disabled={!newPersonName.trim()}
                >
                  인물 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loggedIn && historyDetail && (
        <div
          className="respondy-modal-backdrop"
          role="presentation"
          onClick={() => setHistoryDetailId(null)}
        >
          <div
            className="respondy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="respondy-modal-head">
              <div className="respondy-modal-head-text">
                <p className="respondy-modal-eyebrow">저장된 분석</p>
                <h2 id="history-modal-title" className="respondy-modal-title">
                  분석 기록 상세
                </h2>
              </div>
              <button
                type="button"
                className="respondy-modal-close"
                onClick={(e) => {
                  e.stopPropagation()
                  setHistoryDetailId(null)
                }}
                aria-label="닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="respondy-modal-meta">
              <span
                className={`respondy-modal-badge ${historyDetail.source === 'realtime' ? 'is-realtime' : 'is-manual'}`}
              >
                {historyDetail.source === 'realtime' ? '실시간 분석' : '수동 입력'}
              </span>
              <span className="respondy-modal-meta-sep" aria-hidden>
                ·
              </span>
              <span className="respondy-modal-time">
                {new Date(historyDetail.at).toLocaleString('ko-KR', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="respondy-modal-body">
              <section className="respondy-modal-section respondy-modal-panel">
                <h3 className="respondy-modal-section-title">입력 요약</h3>
                <dl className="respondy-modal-dl">
                  <dt>제목</dt>
                  <dd>{historyDetail.title || '—'}</dd>
                  <dt>상대방과의 관계</dt>
                  <dd>{historyDetail.relation || '—'}</dd>
                  <dt>목표 관계</dt>
                  <dd>{historyDetail.goalRelation || '—'}</dd>
                  <dt>상황 설명</dt>
                  <dd className="respondy-modal-pre">{historyDetail.situation || '—'}</dd>
                  {historyDetail.source === 'manual' && (
                    <>
                      <dt>받은 메시지</dt>
                      <dd className="respondy-modal-pre">
                        {historyDetail.receivedMessage || '—'}
                      </dd>
                    </>
                  )}
                </dl>
              </section>
              <section className="respondy-modal-section respondy-modal-panel">
                <h3 className="respondy-modal-section-title">AI 분석 결과</h3>
                <p className="respondy-modal-label">감정 분석</p>
                <div className="respondy-modal-textbox">{historyDetail.emotion}</div>
                <p className="respondy-modal-label">맥락 해석</p>
                <div className="respondy-modal-textbox">{historyDetail.context}</div>
              </section>
              <section className="respondy-modal-section respondy-modal-panel">
                <h3 className="respondy-modal-section-title">추천 답장</h3>
                <ul className="respondy-modal-suggestions">
                  {historyDetail.suggestions.map((s, i) => (
                    <li key={`${historyDetail.id}-s-${i}`} className="respondy-modal-suggestion">
                      <span className="respondy-modal-suggestion-index">{i + 1}</span>
                      <span className="respondy-modal-suggestion-text">{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
