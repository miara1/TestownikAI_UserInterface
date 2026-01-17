// src/renderer/src/components/TopicQuizView.tsx
import { useEffect, useMemo, useState } from 'react'
import beerImg from '../assets/beer.png'
import { rateQuestion } from '../ragApi'
import type { StoredQuestion } from '../utils/questionsDb'
import {
  deleteQuestion,
  getQuestionsByTopic,
  resetTopicProgress,
  setLocalRating,
  setUserAnswer
} from '../utils/questionsDb'

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

  const [ratingBusy, setRatingBusy] = useState(false)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [ratingError, setRatingError] = useState<string | null>(null)

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

  useEffect(() => {
    setRatingFeedback(current?._lastFeedback ?? '')
    setRatingError(null)
  }, [current?.question_id])

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

  // useEffect(() => {
  //   const done = progress.total > 0 && progress.answered === progress.total
  //   if (done && !summaryDismissed) {
  //     setShowSummary(true)
  //   }
  // }, [progress.answered, progress.total, summaryDismissed])

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

  const handleRate = async (score: number) => {
    if (!current) return

    // clamp 1..10
    const clamped = Math.max(1, Math.min(10, score))

    setRatingBusy(true)
    setRatingError(null)

    try {
      // 1) backend
      await rateQuestion(current.question_id, clamped, ratingFeedback || null)

      // 2) local DB (dla pokazywania ostatniego rate)
      await setLocalRating(current.question_id, clamped, ratingFeedback || null)

      // 3) odśwież pytania, żeby current miał _lastRate
      const qs = await getQuestionsByTopic(topic)
      setQuestions(qs)
    } catch (e) {
      setRatingError((e as Error).message ?? 'rate_failed')
    } finally {
      setRatingBusy(false)
    }
  }

  const handleDeleteCurrent = async () => {
    if (!current) return

    const ok = window.confirm('Usunąć to pytanie z tego folderu? Tej operacji nie da się cofnąć.')
    if (!ok) return
    console.log('Deleting question_id:', current.question_id)

    await deleteQuestion(current.question_id)

    const qs = await getQuestionsByTopic(topic)
    console.log('Questions after delete:', qs.length)

    if (qs.length === 0) {
      // folder pusty -> wróć do panelu głównego
      onBack()
      return
    }

    setQuestions(qs)
    // zostajemy na tym samym indeksie, ale pilnujemy zakresu
    setIdx((prev) => Math.min(prev, qs.length - 1))
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
            {current && <> </>}
          </div>
        </div>

        {progress.total > 0 && progress.answered === progress.total && (
          <span className="ml-2 text-xs text-emerald-400">Ukończono</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSummary(true)}
            disabled={progress.total === 0 || progress.answered !== progress.total}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm disabled:opacity-50"
            title="Dostępne po udzieleniu odpowiedzi na wszystkie pytania"
          >
            Pokaż wynik
          </button>

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

          <button
            onClick={() => void handleDeleteCurrent()}
            disabled={!current}
            className="px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-sm disabled:opacity-50"
            title="Usuń to pytanie z folderu"
          >
            Usuń pytanie
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
              {idx + 1} / {questions.length} • typ: {current.question.kind} • trudność:{' '}
              {String((current.question.metadata as any)?.difficulty ?? '—')} • rate:{' '}
              {current._lastRate ? `${current._lastRate}/10` : '—'}
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

      {current && (
        <div className="flex items-center gap-3 rounded border border-slate-800 bg-slate-950 p-3">
          <div className="text-sm text-slate-200 whitespace-nowrap">Oceń pytanie:</div>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                disabled={ratingBusy}
                onClick={() => void handleRate(s)}
                className={[
                  'px-3 py-1.5 rounded border text-sm',
                  current._lastRate === s
                    ? 'border-emerald-500 bg-emerald-600/20'
                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800',
                  ratingBusy ? 'opacity-50 cursor-default' : ''
                ].join(' ')}
                title="Wyślij ocenę do backendu"
              >
                {s}
              </button>
            ))}
          </div>

          <input
            value={ratingFeedback}
            onChange={(e) => setRatingFeedback(e.target.value)}
            disabled={ratingBusy}
            placeholder="(opcjonalnie) komentarz…"
            className="ml-auto w-[min(360px,40vw)] px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-sm"
          />

          {ratingError && <div className="text-xs text-red-400 ml-2">{ratingError}</div>}
        </div>
      )}

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
