import { useState, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import * as api from './api';
import type { SyncData, Task, Station, ForumPost, ForumReply, Message, BrainDump, Announcement, CoFlowDate } from './api';

import { supabase } from './lib/supabase';
import { TopNav } from './components/TopNav';
import { AuthGate } from './components/AuthGate';
import { HubView } from './views/HubView';
import { PodcastView } from './views/PodcastView';
import { WorkshopsView } from './views/WorkshopsView';
import { WellView } from './views/WellView';
import { DecisionsView } from './views/DecisionsView';
import { CoFlowView } from './views/CoFlowView';
import { TeamView } from './views/TeamView';
import { RevenueView } from './views/RevenueView';
import { ImessageTerminal } from './components/iMessageTerminal';
import { usePodcastRealtime } from './hooks/usePodcastRealtime';
import { useCoFlowRealtime } from './hooks/useCoFlowRealtime';
import { useWorkshopRealtime } from './hooks/useWorkshopRealtime';
import { useWorkshopFeedbackRealtime } from './hooks/useWorkshopFeedbackRealtime';
import { useCalendarRealtime } from './hooks/useCalendarRealtime';
import { useRevenueRealtime } from './hooks/useRevenueRealtime';
import { useTasksRealtime } from './hooks/useTasksRealtime';
import { useLeadsRealtime } from './hooks/useLeadsRealtime';
import { useWellNotesRealtime } from './hooks/useWellNotesRealtime';
import { DashboardProvider } from './context/DashboardContext';
import { SyncStatusBar } from './components/SyncStatusBar';
import { ViewShell } from './components/ViewShell';
import type { ModuleState } from './types/dashboard';
import { PublicContentIndex, PublicContentPage } from './views/PublicContent';

type View = 'hub' | 'podcast' | 'workshops' | 'well' | 'coflow' | 'team' | 'revenue';
type Role = 'core' | 'co-creator' | 'public';

const ALL_VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'hub', label: 'This Week', icon: '◎' },
  { key: 'podcast', label: 'Moves', icon: '↗' },
  { key: 'coflow', label: 'Care', icon: '◌' },
  { key: 'workshops', label: 'FLOWS', icon: '🌿' },
  { key: 'revenue', label: 'The Source', icon: '✦' },
  { key: 'well', label: 'Decisions', icon: '◇' },
  { key: 'team', label: 'System', icon: '◉' },
];

const VIEW_PATHS: Record<View, string> = {
  hub: '/', podcast: '/moves', coflow: '/care', workshops: '/flows',
  revenue: '/money', well: '/decisions', team: '/system',
};

const PATH_VIEWS: Record<string, View> = {
  '/': 'hub', '/moves': 'podcast', '/care': 'coflow', '/flows': 'workshops',
  '/money': 'revenue', '/decisions': 'well', '/system': 'team',
};

// Map auth profile key → Supabase username
const PROFILE_KEY_TO_USERNAME: Record<string, string> = {
  monny: 'mb',
  sunshine: 'sunshine',
  bingle: 'bingle',
  omar: 'omar',
  pia: 'pia',
};

function getDefaultRole(profile: string): Role {
  if (['monny', 'sunshine', 'bingle', 'omar'].includes(profile)) return 'core';
  if (profile === 'pia') return 'co-creator';
  return 'co-creator';
}

function viewsForRole(role: Role): View[] {
  if (role === 'core') return ['hub', 'podcast', 'workshops', 'well', 'coflow', 'team', 'revenue'];
  if (role === 'co-creator') return ['hub', 'workshops', 'well'];
  return ['hub'];
}

