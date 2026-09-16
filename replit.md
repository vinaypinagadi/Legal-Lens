# LegalLens — AI Contract Analyzer

LegalLens helps non-lawyers understand contract language, spot potential risks, and prepare grounded questions for a licensed attorney.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/legallens run dev` — run the LegalLens frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: `@google/genai` with a server-managed `GEMINI_API_KEY` project secret

## Where things live

- `artifacts/legallens/src/App.tsx` — dashboard, intake, document analysis, risk review, chat, and privacy settings
- `artifacts/legallens/src/index.css` — LegalLens visual tokens and paper-grid treatment
- `artifacts/api-server/src/routes/documents.ts` — document, analysis, chat, and overview endpoints
- `artifacts/api-server/src/lib/gemini.ts` — per-request Gemini client and prompt logic
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — Drizzle runtime schema
- `supabase/schema.sql` — Supabase Auth/Postgres reference schema
- `README.md` — local setup, server-managed AI privacy model, and assumptions

## Architecture decisions

- The runnable app uses the workspace PostgreSQL/Drizzle stack; the requested Supabase schema is included as a portable deployment reference.
- Gemini keys are held in project secrets and used only by the API server; they are never sent to the browser or persisted in the database.
- The API schema is OpenAPI-first so the frontend consumes generated hooks rather than handwritten request shapes.
- Contract risks are stored as structured JSON so the UI can show severity, explanation, and source excerpts.

## Product

- Paste a contract or upload a `.txt` file.
- Review a plain-language TL;DR summary.
- Inspect structured red flags with severity and source excerpts.
- Ask questions about an analyzed contract.
- Review the server-managed AI connection and privacy guidance.
- See recent documents and dashboard risk counts.

## User preferences

The mandatory disclaimer must remain visible: LegalLens provides AI-generated legal information, not professional legal advice. Always consult a licensed attorney.

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- Never log, return, or persist the project Gemini key.
- Preview paths are managed by the artifact workflow; do not hardcode service ports in app code.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
