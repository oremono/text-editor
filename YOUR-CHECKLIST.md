# Your Finishing Checklist

Manual steps only you can do, in order. Everything else is done.

## 1. Push and confirm deploy

- [ ] `git push origin master` (from your own terminal)
- [ ] Vercel dashboard → project `text-editor` → confirm the new deployment is green
- [ ] Confirm https://the-text-editor.vercel.app/ serves the latest build

## 2. Smoke-test the live app (incognito window)

- [ ] Log in as `alice@demo.com`
- [ ] Create a document, format some text, watch the indicator hit Saved, refresh — content intact
- [ ] Upload a small `.md` file — it becomes a new editable document
- [ ] Share the document with `bob@demo.com` as Viewer
- [ ] Second incognito window: log in as `bob@demo.com` → doc appears under "Shared with me", opens read-only
- [ ] Promote Bob to Editor → Bob can edit
- [ ] Log out and confirm you're redirected to /login

## 3. Record the walkthrough video

- [ ] Follow `VIDEO-SCRIPT.md` (3–5 min, target ~4). Set the Loom to **unlisted/link-shareable**
- [ ] Watch it back once; confirm all five required points are covered
- [ ] Create `video-url.txt` containing just the Loom link:
  ```bash
  echo "https://www.loom.com/share/<your-video-id>" > video-url.txt
  ```

## 4. Take screenshots

Suggested set (put in a `screenshots/` folder):

- [ ] Login page with the demo accounts visible
- [ ] Document list showing "My documents" and "Shared with me" with role badges
- [ ] Editor with formatted content, save indicator, and the Share dialog open
- [ ] Bob's read-only view of a shared document (viewer banner visible)

## 5. Assemble the Google Drive folder

- [ ] Create a folder, e.g. `Ajaia — Rishabh Kohale — Document Editor`
- [ ] Source zip (excludes node_modules/.git automatically):
  ```bash
  git archive --format=zip -o text-editor-source.zip HEAD
  ```
- [ ] Upload: `text-editor-source.zip`, `README.md`, `ARCHITECTURE.md`, `AI-WORKFLOW.md`, `SUBMISSION.md`, `video-url.txt`, `screenshots/`
- [ ] Set folder sharing to "Anyone with the link — Viewer"
- [ ] Open the folder link in an incognito window to confirm it's accessible

## 6. Revoke the Supabase access token

You shared a Supabase access token during the build — revoke it now:

- [ ] https://supabase.com/dashboard/account/tokens → delete/revoke the token
- [ ] (The app itself uses the project's service-role key in Vercel env vars, which is unaffected)

## 7. Submit

- [ ] On the assessment portal, submit the Drive folder link **and** the live URL https://the-text-editor.vercel.app/
- [ ] Do this **before the timer runs out** — submit even if a later checklist item is imperfect
