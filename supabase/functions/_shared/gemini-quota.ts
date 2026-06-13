import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** Stay well under Gemini free-tier RPM/RPD — one call per search, spaced apart. */
const MIN_SECONDS_BETWEEN_CALLS = 90;
const MAX_CALLS_PER_DAY = 15;
const COOLDOWN_AFTER_429_MINUTES = 20;

export interface GeminiQuotaCheck {
  allowed: boolean;
  reason: "ok" | "cooldown" | "spacing" | "daily_limit" | "no_table";
}

interface QuotaRow {
  id: string;
  last_call_at: string | null;
  cooldown_until: string | null;
  calls_today: number;
  quota_day: string;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkGeminiQuota(
  supabase: SupabaseClient,
): Promise<GeminiQuotaCheck> {
  const { data, error } = await supabase
    .from("gemini_quota")
    .select("id, last_call_at, cooldown_until, calls_today, quota_day")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    if (String(error.message).includes("gemini_quota")) {
      return { allowed: false, reason: "no_table" };
    }
    return { allowed: false, reason: "cooldown" };
  }

  const row = data as QuotaRow | null;
  const now = Date.now();

  if (row?.cooldown_until && new Date(row.cooldown_until).getTime() > now) {
    return { allowed: false, reason: "cooldown" };
  }

  const day = todayUtc();
  const callsToday = row?.quota_day === day ? (row.calls_today ?? 0) : 0;
  if (callsToday >= MAX_CALLS_PER_DAY) {
    return { allowed: false, reason: "daily_limit" };
  }

  if (row?.last_call_at) {
    const elapsedSec = (now - new Date(row.last_call_at).getTime()) / 1000;
    if (elapsedSec < MIN_SECONDS_BETWEEN_CALLS) {
      return { allowed: false, reason: "spacing" };
    }
  }

  return { allowed: true, reason: "ok" };
}

/** Reserve a slot before calling Gemini so parallel searches don't burst the API. */
export async function reserveGeminiSlot(supabase: SupabaseClient): Promise<boolean> {
  const check = await checkGeminiQuota(supabase);
  if (!check.allowed) return false;

  const day = todayUtc();
  const { data: existing } = await supabase
    .from("gemini_quota")
    .select("calls_today, quota_day")
    .eq("id", "default")
    .maybeSingle();

  const prevDay = (existing as QuotaRow | null)?.quota_day;
  const prevCalls = prevDay === day ? ((existing as QuotaRow | null)?.calls_today ?? 0) : 0;

  const { error } = await supabase.from("gemini_quota").upsert({
    id: "default",
    last_call_at: new Date().toISOString(),
    calls_today: prevCalls + 1,
    quota_day: day,
  });

  return !error;
}

export async function recordGemini429(supabase: SupabaseClient): Promise<void> {
  const cooldownUntil = new Date(Date.now() + COOLDOWN_AFTER_429_MINUTES * 60 * 1000).toISOString();
  await supabase.from("gemini_quota").upsert({
    id: "default",
    cooldown_until: cooldownUntil,
  });
}

export function quotaSkipMessage(reason: GeminiQuotaCheck["reason"]): string {
  switch (reason) {
    case "spacing":
      return "Rule filters applied — AI verification waits ~90s between free-tier calls.";
    case "cooldown":
      return "Rule filters applied — AI paused briefly after a rate-limit (no extra API calls made).";
    case "daily_limit":
      return "Rule filters applied — daily free AI quota reached; resets at midnight UTC.";
    case "no_table":
      return "Rule filters applied — run migration 004_gemini_quota.sql to enable spaced AI verification.";
    default:
      return "";
  }
}
