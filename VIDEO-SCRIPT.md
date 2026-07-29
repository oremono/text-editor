# Walkthrough Video Script (3–5 min Loom)

**Before you hit record (3 steps):**
1. Open a normal window and an incognito window side by side, both at https://the-text-editor.vercel.app/ and logged out (you land on /login).
2. Close every other tab.
3. Put `sample.md` on the desktop.

Target ~4 minutes. Speak the **Say** lines; do the **Do** actions while speaking.

---

## [0:00–0:25] Intro + login

**Do:**
- Show the live URL in the address bar, then the login page.
- Click alice@demo.com to fill; log in.

**Say:** Hi, this is my take-home for Ajaia — a lightweight collaborative document editor, live on Vercel. Auth is intentionally mocked, as the assignment allows: three seeded demo users, email-only login. I'll log in as Alice.

## [0:25–1:10] Create, format, autosave

**Do:**
- Click New Document; rename title to "Q3 Plan".
- Type a line; make it an H1.
- Type a sentence; bold and underline words; add a bullet list.
- Point at the save indicator as it goes Saving → Saved.
- Refresh the page.

**Say:** The document list splits into "My documents" and "Shared with me". I'll create a document and rename it inline. The editor is Tiptap — bold, italic, underline, three heading levels, bullet and numbered lists. Saving is automatic: about a second and a half after I stop typing, it patches to the server — the indicator shows Saving, then Saved. Content is stored as Tiptap JSON in Postgres, so if I refresh, everything comes back exactly as formatted.

## [1:10–1:45] Upload

**Do:**
- Go back to the list; click Upload; pick `sample.md`.
- Land in the new editor; scroll the converted content.

**Say:** File upload: I chose the "file becomes a new editable document" flow. It accepts .txt, .md, and .docx up to two megabytes — stated in the UI and README. This markdown file is converted server-side into a real Tiptap document — headings and lists intact — and I'm dropped straight into editing it.

## [1:45–2:45] Sharing + roles

**Do:**
- Open "Q3 Plan"; click Share; add bob@demo.com as Viewer.
- In the incognito window, log in as Bob; show "Shared with me" and the Viewer badge.
- Open the doc; show the read-only banner and that typing does nothing.
- Back as Alice: change Bob to Editor.
- As Bob: refresh; edit a line.

**Say:** Sharing. As the owner, I share this with Bob as a Viewer. Over in incognito as Bob — it appears under "Shared with me" with a Viewer badge. It's read-only, and that's enforced twice: the editor is locked in the UI, and the API rejects a write from a viewer with a 403. Now I'll promote Bob to Editor — and he can edit. That's the role-based sharing stretch item: owner, editor, viewer, with a tested permission matrix.

## [2:45–3:30] Decisions + what was cut

**Do:**
- Briefly show ARCHITECTURE.md (permission matrix), then the tests folder or a test run.

**Say:** Key decisions. Because auth is mocked, database row-level security can't protect anything — so the client never touches the database; every request goes through Next.js API routes holding the service-role key, and that API layer is the single auth boundary. Real auth would just replace one helper. I deliberately cut realtime collaboration, comments, version history, and images to go deep on editing, upload, and sharing — the graded core. Verification is 39 Vitest tests covering the access-control matrix and routes, plus a Playwright browser suite.

## [3:30–4:00] AI workflow + close

**Say:** On AI: I used Claude Code as an orchestrator. I wrote the spec and froze API contracts first, then five sub-agents built the slices in parallel against those contracts, then integration and end-to-end waves. I reviewed every wave, rejected forking existing tutorial clones, corrected a contract deviation on the share endpoints, and caught a corrupted env key during integration testing. AI gave me parallel throughput; the judgment calls stayed human. Thanks for watching.

---

*Speech total: ~540 words. If running long, trim the [2:45] section's last sentence first.*
