import React, { useState, useEffect, useRef } from 'react';
import './cr8w.css';
import { TopNav } from './components/TopNav';
import { HubView } from './components/HubView';
import { GeyserView } from './components/GeyserView';
import { PersonView } from './components/PersonView';
import { AddTaskModal } from './components/AddTaskModal';
import { MessageDrawer } from './components/MessageDrawer';
import { WorkshopsView } from './components/WorkshopsView';
import { CoFlowD8sView } from './components/CoFlowD8sView';
import { WelcomeModal, shouldShowOnboarding } from './components/WelcomeModal';
import { DecomprocessFAB } from './components/DecomprocessFAB';
import { PlaygroundView } from './components/PlaygroundView';
import { ToastContainer } from './components/Toast';
import { useThemeInit } from './components/ThemeProvider';
import { LoginGate, isAuthenticated, getStoredProfile } from './components/LoginGate';
import {
  DEFAULT_ANNOUNCEMENTS,
  STATIONS_DEFAULT,
  GCAL_CLIENT_ID,
} from './components/data';
import * as api from './components/api';
import type { Task, Station, ForumPost, Message, BrainDump, Announcement, ForumReply } from './components/api';
import type { Workshop, WorkshopProgram, WorkshopResource } from './components/api';
import type { CoFlowDate, CoFlowCheckin, WellNote } from './components/api';

// ── Google Calendar OAuth: Authorization Code flow with PKCE ──────────────────
// Google redirects back with ?code=XXXXX as a query param (survives server
// redirects unlike hash fragments). We capture it synchronously at module-eval
// time, exchange it for an access_token via our server-side edge function, then clean the URL.
// CLIENT SECRET removed — token exchange now happens server-side via /gcal-token-exchange

(function captureOAuthCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const codeVerifier = localStorage.getItem('gcal_pkce_verifier');
    if (!codeVerifier) {
      console.error('[GCal OAuth] No PKCE code_verifier in localStorage — ignoring ?code param');
      return;
    }

    // Clean the URL immediately so the code is never reused on refresh
    window.history.replaceState(null, '', window.location.pathname);
    console.log('[GCal OAuth] Auth code captured, exchanging for token via server...');

    // Set a pending flag so HubView can show a spinner while we exchange
    localStorage.setItem('gcal_token_fresh', 'pending');

    // Exchange code → access_token via server-side edge function (secret stays server-side)
    import('/utils/supabase/info').then(({ projectId, publicAnonKey }) => {
      const host = window.location.hostname;
      const onVercelOrDomain = host.endsWith('.vercel.app') || host === 'createwell.monnyfest.co' || host === 'localhost' || host === '127.0.0.1';
      const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)
        ?? (onVercelOrDomain ? '/api/server' : `https://${projectId}.supabase.co/functions/v1/make-server-8dcd9693`);
      const serverUrl = `${apiBase}/gcal-token-exchange`;

      fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_uri: window.location.origin,
          client_id: GCAL_CLIENT_ID,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            console.error('[GCal OAuth] Token exchange error:', data.error, data.error_description);
            localStorage.setItem('gcal_token_fresh', 'error');
            localStorage.setItem('gcal_token_error', data.error_description || data.error);
            return;
          }
          if (data.access_token) {
            // Store in temp key AND per-user key if we know the user
            localStorage.setItem('gcal_access_token', data.access_token);
            const oauthUser = localStorage.getItem('gcal_oauth_user');
            if (oauthUser) {
              localStorage.setItem(`gcal_token_${oauthUser.toUpperCase()}`, data.access_token);
            }
            localStorage.setItem('gcal_token_fresh', 'ready');
            console.log('[GCal OAuth] Token exchange successful' + (oauthUser ? ` for ${oauthUser}` : ''));
          }
          // Clean up PKCE verifier
          localStorage.removeItem('gcal_pkce_verifier');
        })
        .catch(err => {
          console.error('[GCal OAuth] Token exchange fetch error:', err);
          localStorage.setItem('gcal_token_fresh', 'error');
          localStorage.setItem('gcal_token_error', String(err));
        });
    });
  } catch (e) {
    console.error('[GCal OAuth] Code capture error:', e);
  }
})();

type View = 'hub' | 'geyser' | 'workshops' | 'coflow' | 'playground' | 'sunshine' | 'monny' | 'bingle';
type GeyserTab = 'overview' | 'stations' | 'forum';
const PERSON_VIEWS: View[] = ['sunshine', 'monny', 'bingle'];

const DEFAULT_STATIONS_MAPPED: Station[] = STATIONS_DEFAULT.map(s => ({
  ...s,
  id: s.id,
  created_at: undefined,
}));

