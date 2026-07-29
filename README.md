# Text Editor — Lightweight Collaborative Document Editor

A Google-Docs-inspired document editor built as a take-home assignment for Ajaia LLC's AI-Native Full Stack Developer role. Users create and edit rich-text documents, upload files that become editable documents, and share documents with other users with viewer/editor roles.

**Live app:** https://the-text-editor.vercel.app/

**Demo accounts** (email-only login, no passwords):

| Email | Name |
|---|---|
| `alice@demo.com` | Alice |
| `bob@demo.com` | Bob |
| `carol@demo.com` | Carol |

To try the sharing flow: log in as Alice in one window, share a document with `bob@demo.com`, then open an incognito window and log in as Bob.

## Features

- **Documents:** create, rename (inline title edit), edit, delete
- **Rich text:** bold, italic, underline, H1–H3, bullet and ordered lists (Tiptap editor)
- **Autosave:** debounced 1.5 s after the last keystroke, with a Saving / Saved / Error indicator
- **File upload:** upload a `.txt`, `.md`, or `.docx` file (max 2 MB) and it is converted into a new editable document
- **Sharing:** an owner shares a document with another user by email, as **Viewer** (read-only, enforced in both UI and API) or **Editor** (can edit and rename). The document list is split into "My documents" and "Shared with me" with role badges
- **Persistence:** documents are stored as Tiptap JSON in Postgres (`jsonb`), so formatting survives refresh and re-open exactly

**Supported upload types:** `.txt`, `.md`, `.docx` only, 2 MB max. Anything else is rejected with a clear error and no document is created.

**Auth is intentionally mocked** — email-only login with seeded accounts, as the assignment permits. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the auth-boundary design and how real auth would slot in.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Tiptap v3 · Supabase Postgres (server-side access only) · zod v4 · Vitest · Playwright · Vercel

## Local setup

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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run test` | Run the Vitest suite (39 unit/route tests) |
| `npm run test:e2e` | Run the Playwright end-to-end suite (`e2e/`) |
| `npm run lint` | ESLint |

## Tests

- **Vitest (39 tests, `tests/`):** the access-control matrix (`getDocumentAccess` / `requireAccess` for owner, editor, viewer, stranger, missing document), API helper behavior, and the document route handlers (CRUD round-trips, permission rejections) against a mocked Supabase client.
- **Playwright (`e2e/`):** browser end-to-end coverage of the main flows — login, create/edit, autosave, upload, and the share → read-only viewer path.

## More documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack rationale, data model, request flow, auth boundary, permission matrix, and what was prioritized vs. cut
- [AI-WORKFLOW.md](./AI-WORKFLOW.md) — how AI tools were used to build this, and where human judgment overrode them
