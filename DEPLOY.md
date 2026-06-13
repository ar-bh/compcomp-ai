# Deploying CompComp AI

This guide covers the one-time setup to enable competition discovery (database matching + web search fallback). **You do not need to install the Supabase CLI on your computer.**

## Prerequisites

- A [Supabase](https://supabase.com) project (already configured in `config.js`)
- A GitHub repository for this project

---

## Step 1: Run the database migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Open [`supabase/migrations/001_competitions_alter.sql`](supabase/migrations/001_competitions_alter.sql) from this repo
3. Copy the full contents and click **Run**

This adds `age` and `source` columns and a unique index on `link` (if no duplicate links exist). Your existing competition rows are preserved.

Also run [`supabase-rls.sql`](supabase-rls.sql) if you have not already — it allows public reads on the `competitions` table.

---

## Step 2: Enable GitHub auto-deploy

1. **Create a Supabase access token**
   - Supabase Dashboard → click your avatar → **Account** → **Access Tokens**
   - Generate a new token and copy it

2. **Add GitHub secrets**
   - GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Add these two secrets:

   | Secret name | Value |
   |-------------|-------|
   | `SUPABASE_ACCESS_TOKEN` | Token from step 1 |
   | `SUPABASE_PROJECT_REF` | `dznlmoglcbcmwxrxybns` (the ID in your Supabase project URL) |

3. **Push to GitHub**
   - Push to the `main` or `master` branch
   - GitHub Actions will automatically deploy the `discover-competitions` Edge Function
   - Check progress under the **Actions** tab in GitHub

---

## Step 3: API keys explained

| Key | Where it lives | What it does |
|-----|----------------|--------------|
| **Supabase URL + publishable key** (`config.js`) | Browser (public) | Lets the site read competitions from your database and call the Edge Function. Safe to expose — not a secret. |
| **`SUPABASE_ACCESS_TOKEN`** | GitHub Actions secret | Lets GitHub deploy your Edge Function to Supabase. Never put this in the frontend. |
| **`SUPABASE_PROJECT_REF`** | GitHub Actions secret | Tells GitHub which Supabase project to deploy to (`dznlmoglcbcmwxrxybns`). |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Supabase auto-injects into Edge Functions | Lets the Edge Function read/write the database server-side (insert web results). Never expose in the browser. |
| **`SERPER_API_KEY`** | Supabase Edge Function secret | Pays for Google web search (1 credit per query). Only used when the database cannot fill all 10 result slots. |
| **`GEMINI_API_KEY`** | Supabase Edge Function secret (optional) | Free-tier AI that filters search results (news/listicles vs real competitions). Only runs when a web search happens. |

### Serper (web search)

1. Sign up at [serper.dev](https://serper.dev) and copy your API key
2. Supabase Dashboard → **Edge Functions** → **Secrets**
3. Add: `SERPER_API_KEY` = your key

**Credit saving:** The app checks your Supabase database first. Serper runs only if fewer than 10 matches are found. Each search uses at most **2 Serper queries**. Every good web result is saved to the database (`source = web`), so repeat searches reuse cached rows instead of burning credits again.

### Optional — AI result filtering (Gemini)

For better quality (filters out news, listicles, and school announcements):

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Supabase Dashboard → **Edge Functions** → **Secrets**
3. Add: `GEMINI_API_KEY` = your key

The Edge Function sends search results to Gemini Flash and keeps only official competition pages. Without this key, strict rule-based filtering is used instead.

---

## Step 4: Smoke test

1. Open the site and go to **Get Started**
2. Fill in age, grade, location, format, and at least one topic
3. Click **find results**
4. You should see **3–10 competition cards**
5. If web search ran, new rows appear in Supabase → **Table Editor** with `source = web`

---

## How it works

```text
Form submit → Edge Function (discover-competitions)
                ├── Rank matches from Supabase (manual + cached web rows)
                ├── If 10 found → return (0 Serper credits used)
                ├── If not → Serper (max 2 queries) → save all good finds to DB
                └── Return up to 10 results (database first, web fills gaps)
```

If the Edge Function is not deployed yet, the site falls back to local matching (database only, no web search).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not reach Supabase" | Check `config.js` URL and API key match your project |
| Edge Function 404 | Push to GitHub and confirm Actions deploy succeeded |
| Fewer than 3 results | Broaden topics/location; add `SERPER_API_KEY` |
| Duplicate link index skipped | Remove duplicate `link` values in Table Editor, re-run migration |

---

## Manual deploy (alternative)

If you prefer not to use GitHub Actions, install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase login
supabase link --project-ref dznlmoglcbcmwxrxybns
supabase functions deploy discover-competitions
```
