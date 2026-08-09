import React, { useState, useEffect, useRef } from 'react';
import * as api from './api';
import type { SyncData, Task, Station, ForumPost, ForumReply, Message, BrainDump, Announcement, Workshop, WorkshopProgram, WorkshopResource, CoFlowDate, CoFlowCheckin, WellNote, Applicant, Collaborator, RevenueOp } from './api';

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

type View = 'hub' | 'podcast' | 'workshops' | 'well' | 'coflow' | 'team' | 'revenue';

const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'hub', label: 'Hub', icon: '◎' },
  { key: 'podcast', label: 'Podcast', icon: '🎙️' },
  { key: 'workshops', label: 'Workshops', icon: '🌿' },
  { key: 'well', label: 'The Well', icon: '💧' },
  { key: 'coflow', label: 'CoFlow', icon: '🌊' },
  { key: 'team', label: 'Team', icon: '◉' },
  { key: 'revenue', label: 'Revenue', icon: '✦' },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<string>('');
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
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopPrograms, setWorkshopPrograms] = useState<WorkshopProgram[]>([]);
  const [workshopResources, setWorkshopResources] = useState<WorkshopResource[]>([]);
  const [coFlowDates, setCoFlowDates] = useState<CoFlowDate[]>([]);
  const [coFlowCheckins, setCoFlowCheckins] = useState<CoFlowCheckin[]>([]);
  const [wellNotes, setWellNotes] = useState<WellNote[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [revenueOps, setRevenueOps] = useState<RevenueOp[]>([]);

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

  const [showTerminal, setShowTerminal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const fetchSyncRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  const silentFailCount = useRef(0);
  const dataLoadedRef = useRef(false);

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
        setWorkshops(data.workshops || []);
        setWorkshopPrograms(data.workshopPrograms || []);
        setWorkshopResources(data.workshopResources || []);
        setCoFlowDates(data.coflowDates || []);
        setCoFlowCheckins(data.coflowCheckins || []);
        setWellNotes(data.wellNotes || []);
        setApplicants(data.applicants || []);
        setCollaborators(data.collaborators || []);
        setRevenueOps(data.revenueOps || []);
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

  // ── Actions ─────────────────────────────────────────────────────────────────
  const addTask = async (item: Omit<api.Task, 'id' | 'created_at'>) => {
    try { const created = await api.createTask(item); setTasks(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateTask = async (id: number, updates: Partial<api.Task>) => {
    try { setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t)); await api.updateTask(id, updates); } catch (e) { console.error(e); }
  };
  const deleteTask = async (id: number) => {
    try { setTasks(p => p.filter(t => t.id !== id)); await api.deleteTask(id); } catch (e) { console.error(e); }
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

  const addWorkshop = async (w: Omit<api.Workshop, 'id' | 'created_at'>) => {
    try { const created = await api.createWorkshop(w); setWorkshops(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateWorkshop = async (id: number, updates: Partial<api.Workshop>) => {
    try { setWorkshops(p => p.map(w => w.id === id ? { ...w, ...updates } : w)); await api.updateWorkshop(id, updates); } catch (e) { console.error(e); }
  };
  const deleteWorkshop = async (id: number) => {
    try { setWorkshops(p => p.filter(w => w.id !== id)); await api.deleteWorkshop(id); } catch (e) { console.error(e); }
  };

  const addCoFlowDate = async (d: Omit<api.CoFlowDate, 'id' | 'created_at'>) => {
    try { const created = await api.createCoFlowDate(d); setCoFlowDates(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateCoFlowDate = async (id: number, updates: Partial<api.CoFlowDate>) => {
    try { setCoFlowDates(p => p.map(d => d.id === id ? { ...d, ...updates } : d)); await api.updateCoFlowDate(id, updates); } catch (e) { console.error(e); }
  };

  const addCoFlowCheckin = async (c: Omit<api.CoFlowCheckin, 'id' | 'created_at'>) => {
    try { const created = await api.createCoFlowCheckin(c); setCoFlowCheckins(p => [...p, created]); } catch (e) { console.error(e); }
  };

  const addWellNote = async (content: string) => {
    try { const created = await api.createWellNote({ content }); setWellNotes(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const landWellNote = async (id: number) => {
    try { const note = wellNotes.find(n => n.id === id); if (!note) return; const updated = await api.updateWellNote(id, { landed: (note.landed || 0) + 1 }); setWellNotes(p => p.map(n => n.id === id ? updated : n)); } catch (e) { console.error(e); }
  };

  // v3 actions
  const addApplicant = async (a: Omit<api.Applicant, 'id' | 'created_at'>) => {
    try { const created = await api.createApplicant(a); setApplicants(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateApplicant = async (id: number, updates: Partial<api.Applicant>) => {
    try { setApplicants(p => p.map(a => a.id === id ? { ...a, ...updates } : a)); await api.updateApplicant(id, updates); } catch (e) { console.error(e); }
  };

  const addCollaborator = async (c: Omit<api.Collaborator, 'id' | 'created_at'>) => {
    try { const created = await api.createCollaborator(c); setCollaborators(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateCollaborator = async (id: number, updates: Partial<api.Collaborator>) => {
    try { setCollaborators(p => p.map(c => c.id === id ? { ...c, ...updates } : c)); await api.updateCollaborator(id, updates); } catch (e) { console.error(e); }
  };

  const addRevenueOp = async (r: Omit<api.RevenueOp, 'id' | 'created_at'>) => {
    try { const created = await api.createRevenueOp(r); setRevenueOps(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateRevenueOp = async (id: number, updates: Partial<api.RevenueOp>) => {
    try { setRevenueOps(p => p.map(r => r.id === id ? { ...r, ...updates } : r)); await api.updateRevenueOp(id, updates); } catch (e) { console.error(e); }
  };

  if (!authed) {
    return <AuthGate onAuthenticated={(p) => { setAuthed(true); setProfile(p); }} />;
  }

  return (
    <div className="cr8w-app">
      <TopNav
        views={VIEWS}
        currentView={currentView}
        onNavigate={(v: string) => setCurrentView(v as View)}
        syncStatus={syncStatus}
        syncTime={syncTime}
        profile={profile}
        onSignOut={() => { localStorage.clear(); setAuthed(false); window.location.reload(); }}
        onOpenTerminal={() => setShowTerminal(true)}
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
          workshops={workshops}
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
          workshops={workshops}
          programs={workshopPrograms}
          resources={workshopResources}
          applicants={applicants}
          onAddWorkshop={addWorkshop}
          onUpdateWorkshop={updateWorkshop}
          onDeleteWorkshop={deleteWorkshop}
          onAddApplicant={addApplicant}
          onUpdateApplicant={updateApplicant}
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
          onAddCheckin={addCoFlowCheckin}
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
          workshops={workshops}
          onAddOp={addRevenueOp}
          onUpdateOp={updateRevenueOp}
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
