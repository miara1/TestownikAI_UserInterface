// src/renderer/src/utils/questionsDb.ts
import type { QuestionWrapper } from '../ragApi'

const DB_NAME = 'testownik_db'
const DB_VERSION = 1
const STORE = 'questions'

export type StoredQuestion = QuestionWrapper & {
  _topic: string
  _timestamp: string
  _userAnswer?: string
  _isCorrect?: boolean
  _answeredAt?: string
}

function getTopic(q: QuestionWrapper): string {
  const meta = q.question.metadata as Record<string, unknown> | undefined
  const topic = (meta?.topic as string | undefined)?.trim()
  return topic && topic.length > 0 ? topic : 'Bez tematu'
}

function getTimestamp(q: QuestionWrapper): string {
  const meta = q.question.metadata as Record<string, unknown> | undefined
  const ts = (meta?.timestamp as string | undefined)?.trim()
  return ts && ts.length > 0 ? ts : new Date().toISOString()
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'question_id' })
        store.createIndex('by_topic', '_topic', { unique: false })
        store.createIndex('by_timestamp', '_timestamp', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function upsertQuestion(q: QuestionWrapper): Promise<void> {
  const db = await openDb()
  const payload: StoredQuestion = {
    ...q,
    _topic: getTopic(q),
    _timestamp: getTimestamp(q)
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)

    tx.objectStore(STORE).put(payload) // put = insert lub update po question_id
  })

  db.close()

  // prosty “event bus” bez store’a
  window.dispatchEvent(new Event('questions-updated'))
}

export type TopicSummary = {
  topic: string
  count: number
  lastTimestamp: string
}

export async function getTopicsSummary(): Promise<TopicSummary[]> {
  const db = await openDb()

  const all = await new Promise<StoredQuestion[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as StoredQuestion[])
    req.onerror = () => reject(req.error)
  })

  db.close()

  const map = new Map<string, { count: number; lastTimestamp: string }>()
  for (const q of all) {
    const topic = q._topic
    const prev = map.get(topic)
    if (!prev) {
      map.set(topic, { count: 1, lastTimestamp: q._timestamp })
    } else {
      prev.count += 1
      if (q._timestamp > prev.lastTimestamp) prev.lastTimestamp = q._timestamp
    }
  }

  return Array.from(map.entries())
    .map(([topic, v]) => ({ topic, count: v.count, lastTimestamp: v.lastTimestamp }))
    .sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp))
}

export async function clearAllQuestions(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).clear()
  })
  db.close()
  window.dispatchEvent(new Event('questions-updated'))
}

export async function deleteTopics(topics: string[]): Promise<void> {
  if (topics.length === 0) return

  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)

    const store = tx.objectStore(STORE)
    const index = store.index('by_topic')

    for (const topic of topics) {
      const req = index.openCursor(IDBKeyRange.only(topic))
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      req.onerror = () => reject(req.error)
    }
  })

  db.close()
  window.dispatchEvent(new Event('questions-updated'))
}

export async function getQuestionsByTopic(topic: string): Promise<StoredQuestion[]> {
  const db = await openDb()

  const all = await new Promise<StoredQuestion[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const index = tx.objectStore(STORE).index('by_topic')
    const req = index.getAll(IDBKeyRange.only(topic))

    req.onsuccess = () => resolve(req.result as StoredQuestion[])
    req.onerror = () => reject(req.error)
  })

  db.close()

  // najstarsze -> najnowsze (żeby „quiz” szedł w czasie)
  return all.sort((a, b) => a._timestamp.localeCompare(b._timestamp))
}

export async function setUserAnswer(
  questionId: string,
  userAnswer: string,
  isCorrect: boolean
): Promise<void> {
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)

    const store = tx.objectStore(STORE)
    const getReq = store.get(questionId)

    getReq.onsuccess = () => {
      const item = getReq.result as StoredQuestion | undefined
      if (!item) return

      item._userAnswer = userAnswer
      item._isCorrect = isCorrect
      item._answeredAt = new Date().toISOString()

      store.put(item)
    }

    getReq.onerror = () => reject(getReq.error)
  })

  db.close()
  window.dispatchEvent(new Event('questions-updated'))
}

export async function resetTopicProgress(topic: string): Promise<void> {
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)

    const store = tx.objectStore(STORE)
    const index = store.index('by_topic')
    const req = index.openCursor(IDBKeyRange.only(topic))

    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return

      const item = cursor.value as StoredQuestion
      delete item._userAnswer
      delete item._isCorrect
      delete item._answeredAt

      cursor.update(item)
      cursor.continue()
    }

    req.onerror = () => reject(req.error)
  })

  db.close()
  window.dispatchEvent(new Event('questions-updated'))
}
