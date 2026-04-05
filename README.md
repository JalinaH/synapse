# Synapse

Synapse is a second-brain web app for capturing ideas, turning them into searchable vectors, and chatting with your personal knowledge base.

## What It Does

Synapse combines note-taking, semantic retrieval, and AI chat so you can recall and synthesize ideas quickly.

Key capabilities:

- Create, edit, tag, and delete notes with embedding generation.
- Semantic search over your notes using vector similarity.
- AI chat grounded in your stored notes, with source-aware responses.
- Note import/export in JSON, CSV, and Markdown.
- Supabase auth with protected dashboard routes.
- Tier-based usage controls (credits, note limits, character limits).
- Light and dark themes with persisted preference.

## Tech Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres + RLS)
- Google Gemini via `@google/genai`
- Lucide icons and `react-markdown`

## Requirements

- Node.js 22+ (matches Docker runtime)
- pnpm 9+
- A Supabase project
- A Gemini API key

## Quick Start

1. Install dependencies.

```bash
pnpm install
```

2. Create `.env.local` in the project root.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

3. Start the dev server.

```bash
pnpm dev
```

4. Open http://localhost:3000.

## Environment Variables

| Variable                        | Required | Description                                                   |
| ------------------------------- | -------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL.                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon public key.                                     |
| `GEMINI_API_KEY`                | Yes      | API key used for chat and embeddings.                         |
| `GEMINI_EMBEDDING_MODEL`        | No       | Embedding model override. Defaults to `gemini-embedding-001`. |

## Expected Supabase Schema

Synapse expects these database objects:

- `notes` table with: `id`, `user_id`, `content`, `embedding` (vector 768), `tags` (text[]), `created_at`.
- `profiles` table with: `id`, `first_name`, `last_name`, `email`, `tier`, `credits_used`, `billing_start_date`.
- `match_notes` RPC with params `query_embedding`, `match_threshold`, `match_count`, returning `id`, `content`, `similarity`.
- RLS policies on `notes` and `profiles` that scope reads/writes to `auth.uid()`.

## Credit Tiers

| Tier  | Monthly Credits | Note Limit | Max Characters Per Note |
| ----- | --------------- | ---------- | ----------------------- |
| Free  | 1,000           | 50         | 1,000                   |
| Pro   | 5,000           | 250        | 20,000                  |
| Ultra | 10,000          | Unlimited  | 100,000                 |

Credits are consumed by embedding generation and chat operations. Usage resets based on `billing_start_date`.

## Available Scripts

- `pnpm dev` - Run the development server.
- `pnpm build` - Build for production.
- `pnpm start` - Start the production server.
- `pnpm lint` - Run ESLint.

## Docker

The repository includes a multi-stage `Dockerfile` for production builds.

Build image:

```bash
docker build -t synapse .
```

Run container:

```bash
docker run --rm -p 3000:3000 \
	-e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
	-e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key \
	-e GEMINI_API_KEY=your_gemini_api_key \
	synapse
```

## Project Structure

- `src/app` - App routes, layouts, and server actions.
- `src/components` - Reusable UI and note/chat components.
- `src/lib` - Tier config and Supabase client helpers.
- `src/types` - Shared TypeScript types.
- `public` - Static assets.

## Notes

- Chat threads are stored client-side in local storage.
- Production deployments should run with strict Supabase RLS policies enabled.
