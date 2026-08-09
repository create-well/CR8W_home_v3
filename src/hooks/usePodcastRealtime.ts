import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Episode, Guest, TopicDrop } from '../api';

// Map Supabase snake_case → frontend camelCase
function mapEpisode(row: any): Episode {
  return {
    id: row.id,
    episodeNum: row.episode_num || 0,
    topic: row.topic || row.title || '',
    recordingDate: row.recording_date || row.scheduled_date || '',
    movedToFriday: row.moved_to_friday || false,
    roles: row.roles || {},
    guestId: row.guest_id || undefined,
    status: row.status || 'drops open',
    rawAudioLink: row.raw_audio_link || '',
    finalLength: row.final_length || 0,
    clipsCount: row.clips_count || 0,
    substackSnippet: row.substack_snippet || false,
    publishDate: row.publish_date || row.published_date || '',
    gearIssues: row.gear_issues || '',
    decomprocessingNotes: row.decomprocessing_notes || row.notes || '',
    created_at: row.created_at,
  };
}

function mapGuest(row: any): Guest {
  return {
    id: row.id,
    name: row.name || '',
    contact: row.contact || row.email || '',
    connectionType: row.connection_type || 'community member',
    episodeNum: row.episode_num || undefined,
    recordingDate: row.recording_date || '',
    topicSent: row.topic_sent || false,
    topicSentDate: row.topic_sent_date || '',
    prepStatus: row.prep_status || '',
    micTimeNotes: row.mic_time_notes || '',
    thanked: row.thanked || false,
    stage: row.stage || row.flow_status || 'aligned',
    created_at: row.created_at,
  };
}

function mapTopicDrop(row: any): TopicDrop {
  return {
    id: row.id,
    text: row.text || '',
    dropper: row.dropper || null,
    weekId: row.week_id || undefined,
    candidate: row.candidate || false,
    whyLanded: row.why_landed || '',
    gut: row.gut || null,
    voteCount: row.vote_count || 0,
    locked: row.locked || false,
    created_at: row.created_at,
  };
}