export default function App() {
  useThemeInit();

  // ── PWA: inject meta tags + register service worker ──────────────────────
  useEffect(() => {
    // Meta tags for PWA / iOS
    const metaTags: { name?: string; content: string; httpEquiv?: string; property?: string }[] = [
      { name: 'theme-color', content: '#C25B38' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Create Well' },
    ];
    const injected: HTMLElement[] = [];
    for (const tag of metaTags) {
      // Skip if already exists
      const selector = tag.name ? `meta[name="${tag.name}"]` : null;
      if (selector && document.head.querySelector(selector)) continue;
      const el = document.createElement('meta');
      if (tag.name) el.setAttribute('name', tag.name);
      el.setAttribute('content', tag.content);
      document.head.appendChild(el);
      injected.push(el);
    }

    // Manifest link
    if (!document.head.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = '/manifest.json';
      document.head.appendChild(manifest);
      injected.push(manifest);
    }

    // Apple touch icon
    if (!document.head.querySelector('link[rel="apple-touch-icon"]')) {
      const icon = document.createElement('link');
      icon.rel = 'apple-touch-icon';
      icon.href = '/assets/26b5a4fd9027610adb3ddb9ed89749cb683707dd.png';
      document.head.appendChild(icon);
      injected.push(icon);
    }

    // iOS splash screen (using media query for common sizes)
    if (!document.head.querySelector('meta[name="apple-mobile-web-app-splash"]')) {
      // Inline a simple splash via background-color approach
      const splashStyle = document.createElement('style');
      splashStyle.textContent = `
        @media screen and (display-mode: standalone) {
          body::before {
            content: none;
          }
        }
      `;
      // The background_color in manifest.json (#EAE3DB) handles the splash on most devices
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PWA] Service worker registered:', reg.scope);
      }).catch((err) => {
        console.log('[PWA] Service worker registration failed:', err);
      });
    }

    return () => {
      injected.forEach(el => el.remove());
    };
  }, []);

  // ── Auth gate — renders before everything else ────────────────────────────
  const [authed, setAuthed] = useState(() => isAuthenticated());
  const [initialProfile] = useState(() => getStoredProfile() ?? 'monny');

  function handleAuthenticated(profileKey: string) {
    setAuthed(true);
    setChatActiveUser(profileKey === 'event-support' ? 'monny' : profileKey);
  }

  const [currentView, setCurrentView] = useState<View>('hub');
  const [geyserDefaultTab, setGeyserDefaultTab] = useState<GeyserTab>('overview');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [syncTime, setSyncTime] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'ok' | 'error' | 'syncing'>('syncing');
  const [chatActiveUser, setChatActiveUser] = useState(
    () => { const p = getStoredProfile(); return (p && p !== 'event-support') ? p : 'monny'; }
  );
  const [showWelcome, setShowWelcome] = useState(() => shouldShowOnboarding(initialProfile === 'event-support' ? 'monny' : initialProfile));
  const [showDomainBanner, setShowDomainBanner] = useState(() => {
    // Only show if NOT on the custom domain and not previously dismissed this session
    const isCustomDomain = window.location.hostname === 'createwell.monnyfest.co';
    const dismissed = sessionStorage.getItem('cr8w_domain_banner_dismissed');
    return !isCustomDomain && !dismissed;
  });

  // Re-check onboarding when active user changes
  useEffect(() => {
    if (shouldShowOnboarding(chatActiveUser)) {
      setShowWelcome(true);
    }
  }, [chatActiveUser]);

  // Track which Wednesday reminders we've already sent so we don't duplicate
  const wednesdayReminderSent = useRef(false);

  // Shared synced state
  const [actionItems, setActionItems] = useState<Task[]>([]);
  const [stations, setStations] = useState<Station[]>(DEFAULT_STATIONS_MAPPED);
  const [forum, setForum] = useState<ForumPost[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [brainDumps, setBrainDumps] = useState<BrainDump[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [forumReplies, setForumReplies] = useState<ForumReply[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopPrograms, setWorkshopPrograms] = useState<WorkshopProgram[]>([]);
  const [workshopResources, setWorkshopResources] = useState<WorkshopResource[]>([]);
  const [coFlowDates, setCoFlowDates] = useState<CoFlowDate[]>([]);
  const [coFlowCheckins, setCoFlowCheckins] = useState<CoFlowCheckin[]>([]);
  const [wellNotes, setWellNotes] = useState<WellNote[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const dataLoadedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track consecutive silent failures so we only show red after 3 misses in a row
  const silentFailCount = useRef(0);

  // ── Polling sync ────────────────────────────────────────────────────────────
  // fetchSync is defined inside useEffect so it never goes stale.
  // We keep a stable ref so we can call it from interval callbacks.
  const fetchSyncRef = useRef<((silent?: boolean) => Promise<void>)>();

  // ── Deduplicate system messages: keep only the latest of each unique content ─
  function deduplicateSystemMessages(msgs: Message[]): Message[] {
    const seen = new Map<string, Message>();
    const result: Message[] = [];
    for (const m of msgs) {
      if (m.author === 'system') {
        // Normalize content for comparison (trim whitespace)
        const key = m.content?.trim() || '';
        const existing = seen.get(key);
        if (existing) {
          // Keep the one with the later created_at, drop the other
          const existingTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;
          const currentTime = m.created_at ? new Date(m.created_at).getTime() : 0;
          if (currentTime > existingTime) {
            // Replace existing with current in result
            const idx = result.indexOf(existing);
            if (idx >= 0) result[idx] = m;
            seen.set(key, m);
          }
          // else skip current (existing is newer)
        } else {
          seen.set(key, m);
          result.push(m);
        }
      } else {
        result.push(m);
      }
    }
    return result;
  }

  useEffect(() => {
    async function fetchSync(silent = false) {
      if (!silent) setSyncStatus('syncing');
      try {
        const data = await api.sync();
        setActionItems(data.tasks || []);
        setStations(data.stations?.length ? data.stations : DEFAULT_STATIONS_MAPPED);
        setForum(data.forum || []);
        setMessages(deduplicateSystemMessages(data.messages || []));
        setBrainDumps(data.braindumps || []);
        if (data.announcements?.length) setAnnouncements(data.announcements);
        setForumReplies(data.forumReplies || []);
        setWorkshops(data.workshops || []);
        setWorkshopPrograms(data.workshopPrograms || []);
        setWorkshopResources(data.workshopResources || []);
        setCoFlowDates(data.coflowDates || []);
        setCoFlowCheckins(data.coflowCheckins || []);
        setWellNotes(data.wellNotes || []);
        setSyncStatus('ok');
        silentFailCount.current = 0;
        const now = new Date();
        setSyncTime('Synced ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          setDataLoaded(true);
        }
      } catch (e) {
        console.error('Sync error:', e);
        if (silent) {
          // Background poll: surface error after 2 consecutive failures (~30 s)
          silentFailCount.current += 1;
          if (silentFailCount.current >= 2) setSyncStatus('error');
        } else {
          // Foreground (initial) load failure — show error immediately
          setSyncStatus('error');
        }
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          setDataLoaded(true);
          setStations(DEFAULT_STATIONS_MAPPED);
          setAnnouncements(DEFAULT_ANNOUNCEMENTS);
        }
      }
    }

    fetchSyncRef.current = fetchSync;
    fetchSync(false);
    pollRef.current = setInterval(() => fetchSyncRef.current?.(true), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // runs once — no stale closure, dataLoadedRef is mutable

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Scroll-to-top button
  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function navigate(view: string) {
    setCurrentView(view as View);
    if (view === 'geyser') setGeyserDefaultTab('overview');
  }
  function navigateGeyserStations() {
    setCurrentView('geyser');
    setGeyserDefaultTab('stations');
  }
  function navigateGeyserForum() {
    setCurrentView('geyser');
    setGeyserDefaultTab('forum');
  }

  const currentPerson = PERSON_VIEWS.includes(currentView) ? currentView as string : null;

  // ── System message helper (fire-and-forget, don't block the action) ─────────
  function sendSystemMessage(content: string) {
    // Dedup guard: skip if an identical system message already exists in state
    const trimmed = content.trim();
    setMessages(prev => {
      const alreadyExists = prev.some(m => m.author === 'system' && m.content?.trim() === trimmed);
      if (alreadyExists) return prev;
      // Optimistic local insert
      const tempId = -(Date.now() + Math.random());
      const optimistic: Message = { author: 'system', content, id: tempId, created_at: new Date().toISOString() };
      // Fire API call (can't await inside setState, so schedule it)
      api.sendMessage({ author: 'system', content })
        .then(created => setMessages(p => p.map(m => m.id === tempId ? created : m)))
        .catch(e => {
          console.error('System message send error:', e);
          setMessages(p => p.filter(m => m.id !== tempId));
        });
      return [...prev, optimistic];
    });
  }

  // ── Wednesday check-in reminder (auto-fires once per Wednesday session) ─────
  useEffect(() => {
    if (!dataLoaded || wednesdayReminderSent.current) return;
    const today = new Date();
    if (today.getDay() !== 3) return; // 3 = Wednesday
    // Check if we already sent a reminder today (localStorage guard)
    const key = `cr8w_wed_reminder_${today.toISOString().split('T')[0]}`;
    if (localStorage.getItem(key)) { wednesdayReminderSent.current = true; return; }
    // Also check if there's already a Wednesday reminder in the loaded messages
    const reminderContent = '[REMINDER] \u{1F4CB} It\'s Wednesday! Time to drop your weekly check-in on PlayD8s before the next behind h\u0030es doors. Head to PlayD8s \u2192 Check-In tab.';
    const alreadyInMessages = messages.some(m => m.author === 'system' && m.content?.trim() === reminderContent);
    if (alreadyInMessages) { wednesdayReminderSent.current = true; localStorage.setItem(key, '1'); return; }
    wednesdayReminderSent.current = true;
    localStorage.setItem(key, '1');
    sendSystemMessage(reminderContent);
  }, [dataLoaded, messages]);

  // ── Task actions ────────────────────────────────────────────────────────────
  async function addTask(item: Omit<Task, 'id' | 'created_at'>) {
    try {
      const created = await api.createTask(item);
      setActionItems(prev => [...prev, created]);
      // System notification in CR8W Chat
      const personLabel = item.person ? item.person.charAt(0).toUpperCase() + item.person.slice(1) : 'Someone';
      sendSystemMessage(`[UPDATE] \u{26F2}\uFE0F New Geyser task: "${item.title}" assigned to ${personLabel} (${item.priority} priority)`);
    } catch (e) { console.error('Add task error:', e); }
  }

  async function updateTaskStatus(id: number, status: string) {
    try {
      setActionItems(prev => prev.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t));
      await api.updateTask(id, { status: status as Task['status'] });
    } catch (e) { console.error('Update task error:', e); }
  }

  async function updateTask(id: number, updates: Partial<Task>) {
    try {
      setActionItems(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      await api.updateTask(id, updates);
    } catch (e) { console.error('Update task error:', e); }
  }

  async function deleteTask(id: number) {
    try {
      setActionItems(prev => prev.filter(t => t.id !== id));
      await api.deleteTask(id);
    } catch (e) { console.error('Delete task error:', e); }
  }

  // ── Station actions ─────────────────────────────────────────────────────────
  async function updateStationStatus(id: number, status: string) {
    try {
      setStations(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      await api.updateStation(id, { status });
    } catch (e) { console.error('Update station status error:', e); }
  }

  async function updateStationOwner(id: number, owner: string) {
    try {
      setStations(prev => prev.map(s => s.id === id ? { ...s, owner } : s));
      await api.updateStation(id, { owner });
    } catch (e) { console.error('Update station owner error:', e); }
  }

  async function updateStationField(id: number, updates: Partial<Station>) {
    try {
      setStations(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      await api.updateStation(id, updates);
    } catch (e) { console.error('Update station field error:', e); }
  }

  async function addStation(s: Omit<Station, 'id' | 'created_at'>) {
    try {
      const created = await api.createStation(s);
      setStations(prev => [...prev, created]);
    } catch (e) { console.error('Add station error:', e); }
  }

  async function deleteStation(id: number) {
    try {
      setStations(prev => prev.filter(s => s.id !== id));
      await api.deleteStation(id);
    } catch (e) { console.error('Delete station error:', e); }
  }

  // ── Forum actions ───────────────────────────────────────────────────────────
  async function addForumPost(post: Omit<ForumPost, 'id' | 'created_at'>) {
    try {
      const created = await api.createForumPost(post);
      setForum(prev => [created, ...prev]);
      // System notification in CR8W Chat
      const authorLabel = post.author ? post.author.charAt(0).toUpperCase() + post.author.slice(1) : 'Someone';
      sendSystemMessage(`[UPDATE] \u{1F4AC} ${authorLabel} dropped a new post in The Well${post.tag ? ` [${post.tag}]` : ''}`);
    } catch (e) { console.error('Add forum post error:', e); }
  }

  async function deleteForumPost(id: number) {
    try {
      setForum(prev => prev.filter(p => p.id !== id));
      await api.deleteForumPost(id);
    } catch (e) { console.error('Delete forum post error:', e); }
  }

  async function updateForumPost(id: number, updates: Partial<ForumPost>) {
    try {
      setForum(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      const updated = await api.updateForumPost(id, updates);
      setForum(prev => prev.map(p => p.id === id ? updated : p));
      const authorLabel = updates.author || forum.find(p => p.id === id)?.author || 'Someone';
      const label = authorLabel.charAt(0).toUpperCase() + authorLabel.slice(1);
      sendSystemMessage(`[UPDATE] ✏️ ${label} edited a post in The Well`);
    } catch (e) { console.error('Update forum post error:', e); }
  }

  // ── Forum reply actions ────────────────────────────────────────────────────
  async function addForumReply(postId: number, reply: { author: string; content: string }) {
    const tempId = -Date.now();
    const optimistic: ForumReply = { id: tempId, postId, author: reply.author, content: reply.content, created_at: new Date().toISOString() };
    setForumReplies(prev => [...prev, optimistic]);
    try {
      const created = await api.createForumReply(postId, reply);
      setForumReplies(prev => prev.map(r => r.id === tempId ? { ...created, postId } : r));
    } catch (e) {
      console.error('Add forum reply error:', e);
      setForumReplies(prev => prev.filter(r => r.id !== tempId));
    }
  }

  async function deleteForumReply(replyId: number) {
    try {
      setForumReplies(prev => prev.filter(r => r.id !== replyId));
      await api.deleteForumReply(replyId);
    } catch (e) { console.error('Delete forum reply error:', e); }
  }

  // ── Message actions ─────────────────────────────────────────────────────────
  async function sendMessage(msg: Omit<Message, 'id' | 'created_at'>) {
    // Optimistic UI: show message instantly with temp id, then replace on server confirm
    const tempId = -Date.now();
    const optimistic: Message = { ...msg, id: tempId, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    try {
      const created = await api.sendMessage(msg);
      setMessages(prev => prev.map(m => m.id === tempId ? created : m));
    } catch (e) {
      console.error('Send message error:', e);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  async function deleteMessage(id: number) {
    try {
      setMessages(prev => prev.filter(m => m.id !== id));
      await api.deleteMessage(id);
    } catch (e) { console.error('Delete message error:', e); }
  }

  async function updateMessage(id: number, content: string) {
    try {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m));
      await api.updateMessage(id, { content, edited: true });
    } catch (e) { console.error('Update message error:', e); }
  }

  async function updateMessageFields(id: number, fields: Partial<Message>) {
    try {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
      await api.updateMessage(id, fields);
    } catch (e) { console.error('Update message fields error:', e); }
  }

  // ── Brain dump actions ──────────────────────────────────────────────────────
  async function addBrainDump(dump: Omit<BrainDump, 'id' | 'created_at'>) {
    try {
      const created = await api.createBrainDump(dump);
      setBrainDumps(prev => [created, ...prev]);
    } catch (e) { console.error('Add brain dump error:', e); }
  }

  async function deleteBrainDump(id: number) {
    try {
      setBrainDumps(prev => prev.filter(d => d.id !== id));
      await api.deleteBrainDump(id);
    } catch (e) { console.error('Delete brain dump error:', e); }
  }

  // ── Announcement actions ────────────────────────────────────────────────────
  async function dismissAnnouncement(id: number) {
    try {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      await api.deleteAnnouncement(id);
    } catch (e) { console.error('Dismiss announcement error:', e); }
  }

  async function addAnnouncement() {
    const text = prompt('New announcement:');
    if (!text) return;
    const priority = (prompt('Priority (high, medium, low):') || 'high') as Announcement['priority'];
    try {
      const created = await api.createAnnouncement({ text, priority, active: 1 });
      setAnnouncements(prev => [created, ...prev]);
    } catch (e) { console.error('Add announcement error:', e); }
  }

  // ── Legacy compat (PersonView uses NoteItem/MomentumItem shapes) ───────────
  const forumNotesForPerson = forum.map(f => ({ id: f.id, author: f.author, content: f.content, created_at: f.created_at }));
  const momentumItems: any[] = [];

  function addNote(content: string, author: string) {
    addForumPost({ author, content });
  }

  function addMomentum(content: string, person: string) {
    // stored locally only (momentum is person-specific UX)
  }

  // ── Workshop actions ────────────────────────────────────────────────────────
  const WELLSHOP_TAG_MAP: Record<string, string[]> = {
    wellshop: ['wellshop', 'reflection', 'grounding', 'journaling', 'inner', 'nurture', 'decomprocess'],
    expresshop: ['expresshop', 'expression', 'sharing', 'presenting', 'pitching', 'storytelling', 'outer'],
    playshop: ['playshop', 'play', 'creative', 'show-and-tell', 'experiment', 'fun'],
  };

  function workshopMatchesCategory(w: Workshop, categoryKey: string): boolean {
    const keywords = WELLSHOP_TAG_MAP[categoryKey] || [];
    const titleLower = w.title.toLowerCase();
    const descLower = w.description.toLowerCase();
    const tagSet = (w.tags || []).map(t => t.toLowerCase());
    return keywords.some(kw => tagSet.includes(kw) || titleLower.includes(kw) || descLower.includes(kw));
  }

  async function addWorkshop(w: Omit<Workshop, 'id' | 'created_at'>) {
    try {
      const created = await api.createWorkshop(w);
      setWorkshops(prev => [...prev, created]);
      // Check wellshop notify subscriptions and send system messages
      for (const catKey of ['wellshop', 'expresshop', 'playshop']) {
        if (localStorage.getItem(`wellshop_notify_${catKey}`) === '1' && workshopMatchesCategory(created, catKey)) {
          sendSystemMessage(`🔔 a new ${catKey} just got scheduled: "${created.title}" — you asked to be notified!`);
          break; // only one notification per workshop creation
        }
      }
    } catch (e) { console.error('Add workshop error:', e); }
  }

  async function updateWorkshop(id: number, updates: Partial<Workshop>) {
    try {
      setWorkshops(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
      await api.updateWorkshop(id, updates);
    } catch (e) { console.error('Update workshop error:', e); }
  }

  async function deleteWorkshop(id: number) {
    try {
      setWorkshops(prev => prev.filter(w => w.id !== id));
      await api.deleteWorkshop(id);
    } catch (e) { console.error('Delete workshop error:', e); }
  }

  async function addWorkshopProgram(p: Omit<WorkshopProgram, 'id' | 'created_at'>) {
    try {
      const created = await api.createWorkshopProgram(p);
      setWorkshopPrograms(prev => [...prev, created]);
    } catch (e) { console.error('Add workshop program error:', e); }
  }

  async function updateWorkshopProgram(id: number, updates: Partial<WorkshopProgram>) {
    try {
      setWorkshopPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      await api.updateWorkshopProgram(id, updates);
    } catch (e) { console.error('Update workshop program error:', e); }
  }

  async function deleteWorkshopProgram(id: number) {
    try {
      setWorkshopPrograms(prev => prev.filter(p => p.id !== id));
      await api.deleteWorkshopProgram(id);
    } catch (e) { console.error('Delete workshop program error:', e); }
  }

  async function addWorkshopResource(r: Omit<WorkshopResource, 'id' | 'created_at'>) {
    try {
      const created = await api.createWorkshopResource(r);
      setWorkshopResources(prev => [...prev, created]);
    } catch (e) { console.error('Add workshop resource error:', e); }
  }

  async function deleteWorkshopResource(id: number) {
    try {
      setWorkshopResources(prev => prev.filter(r => r.id !== id));
      await api.deleteWorkshopResource(id);
    } catch (e) { console.error('Delete workshop resource error:', e); }
  }

  // ── CoFlow actions ──────────────────────────────────────────────────────────
  async function addCoFlowDate(d: Omit<CoFlowDate, 'id' | 'created_at'>) {
    try {
      const created = await api.createCoFlowDate(d);
      setCoFlowDates(prev => [...prev, created]);
      // System notification in CR8W Chat
      const hostLabel = d.host ? capitalize(d.host) : 'Someone';
      const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const timeStr = d.startTime && d.endTime ? `${d.startTime} – ${d.endTime}` : d.timeRange || 'TBD';
      sendSystemMessage(`[UPDATE] \u{1F5D3}\uFE0F New behind h0es doors scheduled! ${dateLabel} · ${timeStr} · ${d.location || 'TBD'}${d.host ? ` · Hosted by ${hostLabel}` : ''}${d.theme ? ` · "${d.theme}"` : ''}`);
    } catch (e) { console.error('Add coflow date error:', e); }
  }

  async function updateCoFlowDate(id: number, updates: Partial<CoFlowDate>) {
    try {
      const prev = coFlowDates.find(d => d.id === id);
      setCoFlowDates(p => p.map(d => d.id === id ? { ...d, ...updates } : d));
      await api.updateCoFlowDate(id, updates);
      // Notify on significant edits (date, time, location, status changes)
      if (prev && (updates.date || updates.startTime || updates.endTime || updates.location || updates.host || updates.theme) && updates.status !== 'archived') {
        const dateLabel = new Date((updates.date || prev.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        sendSystemMessage(`[UPDATE] \u270F\uFE0F behind h0es doors updated → ${dateLabel} · ${updates.location || prev.location || 'TBD'}`);
      }
      if (updates.status === 'archived' && prev) {
        const dateLabel = new Date(prev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        sendSystemMessage(`[UPDATE] \u{1F4DA} behind h0es doors (${dateLabel}) has been archived. Check the Archive tab for recap.`);
      }
    } catch (e) { console.error('Update coflow date error:', e); }
  }

  async function deleteCoFlowDate(id: number) {
    try {
      const d8 = coFlowDates.find(d => d.id === id);
      setCoFlowDates(prev => prev.filter(d => d.id !== id));
      await api.deleteCoFlowDate(id);
      // System notification
      if (d8) {
        const dateLabel = new Date(d8.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        sendSystemMessage(`[UPDATE] \u274C behind h0es doors on ${dateLabel} has been cancelled.`);
      }
    } catch (e) { console.error('Delete coflow date error:', e); }
  }

  async function addCoFlowCheckin(c: Omit<CoFlowCheckin, 'id' | 'created_at'>) {
    try {
      const created = await api.createCoFlowCheckin(c);
      setCoFlowCheckins(prev => [...prev, created]);
      // System notification in CR8W Chat
      const authorLabel = c.author ? c.author.charAt(0).toUpperCase() + c.author.slice(1) : 'Someone';
      const moodEmojis: Record<string, string> = { fire: '\u{1F525}', sun: '\u2600\uFE0F', cloud: '\u2601\uFE0F', rain: '\u{1F327}\uFE0F', storm: '\u26C8\uFE0F' };
      const moodStr = c.mood && moodEmojis[c.mood] ? ` ${moodEmojis[c.mood]}` : '';
      const agendaCount = c.agendaItems?.length || 0;
      sendSystemMessage(`[UPDATE] \u2705 ${authorLabel} dropped a PlayD8s check-in${moodStr}${agendaCount > 0 ? ` with ${agendaCount} agenda item${agendaCount > 1 ? 's' : ''}` : ''}. ${c.confirmTime ? 'Time confirmed \u2713' : 'Time needs adjusting \u26A0\uFE0F'}`);
    } catch (e) { console.error('Add coflow checkin error:', e); }
  }

  async function deleteCoFlowCheckin(id: number) {
    try {
      setCoFlowCheckins(prev => prev.filter(c => c.id !== id));
      await api.deleteCoFlowCheckin(id);
    } catch (e) { console.error('Delete coflow checkin error:', e); }
  }

  // ── Well notes actions ──────────────────────────────────────────────────────
  async function addWellNote(content: string) {
    try {
      const created = await api.createWellNote({ content });
      setWellNotes(prev => [...prev, created]);
      // Send system notification to CR8W Chat
      sendSystemMessage('💧 someone dropped a note in the well — pull from the spring to find it');
    } catch (e) { console.error('Add well note error:', e); }
  }

  async function landWellNote(id: number) {
    try {
      const note = wellNotes.find(n => n.id === id);
      if (!note) return;
      const updated = await api.updateWellNote(id, { landed: (note.landed || 0) + 1 });
      setWellNotes(prev => prev.map(n => n.id === id ? updated : n));
    } catch (e) { console.error('Land well note error:', e); }
  }

  // Show login gate until authenticated
  if (!authed) {
    return <LoginGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="cr8w-app" style={{ paddingBottom: '20px' }}>
      <TopNav currentView={currentView} onNavigate={navigate} syncStatus={syncStatus} />

      {/* Domain setup banner — only on non-custom-domain URLs */}
      {showDomainBanner && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(123,168,157,0.12) 0%, rgba(184,169,212,0.08) 100%)',
          border: '1px solid rgba(123,168,157,0.2)',
          color: 'var(--text-primary, #EAE3DB)',
          textAlign: 'center',
          fontSize: '0.78rem',
          padding: '8px 40px 8px 12px',
          fontFamily: 'var(--font-label, Montserrat, sans-serif)',
          letterSpacing: '0.01em',
          lineHeight: 1.5,
          position: 'relative',
        }}>
          🔧 Custom domain is setting up — you're viewing via the direct link. Bookmark this page!
          <button
            onClick={() => {
              setShowDomainBanner(false);
              sessionStorage.setItem('cr8w_domain_banner_dismissed', 'true');
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #8A7D72)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '2px 4px',
            }}
            title="Dismiss"
          >×</button>
        </div>
      )}

      {/* Sync indicator */}
      {syncStatus === 'error' && (
        <div style={{
          background: '#7A3A28', color: '#FFDEC2', textAlign: 'center',
          fontSize: '0.73rem', padding: '7px 12px', fontFamily: 'var(--font-label)',
          letterSpacing: '0.02em', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span>⚠ Server unreachable — the Supabase edge function may be down or paused.</span>
          <span style={{ opacity: 0.7 }}>|</span>
          <button
            onClick={() => fetchSyncRef.current?.(false)}
            style={{ background: 'rgba(255,222,194,0.2)', border: '1px solid rgba(255,222,194,0.4)', color: '#FFDEC2', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', borderRadius: 4, padding: '2px 8px' }}
          >
            Retry now
          </button>
          <a
            href="https://status.supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFDEC2', fontSize: 'inherit', fontFamily: 'inherit', opacity: 0.75 }}
          >
            Supabase status ↗
          </a>
        </div>
      )}

      <main className="cr-main">
        {!dataLoaded && (
          <div className="loading-skeleton">
            <div className="skeleton-bar" style={{ width: '60%', height: 32, marginBottom: 16 }} />
            <div className="skeleton-bar" style={{ width: '40%', height: 80, marginBottom: 20 }} />
            <div className="skeleton-bar" style={{ width: '100%', height: 120, marginBottom: 12 }} />
            <div className="skeleton-bar" style={{ width: '100%', height: 80, marginBottom: 12 }} />
            <div className="skeleton-bar" style={{ width: '90%', height: 60 }} />
          </div>
        )}
        {dataLoaded && currentView === 'hub' && (
          <HubView
            onNavigate={navigate}
            onNavigateGeyserStations={navigateGeyserStations}
            announcements={announcements}
            brainDumps={brainDumps}
            onAddBrainDump={addBrainDump}
            onDeleteBrainDump={deleteBrainDump}
            syncTime={syncTime}
            activeUser={chatActiveUser}
            wellNotes={wellNotes}
            onAddWellNote={addWellNote}
            onLandWellNote={landWellNote}
            workshops={workshops}
            coFlowDates={coFlowDates}
            coFlowCheckins={coFlowCheckins}
            actionItems={actionItems}
            stations={stations}
          />
        )}

        {dataLoaded && currentView === 'geyser' && (
          <GeyserView
            onNavigate={navigate}
            actionItems={actionItems}
            stations={stations}
            announcements={announcements}
            wellNotes={forumNotesForPerson}
            forum={forum}
            forumReplies={forumReplies}
            defaultTab={geyserDefaultTab}
            onAddTask={() => setShowAddTaskModal(true)}
            onUpdateTaskStatus={updateTaskStatus}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onDismissAnnouncement={dismissAnnouncement}
            onAddAnnouncement={addAnnouncement}
            onAddNote={addNote}
            onAddForumPost={addForumPost}
            onUpdateForumPost={updateForumPost}
            onDeleteForumPost={deleteForumPost}
            onAddForumReply={addForumReply}
            onDeleteForumReply={deleteForumReply}
            onUpdateStationStatus={updateStationStatus}
            onUpdateStationOwner={updateStationOwner}
            onUpdateStationField={updateStationField}
            onAddStation={addStation}
            onDeleteStation={deleteStation}
          />
        )}

        {dataLoaded && currentView === 'workshops' && (
          <WorkshopsView
            workshops={workshops}
            programs={workshopPrograms}
            resources={workshopResources}
            onAddWorkshop={addWorkshop}
            onUpdateWorkshop={updateWorkshop}
            onDeleteWorkshop={deleteWorkshop}
            onAddProgram={addWorkshopProgram}
            onUpdateProgram={updateWorkshopProgram}
            onDeleteProgram={deleteWorkshopProgram}
            onAddResource={addWorkshopResource}
            onDeleteResource={deleteWorkshopResource}
          />
        )}

        {dataLoaded && currentView === 'coflow' && (
          <CoFlowD8sView
            coflowDates={coFlowDates}
            coflowCheckins={coFlowCheckins}
            onAddCoFlowDate={addCoFlowDate}
            onUpdateCoFlowDate={updateCoFlowDate}
            onDeleteCoFlowDate={deleteCoFlowDate}
            onAddCoFlowCheckin={addCoFlowCheckin}
            onDeleteCoFlowCheckin={deleteCoFlowCheckin}
          />
        )}

        {dataLoaded && currentView === 'playground' && (
          <PlaygroundView />
        )}

        {dataLoaded && PERSON_VIEWS.includes(currentView) && (
          <PersonView
            key={currentView}
            person={currentView}
            onNavigate={navigate}
            actionItems={actionItems}
            momentumItems={momentumItems}
            wellNotes={forumNotesForPerson}
            stations={stations}
            onAddTask={() => setShowAddTaskModal(true)}
            onUpdateTaskStatus={updateTaskStatus}
            onAddMomentum={addMomentum}
            onAddNote={addNote}
          />
        )}
      </main>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          currentPerson={currentPerson}
          onAdd={addTask}
          onClose={() => setShowAddTaskModal(false)}
        />
      )}

      {/* iMessage-style Chat Drawer */}
      <MessageDrawer
        messages={messages}
        onSend={sendMessage}
        onDelete={deleteMessage}
        onUpdate={updateMessage}
        onUpdateFields={updateMessageFields}
        onNavigateToForum={navigateGeyserForum}
        onNavigateToGeyser={() => navigate('geyser')}
        onNavigateToStations={navigateGeyserStations}
        onNavigateToPlayD8s={() => navigate('coflow')}
        activeAs={chatActiveUser}
        onSetActiveAs={setChatActiveUser}
        onAddWellNote={addWellNote}
      />

      {/* Scroll to Top */}
      <button
        className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Back to top"
        style={{ bottom: '84px', left: '20px', right: 'auto' }}
      >↑</button>

      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          activeUser={chatActiveUser}
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      {/* Decomprocessing FAB */}
      <DecomprocessFAB />
      <ToastContainer />
    </div>
  );
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}