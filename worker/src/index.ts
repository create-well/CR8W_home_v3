/**
 * Create Well ops worker.
 *
 * Exposes the Supabase mirror (mirror_flows / mirror_moves / mirror_people)
 * as tools your Notion Custom Agents can call.
 *
 * Why tools and not a sync:
 *   `worker.sync` writes INTO a Notion-managed database. It is built for
 *   external API -> Notion. It cannot push Notion -> Supabase, so it is the
 *   wrong shape for the mirror. The mirror stays on GitHub Actions (free).
 *   This worker instead lets agents READ that mirror.
 *
 * Contract, unchanged:
 *   Notion writes. Supabase remembers. Surfaces read. Nothing writes backward.
 *   Every tool here is read-only.
 *
 * Env (set with `ntn workers env set`):
 *   SUPABASE_URL        https://axntibrdivccycxdwlzk.supabase.co
 *   SUPABASE_KEY        service_role key
 */

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";

const worker = new Worker();
export default worker;

// Supabase's PostgREST publishes a documented rate ceiling well above this;
// pace conservatively so a chatty agent can't spike it.
const supabase = worker.pacer("supabase", {
	allowedRequests: 10,
	intervalMs: 1000,
});

const FLOW_STATUS_ORDER = [
	"Idea",
	"Scheduled",
	"Ready",
	"Approved",
	"Happened",
	"Wrapped",
	"Cancelled",
] as const;

const CLOSED_STATUSES = new Set(["Wrapped", "Cancelled"]);

type Flow = {
	notion_url: string;
	name: string | null;
	type: string | null;
	status: string | null;
	date_start: string | null;
	venue: string | null;
	capacity: number | null;
	flow_keeper: string[] | null;
	notes: string | null;
};

type Move = {
	notion_url: string;
	name: string | null;
	status: string | null;
	type: string | null;
	due: string | null;
	owner: string[] | null;
	blocked_by: string | null;
};

type Person = {
	notion_url: string;
	name: string | null;
	roles: string[] | null;
	well_level: string | null;
	next_invitation: string | null;
};

type SyncRun = {
	finished_at: string | null;
	status: string;
	flows_count: number | null;
	moves_count: number | null;
	people_count: number | null;
};

/** Read-only PostgREST query. Throws with a readable message on failure. */
async function query<T>(path: string): Promise<T[]> {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_KEY;
	if (!url || !key) {
		throw new Error(
			"SUPABASE_URL and SUPABASE_KEY must be set. Run: ntn workers env set SUPABASE_URL=... SUPABASE_KEY=...",
		);
	}

	await supabase.wait();

	const res = await fetch(`${url}/rest/v1/${path}`, {
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`,
			Accept: "application/json",
		},
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Supabase ${res.status}: ${body.slice(0, 300)}`);
	}

	return (await res.json()) as T[];
}

function daysUntil(iso: string | null): number | null {
	if (!iso) return null;
	const ms = new Date(iso).getTime();
	if (Number.isNaN(ms)) return null;
	return Math.round((ms - Date.now()) / 86_400_000);
}

function hasRoles(p: Person): boolean {
	return Array.isArray(p.roles) && p.roles.length > 0;
}

/** Freshness of the mirror, so an agent never reports a number it can't trust. */
async function freshness(): Promise<{ label: string; stale: boolean }> {
	const runs = await query<SyncRun>(
		"mirror_sync_runs?status=eq.ok&select=finished_at,status,flows_count,moves_count,people_count&order=finished_at.desc&limit=1",
	);
	const last = runs[0]?.finished_at;
	if (!last) return { label: "never synced", stale: true };

	const mins = Math.round((Date.now() - new Date(last).getTime()) / 60_000);
	const stale = mins > 90; // cron is 30m; 3 missed runs means something is wrong
	const label =
		mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
	return { label, stale };
}

/** The shared bottleneck rules, used by both tools so they never disagree. */
function findStuck(flows: Flow[], moves: Move[], people: Person[]) {
	const stuck: Array<{ item: string; why: string; url?: string }> = [];
	const open = flows.filter((f) => !CLOSED_STATUSES.has(f.status ?? ""));

	for (const f of open) {
		const d = daysUntil(f.date_start);
		if (
			(f.status === "Idea" || f.status === "Scheduled") &&
			d !== null &&
			d >= 0 &&
			d < 14
		) {
			stuck.push({
				item: f.name ?? "(untitled flow)",
				why: `${f.status} but only ${d} days out`,
				url: f.notion_url,
			});
		}
		if (f.status === "Approved" && !(f.flow_keeper ?? []).length) {
			stuck.push({
				item: f.name ?? "(untitled flow)",
				why: "Approved with no Flow Keeper assigned",
				url: f.notion_url,
			});
		}
		if (f.status === "Ready" && !f.venue) {
			stuck.push({
				item: f.name ?? "(untitled flow)",
				why: "Ready without a Venue",
				url: f.notion_url,
			});
		}
	}

	for (const m of moves) {
		if (m.status === "Done" || m.status === "Dropped") continue;
		if (m.blocked_by) {
			stuck.push({
				item: m.name ?? "(untitled move)",
				why: `Blocked by: ${m.blocked_by}`,
				url: m.notion_url,
			});
		}
		const d = daysUntil(m.due);
		if (d !== null && d < 0) {
			stuck.push({
				item: m.name ?? "(untitled move)",
				why: `Overdue by ${-d} days`,
				url: m.notion_url,
			});
		}
	}

	const previews = flows.filter((f) => f.name?.startsWith("[PREVIEW]")).length;
	if (previews > 0) {
		stuck.push({
			item: `${previews} [PREVIEW] flow${previews === 1 ? "" : "s"} still on the board`,
			why: "retired records, safe to delete by hand",
		});
	}

	if (moves.length === 0) {
		stuck.push({
			item: "MOVES database is empty",
			why: "no owned next actions exist anywhere in the system",
		});
	} else if (!moves.some((m) => m.status === "Now")) {
		stuck.push({
			item: "No Moves marked Now",
			why: "everything is Next, so nothing is actually in motion",
		});
	}

	const unassigned = people.filter((p) => !hasRoles(p)).length;
	if (unassigned > 0) {
		stuck.push({
			item: `${unassigned} People rows without Roles`,
			why: "role-filtered views will silently miss them",
		});
	}

	return stuck;
}

