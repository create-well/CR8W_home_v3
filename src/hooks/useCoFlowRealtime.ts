import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SbCheckin {
  id: string;
  profileId: string;
  bodyStatus: string;
  creativePulse: string;
  blockers: string;
  needs: string;
  meetingDate: string;
  created_at: string;
}

function mapCheckin(row: any): SbCheckin {
  return {
    id: row.id,
    profileId: row.profile_id || '',
    bodyStatus: row.body_status || '',
    creativePulse: row.creative_pulse || '',
    blockers: row.blockers || '',
    needs: row.needs || '',
    meetingDate: row.meeting_date || '',
    created_at: row.created_at,
  };
}

export function useCoFlowRealtime() {
  const [checkins, setCheckins] = useState<SbCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('coflow_checkins')
        .select('*')
        .order('meeting_date', { ascending: false });
      if (err) throw err;
      setCheckins((data || []).map(mapCheckin));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load check-ins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('coflow-checkins-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coflow_checkins' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addCheckin = useCallback(async (c: Omit<SbCheckin, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('coflow_checkins').insert({
      profile_id: c.profileId,
      body_status: c.bodyStatus,
      creative_pulse: c.creativePulse,
      blockers: c.blockers,
      needs: c.needs,
      meeting_date: c.meetingDate,
    }).select().single();
    if (error) throw error;
    setCheckins(prev => [mapCheckin(data), ...prev]);
    return mapCheckin(data);
  }, []);

  const updateCheckin = useCallback(async (id: string, updates: Partial<SbCheckin>) => {
    const payload: any = {};
    if (updates.profileId !== undefined) payload.profile_id = updates.profileId;
    if (updates.bodyStatus !== undefined) payload.body_status = updates.bodyStatus;
    if (updates.creativePulse !== undefined) payload.creative_pulse = updates.creativePulse;
    if (updates.blockers !== undefined) payload.blockers = updates.blockers;
    if (updates.needs !== undefined) payload.needs = updates.needs;
    if (updates.meetingDate !== undefined) payload.meeting_date = updates.meetingDate;

    const { error } = await supabase.from('coflow_checkins').update(payload).eq('id', id);
    if (error) throw error;
    setCheckins(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCheckin = useCallback(async (id: string) => {
    const { error } = await supabase.from('coflow_checkins').delete().eq('id', id);
    if (error) throw error;
    setCheckins(prev => prev.filter(c => c.id !== id));
  }, []);

  return { checkins, loading, error, addCheckin, updateCheckin, deleteCheckin };
}
