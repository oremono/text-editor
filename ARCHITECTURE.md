# Architecture Note

This document explains what was built, why the stack looks the way it does, and — most importantly — what was deliberately prioritized and cut within the 4–6 hour timebox.

## 1. Stack and rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Frontend and API in one deployable unit; no separate backend to run or document |
| Editor | Tiptap v3 (StarterKit + Underline) | The assignment allows any editor library. Hand-rolling `contentEditable` is the least differentiating way to spend the timebox; Tiptap gives a solid ProseMirror-based editing experience and a clean JSON document model |
| Database | Supabase Postgres (free tier) | Hosted, free, zero setup for reviewers; real relational integrity for the sharing model |
| DB access | Server-side only, via service-role key inside API routes | See §4 — the API layer is the auth boundary |
| Validation | zod v4 | Every request body validated; ZodError mapped to 400 centrally |
| UI | Tailwind v4 + shadcn/ui | Ready-made Dialog/Select/Toast primitives for share and rename flows |
| Tests | Vitest (39 tests) + Playwright E2E (`e2e/`) | The permission logic is the most meaningful thing to test; E2E proves the flows in a real browser |
| Deployment | Vercel (auto-deploys `master`) | Native Next.js path; reviewers get a live URL: https://the-text-editor.vercel.app/ |

## 2. Data model (3 tables)

```sql
users            (id uuid PK, email unique, name, created_at)
documents        (id uuid PK, owner_id → users, title,
                  content jsonb,          -- Tiptap JSON document
                  created_at, updated_at)
document_shares  (id uuid PK, document_id → documents, user_id → users,
                  role check in ('viewer','editor'),
                  unique (document_id, user_id))
```

Full schema + seed: `supabase/migrations/20260729000001_init.sql`.

**Why Tiptap JSON in `jsonb`:** it preserves formatting and structure exactly (the persistence requirement), round-trips losslessly into the editor, avoids HTML sanitization concerns on read, and stays queryable. Ownership lives on `documents.owner_id`; shared access is a row in `document_shares` — so "owned vs shared" and the role are both first-class, not inferred.

## 3. Request flow

```
Browser (React client components)
  |  apiFetch() — attaches x-user-id header from localStorage session
  v
Next.js API route handler (app/api/**)
  |  withErrorHandling()   ApiError -> status, ZodError -> 400, else -> 500
  |  requireUser(req)      x-user-id must exist in users table, else 401
  |  requireAccess(docId, userId, minRole)   owner > editor > viewer, else 403/404
  |  zod schema.parse(body)
  v
lib/ service layer (access.ts, convert.ts, supabase.ts)
  |  supabase-js with SERVICE ROLE key (server-only module)
  v
Supabase Postgres  (users / documents / document_shares)
```

The client never talks to Supabase. Every document route funnels through the same two helpers (`requireUser`, `requireAccess`), so there is exactly one place where identity and permissions are decided.

## 4. Auth boundary — mock auth, by design

Auth is intentionally mocked: login is email-only against seeded users; the client stores the user record in localStorage and sends `x-user-id` on every request; the server verifies that id exists on each call.

This is **not secure** — anyone who knows a user's UUID could impersonate them — and that is a documented, deliberate scope cut, explicitly permitted by the assignment ("seeded accounts, mocked auth"). The consequential design decision it forced:

- **Row Level Security was off the table.** RLS is only meaningful when the database can trust the caller's identity (a verified JWT). With mock identity, RLS would be security theater. So instead of client-side Supabase access, **all DB access happens server-side with the service-role key, and the API route layer is the single enforcement boundary.**
- **Real auth slots in without restructuring.** Swapping in Supabase Auth (or any JWT provider) means replacing the body of `requireUser()` — header check becomes token verification — and the login page. Every route, the permission helpers, and the data model are unchanged. Optionally, RLS policies could then be layered on as defense in depth.

This was a conscious trade: spend the timebox on document, sharing, and upload logic that demonstrates product judgment, not on wiring an auth provider — while keeping the architecture honest about where real auth would live.

## 5. Permission model

| Action | Owner | Editor (shared) | Viewer (shared) | Anyone else |
|---|---|---|---|---|
| See in document list | yes | yes | yes | no |
| Open / read | yes | yes | yes | 403 |
| Edit content | yes | yes | no (read-only) | 403 |
| Rename | yes | yes | no | 403 |
| Share / revoke access | yes | no | no | 403 |
| Delete | yes | no | no | 403 |

One helper implements this: `getDocumentAccess(docId, userId) -> 'owner' | 'editor' | 'viewer' | null` (`lib/access.ts`), used by every document route via `requireAccess`. Viewer read-only is enforced twice: the editor is non-editable in the UI (with a banner), **and** `PATCH` requires the `editor` role at the API — the UI is a convenience, the API is the guarantee. This helper and matrix are what the test suite exercises hardest.

## 6. What was prioritized, and what was cut

**Prioritized — depth over coverage:**

1. **Correct, tested access control.** Sharing is the feature where "working logic" vs "demo smoke and mirrors" shows. The role matrix is enforced at the API, covered by unit tests, and demonstrable live with two browser windows.
2. **A trustworthy editing loop.** Rich text with debounced autosave and an honest save indicator (including an error state) — the core loop a user lives in.
3. **A complete upload pipeline.** All three formats from the assignment's example (`.txt`, `.md`, `.docx`) convert server-side into real Tiptap documents, with type/size validation and clean failure modes.
4. **Reviewability.** Live deployment, seeded accounts, one-file schema setup, tests that run with `npm test`.

**Cut — deliberately (see spec.md §13):**

- **Real auth/security** — mocked as described in §4; the assignment permits it and it bought the most time for the least evaluative loss.
- **Real-time collaboration** — single-writer, last-write-wins autosave. Live cursors/CRDTs are days of work and listed by the assignment as optional stretch only.
- **Comments, version history, folders, search, pagination** — none of these change the core judgment being evaluated; all are additive later.
- **Images in documents** — pulls in storage, upload UI inside the editor, and sanitization; low value for the demo flows.
- **Upload beyond .txt/.md/.docx, 2 MB** — stated clearly in the UI and README, as required.
- **Markdown export** (planned stretch) — not built; the role-based sharing stretch item (viewer/editor) was completed instead since it deepens the core sharing feature rather than adding a side feature.

## 7. Next 2–4 hours

In priority order:

1. **Real auth** — Supabase Auth (magic link) replacing `requireUser`'s header check with JWT verification; add RLS policies as a second enforcement layer.
2. **Realtime presence** — Supabase Realtime channels to show "who's viewing" avatars and stale-document warnings; a stepping stone toward true collaborative editing without committing to CRDTs yet.
3. **Version history** — snapshot the Tiptap JSON on save (or on interval) into a `document_versions` table; list + restore UI. The `jsonb` content model makes this nearly free.
4. **Import into an existing document** and **Markdown export** — reuse `lib/convert.ts` to append uploaded content at the cursor, and serialize Tiptap JSON to `.md` for download.
