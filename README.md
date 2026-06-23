# CompComp AI

**CompComp** (Competition Compass) helps students find competitions and programs they can actually join — matched to age, grade, location, format, and interests.

Live site: GitHub Pages frontend + Supabase backend.

---

## What it does

1. You fill out a short profile (or search for something specific like “Stardance” or “USACO”).
2. The app returns **up to 10 recommended matches** — official competition pages, registration links, Devpost events, etc.
3. A second section, **“May not be what you're looking for”**, shows related listicles, roundups, and close matches that didn’t make the top 10.

---

## How search works (simple)

```text
You submit the form
       ↓
Edge Function (discover-competitions)
       ↓
┌──────────────────────────────────────┐
│ 1. Match from Supabase database      │
│ 2. Web search (Serper) if needed     │
│ 3. Rule filters (block junk/media)   │
│ 4. Optional Gemini AI filter         │
│ 5. Return 10 primary + suggested     │
└──────────────────────────────────────┘
       ↓
Cards shown on the page
```

### Profile search (no search box)

- Pulls from the **database first** (7 slots) and adds a few **fresh web results** (3 slots) when Serper is configured.
- Good web finds are **saved to the database** so the next search is cheaper.

### Named search (search box filled)

- **Web search runs first** to find pages that match the name you typed.
- Database rows are used to fill gaps.

### Gemini AI (optional)

Gemini is **not** a custom trained model. It’s a **one-shot prompt filter**:

1. The app sends Gemini a numbered list of up to 10 candidates (title, URL, date, snippet).
2. The prompt says what to **keep** (real competition pages) and **reject** (listicles, forums, news, closed events).
3. Gemini replies with JSON like `{"keep":[0, 2, 5]}`.
4. Only those indices stay in the recommended section.

If Gemini is unavailable (no API key, rate limit, daily quota), the app uses **rule-based filters** instead. If Gemini rejects everything, the rule-filtered results are kept so you don’t get zero cards.

Gemini quota: about **15 calls/day**, spaced apart, to stay within the free tier.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | HTML, CSS, JavaScript (GitHub Pages) |
| Database | Supabase (`competitions` table) |
| Backend | Supabase Edge Function (`discover-competitions`, Deno/TypeScript) |
| Web search | [Serper](https://serper.dev) |
| AI filter | Google Gemini (`gemini-2.0-flash-lite`) |
| Deploy | GitHub Actions → Supabase Edge Functions |

---

## Project structure

```text
index.html          Landing page + form
styles.css          UI styles
script.js           Form handling, card rendering
config.js           Supabase URL + publishable key (browser-safe)
matching.js         Client-side fallback matching if Edge Function fails

supabase/
  functions/
    discover-competitions/   Main discovery API
    _shared/                 Matching, dates, Gemini filter, images
  migrations/                SQL migrations for the competitions table

.github/workflows/    Auto-deploy Edge Function on push to main
DEPLOY.md             Detailed setup guide
```

---

## Setup

See **[DEPLOY.md](DEPLOY.md)** for the full walkthrough. Short version:

1. **Supabase** — run migrations in `supabase/migrations/` and `supabase-rls.sql`.
2. **GitHub secrets** — `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` (for auto-deploy).
3. **Edge Function secrets** (Supabase Dashboard → Edge Functions → Secrets):
   - `SERPER_API_KEY` — web search (recommended)
   - `GEMINI_API_KEY` — optional AI filtering

Update `config.js` with your Supabase project URL and **publishable** key. Never put service-role or secret keys in the frontend.

---

## Local development

No build step. Open `index.html` in a browser or serve the folder statically:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. Discovery requires the deployed Edge Function (or Supabase local stack if you set that up separately).

---

## License

Hackathon / student project — check with the repo owner for reuse terms.
