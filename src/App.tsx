import React, { useState, useEffect, useRef } from 'react';
import * as api from './api';
import type { SyncData, Task, Station, ForumPost, ForumReply, Message, BrainDump, Announcement, CoFlowDate, WellNote } from './api';

import { supabase } from './lib/supabase';
import { TopNav } from './components/TopNav';
import { AuthGate } from './components/AuthGate';
import { HubView } from './views/HubView';
import { PodcastView } from './views/PodcastView';
import { WorkshopsView } from './views/WorkshopsView';
import { WellView } from './views/WellView';
import { CoFlowView } from './views/CoFlowView';
import { TeamView } from './views/TeamView';
import { RevenueView } from './views/RevenueView';
import { ImessageTerminal } from './components/iMessageTerminal';
import { usePodcastRealtime } from './hooks/usePodcastRealtime';
import { useCoFlowRealtime } from './hooks/useCoFlowRealtime';
import { useWorkshopRealtime } from './hooks/useWorkshopRealtime';
import { useRevenueRealtime } from './hooks/useRevenueRealtime';

type View = 'hub' | 'podcast' | 'workshops' | 'well' | 'coflow' | 'team' | 'revenue';
type Role = 'core' | 'co-creator' | 'public';

const ALL_VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'hub', label: 'Hub', icon: '◎' },
  { key: 'podcast', label: 'Podcast', icon: '🎙️' },
  { key: 'workshops', label: 'Workshops', icon: '🌿' },
  { key: 'well', label: 'The Well', icon: '💧' },
  { key: 'coflow', label: 'CoFlow', icon: '🌊' },
  { key: 'team', label: 'Team', icon: '◉' },
  { key: 'revenue', label: 'Revenue', icon: '✦' },
];

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

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('cr8w_profile'));
  const [profile, setProfile] = useState<string>(() => localStorage.getItem('cr8w_profile') || '');
  const [role, setRole] = useState<Role>('public');
  const [currentView, setCurrentView] = useState<View>('hub');
  const [syncStatus, setSyncStatus] = useState<'ok' | 'error' | 'syncing'>('ok');
  const [syncTime, setSyncTime] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Data states (legacy API — polled)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [forum, setForum] = useState<ForumPost[]>([]);
  const [forumReplies, setForumReplies] = useState<ForumReply[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [brainDumps, setBrainDumps] = useState<BrainDump[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [coFlowDates, setCoFlowDates] = useState<CoFlowDate[]>([]);
  const [wellNotes, setWellNotes] = useState<WellNote[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);

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

  const [showTerminal, setShowTerminal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleNotionSync = async () => {
    setSyncStatus('syncing');
    setSyncTime('Syncing with Notion…');
    try {
      const result = await api.triggerNotionSync();
      if (result.ok) {
        setSyncStatus('ok');
        setSyncTime('Synced with Notion ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      } else {
        setSyncStatus('error');
        setSyncTime('Notion sync failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncTime('Notion sync error: ' + e.message);
    }
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
        setTasks(data.tasks || []);
        setStations(data.stations || []);
        setForum(data.forum || []);
        setForumReplies(data.forumReplies || []);
        setMessages(data.messages || []);
        setBrainDumps(data.braindumps || []);
        setAnnouncements(data.announcements || []);
        setCoFlowDates(data.coflowDates || []);
        setWellNotes(data.wellNotes || []);
        setCollaborators(data.collaborators || []);
        setSyncStatus('ok');
        silentFailCount.current = 0;
        const now = new Date();
        setSyncTime('Synced ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
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
  const addTask = async (item: Omit<api.Task, 'id' | 'created_at'>) => {
    try { const created = await api.createTask(item); setTasks(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateTask = async (id: number, updates: Partial<api.Task>) => {
    try { setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t)); await api.updateTask(id, updates); } catch (e) { console.error(e); }
  };

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

  const addWellNote = async (content: string) => {
    try { const created = await api.createWellNote({ content }); setWellNotes(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const landWellNote = async (id: number) => {
    try { const note = wellNotes.find(n => n.id === id); if (!note) return; const updated = await api.updateWellNote(id, { landed: (note.landed || 0) + 1 }); setWellNotes(p => p.map(n => n.id === id ? updated : n)); } catch (e) { console.error(e); }
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
    <div className="cr8w-app">
      <TopNav
        views={visibleViews}
        currentView={currentView}
        onNavigate={(v: string) => setCurrentView(v as View)}
        syncStatus={syncStatus}
        syncTime={syncTime}
        profile={profile}
        onSignOut={() => { localStorage.clear(); setAuthed(false); window.location.reload(); }}
        onOpenTerminal={() => setShowTerminal(true)}
        onTriggerSync={handleNotionSync}
      />

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
          onNavigate={(v: string) => setCurrentView(v as View)}
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
          onAddWorkshop={addSbWorkshop}
          onUpdateWorkshop={updateSbWorkshop}
          onDeleteWorkshop={deleteSbWorkshop}
          onAddApplicant={addSbApplicant}
          onUpdateApplicant={updateSbApplicant}
        />
      )}

      {dataLoaded && currentView === 'well' && (
        <WellView
          forum={forum}
          forumReplies={forumReplies}
          wellNotes={wellNotes}
          brainDumps={brainDumps}
          onAddForumPost={addForumPost}
          onAddForumReply={addForumReply}
          onAddWellNote={addWellNote}
          onLandWellNote={landWellNote}
          onAddBrainDump={addBrainDump}
        />
      )}

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
  );
}
