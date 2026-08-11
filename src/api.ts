import { publicAnonKey, supabaseUrl } from './utils/supabase/config';

const API_KEY = publicAnonKey;
const SUPABASE_URL = supabaseUrl;

function resolveApiBase(): string {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE as string;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const onVercelOrDomain =
    host.endsWith('.vercel.app') ||
    host === 'createwell.monnyfest.co' || host === 'cr8w.com' || host === 'www.cr8w.com' ||
    host === 'localhost' || host === '127.0.0.1';
  if (onVercelOrDomain) return '/api/server';
  return (typeof window !== 'undefined' && window.location?.origin?.startsWith('http'))
    ? '/api/server'
    : 'https://cr8w-home-v2.vercel.app/api/server';
}

const BASE = resolveApiBase();
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` };

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const maxRetries = method === 'GET' ? 1 : 0;
  const TIMEOUT_MS = 8_000;
  let lastError: Error | null = null;
  const sub = path.replace(/^\/+|\/+$/g, '');
  const url = sub ? `${BASE}?path=${encodeURIComponent(sub)}` : BASE;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: controller.signal });
      if (!res.ok) { const text = await res.text(); throw new Error(`${method} ${path} → ${res.status}: ${text}`); }
      return res.json();
    } catch (e: any) {
      lastError = e;
      if (e?.name === 'AbortError') lastError = new Error(`${method} ${path} → timed out after ${TIMEOUT_MS/1000}s`);
      const isNetworkError = e?.name === 'AbortError' || (e instanceof TypeError && e.message === 'Failed to fetch');
      if (attempt < maxRetries && isNetworkError) { await new Promise(r => setTimeout(r, 2_000)); continue; }
      throw lastError;
    } finally { clearTimeout(timeoutId); }
  }
  throw lastError!;
}

// ── Existing endpoints (backward compatible) ──────────────────────────────────
export const sync = () => req<SyncData>('GET', '/sync');


export const getStations = () => req<Station[]>('GET', '/stations');
export const createStation = (s: Omit<Station, 'id' | 'created_at'>) => req<Station>('POST', '/stations', s);
export const updateStation = (id: number, s: Partial<Station>) => req<Station>('PUT', `/stations/${id}`, s);
export const deleteStation = (id: number) => req<{ ok: boolean }>('DELETE', `/stations/${id}`);

export const getForum = () => req<ForumPost[]>('GET', '/forum');
export const createForumPost = (p: Omit<ForumPost, 'id' | 'created_at'>) => req<ForumPost>('POST', '/forum', p);
export const updateForumPost = (id: number, p: Partial<ForumPost>) => req<ForumPost>('PUT', `/forum/${id}`, p);
export const deleteForumPost = (id: number) => req<{ ok: boolean }>('DELETE', `/forum/${id}`);

export const getForumReplies = () => req<ForumReply[]>('GET', '/forum/replies/all');
export const createForumReply = (postId: number, r: { author: string; content: string }) => req<ForumReply>('POST', `/forum/${postId}/replies`, r);
export const deleteForumReply = (id: number) => req<{ ok: boolean }>('DELETE', `/forum/replies/${id}`);

export const getMessages = () => req<Message[]>('GET', '/messages');
export const sendMessage = (m: Omit<Message, 'id' | 'created_at'>) => req<Message>('POST', '/messages', m);
export const deleteMessage = (id: number) => req<{ ok: boolean }>('DELETE', `/messages/${id}`);
export const updateMessage = (id: number, updates: Partial<Message>) => req<Message>('PUT', `/messages/${id}`, updates);

export const getBrainDumps = () => req<BrainDump[]>('GET', '/braindumps');
export const createBrainDump = (d: Omit<BrainDump, 'id' | 'created_at'>) => req<BrainDump>('POST', '/braindumps', d);
export const deleteBrainDump = (id: number) => req<{ ok: boolean }>('DELETE', `/braindumps/${id}`);

export const getAnnouncements = () => req<Announcement[]>('GET', '/announcements');
export const createAnnouncement = (a: Omit<Announcement, 'id' | 'created_at'>) => req<Announcement>('POST', '/announcements', a);
export const deleteAnnouncement = (id: number) => req<{ ok: boolean }>('DELETE', `/announcements/${id}`);

export const getWorkshops = () => req<Workshop[]>('GET', '/workshops');
export const createWorkshop = (w: Omit<Workshop, 'id' | 'created_at'>) => req<Workshop>('POST', '/workshops', w);
export const updateWorkshop = (id: number, w: Partial<Workshop>) => req<Workshop>('PUT', `/workshops/${id}`, w);
export const deleteWorkshop = (id: number) => req<{ ok: boolean }>('DELETE', `/workshops/${id}`);

export const getWorkshopPrograms = () => req<WorkshopProgram[]>('GET', '/workshop-programs');
export const createWorkshopProgram = (p: Omit<WorkshopProgram, 'id' | 'created_at'>) => req<WorkshopProgram>('POST', '/workshop-programs', p);
export const updateWorkshopProgram = (id: number, p: Partial<WorkshopProgram>) => req<WorkshopProgram>('PUT', `/workshop-programs/${id}`, p);
export const deleteWorkshopProgram = (id: number) => req<{ ok: boolean }>('DELETE', `/workshop-programs/${id}`);

export const getWorkshopResources = () => req<WorkshopResource[]>('GET', '/workshop-resources');
export const createWorkshopResource = (r: Omit<WorkshopResource, 'id' | 'created_at'>) => req<WorkshopResource>('POST', '/workshop-resources', r);
export const deleteWorkshopResource = (id: number) => req<{ ok: boolean }>('DELETE', `/workshop-resources/${id}`);

export const getCoFlowDates = () => req<CoFlowDate[]>('GET', '/coflow-dates');
export const createCoFlowDate = (d: Omit<CoFlowDate, 'id' | 'created_at'>) => req<CoFlowDate>('POST', '/coflow-dates', d);
export const updateCoFlowDate = (id: number, d: Partial<CoFlowDate>) => req<CoFlowDate>('PUT', `/coflow-dates/${id}`, d);
export const deleteCoFlowDate = (id: number) => req<{ ok: boolean }>('DELETE', `/coflow-dates/${id}`);

export const getCoFlowCheckins = () => req<CoFlowCheckin[]>('GET', '/coflow-checkins');
export const createCoFlowCheckin = (c: Omit<CoFlowCheckin, 'id' | 'created_at'>) => req<CoFlowCheckin>('POST', '/coflow-checkins', c);
export const deleteCoFlowCheckin = (id: number) => req<{ ok: boolean }>('DELETE', `/coflow-checkins/${id}`);

export const getWellNotes = () => req<WellNote[]>('GET', '/well-notes');
export const createWellNote = (n: { content: string }) => req<WellNote>('POST', '/well-notes', n);
export const updateWellNote = (id: number, n: Partial<WellNote>) => req<WellNote>('PUT', `/well-notes/${id}`, n);

export const getCalendarEvents = () => req<CalendarEventKV[]>('GET', '/calendar-events');

// ── New v3 endpoints (workshop applicants, collaborators, revenue) ────────────
export const getApplicants = () => req<Applicant[]>('GET', '/applicants');
export const createApplicant = (a: Omit<Applicant, 'id' | 'created_at'>) => req<Applicant>('POST', '/applicants', a);
export const updateApplicant = (id: number, a: Partial<Applicant>) => req<Applicant>('PUT', `/applicants/${id}`, a);
export const deleteApplicant = (id: number) => req<{ ok: boolean }>('DELETE', `/applicants/${id}`);

export const getCollaborators = () => req<Collaborator[]>('GET', '/collaborators');
export const createCollaborator = (c: Omit<Collaborator, 'id' | 'created_at'>) => req<Collaborator>('POST', '/collaborators', c);
export const updateCollaborator = (id: number, c: Partial<Collaborator>) => req<Collaborator>('PUT', `/collaborators/${id}`, c);
export const deleteCollaborator = (id: number) => req<{ ok: boolean }>('DELETE', `/collaborators/${id}`);

export const getRevenueOps = () => req<RevenueOp[]>('GET', '/revenue-ops');
export const createRevenueOp = (r: Omit<RevenueOp, 'id' | 'created_at'>) => req<RevenueOp>('POST', '/revenue-ops', r);
export const updateRevenueOp = (id: number, r: Partial<RevenueOp>) => req<RevenueOp>('PUT', `/revenue-ops/${id}`, r);
export const deleteRevenueOp = (id: number) => req<{ ok: boolean }>('DELETE', `/revenue-ops/${id}`);

// ── Podcast endpoints (legacy — use Supabase directly for live sync) ──────────
export const getEpisodes = () => req<Episode[]>('GET', '/episodes');
export const createEpisode = (e: Omit<Episode, 'id' | 'created_at'>) => req<Episode>('POST', '/episodes', e);
export const updateEpisode = (id: string, e: Partial<Episode>) => req<Episode>('PUT', `/episodes/${id}`, e);
export const deleteEpisode = (id: string) => req<{ ok: boolean }>('DELETE', `/episodes/${id}`);

export const getGuests = () => req<Guest[]>('GET', '/guests');
export const createGuest = (g: Omit<Guest, 'id' | 'created_at'>) => req<Guest>('POST', '/guests', g);
export const updateGuest = (id: string, g: Partial<Guest>) => req<Guest>('PUT', `/guests/${id}`, g);
export const deleteGuest = (id: string) => req<{ ok: boolean }>('DELETE', `/guests/${id}`);

export const getTopicDrops = () => req<TopicDrop[]>('GET', '/topic-drops');
export const createTopicDrop = (d: Omit<TopicDrop, 'id' | 'created_at'>) => req<TopicDrop>('POST', '/topic-drops', d);
export const updateTopicDrop = (id: string, d: Partial<TopicDrop>) => req<TopicDrop>('PUT', `/topic-drops/${id}`, d);
export const deleteTopicDrop = (id: string) => req<{ ok: boolean }>('DELETE', `/topic-drops/${id}`);

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  createdBy?: string;
  dueDate?: string;
  tag?: string;
  person?: string;
  createdAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Station {
  id: number; emoji: string; name: string; status: string;
  description: string; owner: string; created_at?: string;
}

export interface ForumPost {
  id: number; author: string; content: string; tag?: string; created_at?: string;
}

export interface ForumReply {
  id: number; postId: number; author: string; content: string; created_at?: string;
}

export interface Message {
  id: number; author: string; content: string;
  tag?: 'urgent' | 'important' | 'pinned' | null;
  reactions?: Record<string, string[]>;
  edited?: boolean; created_at?: string;
}

export interface BrainDump {
  id: number; author: string; content: string; tags?: string; drive_link?: string; created_at?: string;
}

export interface Announcement {
  id: number; text: string; priority: 'high' | 'medium' | 'low'; active?: number; created_at?: string;
}

export interface Workshop {
  id: number;
  title: string;
  description: string;
  facilitator: 'monny' | 'sunshine' | 'bingle' | 'omar' | 'pia';
  date: string;
  capacity: number;
  participants: number;
  location: string;
  tags: string[];
  googleDocLink?: string;
  status: 'ideation' | 'planning' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface WorkshopProgram {
  id: number;
  seriesName: string;
  description: string;
  learningObjectives: string[];
  sessionOutline: { number: number; title: string; description: string }[];
  targetAudience: string;
  materialsNeeded: string[];
  facilitator: string;
  created_at?: string;
}

export interface WorkshopResource {
  id: number;
  title: string;
  type: 'google-doc' | 'meeting-notes' | 'template' | 'recording' | 'slides';
  url: string;
  lastUpdated: string;
  author: string;
  created_at?: string;
}

export interface CoFlowDate {
  id: number;
  date: string;
  timeRange: string;
  startTime?: string;
  endTime?: string;
  location: string;
  host?: string;
  theme?: string;
  rsvp: Record<string, string>;
  agendaItems: { id: number; text: string; lead: string; timeEstimate: number; done: boolean }[];
  agendaLocked?: boolean;
  notes: string;
  vibeCheck: string;
  sessionNotes?: string;
  attendees?: string[];
  status: 'upcoming' | 'active' | 'archived';
  created_at?: string;
}

export interface CoFlowCheckin {
  id: number;
  weekOf: string;
  author: string;
  confirmTime: boolean;
  locationSuggestion: string;
  agendaItems: string[];
  mood?: string;
  timePreference?: string;
  notes?: string;
  created_at?: string;
}

export interface WellNote {
  id: number;
  content: string;
  landed: number;
  created_at?: string;
}

export interface CalendarEventKV {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
  creator: string;
  synced_at?: string;
}

// ── New v3 types ──────────────────────────────────────────────────────────────
export type ApplicantStage = 'applied' | 'vetted' | 'scheduled' | 'marketed' | 'completed' | 'declined';

export interface Applicant {
  id: number;
  name: string;
  email: string;
  phone?: string;
  workshopId?: number;
  stage: ApplicantStage;
  source: 'form' | 'referral' | 'instagram' | 'podcast' | 'event';
  notes: string;
  assignedTo?: string;
  created_at?: string;
}

export type CollaboratorRole = 'core' | 'co-creator' | 'advisor' | 'alumni';
export type AccessTier = 'full' | 'workshops' | 'well' | 'view-only';

export interface Collaborator {
  id: number;
  name: string;
  email: string;
  role: CollaboratorRole;
  accessTier: AccessTier;
  hdType?: string;
  profileNote?: string;
  active: boolean;
  created_at?: string;
}

export type RevenueStage = 'prospect' | 'pitched' | 'negotiating' | 'closed-won' | 'closed-lost' | 'paused';
export type RevenueType = 'sponsor' | 'grant' | 'donation' | 'merch' | 'ticket' | 'other';

export interface RevenueOp {
  id: number;
  orgName: string;
  contactName?: string;
  contactEmail?: string;
  type: RevenueType;
  stage: RevenueStage;
  amount?: number;
  currency: string;
  expectedClose?: string;
  actualClose?: string;
  notes: string;
  linkedPodcastEpisode?: string;
  linkedWorkshopId?: number;
  owner: string;
  created_at?: string;
}

// ── Podcast types ─────────────────────────────────────────────────────────────
export type EpisodeStatus =
  | 'drops open'
  | 'synthesized'
  | 'topic locked'
  | 'prepped'
  | 'recorded'
  | 'decomprocessed'
  | 'editing'
  | 'depanty'
  | 'published';

export type GuestStage = 'aligned' | 'invited' | 'scheduled' | 'prepped' | 'recorded' | 'aired' | 'thanked';

export interface Episode {
  id: string;
  episodeNum: number;
  topic: string;
  recordingDate?: string;
  movedToFriday?: boolean;
  roles: {
    flowKeeper?: string;
    groundingOpener?: string;
    tasteEditor?: string;
    techAnchor?: string;
    benediction?: string;
    closer?: string;
  };
  guestId?: string;
  status: EpisodeStatus;
  rawAudioLink?: string;
  finalLength?: number;
  clipsCount?: number;
  substackSnippet?: boolean;
  publishDate?: string;
  gearIssues?: string;
  decomprocessingNotes?: string;
  created_at?: string;
}

export interface Guest {
  id: string;
  name: string;
  contact: string;
  connectionType: 'community member' | 'collaborator' | 'reciprocal pod' | 'other';
  episodeNum?: number;
  recordingDate?: string;
  topicSent?: boolean;
  topicSentDate?: string;
  prepStatus?: string;
  micTimeNotes?: string;
  thanked?: boolean;
  stage: GuestStage;
  created_at?: string;
}

export interface TopicDrop {
  id: string;
  text: string;
  dropper?: string | null;
  weekId?: string;
  candidate?: boolean;
  whyLanded?: string;
  gut?: 'mmm-hmm' | 'unh-unh' | null;
  voteCount?: number;
  locked?: boolean;
  created_at?: string;
}

export interface SyncData {
  tasks: Task[];
  stations: Station[];
  forum: ForumPost[];
  messages: Message[];
  braindumps: BrainDump[];
  announcements: Announcement[];
  forumReplies: ForumReply[];
  workshops: Workshop[];
  workshopPrograms: WorkshopProgram[];
  workshopResources: WorkshopResource[];
  coflowDates: CoFlowDate[];
  coflowCheckins: CoFlowCheckin[];
  wellNotes: WellNote[];
  calendarEvents: CalendarEventKV[];
  // v3 fields (may be empty until backend supports them)
  applicants?: Applicant[];
  collaborators?: Collaborator[];
  revenueOps?: RevenueOp[];
  // podcast fields
  episodes?: Episode[];
  guests?: Guest[];
  topicDrops?: TopicDrop[];
}

// ── Notion sync run history (read-only) ─────────────────────────────────────
export interface NotionSyncRun {
  ran_at: string;
  ok: boolean;
  results: { table: string; created?: number; updated?: number; skipped?: number; note?: string }[];
  error?: string;
}

export const getNotionSyncRuns = () =>
  req<{ to: NotionSyncRun[]; from: NotionSyncRun[] }>('GET', '/notion-sync-runs');

// ── Notion bidirectional sync (Edge Functions) ────────────────────────────────
export async function triggerNotionSync(): Promise<{ ok: boolean; toNotion: any; fromNotion: any; error?: string }> {
  const efHeaders = { 'Content-Type': 'application/json' };
  const TIMEOUT = 30_000;

  async function callEF(path: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
        method: 'POST',
        headers: efHeaders,
        body: '{}',
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${path} → ${res.status}: ${text.slice(0, 200)}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  try {
    const [toNotion, fromNotion] = await Promise.all([
      callEF('sync-to-notion'),
      callEF('sync-from-notion'),
    ]);
    return { ok: true, toNotion, fromNotion };
  } catch (e: any) {
    return { ok: false, toNotion: null, fromNotion: null, error: e.message };
  }
}
