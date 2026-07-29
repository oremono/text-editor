# Your Finishing Checklist

Start now: run `git push origin master` from your own terminal (step 1 below). Everything automated is done — what remains is ~50 min of manual steps only you can do, in order.

## Do now — steps 1–5, in order

### 1. Push and confirm deploy (~5 min)

1. [ ] Run `git push origin master` from your own terminal
2. [ ] Vercel dashboard → project `text-editor` → confirm the new deployment is green
3. [ ] Open https://the-text-editor.vercel.app/ and confirm it serves the latest build

### 2. Smoke-test the live app (~10 min, incognito window)

1. [ ] Log in as `alice@demo.com`
2. [ ] Create a document, format some text, watch the indicator hit Saved, refresh — content intact
3. [ ] Upload a small `.md` file — it becomes a new editable document
4. [ ] Share the document with `bob@demo.com` as Viewer; in a second incognito window log in as `bob@demo.com` — doc appears under "Shared with me", opens read-only
5. [ ] Promote Bob to Editor → Bob can edit; then log out and confirm you're redirected to /login

### 3. Record the walkthrough video (~20 min)

1. [ ] Follow `VIDEO-SCRIPT.md` (3–5 min, target ~4)
2. [ ] Set the Loom to **unlisted/link-shareable**
3. [ ] Create `video-url.txt` containing just the Loom link:
   ```bash
   echo "https://www.loom.com/share/<your-video-id>" > video-url.txt
   ```

### 4. Take 4 screenshots (~5 min)

Put them in a `screenshots/` folder:

1. [ ] Login page with the demo accounts visible
2. [ ] Document list showing "My documents" and "Shared with me" with role badges
3. [ ] Editor with formatted content, save indicator, and the Share dialog open
4. [ ] Bob's read-only view of a shared document (viewer banner visible)

### 5. Assemble the Drive folder and submit (~10 min)

1. [ ] Create a folder, e.g. `Ajaia — Rishabh Kohale — Document Editor`
2. [ ] Build the source zip (excludes node_modules/.git automatically):
   ```bash
   git archive --format=zip -o text-editor-source.zip HEAD
   ```
3. [ ] Upload: `text-editor-source.zip`, `README.md`, `ARCHITECTURE.md`, `AI-WORKFLOW.md`, `SUBMISSION.md`, `video-url.txt`, `screenshots/`
4. [ ] Set folder sharing to "Anyone with the link — Viewer", then open the folder link in an incognito window to confirm it's accessible
5. [ ] On the assessment portal, submit the Drive folder link **and** the live URL https://the-text-editor.vercel.app/ — **before the timer runs out**, even if another checklist item is imperfect

## After you submit (~2 min)

You shared a Supabase access token during the build — revoke it:

1. [ ] https://supabase.com/dashboard/account/tokens → delete/revoke the token
2. [ ] (The app itself uses the project's service-role key in Vercel env vars, which is unaffected)

## Only if time remains

- [ ] Watch the video back once; confirm all five required points are covered

Next action (~1 min): open a terminal and run `git push origin master`.
