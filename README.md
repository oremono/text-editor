# Text Editor

Lightweight collaborative doc editor — submission for Ajaia LLC's AI-Native Full Stack Developer take-home.

**Live app:** https://the-text-editor.vercel.app

**Demo accounts** — login is email-only, no passwords:

| Email | Name |
|---|---|
| `alice@demo.com` | Alice |
| `bob@demo.com` | Bob |
| `carol@demo.com` | Carol |

To try sharing: log in as Alice, share a doc with `bob@demo.com`, then log in as Bob in an incognito window.

## What it does

- Rich-text editing (Tiptap v3): bold, italic, underline, H1–H3, bullet/ordered lists, inline rename, delete
- Autosave fires 1.5 s after you stop typing, with a Saving / Saved / Error indicator
- Upload a `.txt`, `.md`, or `.docx` (max 2 MB) and it becomes a new editable doc — wrong type, oversize, or unparseable files get a clear error and nothing's created
- Share by email as **viewer** (read-only) or **editor**; owner can change roles or revoke anytime
- Doc list splits into "My documents" and "Shared with me" with role badges
- Everything's stored as Tiptap JSON in Postgres (Supabase), so formatting survives refresh

## Auth (read this before judging the login page)

- Auth is fake on purpose — the assignment allows "seeded accounts, mocked auth". The browser never touches the DB; every request goes through API routes that check identity and permissions server-side ([`lib/access.ts`](./lib/access.ts)). Details and the real-auth swap-in path are in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Run it locally

Needs Node 20+, npm, and a Supabase project (free tier is fine).

1. `npm install`
2. In the Supabase SQL editor, run [`supabase/migrations/20260729000001_init.sql`](./supabase/migrations/20260729000001_init.sql) — creates `users`, `documents`, `document_shares` and seeds the three demo users
3. Create `.env.local` in the repo root (values are in Project Settings → API; the service-role key never reaches the browser):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

4. `npm run dev`, open http://localhost:3000, log in as `alice@demo.com`

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run test` | Vitest suite (39 tests) |
| `npm run test:e2e` | Playwright E2E suite |
| `npm run lint` | ESLint |

## Tests

- 39 Vitest unit/route tests ([`tests/`](./tests/)) — full access-control matrix (owner/editor/viewer/stranger/missing doc), API helpers, CRUD routes
- 6 Playwright flows ([`e2e/editor-flows.spec.ts`](./e2e/editor-flows.spec.ts)) — login, edit + persist across reload, rename, viewer/editor role enforcement, `.txt` upload, access denial
- CI runs lint + tests on every push

## Where to look

- [ARCHITECTURE.md](./ARCHITECTURE.md) — priorities, tradeoffs, permission matrix, scope cuts and next steps
- [AI-WORKFLOW.md](./AI-WORKFLOW.md) — which AI tools, what they sped up, what got rejected, how output was verified
- [SUBMISSION.md](./SUBMISSION.md) — exact list of what's in the Drive folder
- [`lib/access.ts`](./lib/access.ts) — the one permission helper every doc route goes through
- [`lib/convert.ts`](./lib/convert.ts) — `.docx`/`.md`/`.txt` → Tiptap JSON
- [`supabase/migrations/20260729000001_init.sql`](./supabase/migrations/20260729000001_init.sql) — schema + demo-user seed
- [`tests/`](./tests/) · [`e2e/`](./e2e/) — test suites

## Delivery checklist

| Assignment ask | Status | Where |
|---|---|---|
| Create, rename, edit, save/reopen, delete | ✅ | [`app/doc/[id]/page.tsx`](./app/doc/%5Bid%5D/page.tsx) |
| Rich-text formatting (bold, italic, underline, headings, lists) | ✅ | [`components/editor/toolbar.tsx`](./components/editor/toolbar.tsx) (Tiptap v3) |
| File upload, supported types stated | ✅ `.txt`/`.md`/`.docx`, 2 MB, stated in UI + here | [`lib/convert.ts`](./lib/convert.ts) · [`app/api/upload/route.ts`](./app/api/upload/route.ts) |
| Sharing: owner, grant access, owned/shared distinction | ✅ plus viewer/editor roles (stretch) | [`lib/access.ts`](./lib/access.ts) · [`components/share-dialog.tsx`](./components/share-dialog.tsx) |
| Persistence across refresh | ✅ Tiptap JSON in Postgres `jsonb` | [`supabase/migrations/20260729000001_init.sql`](./supabase/migrations/20260729000001_init.sql) |
| Setup and run instructions | ✅ | [Run it locally](#run-it-locally) |
| Working deployment | ✅ | https://the-text-editor.vercel.app |
| Credentials / seeded users | ✅ | [Demo accounts](#text-editor) at the top |
| Validation and error handling | ✅ zod on every body, central error mapping | [`lib/api-helpers.ts`](./lib/api-helpers.ts) |
| At least one meaningful automated test | ✅ 39 Vitest + 6 Playwright | [`tests/`](./tests/) · [`e2e/editor-flows.spec.ts`](./e2e/editor-flows.spec.ts) |
| Architecture note | ✅ | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| AI workflow note | ✅ | [AI-WORKFLOW.md](./AI-WORKFLOW.md) |
| Walkthrough video (3–5 min) | ✅ | `video-url.txt` in the Drive folder (unlisted Loom) |
| SUBMISSION.md listing what's included | ✅ | [SUBMISSION.md](./SUBMISSION.md) |
| Screenshots / demo GIF | ✅ | `screenshots/` in the Drive folder |
| Partial features stated | ✅ Markdown export not built; auth mocked by design | [ARCHITECTURE.md](./ARCHITECTURE.md) · [SUBMISSION.md](./SUBMISSION.md) |
