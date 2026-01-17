// src/renderer/src/components/TopicQuizView.tsx
import { useEffect, useMemo, useState } from 'react'
import beerImg from '../assets/beer.png'
import type { StoredQuestion } from '../utils/questionsDb'
import { getQuestionsByTopic, resetTopicProgress, setUserAnswer } from '../utils/questionsDb'

type Props = {
  topic: string
  onBack: () => void
}

function normalizeAnswer(x: string): string {
  return (x ?? '').toString().trim().toUpperCase()
}

function mcqLetterFromIndex(i: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + i) // A,B,C...
}

export function TopicQuizView({ topic, onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<StoredQuestion[]>([])
  const [idx, setIdx] = useState(0)

  const [showSummary, setShowSummary] = useState(false)
  const [summaryDismissed, setSummaryDismissed] = useState(false)

  // per pytanie - stan „klikniętego” w UI (od razu też zapisujemy do DB)
  const current = questions[idx]

  const refresh = async () => {
    setLoading(true)
    try {
      const qs = await getQuestionsByTopic(topic)
      setQuestions(qs)
      setIdx(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    setShowSummary(false)
    setSummaryDismissed(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])

  const finishAndReturn = async () => {
    setShowSummary(false)
    setSummaryDismissed(true)

    await resetTopicProgress(topic) // reset odpowiedzi w tym folderze
    await refresh() // odśwież UI (opcjonalnie, ale spójne)
    onBack() // wróć do panelu głównego
  }

  const progress = useMemo(() => {
    if (!questions.length) return { answered: 0, total: 0 }
    const answered = questions.filter((q) => q._answeredAt).length
    return { answered, total: questions.length }
  }, [questions])

  const correctCount = useMemo(() => questions.filter((q) => q._isCorrect).length, [questions])

  const percentCorrect = useMemo(() => {
    if (!progress.total) return 0
    return Math.round((correctCount / progress.total) * 100)
  }, [correctCount, progress.total])

  useEffect(() => {
    const done = progress.total > 0 && progress.answered === progress.total
    if (done && !summaryDismissed) {
      setShowSummary(true)
    }
  }, [progress.answered, progress.total, summaryDismissed])

  const answered = !!current?._answeredAt
  const correctNorm = current ? normalizeAnswer(current.question.answer) : ''

  const handlePick = async (userAnswerRaw: string) => {
    if (!current) return
    if (answered) return

    const userNorm = normalizeAnswer(userAnswerRaw)

    let isCorrect = false

    if (current.question.kind === 'MCQ') {
      // backend zwraca zwykle "a" / "b" -> normalizujemy do "A"/"B"
      const corr = correctNorm.length === 1 ? correctNorm : correctNorm[0]
      const user = userNorm.length === 1 ? userNorm : userNorm[0]
      isCorrect = user === corr
    } else {
      // YN: porównujemy tekstowo (TAK/NIE lub YES/NO)
      // jeśli backend zawsze daje "TAK"/"NIE" to wystarczy proste porównanie
      isCorrect = userNorm === correctNorm
    }

    await setUserAnswer(current.question_id, userAnswerRaw, isCorrect)

    // odśwież listę pytań, żeby wczytać _userAnswer/_isCorrect
    const qs = await getQuestionsByTopic(topic)
    setQuestions(qs)
  }

  const goPrev = () => setIdx((v) => Math.max(0, v - 1))
  const goNext = () => setIdx((v) => Math.min(questions.length - 1, v + 1))

  const optionClass = (state: 'neutral' | 'correct' | 'wrong') => {
    if (state === 'correct') return 'border-emerald-500 bg-emerald-600/20'
    if (state === 'wrong') return 'border-red-500 bg-red-600/20'
    return 'border-slate-700 bg-slate-900 hover:bg-slate-800'
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
        >
          ← Wróć
        </button>

        <div className="min-w-0">
          <div className="font-semibold truncate">{topic}</div>
          <div className="text-xs text-slate-400">
            Postęp: {progress.answered}/{progress.total}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm disabled:opacity-50"
          >
            Poprzednie
          </button>
          <button
            onClick={goNext}
            disabled={idx >= questions.length - 1}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm disabled:opacity-50"
          >
            Następne
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-auto rounded border border-slate-800 bg-slate-950 p-4">
        {loading ? (
          <div className="text-sm text-slate-400">Ładowanie…</div>
        ) : questions.length === 0 ? (
          <div className="text-sm text-slate-400">
            Brak pytań w tym folderze. Wygeneruj MCQ/YN w lewym panelu.
          </div>
        ) : !current ? (
          <div className="text-sm text-slate-400">Brak aktualnego pytania.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-slate-400">
              {idx + 1} / {questions.length} • typ: {current.question.kind}
            </div>

            <div className="text-base font-semibold leading-snug">{current.question.stem}</div>

            {/* odpowiedzi */}
            {current.question.kind === 'MCQ' ? (
              <div className="flex flex-col gap-2">
                {(current.question.options ?? []).map((opt, i) => {
                  const letter = mcqLetterFromIndex(i) // A,B,C...
                  const userNorm = current._userAnswer
                    ? normalizeAnswer(current._userAnswer).slice(0, 1)
                    : ''
                  const corrLetter = correctNorm.slice(0, 1)

                  const isUserPick = userNorm === letter
                  const isCorrectPick = corrLetter === letter

                  let state: 'neutral' | 'correct' | 'wrong' = 'neutral'
                  if (answered) {
                    if (isCorrectPick) state = 'correct'
                    if (isUserPick && !isCorrectPick) state = 'wrong'
                  }

                  return (
                    <button
                      key={letter}
                      onClick={() => handlePick(letter)}
                      disabled={answered}
                      className={[
                        'text-left w-full rounded border px-3 py-2 transition',
                        optionClass(state),
                        answered ? 'cursor-default' : 'cursor-pointer'
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-2">
                        <div className="font-mono text-sm mt-[1px]">{letter}.</div>
                        <div className="text-sm">{opt}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex gap-2">
                {['TAK', 'NIE'].map((v) => {
                  const userNorm = current._userAnswer ? normalizeAnswer(current._userAnswer) : ''
                  const isUserPick = answered && userNorm === v
                  const isCorrectPick = answered && correctNorm === v

                  let state: 'neutral' | 'correct' | 'wrong' = 'neutral'
                  if (answered) {
                    if (isCorrectPick) state = 'correct'
                    if (isUserPick && !isCorrectPick) state = 'wrong'
                  }

                  return (
                    <button
                      key={v}
                      onClick={() => handlePick(v)}
                      disabled={answered}
                      className={[
                        'flex-1 rounded border px-3 py-2 text-sm font-semibold transition',
                        optionClass(state),
                        answered ? 'cursor-default' : 'cursor-pointer'
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            )}

            {/* feedback po odpowiedzi */}
            {answered && (
              <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-sm font-semibold">
                  {current._isCorrect ? (
                    <span className="text-emerald-400">Poprawnie ✅</span>
                  ) : (
                    <span className="text-red-400">Błędnie ❌</span>
                  )}
                </div>
                <div className="text-sm text-slate-200 mt-2">{current.question.explanation}</div>

                {/* cytowania (opcjonalnie, ale fajne) */}
                {current.question.citations?.length > 0 && (
                  <div className="mt-3 text-xs text-slate-400">
                    <div className="font-semibold mb-1">Cytowania:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {current.question.citations.map((c, i) => (
                        <li key={i}>
                          {c.source}, str. {c.page}: „{c.quote}”
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => void finishAndReturn()} />
          <div className="relative w-[min(1000px,500vw)] rounded border border-slate-700 bg-slate-950 p-5">
            <div className="flex items-start gap-4">
              <img
                src={beerImg}
                alt="Piwo"
                className="w-200 h-200 object-contain rounded bg-slate-900 border border-slate-800"
              />
              <div className="min-w-0">
                <div className="text-lg font-semibold">Test ukończony</div>
                <div className="text-slate-300 mt-2">
                  Wynik: <span className="font-semibold">{percentCorrect}%</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  Poprawne: {correctCount}/{progress.total}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => void finishAndReturn()}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
