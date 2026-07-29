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

**Say:** Hey — this is my take-home for Ajaia. It's a little collaborative document editor, live on Vercel at this URL. Quick heads-up on scope: I went deep on the five core things — editing, upload, sharing, persistence, quality — and skipped anything that didn't help those. Login is fake on purpose — the assignment says that's fine — I'll get to why that mattered. Okay, logging in as Alice.

## [0:25–1:10] Create, format, autosave, reload

**Do:**
- Point at the "My documents" / "Shared with me" sections.
- Click New Document; rename the title inline to "Q3 Plan".
- Type a heading line; make it H1. Type a sentence; bold and underline words; add a bullet list.
- Stop typing and point at the indicator as it goes Saving → Saved.
- Reload the page; show the content intact.

**Say:** So here's the document list — "My documents" and "Shared with me" — yours versus shared, right up front. I'll make a new doc and rename it to "Q3 Plan". The editor's Tiptap — bold, italic, underline, three heading levels, bullet and numbered lists. Now watch the corner when I stop typing — after about a second and a half it says Saving, then Saved. It saves on its own, to the server. And if I reload — everything's still there, formatting and all.

## [1:10–1:40] Upload

**Do:**
- Go back to the list; click Upload; pick `sample.md` from the desktop.
- Land in the new editor; scroll the converted headings and lists.

**Say:** So I typed that one out — but most real docs start as files, so let me pull one in. Upload takes .txt, .md, or .docx, up to two megabytes — it says so right in the UI. The server turns the file into a new doc you can edit. My markdown file keeps its headings and lists, and it drops me straight into the editor.

## [1:40–2:40] Sharing + roles

**Do:**
- Open "Q3 Plan"; click Share; add bob@demo.com as Viewer.
- In the incognito window, log in as Bob; point at "Shared with me" and the Viewer badge.
- Open the doc as Bob; show the read-only banner; try typing — nothing happens.
- Back as Alice: change Bob's role to Editor.
- As Bob: reload; type a line.

**Say:** Okay, the doc's got stuff in it now — but it's only useful if my team can see it. I'm the owner, so I'll share Q3 Plan with Bob as a Viewer. In the incognito window, logged in as Bob — there it is under "Shared with me" with a Viewer badge. And it's read-only: the editor's locked, and the API blocks a viewer's writes too — that's a 403. Back as Alice, I'll bump Bob up to Editor — Bob reloads, and now he can type. That's the role-based sharing stretch goal — and everything you've just watched works end to end on this live site.

## [2:40–3:25] Decisions + tradeoffs + what was cut

**Do:**
- Stay on the app, or briefly show ARCHITECTURE.md's permission matrix and the tests folder.

**Say:** Remember "Saved" flashing earlier? Here's where that goes. Docs are stored as Tiptap JSON in a Postgres jsonb column — that's why the formatting came back after the reload. Now, the fake login. I skipped real auth so I could spend the time on features. But it means the database can't trust who's asking — so the browser never talks to it. Everything goes through Next.js API routes, and that one layer checks who you are and what you can do. Real auth would just swap out one helper. Same thinking cut realtime, comments, and version history — every cut was a choice, not me running out of time. ARCHITECTURE.md goes through each one. To prove it works: 39 Vitest tests on the permission checks, plus six Playwright browser tests.

## [3:25–4:00] AI workflow + close

**Do:**
- Face the camera (or stay on the app); no clicking needed.

**Say:** Last bit — how I used AI. It was all Claude Code. I wrote the spec and locked down the API contracts first, then had a bunch of sub-agents build the features and tests in parallel against those contracts — that was the big time saver. But I also fixed an agent that drifted off the share-endpoint contract, and caught a broken env key the agents missed. I checked everything with Vitest, Playwright, curl against the live site, and a manual pass — it's all in AI-WORKFLOW.md. So that's it: a deployed full-stack docs app — Next.js, Supabase Postgres, Tiptap, 45 automated tests — front to back, all shown live. Thanks for watching.

---

## Coverage check (verify after recording)

| Point to cover | Covered at |
|---|---|
| The main user flow | 0:00–2:40 — login → create/format/autosave → upload → share |
| What functionality works end to end | 1:40–2:40 — closing line names it explicitly, after demonstrating each piece live |
| What was intentionally deprioritized | 0:00–0:25 (mock auth flagged) + 2:40–3:25 (full cut list) |
| Key implementation decisions | 2:40–3:25 — jsonb storage, API-as-boundary, test coverage |
| How AI supported the workflow | 3:25–4:00 — tools, speed-ups, rejections, verification |
| How I prioritized | 0:00–0:25 — depth on the five core things, skipped the rest |
| Tradeoffs stated with reasons (→ ARCHITECTURE.md) | 2:40–3:25 — skipped real auth to spend time on features + pointer |
| All four assignment AI questions (→ AI-WORKFLOW.md) | 3:25–4:00 — tool / sped up / changed-rejected / verified |
| What I built, in one sentence | 3:25–4:00 — deployed full-stack app, stack + 45 tests, shown live |

*Speech total: ~550 words — comfortable at 4 minutes. If running long, trim the last sentence of the [2:40] beat first.*