// ── Tool: full board state ────────────────────────────────────────────────────

worker.tool("getWellBoard", {
	title: "Get Create Well board",
	description:
		"Current Create Well production state from the Supabase mirror: Flows grouped by status, Moves by status, team roles, and what is stuck. Read-only. Use this when asked what is active, scheduled, upcoming, or blocked in Create Well.",
	schema: j.object({
		includeClosed: j
			.boolean()
			.describe("Include Wrapped and Cancelled flows. Defaults to false.")
			.nullable(),
	}),
	execute: async (input) => {
		const includeClosed = input.includeClosed ?? false;

		const [flows, moves, people, fresh] = await Promise.all([
			query<Flow>(
				"mirror_flows?select=notion_url,name,type,status,date_start,venue,capacity,flow_keeper,notes&order=date_start.asc",
			),
			query<Move>(
				"mirror_moves?select=notion_url,name,status,type,due,owner,blocked_by&order=due.asc",
			),
			query<Person>(
				"mirror_people?select=notion_url,name,roles,well_level,next_invitation",
			),
			freshness(),
		]);

		const visible = includeClosed
			? flows
			: flows.filter((f) => !CLOSED_STATUSES.has(f.status ?? ""));

		const flowsByStatus: Record<string, string[]> = {};
		for (const status of FLOW_STATUS_ORDER) {
			const inStatus = visible.filter((f) => f.status === status);
			if (inStatus.length) {
				flowsByStatus[status] = inStatus.map((f) => {
					const d = daysUntil(f.date_start);
					const when =
						d === null ? "no date" : d === 0 ? "today" : d > 0 ? `in ${d}d` : `${-d}d ago`;
					return `${f.name} (${f.type ?? "no type"}, ${when})`;
				});
			}
		}

		const openMoves = moves.filter(
			(m) => m.status === "Now" || m.status === "Next",
		);

		return {
			lastSynced: fresh.label,
			stale: fresh.stale,
			summary: [
				`${visible.length} open flow${visible.length === 1 ? "" : "s"}`,
				`${moves.filter((m) => m.status === "Now").length} moves Now`,
				`${moves.filter((m) => m.status === "Next").length} Next`,
				`${people.filter(hasRoles).length}/${people.length} people with roles`,
			].join(", "),
			flowsByStatus,
			moves: openMoves.map((m) => ({
				name: m.name,
				status: m.status,
				due: m.due,
				blockedBy: m.blocked_by,
			})),
			team: people.filter(hasRoles).map((p) => ({
				name: p.name,
				roles: p.roles,
				wellLevel: p.well_level,
			})),
			stuck: findStuck(flows, moves, people),
			caveat: fresh.stale
				? "Mirror is stale. The 30-minute sync has missed at least three runs. Treat these numbers as last-known, not current."
				: null,
		};
	},
});

// ── Tool: bottlenecks only ────────────────────────────────────────────────────

worker.tool("getStuck", {
	title: "What is stuck in Create Well",
	description:
		"Just the bottlenecks in Create Well: overdue or blocked Moves, Flows approaching their date without prep, missing Flow Keepers, and data hygiene gaps. Read-only. Use this for standups, weekly briefings, or when asked what needs attention.",
	schema: j.object({}),
	execute: async () => {
		const [flows, moves, people, fresh] = await Promise.all([
			query<Flow>(
				"mirror_flows?select=notion_url,name,type,status,date_start,venue,capacity,flow_keeper,notes",
			),
			query<Move>(
				"mirror_moves?select=notion_url,name,status,type,due,owner,blocked_by",
			),
			query<Person>(
				"mirror_people?select=notion_url,name,roles,well_level,next_invitation",
			),
			freshness(),
		]);

		const stuck = findStuck(flows, moves, people);

		return {
			lastSynced: fresh.label,
			stale: fresh.stale,
			count: stuck.length,
			stuck,
			verdict:
				stuck.length === 0
					? "Nothing stuck."
					: `${stuck.length} thing${stuck.length === 1 ? "" : "s"} need a human.`,
		};
	},
});
