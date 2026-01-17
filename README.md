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
- **Yarn 4** (repo ma `packageManager: yarn@4.10.3`).
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

### 1) Włącz Yarn przez Corepack (zalecane)

```bash
corepack enable
corepack prepare yarn@4.10.3 --activate
```

### 2) Zainstaluj zależności

```bash
yarn install
```

Po instalacji uruchomi się też `postinstall`:
- `electron-builder install-app-deps` (instaluje zależności natywne dla Electron).

---

## Uruchomienie (dev)

Najpierw uruchom backend (FastAPI) na tym samym adresie co w `.env`, a potem UI:

```bash
yarn dev
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
yarn build
```

Wykonuje:
- typecheck (node + web),
- `electron-vite build`.

### Build „unpacked” (folder z aplikacją)

```bash
yarn build:unpack
```

### Windows

```bash
yarn build:win
```

### macOS

```bash
yarn build:mac
```

### Linux

```bash
yarn build:linux
```

---

## Skrypty (package.json)

- `yarn dev` — uruchomienie developerskie (electron-vite dev)
- `yarn start` — preview (electron-vite preview)
- `yarn build` — typecheck + build (electron-vite build)
- `yarn build:unpack` — build + `electron-builder --dir`
- `yarn build:win` — build + paczka Windows
- `yarn build:mac` — build + paczka macOS
- `yarn build:linux` — build + paczka Linux
- `yarn lint` — ESLint (cache)
- `yarn format` — Prettier
- `yarn typecheck` — tsc dla node i web

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

### 3) Yarn „nie ta wersja”

Repo ma pinned Yarn w `packageManager`.
Użyj:

```bash
corepack enable
corepack prepare yarn@4.10.3 --activate
```

---

## Licencja

TBD.
