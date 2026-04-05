# Synapse - Project Analysis & Roadmap

> **Generated**: 2026-04-05
> **Stack**: Next.js 16, React 19, Supabase, Google Gemini, Tailwind CSS v4, TypeScript 5
> **Codebase**: ~6,500 lines across 27 files | 0% test coverage

---

## Current State

Synapse is an AI-powered second-brain web application that enables users to capture, store, semantically search, and chat with their personal knowledge base using vector embeddings.

### Implemented Features

- Email/password authentication with Supabase
- Note CRUD with markdown support and tag system
- Semantic vector search via Gemini embeddings
- AI chat with context retrieval and citations
- Credit-based tier system (Free / Pro / Ultra)
- Import/export (JSON, CSV, Markdown)
- Light/dark theme toggle
- Responsive design with marketing landing page
- Docker multi-stage production build
- CI pipeline (lint + build)

---

## Phase 0 - Immediate Fixes

| Priority | Issue | Location |
|----------|-------|----------|
| CRITICAL | `.env.local` committed to git — rotate all keys (Supabase + Gemini) | `.env.local` |
| CRITICAL | No error boundaries — any React error crashes the entire page | All route segments |
| HIGH | No rate limiting on auth, chat, embedding endpoints | `src/app/actions.ts` |
| HIGH | Credit system race condition — concurrent requests can bypass limits | `src/app/actions.ts:545-575` |
| HIGH | Prompt injection risk — user input concatenated directly into AI prompts | `src/app/actions.ts:995` |
| HIGH | XSS risk — `react-markdown` renders unsanitized AI responses | `src/app/dashboard/chat/page.tsx` |

---

## Phase 1 - Bug Fixes

1. **N+1 query on notes page** — fetches all notes twice (once for data, once just for tags) → combine into single query (`src/app/dashboard/notes/page.tsx:52-54`)
2. **No pagination** — all notes loaded at once, will break at scale
3. **Export timeout risk** — `exportNotes()` fetches ALL notes without limit (`src/app/actions.ts:1047`)
4. **Missing email verification check** — users access dashboard with unverified emails
5. **Chat localStorage fragility** — no try-catch around `JSON.parse`, data lost on clear
6. **Embedding batch size of 8** — Gemini supports 100+, causing 12x unnecessary API calls (`src/app/actions.ts:35`)
7. **Unsafe type casts** — 20+ `as unknown` casts without runtime validation
8. **Missing input trimming** on signup fields (email, name)
9. **No password strength validation** on registration
10. **Generic error messages** — "I ran into a problem" gives users zero context

---

## Phase 2 - Next Features

### High Impact

| Feature | Description |
|---------|-------------|
| Server-side chat persistence | Move threads from localStorage to Supabase (data loss prevention) |
| Note pagination & infinite scroll | Essential for scaling beyond 50-100 notes |
| Password reset flow | Currently missing entirely, users get locked out |
| Search filters | Combine semantic search with tag/date filtering |
| Collaborative sharing | Share individual notes via public links |

### Medium Impact

| Feature | Description |
|---------|-------------|
| Rich text editor | Replace plain textarea with a block editor (Tiptap/Novel) |
| Note folders/categories | Organize beyond just tags |
| Keyboard shortcuts | Power user productivity (Cmd+K search, Cmd+N new note) |
| Offline support | Service worker + IndexedDB for offline note access |
| Note versioning/history | Track changes, restore previous versions |

### Nice to Have

| Feature | Description |
|---------|-------------|
| Browser extension | Quick capture from any webpage |
| Daily digest | AI-generated summary of recent notes and connections |
| Graph view | Visualize note relationships and connections |
| Mobile PWA | Installable app with push notifications |
| Voice notes | Speech-to-text capture with Whisper API |

---

## Phase 3 - Infrastructure Improvements

### Testing (currently 0%)

- Set up Vitest for unit tests (credit logic, parsers, citation extraction)
- Playwright for E2E tests (auth flow, note CRUD, chat)
- Add test script to CI pipeline
- Target: 70%+ coverage on critical paths

### Security

- Add CSP, X-Frame-Options, HSTS security headers
- Implement rate limiting middleware (e.g., `@upstash/ratelimit`)
- Add DOMPurify for markdown sanitization
- Create `.env.example` with documented variables
- Use structured AI prompts to prevent injection
- Add CSRF token validation

### Observability

- Error tracking (Sentry)
- Analytics (PostHog / Plausible)
- API usage monitoring and alerting
- Structured logging service (replace `console.error`)

### Accessibility

- Add ARIA labels to all interactive elements (buttons, inputs, modals)
- Replace `window.confirm()` / `window.prompt()` with proper accessible modals
- Add keyboard navigation for chat and note list
- Audit color contrast for WCAG AA compliance
- Add `aria-busy`, `aria-live` regions for dynamic content

### Performance

- Add Redis/caching layer for repeated queries
- Implement database indexes on `user_id`, `tags`, `created_at`
- Use ISR/streaming for dashboard pages
- Increase embedding batch size (8 → 100)
- Combine redundant profile queries

### Developer Experience

- Add `.env.example` with all required variables
- Set up Prettier for consistent formatting
- Add `.editorconfig`
- Create `CONTRIBUTING.md`
- Add Dependabot for dependency updates
- Add security scanning (SAST) to CI

---

## Phase 4 - Architecture & Vision

| Idea | Description |
|------|-------------|
| Multi-modal notes | Support images, PDFs, audio — embed and search across all media types |
| API layer | Public REST/GraphQL API for third-party integrations (Zapier, Obsidian sync) |
| Team workspaces | Shared knowledge bases with role-based access |
| Smart connections | Auto-suggest related notes based on embedding similarity |
| Spaced repetition | Turn notes into flashcards with SM-2 algorithm |
| Webhook integrations | Auto-capture from Slack, email, bookmarks |
| RAG pipeline upgrade | Chunked embeddings for long notes, re-ranking with cross-encoders |
| Custom AI personas | Let users define how the AI responds (teacher, researcher, critic) |

---

## Risk Summary

| Category | Rating | Key Concern |
|----------|--------|-------------|
| Security | CRITICAL | API keys exposed, no rate limiting, XSS risk |
| Testing | CRITICAL | 0% coverage, no test infrastructure |
| Code Quality | HIGH | Unsafe type casts, race conditions |
| Performance | MEDIUM | N+1 queries, small batch sizes, no caching |
| Accessibility | MEDIUM | Missing ARIA, keyboard nav gaps |
| Documentation | MEDIUM | No `.env.example`, no architecture docs |

---

## Recommended Priority Order

```
1. Rotate all exposed keys immediately
2. Add .env.local to .gitignore + create .env.example
3. Add error boundaries to all routes
4. Implement rate limiting
5. Fix N+1 queries and add pagination
6. Set up Vitest + write tests for credit logic
7. Server-side chat persistence
8. Password reset flow
9. Security headers + DOMPurify
10. Rich text editor upgrade
```
