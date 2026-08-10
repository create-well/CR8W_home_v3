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
  const url = `${NOTION_API}${path}`;
  const res = await fetch(url, {
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

async function queryNotionDb(token: string, notionDbId: string, filter?: object) {
  const body: Record<string, unknown> = { page_size: 100 };
  if (filter) body.filter = filter;
  const results: any[] = [];
  let nextCursor: string | undefined;
  do {
    if (nextCursor) body.start_cursor = nextCursor;
    const data: any = await notionFetch(token, `/databases/${notionDbId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    results.push(...data.results);
    nextCursor = data.has_more ? data.next_cursor : undefined;
  } while (nextCursor);
  return results;
}

async function createNotionPage(token: string, notionDbId: string, properties: object) {
  return notionFetch(token, "/pages", {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: notionDbId }, properties }),
  });
}

async function updateNotionPage(token: string, pageId: string, properties: object) {
  return notionFetch(token, `/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

function title(text: string) {
  return { title: [{ text: { content: text || "" } }] };
}
function rich(text: string | null | undefined) {
  return { rich_text: [{ text: { content: text || "" } }] };
}
function num(n: number | null | undefined) {
  return n != null ? { number: n } : { number: null };
}
function sel(name: string | null | undefined) {
  return name ? { select: { name } } : { select: null };
}
function email(val: string | null | undefined) {
  return val ? { email: val } : { email: null };
}
function url(val: string | null | undefined) {
  return val ? { url: val } : { url: null };
}
function checkbox(val: boolean | null | undefined) {
  return { checkbox: !!val };
}
function date(val: string | null | undefined) {
  return val ? { date: { start: val } } : { date: null };
}
function multiSelect(names: string[]) {
  return { multi_select: names.map((n) => ({ name: n })) };
}

function mapRevenueOp(row: any): Record<string, unknown> {
  return {
    Organization: title(row.org_name),
    Type: sel(row.type),
    Amount: num(row.amount ? Number(row.amount) : null),
    Stage: sel(row.stage),
    "Contact Name": rich(row.contact_name),
    "Contact Email": email(row.contact_email),
    Notes: rich(row.notes),
    "Expected Close": date(row.expected_close),
    "Actual Close": date(row.actual_close),
    Currency: sel(row.currency),
    Owner: sel(row.owner),
    "Linked Podcast Episode": rich(row.linked_podcast_episode),
    "Linked Workshop ID": num(row.linked_workshop_id),
    "Sync Status": sel("synced"),
  };
}

function mapEpisode(row: any): Record<string, unknown> {
  const guestName = row.guest_name || (row.guest_id ? String(row.guest_id).slice(0, 8) : null);
  const roles = row.roles || {};
  const roleValue = (key: string) => {
    const v = roles[key];
    const team = ["monny", "sunshine", "bingle", "omar", "pia"];
    return team.includes(v) ? v : null;
  };
  return {
    Topic: title(row.title),
    "Episode #": num(row.episode_num),
    Notes: rich(row.description || row.notes),
    Status: sel(row.status),
    Guest: rich(guestName),
    "Recording Date": date(row.recording_date),
    "Publish Date": date(row.publish_date || row.published_date),
    "Raw Audio Link": url(row.raw_audio_link),
    "Final Length (min)": num(row.final_length),
    "Clips Count": num(row.clips_count),
    "Substack Snippet": checkbox(row.substack_snippet),
    "Gear Issues": rich(row.gear_issues),
    "Flow Keeper": sel(roleValue("flowKeeper")),
    "Grounding Opener": sel(roleValue("groundingOpener")),
    "Taste Editor": sel(roleValue("tasteEditor")),
    "Tech Anchor": sel(roleValue("techAnchor")),
    "Sync Status": sel("synced"),
  };
}

function mapGuest(row: any): Record<string, unknown> {
  const socials = row.social_links
    ? Object.entries(row.social_links as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : null;
  return {
    Name: title(row.name),
    Email: email(row.email),
    Bio: rich(row.bio),
    "Flow Status": sel(row.flow_status),
    "Episode #": num(row.episode_num),
    "Recording Date": date(row.recording_date),
    "Topic Sent": checkbox(row.topic_sent),
    "Prep Status": sel(row.prep_status),
    "Connection Type": sel(row.connection_type),
    Stage: sel(row.stage),
    "Social Links": rich(socials),
    Notes: rich(row.notes),
    "Mic Time Notes": rich(row.mic_time_notes),
    Thanked: checkbox(row.thanked),
    "Sync Status": sel("synced"),
  };
}

function mapApplicant(row: any): Record<string, unknown> {
  const appData = row.application_data ? JSON.stringify(row.application_data, null, 2) : null;
  return {
    Name: title(row.full_name),
    Email: email(row.email),
    "Workshop ID": num(row.workshop_id),
    Stage: sel(row.status),
    Notes: rich(appData || row.notes),
    "Sync Status": sel("synced"),
  };
}

function mapCoflowCheckin(row: any): Record<string, unknown> {
  const profile = row.profile_id;
  const team = ["monny", "sunshine", "bingle", "omar", "pia"];
  const profileMatch = team.includes(profile) ? profile : null;
  const notes = [
    row.body_status ? `Body: ${row.body_status}` : "",
    row.creative_pulse ? `Pulse: ${row.creative_pulse}` : "",
    row.blockers ? `Blockers: ${row.blockers}` : "",
    row.needs ? `Needs: ${row.needs}` : "",
  ].filter(Boolean).join("\n");
  return {
    Name: title(profile ? `${profile} — ${row.meeting_date || ""}` : "Check-in"),
    Profile: sel(profileMatch),
    "Week Of": date(row.meeting_date),
    Mood: rich(row.creative_pulse),
    Notes: rich(notes || null),
    "Sync Status": sel("synced"),
  };
}

function mapWorkshop(row: any): Record<string, unknown> {
  return {
    Title: title(row.title),
    Date: date(row.workshop_date),
    Time: rich(row.workshop_time),
    Location: rich(row.location),
    Capacity: num(row.capacity),
    Attendees: num(row.attendees),
    Status: sel(row.status),
    Description: rich(row.description),
    "Sync Status": sel("synced"),
  };
}

function mapTopicDrop(row: any): Record<string, unknown> {
  return {
    Idea: title(row.text || row.idea || row.topic),
    Dropper: sel(row.dropper),
    Status: sel(row.locked ? "locked" : "open"),
    "Why Landed": rich(row.why_landed),
    Candidate: checkbox(row.candidate),
    "Sync Status": sel("synced"),
  };
}

async function syncTable(
  token: string,
  supabase: any,
  tableName: string,
  notionDbId: string | undefined,
  titleProp: string,
  mapper: (row: any) => Record<string, unknown>
) {
  if (!notionDbId) {
    return { table: tableName, created: 0, updated: 0, skipped: 0, note: "No NOTION_DB_* secret set" };
  }
  const { data: rows, error } = await supabase
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Supabase ${tableName} error: ${error.message}`);
  if (!rows || rows.length === 0) return { table: tableName, created: 0, updated: 0, skipped: 0, note: "No rows" };
  const existingPages = await queryNotionDb(token, notionDbId);
  const titleToPageId = new Map<string, string>();
  for (const page of existingPages) {
    const titleObj = page.properties[titleProp]?.title;
    const t = titleObj?.[0]?.text?.content || "";
    if (t) titleToPageId.set(t, page.id);
  }
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const props = mapper(row);
    const titleVal = (props[titleProp] as any)?.title?.[0]?.text?.content || "";
    const existingId = titleToPageId.get(titleVal);
    try {
      if (existingId) {
        await updateNotionPage(token, existingId, props);
        updated++;
      } else {
        await createNotionPage(token, notionDbId, props);
        created++;
      }
    } catch (e: any) {
      console.error(`Failed to sync ${tableName} row ${row.id}:`, e.message);
    }
  }
  return { table: tableName, created, updated, skipped: 0 };
}

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  let secrets: Map<string, string>;
  try {
    secrets = await loadSecrets(supabase);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Failed to load secrets: ${e.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const NOTION_TOKEN = secrets.get("NOTION_TOKEN");
  if (!NOTION_TOKEN) {
    return new Response(
      JSON.stringify({ error: "NOTION_TOKEN not found in vault.secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const getDbId = (key: string) => secrets.get(key);
  const results: any[] = [];

  try {
    results.push(await syncTable(NOTION_TOKEN, supabase, "revenue_ops", getDbId("NOTION_DB_REVENUE_OPS"), "Organization", mapRevenueOp));

    const notionDbEpisodes = getDbId("NOTION_DB_EPISODES");
    if (notionDbEpisodes) {
      const { data: episodes, error: epErr } = await supabase.from("episodes").select("*, guests(name)").order("created_at", { ascending: false }).limit(200);
      if (epErr) throw epErr;
      const episodesWithGuest = (episodes || []).map((ep: any) => ({ ...ep, guest_name: ep.guests?.name || null }));
      const epExisting = await queryNotionDb(NOTION_TOKEN, notionDbEpisodes);
      const epTitleMap = new Map<string, string>();
      for (const page of epExisting) {
        const t = page.properties.Topic?.title?.[0]?.text?.content || "";
        if (t) epTitleMap.set(t, page.id);
      }
      let epCreated = 0, epUpdated = 0;
      for (const row of episodesWithGuest) {
        const props = mapEpisode(row);
        const titleVal = props.Topic?.title?.[0]?.text?.content || "";
        const existingId = epTitleMap.get(titleVal);
        try {
          if (existingId) { await updateNotionPage(NOTION_TOKEN, existingId, props); epUpdated++; }
          else { await createNotionPage(NOTION_TOKEN, notionDbEpisodes, props); epCreated++; }
        } catch (e: any) { console.error("Episode sync error:", e.message); }
      }
      results.push({ table: "episodes", created: epCreated, updated: epUpdated, skipped: 0 });
    } else {
      results.push({ table: "episodes", created: 0, updated: 0, skipped: 0, note: "No NOTION_DB_EPISODES secret" });
    }

    results.push(await syncTable(NOTION_TOKEN, supabase, "guests", getDbId("NOTION_DB_GUESTS"), "Name", mapGuest));
    results.push(await syncTable(NOTION_TOKEN, supabase, "applicants", getDbId("NOTION_DB_APPLICANTS"), "Name", mapApplicant));
    results.push(await syncTable(NOTION_TOKEN, supabase, "coflow_checkins", getDbId("NOTION_DB_COFLOW"), "Name", mapCoflowCheckin));
    results.push(await syncTable(NOTION_TOKEN, supabase, "workshops", getDbId("NOTION_DB_WORKSHOPS"), "Title", mapWorkshop));
    results.push(await syncTable(NOTION_TOKEN, supabase, "topic_drops", getDbId("NOTION_DB_TOPIC_DROPS"), "Idea", mapTopicDrop));

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Sync failed:", e);
    return new Response(
      JSON.stringify({ error: e.message, stack: e.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
