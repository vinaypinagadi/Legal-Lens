# LegalLens — AI Contract Analyzer

LegalLens is a GenAI-powered legal document explainer for people who need to understand a contract before they speak with a lawyer. It simplifies dense language, calls out potential obligations and risks, and provides a grounded Q&A experience over the document.

> **LegalLens provides AI-generated legal information, not professional legal advice. Always consult a licensed attorney.**

## Chosen vertical

**Simplifying complex legal documents and risk analysis.** The product is designed around an evidence-first reading workflow: plain-language summaries are paired with excerpts from the source document, and risk findings are framed as questions to discuss with a licensed attorney.

## Approach and architecture

- **Frontend:** React + Vite in `artifacts/legallens`, with Tailwind CSS, Lucide React, Wouter, and TanStack Query.
- **API:** Express 5 in `artifacts/api-server`, mounted at `/api`.
- **Typed contract:** `lib/api-spec/openapi.yaml` is the source of truth. Generated React Query hooks live in `lib/api-client-react`.
- **Data:** The runnable Replit version uses the project PostgreSQL database through Drizzle ORM. The matching Supabase Auth/Postgres schema is included in `supabase/schema.sql` for a Supabase deployment.
- **AI:** The server creates a new `GoogleGenAI` client per analysis or chat request from the `GEMINI_API_KEY` project secret. The key is never returned to the browser, written to PostgreSQL, or logged.
- **Document text:** The first build accepts pasted text and `.txt` uploads in the browser. PDF extraction can be added without changing the analysis contract.

The dashboard and analysis workspace are usable immediately. Gemini analysis and document chat use the server-managed project secret, so end users do not need to provide a key.

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the local database

The Replit workspace provides `DATABASE_URL`. Push the Drizzle schema with:

```bash
pnpm --filter @workspace/db run push
```

For a Supabase project instead:

1. Create a Supabase project.
2. Enable an email or OAuth provider in Supabase Auth.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the frontend environment.
5. Install `@supabase/supabase-js` and `@supabase/ssr` in the app that imports `supabase/client.ts`.

### 3. Start the app

The project has managed workflows for the API and frontend. The equivalent commands are:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/legallens run dev
```

### 4. Configure Gemini

1. Add `GEMINI_API_KEY` to the project secrets.
2. Paste a contract or upload a `.txt` file.
3. Run the analysis.

The key stays server-side and is read only when the API creates a Gemini client. It is not sent to the browser, stored in the database, included in URLs, or written to application logs.

## API surface

- `GET /api/overview` — dashboard counts and last analysis time
- `GET /api/documents` — recent documents
- `POST /api/documents` — create a draft from title and extracted text
- `GET /api/documents/:documentId` — retrieve one document
- `POST /api/documents/:documentId` — analyze with the server-managed Gemini connection
- `GET /api/documents/:documentId/chat` — list document chat
- `POST /api/documents/:documentId/chat` — ask Gemini a document-grounded question

## Assumptions

- The hackathon MVP is single-user in the Replit runtime and does not require a local password system. Supabase Auth and row-level security are documented for the Supabase deployment path.
- Contract text is persisted so an analysis can be revisited; the Gemini project key is managed as a secret and never persisted in application tables.
- AI output is advisory and must be reviewed by a licensed attorney.
- The first intake path prioritizes paste and `.txt` upload to keep the MVP lightweight and under the repository size limit.
- The product reports potential risks, not definitive legal conclusions.

## Repository size and Git

The root `.gitignore` excludes dependencies, build output, environment files, and large legal-document fixtures. Initialize the hackathon repository on one branch:

```bash
git init
git branch -M main
git add .
git commit -m "Build LegalLens contract analyzer"
```

Do not commit `.env` files, Gemini keys, Supabase service-role keys, or real contracts.