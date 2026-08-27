import React, { useState, useEffect, useRef } from 'react';
import * as api from './api';
import type { SyncData, Station, ForumPost, ForumReply, Message, BrainDump, Announcement, CoFlowDate } from './api';
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
import { ClientMgmtView } from './views/ClientMgmtView';
import { ClientPortalView } from './views/ClientPortalView';
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
import { useClientData, useClientPortal } from './hooks/useClientData';

type View = 'hub' | 'podcast' | 'workshops' | 'well' | 'coflow' | 'team' | 'revenue' | 'client-mgmt' | 'portal';
type Role = 'core' | 'co-creator' | 'public' | 'client';

const ALL_VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'hub', label: 'Hub', icon: '◎' },
  { key: 'podcast', label: 'Podcast', icon: '🎙️' },
  { key: 'workshops', label: 'Workshops', icon: '🌿' },
  { key: 'well', label: 'The Well', icon: '💧' },
  { key: 'coflow', label: 'CoFlow', icon: '🌊' },
  { key: 'team', label: 'Team', icon: '◉' },
  { key: 'revenue', label: 'Revenue', icon: '✦' },
  { key: 'client-mgmt', label: 'Projects', icon: '🏠' },
  { key: 'portal', label: 'Portal', icon: '🏡' },
];

const PROFILE_KEY_TO_USERNAME: Record<string, string> = {
  monny: 'mb',
  sunshine: 'sunshine',
  bingle: 'bingle',
  omar: 'omar',
  pia: 'pia',
};

function getDefaultRole(profile: string): Role {
  if (profile.startsWith('client:')) return 'client';
  if (['monny', 'sunshine', 'bingle', 'omar'].includes(profile)) return 'core';
  if (profile === 'pia') return 'co-creator';
  return 'co-creator';
}

function viewsForRole(role: Role): View[] {
  if (role === 'client') return ['portal'];
  if (role === 'core') return ['hub', 'podcast', 'workshops', 'well', 'coflow', 'team', 'revenue', 'client-mgmt'];
  if (role === 'co-creator') return ['hub', 'workshops', 'well'];
  return ['hub'];
}

