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

## Step 3: Web search API key (recommended)

The Edge Function searches the web first to find up to 10 competitions. **Serper** (Google results) works best from Supabase servers.

1. Sign up at [serper.dev](https://serper.dev) and copy your API key
2. Supabase Dashboard → **Edge Functions** → **Secrets**
3. Add: `SERPER_API_KEY` = your key

Without this key, Bing/DuckDuckGo are tried as fallbacks (often blocked from Supabase — expect 0 results).

### Optional — AI result filtering (recommended)

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
                ├── Query Supabase competitions
                ├── Score & rank by profile + topics (typo-tolerant)
                ├── If < 3 matches → search web → upsert new rows
                └── Return 3–10 results to the browser
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
