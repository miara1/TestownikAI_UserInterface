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

// upload /ingest
export interface UploadStat {
  file: string
  chunks: number
}

export interface UploadResponse {
  ingested: UploadStat[]
}

// ===== funkcje API =====

export function searchRag(query: string, k = 5): Promise<SearchRes> {
  const req: SearchReq = { query, k }
  return postJson<SearchReq, SearchRes>('/search', req)
}

export function genMcq(topic: string, difficulty: Difficulty = 'medium'): Promise<QuestionWrapper> {
  const req: GenReq = { topic, difficulty }
  return postJson<GenReq, QuestionWrapper>('/gen/mcq', req)
}

export function genYn(topic: string, difficulty: Difficulty = 'medium'): Promise<QuestionWrapper> {
  const req: GenReq = { topic, difficulty }
  return postJson<GenReq, QuestionWrapper>('/gen/yn', req)
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
