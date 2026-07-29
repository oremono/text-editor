# Walkthrough Video Script (3–5 min Loom)

**Before you hit record (3 steps):**
1. Open a normal window and an incognito window side by side, both at https://the-text-editor.vercel.app/ and logged out (both land on /login).
2. Copy `e2e/fixtures/sample.md` to the desktop so it's one click away in the file picker.
3. Close every other tab.

Target ~4 minutes. Speak the **Say** lines; do the **Do** actions while speaking. Each beat hands off to the next — if you follow the Say lines in order, every required point gets covered (checklist at the bottom).

---

## [0:00–0:25] Intro + login + how I prioritized

**Do:**
- Show the live URL in the address bar, then the login page.
- Click the alice@demo.com demo card to fill; log in.

**Say:** Hi — this is my take-home for Ajaia: a lightweight collaborative document editor, live on Vercel at this URL. My priority call up front: depth on the five core requirements — editing, upload, sharing, persistence, quality — and cut everything that didn't serve them. Auth is intentionally mocked, as the assignment allows — more on that tradeoff later. Let me log in as Alice.

## [0:25–1:10] Create, format, autosave, reload

**Do:**
- Point at the "My documents" / "Shared with me" sections.
- Click New Document; rename the title inline to "Q3 Plan".
- Type a heading line; make it H1. Type a sentence; bold and underline words; add a bullet list.
- Stop typing and point at the indicator as it goes Saving → Saved.
- Reload the page; show the content intact.

**Say:** This is the document list — "My documents" and "Shared with me" — owned versus shared is the first thing you see. I'll create a document and rename it inline to "Q3 Plan". The editor is Tiptap: bold, italic, underline, three heading levels, bullet and numbered lists. Watch the corner as I stop typing — a second and a half later it flashes Saving, then Saved. That's autosave patching to the server — and if I reload, everything comes back exactly as formatted.

## [1:10–1:40] Upload

**Do:**
- Go back to the list; click Upload; pick `sample.md` from the desktop.
- Land in the new editor; scroll the converted headings and lists.

**Say:** So I just created this document by typing — but most real documents start life as files, so let me import one. Upload takes .txt, .md, or .docx up to two megabytes — stated right in the UI — and converts the file server-side into a new editable document. My markdown file keeps its headings and lists, and I land straight in the editor.

## [1:40–2:40] Sharing + roles

**Do:**
- Open "Q3 Plan"; click Share; add bob@demo.com as Viewer.
- In the incognito window, log in as Bob; point at "Shared with me" and the Viewer badge.
- Open the doc as Bob; show the read-only banner; try typing — nothing happens.
- Back as Alice: change Bob's role to Editor.
- As Bob: reload; type a line.

**Say:** Now that the document has content, it's only useful if my team can see it. As the owner, I share Q3 Plan with Bob as a Viewer. In the incognito window, logged in as Bob, it appears under "Shared with me" with a Viewer badge — and it's read-only: the UI locks the editor, and the API rejects a viewer's write with a 403. Back as Alice, I promote Bob to Editor — Bob reloads, and now he can type. That's role-based sharing, the stretch item — and every core flow you've just seen works end to end on this live deployment.

## [2:40–3:25] Decisions + tradeoffs + what was cut

**Do:**
- Stay on the app, or briefly show ARCHITECTURE.md's permission matrix and the tests folder.

**Say:** You saw "Saved" flash earlier — here's where that goes. Content is Tiptap JSON in a Postgres jsonb column — that's why formatting survived the reload. And the mock-auth tradeoff: I traded auth realism for feature depth, because the timebox rewards product judgment over provider wiring. The consequence: row-level security would be theater, so the browser never touches the database — every request goes through Next.js API routes, the single auth and permission boundary. Real auth replaces one helper. Same logic cut realtime, comments, and version history — every cut was a product decision, not a shortage, and ARCHITECTURE.md walks through each one. Verifying it all: 39 Vitest tests on the permission matrix, plus six Playwright browser flows.

## [3:25–4:00] AI workflow + close

**Do:**
- Face the camera (or stay on the app); no clicking needed.

**Say:** Finally, AI. The tool was Claude Code, run as an orchestrator: I froze the spec and API contracts, then parallel sub-agents built the feature slices and the test suite — that parallelism was the big speed-up. But I rejected forking tutorial clones, corrected an agent that drifted from the share-endpoint contract, and caught a corrupted env key agents missed. Verification was Vitest, Playwright, curl against production, and a manual pass — details in AI-WORKFLOW.md. What you've seen is a deployed full-stack docs app — Next.js, Supabase Postgres, Tiptap, 45 automated tests — frontend to database, all shown live. Thanks for watching.

---

## Coverage check (verify after recording)

| Point to cover | Covered at |
|---|---|
| The main user flow | 0:00–2:40 — login → create/format/autosave → upload → share |
| What functionality works end to end | 1:40–2:40 — closing line names it explicitly, after demonstrating each piece live |
| What was intentionally deprioritized | 0:00–0:25 (mock auth flagged) + 2:40–3:25 (full cut list) |
| Key implementation decisions | 2:40–3:25 — jsonb storage, API-as-boundary, test coverage |
| How AI supported the workflow | 3:25–4:00 — tools, speed-ups, rejections, verification |
| How I prioritized | 0:00–0:25 — depth on the five core requirements, cut the rest |
| Tradeoffs stated with reasons (→ ARCHITECTURE.md) | 2:40–3:25 — "traded auth realism for feature depth" + pointer |
| All four assignment AI questions (→ AI-WORKFLOW.md) | 3:25–4:00 — tool / sped up / changed-rejected / verified |
| What I built, in one sentence | 3:25–4:00 — deployed full-stack app, stack + 45 tests, shown live |

*Speech total: ~510 words — comfortable at 4 minutes. If running long, trim the last sentence of the [2:40] beat first.*
