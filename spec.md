# Spec — Lightweight Collaborative Document Editor

Take-home assignment for Ajaia LLC (AI-Native Full Stack Developer).
Timebox: 4–6 hours. Goal: a focused, working slice of a Google-Docs-style product — not feature completeness.

---

## 1. Stack (decided)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router)** — single app, frontend + API routes | One deployable unit, no separate backend to run |
| Database | **Supabase Postgres** (free tier, new project in existing account) | Free, hosted, zero reviewer setup |
| DB access | **Server-side only** via `supabase-js` + service-role key inside API routes | localStorage auth means RLS can't protect anything; the API layer is the security boundary. Client never talks to Supabase directly |
| Editor | **Tiptap** (StarterKit + Underline) | Assignment explicitly allows any editor library; building contentEditable from scratch is the least-differentiating way to spend the timebox |
| UI | **Tailwind CSS + shadcn/ui** | Ready-made Dialog/Dropdown/Button/Toast for share + rename flows |
| Auth | **Mock localStorage auth** (see §3) | Assignment explicitly permits "seeded accounts, mocked auth" |
| Tests | **Vitest** — access-control + CRUD API tests | The sharing/permission logic is the most meaningful thing to test |
| Deployment | **Vercel** (free) | Native Next.js path; reviewers get a live URL |

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to client).

---

## 2. Data model (Supabase / Postgres)

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null default 'Untitled document',
  content jsonb not null default '{"type":"doc","content":[]}',  -- Tiptap JSON
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);
```

**Content format:** Tiptap JSON in a `jsonb` column. Preserves formatting/structure exactly (persistence requirement), queryable, no HTML sanitization worries on read.

**Seeded users** (no passwords):
- `alice@demo.com` (Alice)
- `bob@demo.com` (Bob)
- `carol@demo.com` (Carol)

---

## 3. Auth model (mock, by design)

- **Login:** user enters an email → `POST /api/auth/login` → if the email exists in `users`, return the user record; else 404 with a friendly error listing that demo accounts exist (exact emails printed on the login page).
- **Session:** client stores `{ id, email, name }` in `localStorage`. Logged in = key present. Logout = remove key.
- **Request identity:** every API call sends `x-user-id: <uuid>` header. Server verifies the user exists on each request; unknown/missing id → 401.
- **Explicit limitation (documented in README + architecture note):** this is intentionally not secure — anyone who knows a user id could impersonate them. It's a deliberate scope cut to keep focus on document/sharing logic; the API-route boundary means real auth (Supabase Auth, JWT) could be swapped in without restructuring.

---

## 4. Permissions model

| Action | Owner | Editor (shared) | Viewer (shared) | Other |
|---|---|---|---|---|
| See in doc list | ✅ | ✅ | ✅ | ❌ |
| Open/read | ✅ | ✅ | ✅ | 403 |
| Edit content | ✅ | ✅ | ❌ (read-only editor) | 403 |
| Rename | ✅ | ✅ | ❌ | 403 |
| Share / unshare | ✅ | ❌ | ❌ | 403 |
| Delete | ✅ | ❌ | ❌ | 403 |

One helper — `getDocumentAccess(docId, userId) → 'owner' | 'editor' | 'viewer' | null` — used by every document route. This is the core function the tests exercise.

---

## 5. API routes (Next.js route handlers)

| Method & path | Purpose | Access |
|---|---|---|
| `POST /api/auth/login` | Email → user record or 404 | public |
| `GET /api/documents` | List owned + shared docs (each tagged `role`, owner name, `updated_at`) | logged in |
| `POST /api/documents` | Create (optional title/content — also used by import) | logged in |
| `GET /api/documents/:id` | Fetch doc + caller's role | owner/editor/viewer |
| `PATCH /api/documents/:id` | Update `title` and/or `content` | owner/editor |
| `DELETE /api/documents/:id` | Delete | owner |
| `GET /api/documents/:id/shares` | List current shares | owner |
| `POST /api/documents/:id/shares` | `{ email, role }` → grant/update access (upsert) | owner |
| `DELETE /api/documents/:id/shares/:userId` | Revoke access | owner |
| `POST /api/upload` | Multipart file → converted → creates new doc → returns doc id | logged in |

Validation & error handling: zod (or manual checks) on all bodies; consistent `{ error: string }` JSON with proper status codes (400/401/403/404/413); client shows toasts.

---

## 6. Pages & components

```
/login          Email input + demo-account list (click-to-fill). Redirects if logged in.
/               Document list: "My documents" and "Shared with me" sections
                (or one list with Owner/Shared·role badges). New Document button,
                Upload button, per-doc row: title, owner, last edited, role badge,
                delete (owned only). Click → /doc/:id
/doc/:id        Editor page: title (inline rename, owner/editor), Tiptap editor,
                toolbar, save indicator, Share button (owner), Export button,
                read-only banner + disabled editing for viewers.
