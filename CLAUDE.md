# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synapse is a full-stack AI-powered knowledge management app built with Next.js 16, React 19, Supabase (PostgreSQL + Auth + RLS), and Google Gemini (chat & embeddings). Users create notes, generate vector embeddings, and query their knowledge base via semantic search with citation highlighting.

## Commands

```bash
pnpm install --frozen-lockfile  # Install dependencies
pnpm dev                        # Start dev server (localhost:3000)
pnpm build                      # Production build
pnpm start                      # Serve production build
pnpm lint                       # ESLint (flat config, Next.js core-web-vitals + TypeScript rules)
```

No test framework is configured. CI (`.github/workflows/ci.yml`) runs `pnpm lint` then `pnpm build` on pushes to main/test/dev and PRs.

## Architecture

### Routing (Next.js App Router)

```
/                    Landing page (src/app/page.tsx)
/auth/login          Login
/auth/register       Registration
/dashboard           Protected layout — all sub-routes require auth
  /notes             Notes library with tag filtering
  /notes/[id]        Single note editor
  /chat              Chat interface (threads in localStorage)
  /profile           User profile
  /settings          Settings
  /subscribe         Tier subscription
```

### Key Files

- **`src/app/actions.ts`** — Central server actions file (~1,300 lines). All data mutations and AI operations: CRUD notes, embedding generation, semantic search, chat with citations, credit accounting, import/export.
- **`src/middleware.ts`** — Auth guard redirecting unauthenticated users away from `/dashboard`.
- **`src/lib/supabase/server.ts`** / **`client.ts`** — Supabase client factories (SSR vs browser).
- **`src/lib/tiers.ts`** — Tier definitions (Free/Pro/Ultra) with credit limits.
- **`src/components/notes/note-editor.tsx`** — Rich editor with citation highlighting and link autocomplete.

### Data Flow

1. **Auth**: Supabase Auth with email/password. Session refreshed via middleware cookies. RLS policies scope all DB access to `auth.uid()`.
2. **Notes**: Created/updated via server actions → Supabase. Embeddings generated via Gemini (`gemini-embedding-001`, 768-dim vectors) and stored alongside notes.
3. **Chat**: User query → Gemini embedding → `match_notes` RPC (vector similarity) → keyword fallback if low similarity → Gemini chat with matched context → response with extracted citations. Chat threads are stored in browser localStorage (not server-persisted).
4. **Credits**: Tier-based monthly limits (Free: 1K, Pro: 5K, Ultra: 10K). Charged on embedding generation and chat operations. Monthly reset based on `billing_start_date`.

### Conventions

- **Package manager**: pnpm 9+
- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: Tailwind CSS v4 with CSS variables for theming (light/dark via `data-theme` attribute). Global CSS at `src/app/globals.css`.
- **Server actions**: All mutations use `"use server"` pattern in `actions.ts`. Returns JSON to client components.
- **React Compiler**: Enabled via Babel plugin (`next.config.mjs`).
- **TypeScript**: Strict mode. Module resolution: `bundler`.
- **Icons**: Lucide React.

## Workflow for Features and Bug Fixes

When implementing a feature or fixing a bug, follow this workflow:

1. **Pull latest**: Fetch and pull latest changes into the local `dev` branch.
2. **Branch**: Create a new branch from `dev` (e.g., `feat/short-description` or `fix/short-description`).
3. **Implement**: Make the code changes.
4. **Test**: Write tests if appropriate. Run tests and `pnpm lint` to verify nothing is broken.
5. **Commit & Push**: If everything passes, commit and push the branch.
6. **PR**: Create a pull request targeting the `dev` branch.

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (public, RLS-protected)
- `GEMINI_API_KEY` — Google Gemini API key (server-only)
- `GEMINI_EMBEDDING_MODEL` — Optional override for embedding model name
