# Text Editor — Lightweight Collaborative Document Editor

**Live app:** https://the-text-editor.vercel.app/

**Demo accounts** (email-only login, no passwords):

| Email | Name |
|---|---|
| `alice@demo.com` | Alice |
| `bob@demo.com` | Bob |
| `carol@demo.com` | Carol |

**To try the sharing flow:** log in as Alice in one window, share a document with `bob@demo.com`, then open an incognito window and log in as Bob.

This is the submission for Ajaia LLC's AI-Native Full Stack Developer take-home: a Google-Docs-inspired editor in which users create and edit rich-text documents, upload files that become editable documents, and share documents with other users under viewer/editor roles. Every core requirement of the assignment works end to end on the live deployment above; this README walks through each one in the order a reviewer would encounter it, links to the code and documents that back it, and ends with a [delivery checklist](#delivery-checklist) mapping every assignment requirement to where it is fulfilled. The full deliverables index — what is in the Drive folder and what is partial — is in [SUBMISSION.md](./SUBMISSION.md).

## Logging in and what you'll see

The natural starting point is the login screen, so it is worth saying up front: **auth is intentionally mocked**, as the assignment explicitly permits ("seeded accounts, mocked auth"). Login is email-only against the three seeded users above — the login page lists them click-to-fill ([`app/login/page.tsx`](./app/login/page.tsx)). This was a deliberate scope cut with real architectural consequences, covered in [the persistence section below](#persistence-and-the-api-boundary) and in depth in [ARCHITECTURE.md](./ARCHITECTURE.md) §4, including how real auth slots into the existing boundary without restructuring.

Once logged in you land on the document list ([`app/page.tsx`](./app/page.tsx), [`components/doc-list.tsx`](./components/doc-list.tsx)), split into **"My documents"** and **"Shared with me"** with role badges — the owned/shared distinction the assignment asks for is the first thing on screen. From here you can create a document, upload a file, or open anything you own or that has been shared with you.

## The editing experience

Opening a document takes you into the core of the product: the editor page ([`app/doc/[id]/page.tsx`](./app/doc/%5Bid%5D/page.tsx)). It covers the assignment's full document-lifecycle requirement — **create, rename (inline title edit), edit, save, reopen, delete** — and the required rich-text formatting: **bold, italic, underline, H1–H3 headings, and bullet and ordered lists**, built on Tiptap v3 with a custom toolbar ([`components/editor/toolbar.tsx`](./components/editor/toolbar.tsx)). Saving is automatic: a debounced autosave fires **1.5 s** after the last keystroke, with an honest Saving / Saved / Error indicator ([`components/editor/save-indicator.tsx`](./components/editor/save-indicator.tsx)) so you always know whether your work is on the server.

## Getting content in: file upload

Typing is not the only way content enters the product. The upload button ([`components/upload-button.tsx`](./components/upload-button.tsx)) accepts a **`.txt`, `.md`, or `.docx` file (max 2 MB)** and converts it server-side into a new editable document — `.docx` via mammoth, `.md` via marked, both normalized into Tiptap JSON by [`lib/convert.ts`](./lib/convert.ts) and created through [`app/api/upload/route.ts`](./app/api/upload/route.ts).

**Supported upload types:** `.txt`, `.md`, `.docx` only, 2 MB max — stated here and in the UI, as the assignment requires. Anything else (wrong type, oversize, unparseable) is rejected with a clear error and no document is created.

## Working with others: sharing and roles

Documents you create or upload become useful when shared. The owner shares a document by email from the share dialog ([`components/share-dialog.tsx`](./components/share-dialog.tsx)), choosing a role: **Viewer** (read-only) or **Editor** (can edit and rename). The owner can change roles or revoke access at any time. This satisfies the assignment's sharing minimum — a document owner, a way to grant access, and a visible owned/shared distinction (the list sections and role badges above) — and completes the optional stretch item of role-based permissions beyond basic access.

The logic behind it is one helper: `getDocumentAccess(docId, userId) → 'owner' | 'editor' | 'viewer' | null` in [`lib/access.ts`](./lib/access.ts), enforced on every document route via `requireAccess`. Viewer read-only is enforced twice — the editor is disabled in the UI with a banner, **and** the API requires the editor role to write. The UI is a convenience; the API is the guarantee. Share endpoints live in [`app/api/documents/[id]/shares/`](./app/api/documents/%5Bid%5D/shares/), and the full permission matrix is in [ARCHITECTURE.md](./ARCHITECTURE.md) §5.

## Persistence and the API boundary

None of the above matters if it disappears on refresh. Documents are stored as **Tiptap JSON in Postgres (`jsonb`)**, so formatting and structure survive refresh and re-open exactly; shares are rows in a `document_shares` table, so shared-access behavior persists and is demonstrable across logins. The complete schema and demo-user seed live in one file, [`supabase/migrations/20260729000001_init.sql`](./supabase/migrations/20260729000001_init.sql) — three tables: `users`, `documents`, `document_shares`.

How data gets there is where the mock-auth decision from the login section pays off architecturally: because identity is mocked, Row Level Security would be theater, so **the browser never talks to the database**. Every request funnels through Next.js API routes ([`app/api/`](./app/api/)), which hold the service-role key server-side and act as the single enforcement boundary — identity check (`requireUser`), permission check (`requireAccess`), then data access ([`lib/supabase.ts`](./lib/supabase.ts)). The tradeoff, its consequences, and the swap-in path for real auth are documented in [ARCHITECTURE.md](./ARCHITECTURE.md) §3–4.

## How we know it works: validation and tests

A single enforcement boundary is only worth having if it is verified. Three layers cover that:

- **Validation and error handling.** Every request body is validated with zod; a central `withErrorHandling` wrapper ([`lib/api-helpers.ts`](./lib/api-helpers.ts)) maps validation failures to 400, missing identity to 401, insufficient role to 403/404, and everything else to a consistent `{ error }` JSON shape. The client surfaces failures as toasts, and the save indicator has a real error state.
- **39 Vitest unit/route tests** ([`tests/`](./tests/)) — the full access-control matrix (owner, editor, viewer, stranger, missing document), API helper behavior, and document route handlers (CRUD round-trips, permission rejections) against a mocked Supabase client. Run with `npm run test`.
- **6 Playwright end-to-end flows** ([`e2e/editor-flows.spec.ts`](./e2e/editor-flows.spec.ts)) — login, create/edit/persist across reload, rename, sharing with role enforcement (viewer read-only, editor can type), `.txt` upload, and access denial for an unshared user. Run with `npm run test:e2e`.

Beyond the automated suites, the deployed app was smoke-tested live: curl-based checks against the real database during integration, then a manual pass through both demo users, both roles, and all three upload types.

## How it was built

Those verification layers were also gates in the build process itself. Because this is an AI-forward role, the workflow is a documented deliverable: the app was built with Claude Code run as an orchestrator driving parallel sub-agents against human-frozen contracts — spec first ([spec.md](./spec.md)), frozen API contracts, five parallel feature agents, then integration, deployment, and E2E. Every scoping decision was human, and every agent result was reviewed before it counted. Which tools were used, where AI materially sped things up, what AI output was changed or rejected, and how correctness was verified are all covered in [AI-WORKFLOW.md](./AI-WORKFLOW.md).

## What was deliberately cut, and what's next

A 4–6 hour timebox demands cuts, and the assignment asks for them to be explicit. The full accounting is in [ARCHITECTURE.md](./ARCHITECTURE.md) §6–7 and [SUBMISSION.md](./SUBMISSION.md); the highlights:

- **Real auth** — mocked by design, as described above; the highest-value cut with a documented swap-in path.
- **Markdown export** — planned as a second stretch item, **not built**. The role-based sharing stretch was completed instead, since it deepens the core sharing feature. Export is first in line among next steps.
- **Real-time collaboration, comments, version history, folders/search, images in documents** — out of scope; none change the core judgment being evaluated.

With another 2–4 hours, in priority order: real auth (Supabase Auth swapped into `requireUser`, RLS as defense in depth), realtime presence, version history on the `jsonb` content model, and file-import-into-existing-document plus Markdown export ([ARCHITECTURE.md](./ARCHITECTURE.md) §7).

## Run it locally

Everything above is testable on the live deployment, but the assignment also requires local setup and run instructions.

Requirements: Node 20+, npm, and a Supabase project (free tier is fine).

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up the database** — in your Supabase project, open the SQL editor and run the contents of [`supabase/migrations/20260729000001_init.sql`](./supabase/migrations/20260729000001_init.sql). It creates the three tables (`users`, `documents`, `document_shares`) and seeds the three demo users.

3. **Configure environment** — create `.env.local` in the repo root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

   Both values are in the Supabase dashboard under Project Settings → API. The service-role key is used **only inside server-side API routes** and is never sent to the browser.

4. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and log in as `alice@demo.com`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run test` | Run the Vitest suite (39 unit/route tests) |
| `npm run test:e2e` | Run the Playwright end-to-end suite (`e2e/`) |
| `npm run lint` | ESLint |

## Delivery checklist

Every requirement and deliverable from the assignment, its status, and where to find it:

| Assignment requirement | Status | Where |
|---|---|---|
| Document creation, rename, edit, save/reopen, delete | ✅ Delivered | [Editing experience](#the-editing-experience) · [`app/doc/[id]/page.tsx`](./app/doc/%5Bid%5D/page.tsx) |
| Rich-text formatting (bold, italic, underline, headings, lists) | ✅ Delivered | [`components/editor/toolbar.tsx`](./components/editor/toolbar.tsx) (Tiptap v3) |
| File upload with supported types stated | ✅ Delivered — `.txt`/`.md`/`.docx`, 2 MB, stated in UI + README | [Upload](#getting-content-in-file-upload) · [`lib/convert.ts`](./lib/convert.ts) · [`app/api/upload/route.ts`](./app/api/upload/route.ts) |
| Sharing: owner, grant access, owned/shared distinction | ✅ Delivered, plus viewer/editor roles (stretch) | [Sharing](#working-with-others-sharing-and-roles) · [`lib/access.ts`](./lib/access.ts) · [`components/share-dialog.tsx`](./components/share-dialog.tsx) |
| Persistence (documents, formatting, shares survive refresh) | ✅ Delivered — Tiptap JSON in Postgres `jsonb` | [`supabase/migrations/20260729000001_init.sql`](./supabase/migrations/20260729000001_init.sql) |
| Clear setup and run instructions | ✅ Delivered | [Run it locally](#run-it-locally) |
| Working deployment reviewers can access | ✅ Delivered | https://the-text-editor.vercel.app/ |
| Credentials / seeded users for sharing flows | ✅ Delivered | [Demo accounts table](#text-editor--lightweight-collaborative-document-editor) at the top of this file |
| Basic validation and error handling | ✅ Delivered — zod on every body, central error mapping | [`lib/api-helpers.ts`](./lib/api-helpers.ts) |
| At least one meaningful automated test | ✅ Delivered — 39 Vitest tests + 6 Playwright flows | [`tests/`](./tests/) · [`e2e/editor-flows.spec.ts`](./e2e/editor-flows.spec.ts) |
| Architecture note (priorities and tradeoffs) | ✅ Delivered | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| AI-native workflow note | ✅ Delivered | [AI-WORKFLOW.md](./AI-WORKFLOW.md) |
| Walkthrough video (3–5 min) | ✅ Delivered | `video-url.txt` in the Drive folder (unlisted Loom) |
| SUBMISSION.md listing exactly what is included | ✅ Delivered | [SUBMISSION.md](./SUBMISSION.md) |
| Screenshots / demo GIF | ✅ Delivered | `screenshots/` in the Drive folder |
| Partial/incomplete features stated | ✅ Stated — Markdown export not built; auth mocked by design | [Cuts and next steps](#what-was-deliberately-cut-and-whats-next) · [SUBMISSION.md](./SUBMISSION.md) |
