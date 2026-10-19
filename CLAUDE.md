# UniHive — engineering ground rules

The app lives in `Qshop/` (React + Vite on Vercel, Express backend on Render,
Supabase for auth, database and storage).

## Data budget comes first

Before designing or shipping any feature, check what it costs in Supabase and
Vercel quota, not just whether it works. A blown quota takes the whole site
down for everyone.

- **Images and video never stream from Supabase Storage to visitors.** Render
  Supabase-hosted images through `img()` / `getOptimisedUrl()` in
  `Qshop/src/utils/ImageUtils.js` (Vercel image CDN: resized, WebP, cached).
  Static marketing media goes in `Qshop/public/` and is served by Vercel.
- **Uploads are compressed client-side** (`compressImage`, 1200px longest
  side) and stored with long cache headers. No video uploads to Supabase.
- **Queries select only the columns they render and always `limit`.** No
  polling loops; prefer one fetch per page view. Realtime subscriptions only
  where a human is waiting on a live change.
- **Monitors and bots must not download Supabase media** (see
  `monitor/journey.mjs`, which blocks Supabase Storage requests).
- **Estimate before shipping:** expected visitors × requests/bytes per visit vs
  the plan's monthly egress, storage, database size and function invocations.
  If a feature could exceed ~25% of any quota at launch traffic, redesign it
  or flag it before merging.
- Big launches (ticket drops, event nights) get a quota check in the Supabase
  dashboard (Usage) the day before.

## Product rules

- Paid tickets and specials are sold only on Little Events; UniHive never sells
  admission. Free RSVPs on UniHive are fine.
- Never invent prices, sponsor items or line-ups; only show what is confirmed.
- First-time visitors who need an account land on sign-up (`/auth` routes new
  devices to `/auth/signup`), and after log-in or sign-up people return to the
  page they were on (`Qshop/src/components/auth/authRedirect.js`).
