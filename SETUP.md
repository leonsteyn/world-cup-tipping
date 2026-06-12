# Setup Guide — World Cup 2026 Tipping

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free account / new project.
2. In **SQL Editor → New Query**, paste the entire contents of `supabase/schema.sql` and click **Run**.
3. Note your project values from **Settings → API**:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon / public** key
   - **service_role** key (keep this secret — only used server-side)

## 2. Configure the frontend

Open `js/config.js` and replace the two placeholder values:

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';   // anon/public key — safe to expose
```

## 3. Get a football-data.org API key

1. Register for free at https://www.football-data.org/client/register
2. You'll receive an API key by email.
3. The World Cup 2026 competition code is **`WC`**.

## 4. Deploy to Netlify

1. Push this folder to a GitHub repository.
2. Connect it to Netlify (New site → Import from Git).
3. In **Site settings → Environment variables**, add:

| Variable | Value |
|---|---|
| `FOOTBALL_DATA_API_KEY` | your key from step 3 |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | service_role key from step 1 |
| `TOURNAMENT_CODE` | `WC2026` |
| `COMPETITION_CODE` | `WC` |

4. Deploy. The site will be live at your Netlify URL.

## 5. First sync

After deploy, visit:
```
https://your-site.netlify.app/.netlify/functions/sync-matches
```
This will populate all 104 World Cup 2026 fixtures into your database.
After that, the sync runs automatically whenever a user loads the Fixtures page
(rate-limited to once every 5 minutes).

## 6. Add to Mrs Steyn's Games

Update `../leon-games/index.html` to add a card pointing to your new Netlify URL.

---

## Reusing for a different tournament

To run this app for a different competition (e.g. Euro 2028, Copa América):

1. Create a new Supabase project (or add a new `tournament_code` to the same one).
2. Update `js/config.js`:
   - `code`, `name`, `subtitle`, `startDate`, `endDate`, `stages`
3. Update the Netlify env vars:
   - `TOURNAMENT_CODE` — a unique identifier for the DB rows
   - `COMPETITION_CODE` — the football-data.org competition code

See https://www.football-data.org/coverage for all supported competitions.

## Local development

```bash
npm install -g netlify-cli
cp .env.example .env      # fill in your keys
netlify dev               # serves the site + functions at localhost:8888
```
