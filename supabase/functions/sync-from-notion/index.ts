import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

async function loadSecrets(supabase: any): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc("get_notion_secrets");
  if (error) throw new Error(`Vault read error: ${error.message}`);
  const map = new Map<string, string>();
  for (const row of data || []) {
    map.set(row.name, row.decrypted_secret);
  }
  return map;
}

async function notionFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function queryAllDbPages(token: string, databaseId: string): Promise<any[]> {
  const results: any[] = [];
  let nextCursor: string | undefined;
  do {
    const body: any = { page_size: 100 };
    if (nextCursor) body.start_cursor = nextCursor;
    const data = await notionFetch(token, `/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    results.push(...data.results);
    nextCursor = data.has_more ? data.next_cursor : undefined;
  } while (nextCursor);
  return results;
}

async function updateNotionPage(token: string, pageId: string, properties: object) {
  return notionFetch(token, `/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

function getTitle(props: any, key: string): string {
  return props[key]?.title?.[0]?.text?.content || "";
}
function getRichText(props: any, key: string): string | null {
  return props[key]?.rich_text?.[0]?.text?.content || null;
}
function getSelect(props: any, key: string): string | null {
  return props[key]?.select?.name || null;
}
function getNumber(props: any, key: string): number | null {
  return props[key]?.number ?? null;
}
function getEmail(props: any, key: string): string | null {
  return props[key]?.email || null;
}
function getDate(props: any, key: string): string | null {
  return props[key]?.date?.start || null;
}
function getCheckbox(props: any, key: string): boolean {
  return !!props[key]?.checkbox;
}
function getUrl(props: any, key: string): string | null {
  return props[key]?.url || null;
}
function getSyncStatus(props: any): string | null {
  return getSelect(props, "Sync Status");
}

async function upsertByName(
  supabase: any,
  table: string,
  nameCol: string,
  nameVal: string,
  payload: object
): Promise<{ error?: { message: string }; existed: boolean }> {
  if (!nameVal) return { error: { message: "No name/title to match" }, existed: false };
  const { data: existing } = await supabase.from(table).select("id").ilike(nameCol, nameVal).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from(table).update(payload).eq("id", existing.id);
    return { error: error || undefined, existed: true };
  }
  const { error } = await supabase.from(table).insert(payload);
  return { error: error || undefined, existed: false };
}

async function upsertByEmail(
  supabase: any,
  table: string,
  emailVal: string,
  payload: object
): Promise<{ error?: { message: string }; existed: boolean }> {
  if (!emailVal) return { error: { message: "No email to match" }, existed: false };
  const { data: existing } = await supabase.from(table).select("id").ilike("email", emailVal).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from(table).update(payload).eq("id", existing.id);
    return { error: error || undefined, existed: true };
  }
  const { error } = await supabase.from(table).insert(payload);
  return { error: error || undefined, existed: false };
}

async function syncRevenueOps(token: string, supabase: any, dbId: string) {
  const pages = await queryAllDbPages(token, dbId);
  let created = 0, updated = 0, skipped = 0;
  for (const page of pages) {
    const p = page.properties;
    if (getSyncStatus(p) === "Synced") { skipped++; continue; }
    const payload = {
      org_name: getTitle(p, "Organization") || "Untitled",
      type: getSelect(p, "Type"),
      amount: getNumber(p, "Amount"),
      stage: getSelect(p, "Stage"),
      contact_name: getRichText(p, "Contact Name"),
      contact_email: getEmail(p, "Contact Email"),
      notes: getRichText(p, "Notes"),
      expected_close: getDate(p, "Expected Close"),
      actual_close: getDate(p, "Actual Close"),
      currency: getSelect(p, "Currency"),
      owner: getSelect(p, "Owner"),
      linked_podcast_episode: getRichText(p, "Linked Podcast Episode"),
      linked_workshop_id: getNumber(p, "Linked Workshop ID"),
    };
    const { error, existed } = await upsertByName(supabase, "revenue_ops", "org_name", payload.org_name, payload);
    if (error) console.error("revenue_ops error:", error.message);
    else {
      await updateNotionPage(token, page.id, { "Sync Status": { select: { name: "Synced" } } });
      existed ? updated++ : created++;
    }
  }
  return { table: "revenue_ops", created, updated, skipped };
}

async function syncEpisodes(token: string, supabase: any, dbId: string) {
  const pages = await queryAllDbPages(token, dbId);
  let created = 0, updated = 0, skipped = 0;
  for (const page of pages) {
    const p = page.properties;
    if (getSyncStatus(p) === "Synced") { skipped++; continue; }
    const title = getTitle(p, "Topic");
    const guestName = getRichText(p, "Guest");
    let guestId: string | null = null;
    if (guestName) {
      const { data: g } = await supabase.from("guests").select("id").ilike("name", guestName).maybeSingle();
      guestId = g?.id || null;
    }
    const payload: any = {
      title,
      episode_num: getNumber(p, "Episode #"),
      description: getRichText(p, "Notes"),
      status: getSelect(p, "Status"),
      guest_id: guestId,
      recording_date: getDate(p, "Recording Date"),
      publish_date: getDate(p, "Publish Date"),
      raw_audio_link: getUrl(p, "Raw Audio Link"),
      final_length: getNumber(p, "Final Length (min)"),
      clips_count: getNumber(p, "Clips Count"),
      substack_snippet: getCheckbox(p, "Substack Snippet"),
      gear_issues: getRichText(p, "Gear Issues"),
      roles: {
        flowKeeper: getSelect(p, "Flow Keeper"),
        groundingOpener: getSelect(p, "Grounding Opener"),
        tasteEditor: getSelect(p, "Taste Editor"),
        techAnchor: getSelect(p, "Tech Anchor"),
      },
    };
    const { data: existing } = await supabase.from("episodes").select("id").ilike("title", title).maybeSingle();
    let err;
    if (existing?.id) {
      const res = await supabase.from("episodes").update(payload).eq("id", existing.id);
      err = res.error;
    } else {
      const res = await supabase.from("episodes").insert(payload);
      err = res.error;
    }
    if (err) console.error("episodes error:", err.message);
    else {
      await updateNotionPage(token, page.id, { "Sync Status": { select: { name: "Synced" } } });
      existing?.id ? updated++ : created++;
    }
  }
  return { table: "episodes", created, updated, skipped };
}

async function syncGuests(token: string, supabase: any, dbId: string) {
  const pages = await queryAllDbPages(token, dbId);
  let created = 0, updated = 0, skipped = 0;
  for (const page of pages) {
    const p = page.properties;
    if (getSyncStatus(p) === "Synced") { skipped++; continue; }
    const payload = {
      name: getTitle(p, "Name") || "Untitled",
      email: getEmail(p, "Email"),
      bio: getRichText(p, "Bio"),
      flow_status: getSelect(p, "Flow Status"),
      episode_num: getNumber(p, "Episode #"),
      recording_date: getDate(p, "Recording Date"),
      topic_sent: getCheckbox(p, "Topic Sent"),
      prep_status: getSelect(p, "Prep Status"),
      connection_type: getSelect(p, "Connection Type"),
      stage: getSelect(p, "Stage"),
      notes: getRichText(p, "Notes"),
      mic_time_notes: getRichText(p, "Mic Time Notes"),
      thanked: getCheckbox(p, "Thanked"),
    };
    const { error, existed } = await upsertByName(supabase, "guests", "name", payload.name, payload);
    if (error) console.error("guests error:", error.message);
    else {
      await updateNotionPage(token, page.id, { "Sync Status": { select: { name: "Synced" } } });
      existed ? updated++ : created++;
    }
  }
  return { table: "guests", created, updated, skipped };
}

async function syncApplicants(token: string, supabase: any, dbId: string) {
  const pages = await queryAllDbPages(token, dbId);
  let created = 0, updated = 0, skipped = 0;
  for (const page of pages) {
    const p = page.properties;
    if (getSyncStatus(p) === "Synced") { skipped++; continue; }
    const payload = {
      full_name: getTitle(p, "Name") || "Untitled",
      email: getEmail(p, "Email"),
      status: getSelect(p, "Stage"),
      application_data: { notes: getRichText(p, "Notes") },
    };
    const { error, existed } = await upsertByEmail(supabase, "applicants", payload.email || "", payload);
    if (error) console.error("applicants error:", error.message);
    else {
      await updateNotionPage(token, page.id, { "Sync Status": { select: { name: "Synced" } } });
      existed ? updated++ : created++;
    }
  }
  return { table: "applicants", created, updated, skipped };
}

async function syncWorkshops(token: string, supabase: any, dbId: string) {
  const pages = await queryAllDbPages(token, dbId);
  let created = 0, updated = 0, skipped = 0;
  for (const page of pages) {
    const p = page.properties;
    if (getSyncStatus(p) === "Synced") { skipped++; continue; }
    const payload = {
      title: getTitle(p, "Title") || "Untitled Workshop",
      workshop_date: getDate(p, "Date"),
      workshop_time: getRichText(p, "Time"),
      location: getRichText(p, "Location"),
      capacity: getNumber(p, "Capacity"),
      attendees: getNumber(p, "Attendees"),
      status: getSelect(p, "Status"),
      description: getRichText(p, "Description"),
    };
    const { error, existed } = await upsertByName(supabase, "workshops", "title", payload.title, payload);
    if (error) console.error("workshops error:", error.message);
    else {
      await updateNotionPage(token, page.id, { "Sync Status": { select: { name: "Synced" } } });
      existed ? updated++ : created++;
    }
  }
  return { table: "workshops", created, updated, skipped };
}

async function syncTopicDrops(token: string, supabase: any, dbId: string) {
  const pages = await queryAllDbPages(token, dbId);
  let created = 0, updated = 0, skipped = 0;
  for (const page of pages) {
    const p = page.properties;
    if (getSyncStatus(p) === "Synced") { skipped++; continue; }
    const payload = {
      text: getTitle(p, "Idea"),
      dropper: getSelect(p, "Dropper"),
      locked: getSelect(p, "Status") === "locked",
      why_landed: getRichText(p, "Why Landed"),
      candidate: getCheckbox(p, "Candidate"),
    };
    const { error, existed } = await upsertByName(supabase, "topic_drops", "text", payload.text || "", payload);
    if (error) console.error("topic_drops error:", error.message);
    else {
      await updateNotionPage(token, page.id, { "Sync Status": { select: { name: "Synced" } } });
      existed ? updated++ : created++;
    }
  }
  return { table: "topic_drops", created, updated, skipped };
}

// ── Sync run history (KV, capped at 25 newest-first entries) ────────────────
const RUN_HISTORY_LIMIT = 25;

async function recordSyncRun(supabase: any, key: string, entry: Record<string, unknown>) {
  try {
    const { data } = await supabase
      .from("kv_store_8dcd9693")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    let runs: unknown[] = [];
    const raw = data?.value;
    if (typeof raw === "string") {
      try { runs = JSON.parse(raw); } catch { runs = []; }
    } else if (Array.isArray(raw)) {
      runs = raw;
    }
    runs.unshift(entry);
    runs = runs.slice(0, RUN_HISTORY_LIMIT);
    await supabase
      .from("kv_store_8dcd9693")
      .upsert({ key, value: JSON.stringify(runs) });
  } catch (e: any) {
    console.error(`Failed to record sync run (${key}):`, e?.message || e);
  }
}

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  let secrets: Map<string, string>;
  try {
    secrets = await loadSecrets(supabase);
  } catch (e: any) {
    await recordSyncRun(supabase, "notion_sync_runs_from", {
      ran_at: new Date().toISOString(),
      ok: false,
      results: [],
      error: `Failed to load secrets: ${e.message}`,
    });
    return new Response(
      JSON.stringify({ error: `Failed to load secrets: ${e.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const NOTION_TOKEN = secrets.get("NOTION_TOKEN");
  if (!NOTION_TOKEN) {
    await recordSyncRun(supabase, "notion_sync_runs_from", {
      ran_at: new Date().toISOString(),
      ok: false,
      results: [],
      error: "NOTION_TOKEN not found in vault.secrets",
    });
    return new Response(
      JSON.stringify({ error: "NOTION_TOKEN not found in vault.secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const getDbId = (key: string) => secrets.get(key);
  const results: any[] = [];

  try {
    const dbRevenueOps = getDbId("NOTION_DB_REVENUE_OPS");
    const dbEpisodes = getDbId("NOTION_DB_EPISODES");
    const dbGuests = getDbId("NOTION_DB_GUESTS");
    const dbApplicants = getDbId("NOTION_DB_APPLICANTS");
    const dbWorkshops = getDbId("NOTION_DB_WORKSHOPS");
    const dbTopicDrops = getDbId("NOTION_DB_TOPIC_DROPS");

    if (dbRevenueOps) results.push(await syncRevenueOps(NOTION_TOKEN, supabase, dbRevenueOps));
    else results.push({ table: "revenue_ops", note: "No NOTION_DB_REVENUE_OPS secret" });

    if (dbEpisodes) results.push(await syncEpisodes(NOTION_TOKEN, supabase, dbEpisodes));
    else results.push({ table: "episodes", note: "No NOTION_DB_EPISODES secret" });

    if (dbGuests) results.push(await syncGuests(NOTION_TOKEN, supabase, dbGuests));
    else results.push({ table: "guests", note: "No NOTION_DB_GUESTS secret" });

    if (dbApplicants) results.push(await syncApplicants(NOTION_TOKEN, supabase, dbApplicants));
    else results.push({ table: "applicants", note: "No NOTION_DB_APPLICANTS secret" });

    if (dbWorkshops) results.push(await syncWorkshops(NOTION_TOKEN, supabase, dbWorkshops));
    else results.push({ table: "workshops", note: "No NOTION_DB_WORKSHOPS secret" });

    if (dbTopicDrops) results.push(await syncTopicDrops(NOTION_TOKEN, supabase, dbTopicDrops));
    else results.push({ table: "topic_drops", note: "No NOTION_DB_TOPIC_DROPS secret" });

    await recordSyncRun(supabase, "notion_sync_runs_from", {
      ran_at: new Date().toISOString(),
      ok: true,
      results,
    });
    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Sync from Notion failed:", e);
    await recordSyncRun(supabase, "notion_sync_runs_from", {
      ran_at: new Date().toISOString(),
      ok: false,
      results: [],
      error: e.message,
    });
    return new Response(
      JSON.stringify({ error: e.message, stack: e.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