```

Components: `Editor` (Tiptap), `Toolbar` (bold, italic, underline, H1/H2/H3, bullet list, ordered list), `ShareDialog` (email + role picker, current shares list with revoke), `UploadButton`, `SaveIndicator`, `DocList`.

**Autosave:** debounced ~1.5s after last keystroke → `PATCH` content. Indicator states: `Saving… → Saved`, error state with retry toast. Rename saves on blur/Enter.

---

## 7. File upload → new document

Accepted types (enforced client + server, stated in UI + README): **`.txt`, `.md`, `.docx`**. Max size 2 MB.

| Type | Conversion |
|---|---|
| `.txt` | Split on newlines → Tiptap paragraphs |
| `.md` | `marked` → HTML → Tiptap `generateJSON` |
| `.docx` | `mammoth` → HTML → Tiptap `generateJSON` |

Flow: Upload button on doc list → convert server-side → create doc titled from filename → redirect into editor. Unsupported type / oversize / failed parse → clear error toast, no doc created.

---

## 8. Tests (Vitest)

Target the service layer (`lib/documents.ts`, `lib/access.ts`) with a mocked Supabase client:

**Access control (the meaningful test):**
- owner → `'owner'`; shared editor → `'editor'`; shared viewer → `'viewer'`; stranger → `null`
- PATCH as viewer → 403; PATCH as stranger → 403; DELETE as editor → 403; share as non-owner → 403

**CRUD round-trip:**
- create → returns doc with defaults; update title/content → persisted + `updated_at` bumped; get after update returns new content; delete → subsequent get 404

---

## 9. Stretch (only if core is done early)

**Export to Markdown** — serialize Tiptap JSON → `.md` download button in the editor. (~30 min; Viewer/Editor roles already cover the "role-based sharing" stretch item.)
Explicitly deprioritized: real-time collaboration, comments, version history, export to PDF.

---

## 10. Build order & time budget (~4h dev + deliverables)

| # | Phase | Est. |
|---|---|---|
| 1 | Scaffold: create-next-app, Tailwind, shadcn, Supabase project + schema + seed, env wiring | 30 min |
| 2 | Auth: login page, localStorage session, `x-user-id` middleware helper | 25 min |
| 3 | Documents: list page, create, rename, delete + API routes | 40 min |
| 4 | Editor: Tiptap + toolbar + autosave + save indicator | 50 min |
| 5 | Sharing: ShareDialog, shares API, role enforcement, read-only viewer mode | 40 min |
| 6 | Upload: conversion pipeline + UI | 30 min |
| 7 | Tests + validation/error-handling pass | 30 min |
| 8 | Deploy to Vercel, seed prod DB, smoke test live | 20 min |
| 9 | Deliverables: README, architecture note, AI-workflow note, SUBMISSION.md, walkthrough video, Drive folder | 45 min |

Cut line if running late: stretch (§9) goes first, then `.docx` support (keep .txt/.md), then delete-doc.

---

## 11. Deliverables checklist (from assignment)

- [ ] Source code (in Drive folder)
- [ ] `README.md` — local setup + run instructions + demo credentials + supported upload types
- [ ] Architecture note (Markdown) — what was prioritized and why, scope cuts
- [ ] AI workflow note (Markdown) — tools used, where AI sped things up, what was changed/rejected, how correctness was verified
- [ ] `SUBMISSION.md` — index of everything included
- [ ] Live Vercel URL
- [ ] Text file with walkthrough video URL (3–5 min, Loom/YouTube)
- [ ] Screenshots / demo GIF
- [ ] Demo credentials for sharing flow (alice/bob/carol emails)

---

## 12. Execution strategy (multi-agent)

Orchestrator (main session) plans, delegates, and commits — sub-agents do all file work.
Contract-first: Wave 0 fixes shared types/helpers/API contracts in `CONTRACTS.md`; later agents
own disjoint files and integrate against contracts, never against each other's code.

- **Wave 0 (1 agent):** deps, shadcn, `lib/` foundation (`supabase.ts`, `types.ts`, `api-helpers.ts`, `access.ts`), `CONTRACTS.md`, build must pass.
- **Wave 1 (5 agents, parallel):** A auth+docs API+list page · B editor page/components · C sharing API+dialog · D upload API+conversion+button · E Vitest tests against `lib/` contracts.
- **Wave 2 (1 agent):** integration (wire ShareDialog/UploadButton mount points), run app, fix cross-boundary mismatches.
- **Wave 3 (parallel):** Vercel deploy · README/architecture/AI-note writers · live smoke test.

Commit policy: one commit per wave, made by the orchestrator; agents never commit.

## 13. Deliberate scope cuts (to state in architecture note)

- No real auth/security — mock identity via localStorage + header; API boundary designed so real auth slots in later
- No real-time collaboration (single-writer, last-write-wins autosave)
- No comments, version history, folders, search, or pagination
- No image support inside documents
- Upload limited to .txt/.md/.docx, 2 MB