export function usePodcastRealtime() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [topicDrops, setTopicDrops] = useState<TopicDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch initial data ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [epRes, gRes, tdRes] = await Promise.all([
        supabase.from('episodes').select('*').order('episode_num', { ascending: false }),
        supabase.from('guests').select('*').order('created_at', { ascending: false }),
        supabase.from('topic_drops').select('*').order('created_at', { ascending: false }),
      ]);
      if (epRes.error) throw epRes.error;
      if (gRes.error) throw gRes.error;
      if (tdRes.error) throw tdRes.error;
      setEpisodes((epRes.data || []).map(mapEpisode));
      setGuests((gRes.data || []).map(mapGuest));
      setTopicDrops((tdRes.data || []).map(mapTopicDrop));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load podcast data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Real-time subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const episodeChannel = supabase
      .channel('episodes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'episodes' }, () => {
        fetchAll();
      })
      .subscribe();

    const guestChannel = supabase
      .channel('guests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => {
        fetchAll();
      })
      .subscribe();

    const dropsChannel = supabase
      .channel('topic-drops-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topic_drops' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      episodeChannel.unsubscribe();
      guestChannel.unsubscribe();
      dropsChannel.unsubscribe();
    };
  }, [fetchAll]);

  // ── CRUD helpers ─────────────────────────────────────────────────────────────
  const addEpisode = useCallback(async (e: Omit<Episode, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('episodes').insert({
      episode_num: e.episodeNum,
      title: e.topic,
      topic: e.topic,
      recording_date: e.recordingDate,
      moved_to_friday: e.movedToFriday,
      roles: e.roles,
      guest_id: e.guestId,
      status: e.status,
      raw_audio_link: e.rawAudioLink,
      final_length: e.finalLength,
      clips_count: e.clipsCount,
      substack_snippet: e.substackSnippet,
      publish_date: e.publishDate,
      gear_issues: e.gearIssues,
      decomprocessing_notes: e.decomprocessingNotes,
    }).select().single();
    if (error) throw error;
    setEpisodes(prev => [mapEpisode(data), ...prev]);
    return mapEpisode(data);
  }, []);

  const updateEpisode = useCallback(async (id: string, updates: Partial<Episode>) => {
    const payload: any = {};
    if (updates.episodeNum !== undefined) payload.episode_num = updates.episodeNum;
    if (updates.topic !== undefined) { payload.topic = updates.topic; payload.title = updates.topic; }
    if (updates.recordingDate !== undefined) payload.recording_date = updates.recordingDate;
    if (updates.movedToFriday !== undefined) payload.moved_to_friday = updates.movedToFriday;
    if (updates.roles !== undefined) payload.roles = updates.roles;
    if (updates.guestId !== undefined) payload.guest_id = updates.guestId;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.rawAudioLink !== undefined) payload.raw_audio_link = updates.rawAudioLink;
    if (updates.finalLength !== undefined) payload.final_length = updates.finalLength;
    if (updates.clipsCount !== undefined) payload.clips_count = updates.clipsCount;
    if (updates.substackSnippet !== undefined) payload.substack_snippet = updates.substackSnippet;
    if (updates.publishDate !== undefined) payload.publish_date = updates.publishDate;
    if (updates.gearIssues !== undefined) payload.gear_issues = updates.gearIssues;
    if (updates.decomprocessingNotes !== undefined) payload.decomprocessing_notes = updates.decomprocessingNotes;

    const { error } = await supabase.from('episodes').update(payload).eq('id', id);
    if (error) throw error;
    setEpisodes(prev => prev.map(ep => ep.id === id ? { ...ep, ...updates } : ep));
  }, []);

  const deleteEpisode = useCallback(async (id: string) => {
    const { error } = await supabase.from('episodes').delete().eq('id', id);
    if (error) throw error;
    setEpisodes(prev => prev.filter(ep => ep.id !== id));
  }, []);

  const addGuest = useCallback(async (g: Omit<Guest, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('guests').insert({
      name: g.name,
      email: g.contact,
      contact: g.contact,
      connection_type: g.connectionType,
      episode_num: g.episodeNum,
      recording_date: g.recordingDate,
      topic_sent: g.topicSent,
      topic_sent_date: g.topicSentDate,
      prep_status: g.prepStatus,
      mic_time_notes: g.micTimeNotes,
      thanked: g.thanked,
      stage: g.stage,
      flow_status: g.stage,
    }).select().single();
    if (error) throw error;
    setGuests(prev => [mapGuest(data), ...prev]);
    return mapGuest(data);
  }, []);

  const updateGuest = useCallback(async (id: string, updates: Partial<Guest>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.contact !== undefined) { payload.contact = updates.contact; payload.email = updates.contact; }
    if (updates.connectionType !== undefined) payload.connection_type = updates.connectionType;
    if (updates.episodeNum !== undefined) payload.episode_num = updates.episodeNum;
    if (updates.recordingDate !== undefined) payload.recording_date = updates.recordingDate;
    if (updates.topicSent !== undefined) payload.topic_sent = updates.topicSent;
    if (updates.topicSentDate !== undefined) payload.topic_sent_date = updates.topicSentDate;
    if (updates.prepStatus !== undefined) payload.prep_status = updates.prepStatus;
    if (updates.micTimeNotes !== undefined) payload.mic_time_notes = updates.micTimeNotes;
    if (updates.thanked !== undefined) payload.thanked = updates.thanked;
    if (updates.stage !== undefined) { payload.stage = updates.stage; payload.flow_status = updates.stage; }

    const { error } = await supabase.from('guests').update(payload).eq('id', id);
    if (error) throw error;
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const addTopicDrop = useCallback(async (d: Omit<TopicDrop, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('topic_drops').insert({
      text: d.text,
      dropper: d.dropper,
      candidate: d.candidate,
    }).select().single();
    if (error) throw error;
    setTopicDrops(prev => [mapTopicDrop(data), ...prev]);
    return mapTopicDrop(data);
  }, []);

  const updateTopicDrop = useCallback(async (id: string, updates: Partial<TopicDrop>) => {
    const payload: any = {};
    if (updates.text !== undefined) payload.text = updates.text;
    if (updates.dropper !== undefined) payload.dropper = updates.dropper;
    if (updates.candidate !== undefined) payload.candidate = updates.candidate;
    if (updates.whyLanded !== undefined) payload.why_landed = updates.whyLanded;
    if (updates.gut !== undefined) payload.gut = updates.gut;
    if (updates.voteCount !== undefined) payload.vote_count = updates.voteCount;
    if (updates.locked !== undefined) payload.locked = updates.locked;

    const { error } = await supabase.from('topic_drops').update(payload).eq('id', id);
    if (error) throw error;
    setTopicDrops(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  return {
    episodes,
    guests,
    topicDrops,
    loading,
    error,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    addGuest,
    updateGuest,
    addTopicDrop,
    updateTopicDrop,
  };
}
