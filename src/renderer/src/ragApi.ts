// src/renderer/src/ragApi.ts

const API_BASE = import.meta.env.VITE_RAG_API_URL ?? 'http://127.0.0.1:8000'

// helper dla POST JSON
async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }

  return (await res.json()) as TRes
}

// helper dla GET JSON
async function getJson<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }

  return (await res.json()) as TRes
}

// helper dla DELETE JSON
async function deleteJson<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' }
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }

  return (await res.json()) as TRes
}

// ===== typy =====

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Provider = 'default' | 'openai' | 'ollama' | 'none'

export interface SearchReq {
  query: string
  k?: number
}

export interface SearchResult {
  chunk_id: number
  source_id: number
  source: string
  page: number
  quote: string
  text: string
  score: number
}

export interface SearchRes {
  results: SearchResult[]
}

export interface GenReq {
  topic?: string | null
  difficulty?: Difficulty | null
  n?: number | null
  provider?: Provider | null
}

export interface QuestionWrapper {
  question_id: string
  question: {
    kind: 'YN' | 'MCQ'
    stem: string
    options?: string[] | null
    answer: string
    explanation: string
    metadata: Record<string, unknown>
    citations: {
      source: string
      page: number
      quote: string
    }[]
  }
}

export interface MultiQuestionWrapper {
  items: QuestionWrapper[]
}

export type GenResponse = QuestionWrapper | MultiQuestionWrapper

// upload /ingest
export interface UploadStat {
  file: string
  chunks: number
}

export interface UploadResponse {
  ingested: UploadStat[]
}

export interface SourceItem {
  id: number
  filename: string
  mime: string | null
  pages: number | null
  imported_at: string
  sha256: string
  chunks: number
}

export interface SourcesRes {
  total: number
  items: SourceItem[]
  limit: number
  offset: number
}

export interface ClearSourcesRes {
  ok: boolean
  removed_files: number
}

export interface RateReq {
  question_id: string
  score: number
  feedback?: string | null
}

export interface RateRes {
  ok: boolean
}

// ===== funkcje API =====

export function searchRag(query: string, k = 5): Promise<SearchRes> {
  const req: SearchReq = { query, k }
  return postJson<SearchReq, SearchRes>('/search', req)
}

export function genMcq(
  topic: string,
  difficulty: Difficulty = 'medium',
  n: number = 1,
  provider: Provider = 'default'
): Promise<GenResponse> {
  const req: GenReq = { topic, difficulty, n, provider }
  return postJson<GenReq, GenResponse>('/gen/mcq', req)
}

export function genYn(
  topic: string,
  difficulty: Difficulty = 'medium',
  n: number = 1,
  provider: Provider = 'default'
): Promise<GenResponse> {
  const req: GenReq = { topic, difficulty, n, provider }
  return postJson<GenReq, GenResponse>('/gen/yn', req)
}

export function rateQuestion(
  question_id: string,
  score: number,
  feedback?: string | null
): Promise<RateRes> {
  const req: RateReq = { question_id, score, feedback: feedback ?? null }
  return postJson<RateReq, RateRes>('/rate', req)
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData()
  for (const file of files) {
    // backend FastAPI przyjmuje list[UploadFile] pod nazwą "files"
    formData.append('files', file)
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }

  return (await res.json()) as UploadResponse
}

export function listSources(limit = 1000, offset = 0): Promise<SourcesRes> {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  return getJson<SourcesRes>(`/sources?${qs.toString()}`)
}

export function clearSources(): Promise<ClearSourcesRes> {
  return deleteJson<ClearSourcesRes>('/sources')
}
