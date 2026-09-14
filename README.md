# Megaphone — deploy guide

This is a runnable Vite + React project containing the Megaphone prototype.
Right now it's frontend-only: every user's shoutouts, chats, and alerts live
in that browser tab's memory and vanish on refresh. That's fine for the first
round of testing (does the UI make sense, is the flow clear) but it means two
testers on two phones will NOT see each other's posts — for that you need the
backend step below.

## 1. Run it locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Geolocation and the camera/gallery pickers
need HTTPS or `localhost` to work in the browser — `localhost` is fine for
local dev.

## 2. Put it on a real URL testers can open (today, no backend)

Pick one — all have free tiers and give you HTTPS automatically:

- **Vercel** — `npm i -g vercel` then `vercel` in this folder, follow the
  prompts. Or connect the GitHub repo at vercel.com for auto-deploys on push.
- **Netlify** — `npm run build` then drag the resulting `dist/` folder onto
  netlify.com/drop for an instant link, or connect the repo for git-based
  deploys.
- **Cloudflare Pages** — connect the repo, build command `npm run build`,
  output directory `dist`.

Any of these gets you a shareable `https://your-app.vercel.app`-style link.
Send that to testers — works great on phones, which is where you actually
want to test the geolocation/camera bits.

**Heads up:** at this stage each tester's data is local to their own browser.
Good for testing navigation, design, and individual flows. Not yet good for
testing "does the board actually update when someone else posts."

## 3. Add a shared backend (so testers see each other's shoutouts)

The fastest realistic path is **Supabase** (Postgres + Auth + Realtime +
Storage, generous free tier, no infra to manage) or **Firebase** if you'd
rather use Firestore. Either replaces the mock `useState` data with:

- **Auth** — swap the demo name/email login for real Supabase Auth (email
  link or OAuth). Takes an afternoon.
- **Database tables** — `wants`, `threads`/`messages`, `keyword_alerts`,
  roughly mirroring the shapes already in `App.jsx`.
- **Realtime subscriptions** — Supabase's realtime channels (or Firestore
  listeners) push new shoutouts/messages to every open client instantly,
  which is what makes the board and chat actually feel live.
- **Storage** — if you bring photo uploads back, Supabase Storage or an S3
  bucket, gated behind the moderation API step discussed earlier.

This is a genuine chunk of engineering — plan for a few days, not an
afternoon, once auth + realtime + the moderation/rate-limit pieces are all
wired together properly.

## 4. Make it feel like an app, not a website

Once it's on a real URL:

- Add a `manifest.json` + service worker to make it an installable **PWA** —
  testers can "Add to Home Screen" on iOS/Android and it opens full-screen,
  no browser chrome.
- If you want native push notifications (for the keyword alerts) or full
  camera/App Store presence, wrap it with **Capacitor** (keeps this exact
  React code, adds a thin native shell) rather than rewriting in React
  Native.

## Suggested order for testing with real people

1. Deploy the static build (step 2) and send the link to 5-10 people —
   gather feedback on navigation, clarity, whether "shout it out" makes
   sense as a concept.
2. Wire up Supabase auth + a `wants` table with realtime (step 3, just for
   shoutouts first) — now testers at the *same* mock show actually see each
   other's posts.
3. Add chat + keyword alerts on the same backend.
4. PWA wrapper so it installs like an app for a second testing round.
test edit
