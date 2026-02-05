# Synapse

Synapse is a Second Brain web app for capturing ideas, turning them into searchable vectors, and chatting with your personal knowledge base.

## Overview

Synapse combines note-taking, semantic search, and AI chat so you can recall ideas in seconds. Notes are embedded with Gemini, stored in Supabase, and surfaced through similarity search or RAG-style conversations.

## Features

- Capture, edit, and delete notes with automatic embeddings.
- Semantic search and related-note discovery using vector similarity.
- AI chat that can answer questions, summarize, and synthesize plans from your notes.
- Supabase auth with protected dashboard routes and RLS assumptions.
- Usage-based credits, tier limits, and subscription UI.
- Light/dark theme with persisted preference.

## Tech Stack

- Next.js 16 / React 19
- Tailwind CSS v4
- Supabase (Auth, Postgres, RLS)
- Google Gemini via `@google/genai`
- Lucide icons and `react-markdown`

## Getting Started

1. Install dependencies.

```bash
pnpm install
```

2. Add environment variables in `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

3. Start the dev server.

```bash
pnpm dev
```

## Supabase Setup (Expected)

- `notes` table columns: `id`, `user_id`, `content`, `embedding` (vector length 768), `tags` (text array), `created_at`.
- `profiles` table columns: `id`, `first_name`, `last_name`, `email`, `tier`, `credits_used`, `billing_start_date`.
- `match_notes` RPC params: `query_embedding`, `match_threshold`, `match_count`, returning `id`, `content`, `similarity`.
- RLS policies should restrict `notes` and `profiles` rows to `auth.uid()`.

## Credits And Tiers

- Free: 1,000 credits, 50 notes, 1,000 character limit.
- Pro: 5,000 credits, 250 notes, 20,000 character limit.
- Ultra: 10,000 credits, unlimited notes, 100,000 character limit.
- Credits are consumed for embeddings and chat; monthly reset is based on `billing_start_date`.

## Scripts

- `pnpm dev` Run the dev server.
- `pnpm build` Build for production.
- `pnpm start` Start the production server.
- `pnpm lint` Run ESLint.

## Project Structure

- `src/app` Routes and server actions.
- `src/components` UI components and theming.
- `src/lib` Supabase clients and tier configuration.
- `public` Static assets.
