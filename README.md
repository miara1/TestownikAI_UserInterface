# Testownik AI — User Interface (Electron + React)

Desktopowy interfejs (UI) do „Testownik AI”. Aplikacja działa jako **Electron + React + TypeScript** (bundlowanie przez **electron-vite**) i komunikuje się z backendem RAG (FastAPI) po HTTP.

UI umożliwia:
- wgrywanie materiałów (PDF/PPTX/DOCX/EPUB itp.) do backendu,
- przegląd listy źródeł i czyszczenie źródeł,
- generowanie pytań **TAK/NIE (YN)** oraz **ABCD (MCQ)**,
- ocenę jakości pytań (rating),
- rozwiązywanie quizów i przechowywanie pytań/postępu lokalnie w **IndexedDB**.

---

## Wymagania

- **Node.js 18+** (zalecane).
- **npm** (UI uruchamiasz przez `npm run ...`).
- Uruchomiony backend RAG (domyślnie `http://127.0.0.1:8000`).

---

## Konfiguracja API

Adres backendu jest konfigurowany przez zmienną środowiskową Vite:

- `VITE_RAG_API_URL`

Domyślnie UI używa:

```ts
const API_BASE = import.meta.env.VITE_RAG_API_URL ?? 'http://127.0.0.1:8000'
```

Plik: `src/renderer/src/ragApi.ts`

### Przykładowy `.env`

```env
VITE_RAG_API_URL=http://127.0.0.1:8000
```

> W produkcji ustaw `VITE_RAG_API_URL` na adres, pod którym działa Wasz backend (np. host w LAN).

---

## Instalacja

Zainstaluj zależności:

```bash
npm install
```

Po instalacji uruchomi się też `postinstall`:
- `electron-builder install-app-deps` (instaluje zależności natywne dla Electron).

---

## Uruchomienie (dev)

Najpierw uruchom backend (FastAPI) na tym samym adresie co w `.env`, a potem UI:

```bash
npm run dev
```

To uruchamia:
- renderer (React) z hot reload,
- proces główny Electron,
- preload.

---

## Build / paczki instalacyjne

Repo jest przygotowane do budowania paczek przez `electron-builder`.

### Build aplikacji

```bash
npm run build
```

Wykonuje:
- typecheck (node + web),
- `electron-vite build`.

### Build „unpacked” (folder z aplikacją)

```bash
npm run build:unpack
```

### Windows

```bash
npm run build:win
```

### macOS

```bash
npm run build:mac
```

### Linux

```bash
npm run build:linux
```

---

## Skrypty (package.json)

- `npm run dev` — uruchomienie developerskie (electron-vite dev)
- `npm run start` — preview (electron-vite preview)
- `npm run build` — typecheck + build (electron-vite build)
- `npm run build:unpack` — build + `electron-builder --dir`
- `npm run build:win` — build + paczka Windows
- `npm run build:mac` — build + paczka macOS
- `npm run build:linux` — build + paczka Linux
- `npm run lint` — ESLint (cache)
- `npm run format` — Prettier
- `npm run typecheck` — tsc dla node i web

---

## Lokalna baza pytań (IndexedDB)

UI przechowuje pytania, postęp rozwiązywania i odpowiedzi użytkownika w **IndexedDB**.
Dzięki temu:
- quizy działają płynnie,
- można wracać do tematu bez ponownego pobierania pytań,
- backend nie musi trzymać stanu „postępu quizu”.

Backend jest wykorzystywany do:
- generowania pytań,
- ratingu,
- zarządzania źródłami.

---

## Backend API (wykorzystywane endpointy)

Implementacja wywołań jest w `src/renderer/src/ragApi.ts`.

### Search (RAG)

- `POST /search`
  - body: `{ query: string, k?: number }`
  - response: lista chunków z dopasowaniem i score

### Generowanie pytań

- `POST /gen/mcq`
- `POST /gen/yn`

Body (oba endpointy):

```json
{
  "topic": "metaheurystyki",
  "difficulty": "medium",
  "n": 10,
  "provider": "default"
}
```

`provider`:
- `default` | `openai` | `ollama` | `none`

Odpowiedź:
- pojedyncze pytanie albo paczka pytań `{ items: [...] }` (UI obsługuje oba warianty).

### Rating pytania

- `POST /rate`
  - body: `{ question_id: string, score: number, feedback?: string | null }`
  - response: `{ ok: boolean }`

### Źródła (materiały)

- `POST /upload` — multipart/form-data z listą plików pod kluczem `files`
- `GET /sources?limit=...&offset=...` — lista źródeł
- `DELETE /sources` — czyszczenie źródeł

---

## Struktura projektu (wysoki poziom)

Projekt jest oparty o standardowy układ Electron + Vite:

- `src/main/` — proces główny Electron (okna, lifecycle)
- `src/preload/` — preload / bezpieczny bridge
- `src/renderer/` — React UI (komponenty, widoki, style)
  - `src/renderer/src/ragApi.ts` — klient HTTP do backendu
  - `src/renderer/src/utils/...` — logika i baza (IndexedDB)

---

## Troubleshooting

### 1) UI nie łączy się z backendem

- Sprawdź `.env` → `VITE_RAG_API_URL`
- Sprawdź czy backend działa i odpowiada na `GET /sources` albo `POST /gen/yn`.

### 2) Błędy CORS

W dev nie powinno to występować, ale jeśli backend działa na innym hoście/porcie, upewnij się że:
- backend ma poprawnie ustawione CORS,
- URL w `VITE_RAG_API_URL` jest zgodny z faktycznym adresem API.

### 3) Problemy z zależnościami natywnymi Electron

Po `npm install` uruchamia się `electron-builder install-app-deps`. Jeśli masz błędy (np. po aktualizacji Node/Electron), spróbuj ponownie:

```bash
npx electron-builder install-app-deps
```

---

## Licencja

TBD.
