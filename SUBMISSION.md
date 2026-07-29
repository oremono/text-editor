# SUBMISSION.md

Submission for the Ajaia LLC AI-Native Full Stack Developer assignment — a lightweight collaborative document editor.

**Candidate:** Rishabh Kohale (r.kohale9@gmail.com)

## Live product

- **URL:** https://the-text-editor.vercel.app/ (deployed on Vercel, auto-deploys from `master`)
- **Demo accounts** (email-only login, no passwords): `alice@demo.com`, `bob@demo.com`, `carol@demo.com`
- **To review sharing:** log in as Alice, share a document with `bob@demo.com` (Viewer or Editor), then log in as Bob in an incognito window.

## Contents of this Drive folder

Matching the assignment's Deliverables list:

| Deliverable | File / location |
|---|---|
| Source code | `text-editor-source.zip` (full repo; also on GitHub: `oremono/text-editor`) |
| README with local setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI-WORKFLOW.md` |
| This index | `SUBMISSION.md` |
| Live product URL | https://the-text-editor.vercel.app/ (also above) |
| Walkthrough video URL | `video-url.txt` (unlisted Loom, 3–5 min) |
| Screenshots | `screenshots/` (login, document list with role badges, editor + share dialog, viewer read-only mode) |

## What works (all five core requirements, end to end)

1. **Document creation and editing** — create, rename, edit, delete; rich text (bold, italic, underline, H1–H3, bullet and ordered lists) via Tiptap; debounced 1.5 s autosave with a save indicator; documents reopen with formatting intact.
2. **File upload** — `.txt`, `.md`, or `.docx` (max 2 MB, stated in the UI and README) is converted server-side into a new editable document; invalid type/size/parse fails cleanly with no document created.
3. **Sharing** — owner shares by email with **Viewer** or **Editor** role; "My documents" vs "Shared with me" sections with role badges; viewer is read-only in both the UI and the API; owner can change roles and revoke.
4. **Persistence** — Tiptap JSON stored in Supabase Postgres (`jsonb`); documents, formatting, and shares survive refresh and re-login.
5. **Quality** — live deployment, zod validation with consistent error responses, 39 Vitest unit/route tests (access-control matrix + CRUD), Playwright browser E2E suite (`e2e/`), setup docs, architecture and AI notes.

**Stretch item completed:** role-based sharing permissions beyond basic access (the Viewer/Editor model above).

## Partial / not built (honest accounting)

- **Markdown export** — planned as a second stretch item, not built; listed in next steps.
- **Auth is intentionally mocked** (seeded accounts, email-only login) as the assignment permits. This is a documented scope cut, not an accident — see `ARCHITECTURE.md` §4 for the boundary design and how real auth slots in.
- Deliberately out of scope: real-time collaboration, comments, version history, folders/search, images in documents (`ARCHITECTURE.md` §6).

## What I'd build next with another 2–4 hours

1. Real auth (Supabase Auth / magic links) swapped into the existing `requireUser` boundary, plus RLS as defense in depth
2. Realtime presence indicators via Supabase Realtime
3. Version history (snapshot the `jsonb` content into a `document_versions` table with restore)
4. Import a file into an existing document, and Markdown export

Details and rationale: `ARCHITECTURE.md` §7.