function DashboardApp() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('cr8w_profile'));
  const [profile, setProfile] = useState<string>(() => localStorage.getItem('cr8w_profile') || '');
  const [role, setRole] = useState<Role>('public');
  const [currentView, setCurrentView] = useState<View>('hub');
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const nextView = PATH_VIEWS[location.pathname] || 'hub';
    setCurrentView(nextView);
  }, [location.pathname]);
  const [syncStatus, setSyncStatus] = useState<'ok' | 'error' | 'syncing'>('ok');
  const [syncTime, setSyncTime] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const shellState: ModuleState = !dataLoaded ? 'loading' : syncStatus === 'error' ? 'sync-failed' : 'ready';

  // Data states (legacy API — polled)
  const [stations, setStations] = useState<Station[]>([]);

  // Tasks — live-synced via Supabase real-time (v3.1)
  const { tasks, addTask, updateTask, deleteTask } = useTasksRealtime();
  const [forum, setForum] = useState<ForumPost[]>([]);
  const [forumReplies, setForumReplies] = useState<ForumReply[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [brainDumps, setBrainDumps] = useState<BrainDump[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [coFlowDates, setCoFlowDates] = useState<CoFlowDate[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Calendar events — live-synced via Supabase real-time (v3)
  const { events: calendarEvents } = useCalendarRealtime();

  // Revenue ops — live-synced via Supabase real-time
  const { ops: revenueOps, addOp: addRevenueOp, updateOp: updateRevenueOp, deleteOp: deleteRevenueOp } = useRevenueRealtime();

  // Podcast data — live-synced via Supabase real-time
  const {
    episodes,
    guests,
    topicDrops,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    addGuest,
    updateGuest,
    addTopicDrop,
    updateTopicDrop,
  } = usePodcastRealtime();

  // CoFlow check-ins — live-synced via Supabase real-time
  const {
    checkins: coFlowCheckins,
    addCheckin,
    updateCheckin,
    deleteCheckin,
  } = useCoFlowRealtime();

  // Workshops + applicants — live-synced via Supabase real-time
  const {
    workshops: sbWorkshops,
    applicants: sbApplicants,
    addWorkshop: addSbWorkshop,
    updateWorkshop: updateSbWorkshop,
    deleteWorkshop: deleteSbWorkshop,
    addApplicant: addSbApplicant,
    updateApplicant: updateSbApplicant,
  } = useWorkshopRealtime();

  // Workshop feedback — post-event data collection
  const {
    feedback: workshopFeedback,
    addFeedback: addWorkshopFeedback,
    deleteFeedback: deleteWorkshopFeedback,
  } = useWorkshopFeedbackRealtime();

  // Launch leads + RSVPs — live-synced via Supabase real-time
  const {
    leads,
    addLead,
    updateLead,
    deleteLead,
  } = useLeadsRealtime();

  // Well notes — live-synced via Supabase real-time (v3.2)
  const { notes: wellNotes, status: wellNotesStatus, error: wellNotesError, retry: retryWellNotes, addNote, landNote } = useWellNotesRealtime();

  const [showTerminal, setShowTerminal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notionSyncNote, setNotionSyncNote] = useState('');

  // ── Notion sync run history (read-only, shown as 🔄 button tooltip) ─────────
  const refreshNotionSyncNote = async () => {
    try {
      const runs = await api.getNotionSyncRuns();
      const all = [...(runs.to || []), ...(runs.from || [])]
        .sort((a, b) => (b.ran_at || '').localeCompare(a.ran_at || ''));
      const fmt = (iso: string) =>
        new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const lastOk = all.find(r => r.ok);
      const lastErr = all.find(r => !r.ok);
      let note = '';
      if (lastOk) note = `Last Notion sync: ${fmt(lastOk.ran_at)}`;
      if (lastErr) note += `${note ? ' · ' : ''}Last error ${fmt(lastErr.ran_at)}: ${lastErr.error || 'unknown'}`;
      setNotionSyncNote(note);
    } catch { /* keep prior note */ }
  };

  useEffect(() => { refreshNotionSyncNote(); }, []);

  const handleNotionSync = async () => {
    setSyncStatus('syncing');
    setSyncTime('Syncing with Notion…');
    try {
      const result = await api.triggerNotionSync();
      if (result.ok) {
        setSyncStatus('ok');
        const syncedAt = new Date();
        setSyncTime('Synced with Notion ' + syncedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        setLastSyncedAt(syncedAt.toISOString());
      } else {
        setSyncStatus('error');
        setSyncTime('Notion sync failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncTime('Notion sync error: ' + e.message);
    }
    refreshNotionSyncNote();
  };

  const fetchSyncRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  const silentFailCount = useRef(0);
  const dataLoadedRef = useRef(false);

  // ── Fetch role from Supabase after auth ──────────────────────────────────────
  useEffect(() => {
    if (!authed || !profile) return;
    async function fetchRole() {
      const username = PROFILE_KEY_TO_USERNAME[profile] || profile;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('username', username)
        .single();
      if (error || !data?.role) {
        setRole(getDefaultRole(profile));
      } else {
        setRole(data.role as Role);
      }
    }
    fetchRole();
  }, [authed, profile]);

  // ── Ensure current view is allowed for role ──────────────────────────────────
  useEffect(() => {
    const allowed = viewsForRole(role);
    if (!allowed.includes(currentView)) {
      setCurrentView(allowed[0] || 'hub');
    }
  }, [role, currentView]);

  // ── Legacy sync polling ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchSync(silent = false) {
      try {
        setSyncStatus('syncing');
        const data: SyncData = await api.sync();
        setStations(data.stations || []);
        setForum(data.forum || []);
        setForumReplies(data.forumReplies || []);
        setMessages(data.messages || []);
        setBrainDumps(data.braindumps || []);
        setAnnouncements(data.announcements || []);
        setCoFlowDates(data.coflowDates || []);
        setCollaborators(data.collaborators || []);
        setSyncStatus('ok');
        silentFailCount.current = 0;
        const now = new Date();
        setSyncTime('Synced ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        setLastSyncedAt(now.toISOString());
        if (!dataLoadedRef.current) { dataLoadedRef.current = true; setDataLoaded(true); }
      } catch (e) {
        silentFailCount.current += 1;
        const isNetwork = e instanceof TypeError && (String(e).includes('fetch') || String(e).includes('network'));
        if (!isNetwork && silentFailCount.current >= 2) setSyncStatus('error');
        else if (silent) setSyncStatus('ok');
        if (!dataLoadedRef.current) { dataLoadedRef.current = true; setDataLoaded(true); }
      }
    }
    fetchSyncRef.current = fetchSync;
    fetchSync(false);

    let pollInterval = 15_000;
    const MAX_INTERVAL = 300_000;
    let pollRef: ReturnType<typeof setTimeout> | null = null;
    function schedulePoll() {
      pollRef = setTimeout(async () => {
        await fetchSyncRef.current?.(true);
        pollInterval = silentFailCount.current > 0 ? Math.min(pollInterval * 2, MAX_INTERVAL) : 15_000;
        schedulePoll();
      }, pollInterval);
    }
    schedulePoll();
    return () => { if (pollRef) clearTimeout(pollRef); };
  }, []);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentView]);

  // ── Actions (legacy API) ─────────────────────────────────────────────────────
  const addForumPost = async (post: Omit<api.ForumPost, 'id' | 'created_at'>) => {
    try { const created = await api.createForumPost(post); setForum(p => [created, ...p]); } catch (e) { console.error(e); }
  };
  const addForumReply = async (postId: number, reply: { author: string; content: string }) => {
    try { const created = await api.createForumReply(postId, reply); setForumReplies(p => [...p, created]); } catch (e) { console.error(e); }
  };

  const sendMessage = async (msg: Omit<api.Message, 'id' | 'created_at'>) => {
    try { const created = await api.sendMessage(msg); setMessages(p => [...p, created]); } catch (e) { console.error(e); }
  };

  const addBrainDump = async (dump: Omit<api.BrainDump, 'id' | 'created_at'>) => {
    try { const created = await api.createBrainDump(dump); setBrainDumps(p => [created, ...p]); } catch (e) { console.error(e); }
  };

  const addCoFlowDate = async (d: Omit<api.CoFlowDate, 'id' | 'created_at'>) => {
    try { const created = await api.createCoFlowDate(d); setCoFlowDates(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateCoFlowDate = async (id: number, updates: Partial<api.CoFlowDate>) => {
    try { setCoFlowDates(p => p.map(d => d.id === id ? { ...d, ...updates } : d)); await api.updateCoFlowDate(id, updates); } catch (e) { console.error(e); }
  };

  // Well notes (realtime hook; same try/catch shape as the legacy actions)
  const addWellNote = async (content: string) => {
    try { await addNote(content); } catch (e) { console.error(e); }
  };
  const landWellNote = async (id: string) => {
    try { await landNote(id); } catch (e) { console.error(e); }
  };

  // v3 actions (legacy API)
  const addCollaborator = async (c: Omit<any, 'id' | 'created_at'>) => {
    try { const created = await api.createCollaborator(c); setCollaborators(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateCollaborator = async (id: number, updates: Partial<any>) => {
    try { setCollaborators(p => p.map(c => c.id === id ? { ...c, ...updates } : c)); await api.updateCollaborator(id, updates); } catch (e) { console.error(e); }
  };

  // ── Filter views by role ─────────────────────────────────────────────────────
  const allowedViews = viewsForRole(role);
  const visibleViews = ALL_VIEWS.filter(v => allowedViews.includes(v.key));

  if (!authed) {
    return <AuthGate onAuthenticated={(p) => { setAuthed(true); setProfile(p); }} />;
  }

  return (
    <DashboardProvider>
      <div className="cr8w-app">
      <TopNav
        views={visibleViews}
        currentView={currentView}
        onNavigate={(v: string) => navigate(VIEW_PATHS[v as View] || '/')}
        syncStatus={syncStatus}
        syncTime={syncTime}
        profile={profile}
        onSignOut={() => { localStorage.clear(); setAuthed(false); window.location.reload(); }}
        onOpenTerminal={() => setShowTerminal(true)}
        onTriggerSync={handleNotionSync}
        notionSyncNote={notionSyncNote}
      />

      <SyncStatusBar
        state={syncStatus === 'error' ? 'failed' : syncStatus === 'syncing' ? 'syncing' : 'fresh'}
        lastSyncedAt={lastSyncedAt}
      />

      <Routes>
        <Route path="/" element={<span />} />
        <Route path="/moves" element={<span />} />
        <Route path="/care" element={<span />} />
        <Route path="/flows" element={<span />} />
        <Route path="/money" element={<span />} />
        <Route path="/decisions" element={<span />} />
        <Route path="/system" element={<span />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ViewShell
        title={ALL_VIEWS.find(v => v.key === currentView)?.label || 'This Week'}
        state={shellState}
        restrictedMessage="This view is not available for your current role or consent settings."
      >

      {!dataLoaded && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 8 }}>Loading the well...</div>
          <div style={{ fontSize: '0.85rem' }}>First sync may take a moment</div>
        </div>
      )}

      {dataLoaded && currentView === 'hub' && (
        <HubView
          tasks={tasks}
          workshops={sbWorkshops}
          coFlowDates={coFlowDates}
          wellNotes={wellNotes}
          announcements={announcements}
          brainDumps={brainDumps}
          calendarEvents={calendarEvents}
          onNavigate={(v: string) => navigate(VIEW_PATHS[v as View] || '/')}
        />
      )}

      {dataLoaded && currentView === 'podcast' && (
        <PodcastView
          episodes={episodes}
          guests={guests}
          topicDrops={topicDrops}
          onAddEpisode={addEpisode}
          onUpdateEpisode={updateEpisode}
          onDeleteEpisode={deleteEpisode}
          onAddGuest={addGuest}
          onUpdateGuest={updateGuest}
          onAddTopicDrop={addTopicDrop}
          onUpdateTopicDrop={updateTopicDrop}
        />
      )}

      {dataLoaded && currentView === 'workshops' && (
        <WorkshopsView
          workshops={sbWorkshops}
          applicants={sbApplicants}
          feedback={workshopFeedback}
          onAddWorkshop={addSbWorkshop}
          onUpdateWorkshop={updateSbWorkshop}
          onDeleteWorkshop={deleteSbWorkshop}
          onAddApplicant={addSbApplicant}
          onUpdateApplicant={updateSbApplicant}
          onAddFeedback={addWorkshopFeedback}
          onDeleteFeedback={deleteWorkshopFeedback}
          leads={leads}
          canManageLeads={role === 'core'}
          onAddLead={addLead}
          onUpdateLead={updateLead}
          onDeleteLead={deleteLead}
        />
      )}

      {currentView === 'well' && <DecisionsView tasks={tasks} />}

      {dataLoaded && currentView === 'coflow' && (
        <CoFlowView
          dates={coFlowDates}
          checkins={coFlowCheckins}
          tasks={tasks}
          onAddDate={addCoFlowDate}
          onUpdateDate={updateCoFlowDate}
          onAddCheckin={addCheckin}
        />
      )}

      {dataLoaded && currentView === 'team' && (
        <TeamView
          collaborators={collaborators}
          tasks={tasks}
          stations={stations}
          onAddCollaborator={addCollaborator}
          onUpdateCollaborator={updateCollaborator}
        />
      )}

      {dataLoaded && currentView === 'revenue' && (
        <RevenueView
          opportunities={revenueOps}
          workshops={sbWorkshops}
          onAddOp={addRevenueOp}
          onUpdateOp={updateRevenueOp}
          onDeleteOp={deleteRevenueOp}
        />
      )}

      </ViewShell>

      {/* iMessage Terminal */}
      {showTerminal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTerminal(false); }}>
          <div className="modal-content" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <span className="modal-title">💬 iMessage Terminal</span>
              <button className="modal-close" onClick={() => setShowTerminal(false)}>×</button>
            </div>
            <ImessageTerminal />
          </div>
        </div>
      )}

      {/* Scroll to top */}
      <button
        className={`scroll-top ${showScrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >↑</button>
      </div>
    </DashboardProvider>
  );
}

function PublicContentRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <PublicContentPage slug={slug || ''} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/content" element={<PublicContentIndex />} />
      <Route path="/content/:slug" element={<PublicContentRoute />} />
      <Route path="*" element={<DashboardApp />} />
    </Routes>
  );
}
