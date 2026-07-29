# Collaborative Doc Editor — Rishabh Kohale

Submission for the AI-Native Full Stack Developer assignment: a lightweight collaborative document editor (Next.js + Tiptap + Supabase Postgres).

- **Live app** → https://the-text-editor.vercel.app
- **Code (zip)** → `<DRIVE LINK HERE>`
- Repo is private — full source is in the zip.

## Demo logins (email-only, no passwords)

`alice@demo.com` · `bob@demo.com` · `carol@demo.com`

**30-second sharing test:** log in as alice → create a doc → share to `bob@demo.com` as viewer → open an incognito window, log in as bob → doc shows up under "Shared with me", read-only → back as alice, promote bob to editor → bob can now edit.

## What's in the zip

- Full source
- `README.md` — setup + run instructions
- `ARCHITECTURE.md` — what I prioritized and why
- `AI-WORKFLOW.md` — AI tools used, where they sped things up, what I rejected, how I verified
- Migration SQL (schema + demo-user seed)
- Tests: 39 Vitest unit/route tests + 6 Playwright E2E flows
- CI workflow (lint + tests on push)

## What works end to end

- Create / rename / delete docs; rich text (bold, italic, underline, H1–H3, lists) with 1.5 s debounced autosave and a save indicator
- Upload a `.txt`, `.md`, or `.docx` (max 2 MB) → becomes a new editable doc; bad files fail cleanly
- Sharing: owner grants viewer or editor by email; "My documents" vs "Shared with me" with role badges; owner can change roles or revoke
- Persistence: Tiptap JSON in Supabase Postgres — docs, formatting, and shares survive refresh and re-login
- Deployed on Vercel, zod validation on every request body, 39 Vitest + 6 Playwright tests, CI

Stretch item done: viewer/editor role-based sharing.

## Honest scope

- Auth is mocked on purpose (seeded accounts, email-only login) — the assignment allows it. All permission checks happen server-side in API routes, so real auth slots in behind one boundary.
- No realtime collab — single-writer editing only.
- Markdown export not built.

**Next 2–4 hours:** real auth (Supabase Auth + RLS), realtime presence, version history.

That's it — happy to walk through any of it.