export default function App() {
  const [authed, setAuthed] = useState(() => {
    const saved = localStorage.getItem('cr8w_profile');
    const clientId = localStorage.getItem('cr8w_client_id');
    return !!(saved || clientId);
  });
  const [profile, setProfile] = useState<string>(() => {
    const saved = localStorage.getItem('cr8w_profile') || '';
    const clientId = localStorage.getItem('cr8w_client_id');
    if (clientId) return 'client:' + clientId;
    return saved;
  });
  const [role, setRole] = useState<Role>('public');
  const [currentView, setCurrentView] = useState<View>('hub');
  const [syncStatus, setSyncStatus] = useState<'ok' | 'error' | 'syncing'>('ok');
  const [syncTime, setSyncTime] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  const isClient = profile.startsWith('client:');
  const clientId = isClient ? profile.replace('client:', '') : null;

  const [stations, setStations] = useState<Station[]>([]);
  const { tasks, addTask, updateTask, deleteTask } = useTasksRealtime();
  const [forum, setForum] = useState<ForumPost[]>([]);
  const [forumReplies, setForumReplies] = useState<ForumReply[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [brainDumps, setBrainDumps] = useState<BrainDump[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [coFlowDates, setCoFlowDates] = useState<CoFlowDate[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const { events: calendarEvents } = useCalendarRealtime();
  const { ops: revenueOps, addOp: addRevenueOp, updateOp: updateRevenueOp, deleteOp: deleteRevenueOp } = useRevenueRealtime();
  const { episodes, guests, topicDrops, addEpisode, updateEpisode, deleteEpisode, addGuest, updateGuest, addTopicDrop, updateTopicDrop } = usePodcastRealtime();
  const { checkins: coFlowCheckins, addCheckin, updateCheckin, deleteCheckin } = useCoFlowRealtime();
  const { workshops: sbWorkshops, applicants: sbApplicants, addWorkshop: addSbWorkshop, updateWorkshop: updateSbWorkshop, deleteWorkshop: deleteSbWorkshop, addApplicant: addSbApplicant, updateApplicant: updateSbApplicant } = useWorkshopRealtime();
  const { feedback: workshopFeedback, addFeedback: addWorkshopFeedback, deleteFeedback: deleteWorkshopFeedback } = useWorkshopFeedbackRealtime();
  const { leads, addLead, updateLead, deleteLead } = useLeadsRealtime();
  const { notes: wellNotes, status: wellNotesStatus, error: wellNotesError, retry: retryWellNotes, addNote, landNote } = useWellNotesRealtime();

  const clientData = useClientData(30000);
  const portalData = useClientPortal(clientId, clientData);

  const [showTerminal, setShowTerminal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notionSyncNote, setNotionSyncNote] = useState('');

  const refreshNotionSyncNote = async () => {
    try {
      const runs = await api.getNotionSyncRuns();
      const all = [...(runs.to || []), ...(runs.from || [])].sort((a, b) => (b.ran_at || '').localeCompare(a.ran_at || ''));
      const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const lastOk = all.find(r => r.ok);
      const lastErr = all.find(r => !r.ok);
      let note = '';
      if (lastOk) note = 'Last Notion sync: ' + fmt(lastOk.ran_at);
      if (lastErr) note += (note ? ' · ' : '') + 'Last error ' + fmt(lastErr.ran_at) + ': ' + (lastErr.error || 'unknown');
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
        setSyncTime('Synced with Notion ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
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

  useEffect(() => {
    if (!authed || !profile) return;
    if (isClient) { setRole('client'); return; }
    async function fetchRole() {
      const username = PROFILE_KEY_TO_USERNAME[profile] || profile;
      const { data, error } = await supabase.from('profiles').select('role').eq('username', username).single();
      if (error || !data?.role) { setRole(getDefaultRole(profile)); }
      else { setRole(data.role as Role); }
    }
    fetchRole();
  }, [authed, profile, isClient]);

  useEffect(() => {
    const allowed = viewsForRole(role);
    if (!allowed.includes(currentView)) { setCurrentView(allowed[0] || 'hub'); }
  }, [role, currentView]);

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
        setSyncTime('Synced ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        if (!dataLoadedRef.current) { dataLoadedRef.current = true; setDataLoaded(true); }
      } catch (e) {
        silentFailCount.current++;
        const isNetwork = e instanceof TypeError && (String(e).includes('fetch') || String(e).includes('network'));
        if (!isNetwork && silentFailCount.current >= 2) setSyncStatus('error');
        else if (silent) setSyncStatus('ok');
        if (!dataLoadedRef.current) { dataLoadedRef.current = true; setDataLoaded(true); }
      }
    }
    fetchSyncRef.current = fetchSync;
    fetchSync(false);
    let pollInterval = 15000;
    const MAX_INTERVAL = 300000;
    let pollRef: ReturnType<typeof setTimeout> | null = null;
    function schedulePoll() {
      pollRef = setTimeout(async () => {
        await fetchSyncRef.current?.(true);
        pollInterval = silentFailCount.current > 0 ? Math.min(pollInterval * 2, MAX_INTERVAL) : 15000;
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
    try { await addNote(content); } catch (e) { console.error(e); }
  };
  const landWellNote = async (id: string) => {
    try { await landNote(id); } catch (e) { console.error(e); }
  };
  const addCollaborator = async (c: Omit<any, 'id' | 'created_at'>) => {
    try { const created = await api.createCollaborator(c); setCollaborators(p => [...p, created]); } catch (e) { console.error(e); }
  };
  const updateCollaborator = async (id: number, updates: Partial<any>) => {
    try { setCollaborators(p => p.map(c => c.id === id ? { ...c, ...updates } : c)); await api.updateCollaborator(id, updates); } catch (e) { console.error(e); }
  };

  const allowedViews = viewsForRole(role);
  const visibleViews = ALL_VIEWS.filter(v => allowedViews.includes(v.key));

  if (!authed) {
    return <AuthGate onAuthenticated={(p) => { setAuthed(true); setProfile(p); }} />;
  }

  return (
    <div className='cr8w-app'>
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
        notionSyncNote={notionSyncNote}
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
          calendarEvents={calendarEvents}
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
      {currentView === 'well' && (
        <WellView
          forum={forum}
          forumReplies={forumReplies}
          wellNotes={wellNotes}
          wellNotesStatus={wellNotesStatus}
          wellNotesError={wellNotesError}
          onRetryWellNotes={retryWellNotes}
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
      {dataLoaded && currentView === 'client-mgmt' && role === 'core' && (
        <ClientMgmtView
          clients={clientData.clients}
          projects={clientData.projects}
          tasks={clientData.tasks}
          invoices={clientData.invoices}
          meetings={clientData.meetings}
          documents={clientData.documents}
          onAddClient={clientData.addClient}
          onUpdateClient={clientData.updateClient}
          onDeleteClient={clientData.removeClient}
          onAddProject={clientData.addProject}
          onUpdateProject={clientData.updateProject}
          onDeleteProject={clientData.removeProject}
          onAddTask={clientData.addTask}
          onUpdateTask={clientData.updateTask}
          onDeleteTask={clientData.removeTask}
          onAddInvoice={clientData.addInvoice}
          onUpdateInvoice={clientData.updateInvoice}
          onDeleteInvoice={clientData.removeInvoice}
          onAddMeeting={clientData.addMeeting}
          onUpdateMeeting={clientData.updateMeeting}
          onDeleteMeeting={clientData.removeMeeting}
          onAddDocument={clientData.addDocument}
          onUpdateDocument={clientData.updateDocument}
          onDeleteDocument={clientData.removeDocument}
        />
      )}
      {currentView === 'portal' && isClient && portalData.client && (
        <ClientPortalView
          client={portalData.client}
          projects={portalData.projects}
          tasks={portalData.tasks}
          invoices={portalData.invoices}
          meetings={portalData.meetings}
          documents={portalData.documents}
          onLogout={() => {
            localStorage.removeItem('cr8w_profile');
            localStorage.removeItem('cr8w_client_id');
            setAuthed(false);
            setProfile('');
            window.location.reload();
          }}
        />
      )}
      {showTerminal && (
        <div className='modal-overlay' onClick={(e) => { if (e.target === e.currentTarget) setShowTerminal(false); }}>
          <div className='modal-content' style={{ maxWidth: 720 }}>
            <div className='modal-header'>
              <span className='modal-title'>💬 iMessage Terminal</span>
              <button className='modal-close' onClick={() => setShowTerminal(false)}>×</button>
            </div>
            <ImessageTerminal />
          </div>
        </div>
      )}
      <button className={'scroll-top ' + (showScrollTop ? 'visible' : '')} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
    </div>
  );
}
