import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SbRevenueOp {
  id: string;
  orgName: string;
  contactName?: string;
  contactEmail?: string;
  type: 'sponsor' | 'grant' | 'donation' | 'merch' | 'ticket' | 'other';
  stage: 'prospect' | 'pitched' | 'negotiating' | 'closed-won' | 'closed-lost' | 'paused';
  amount?: number;
  currency: string;
  expectedClose?: string;
  actualClose?: string;
  notes: string;
  linkedPodcastEpisode?: string;
  linkedWorkshopId?: number;
  owner: string;
  created_at: string;
}

function mapRevenueOp(row: any): SbRevenueOp {
  return {
    id: row.id,
    orgName: row.org_name || '',
    contactName: row.contact_name || undefined,
    contactEmail: row.contact_email || undefined,
    type: row.type || 'other',
    stage: row.stage || 'prospect',
    amount: row.amount ? parseFloat(row.amount) : undefined,
    currency: row.currency || 'USD',
    expectedClose: row.expected_close || undefined,
    actualClose: row.actual_close || undefined,
    notes: row.notes || '',
    linkedPodcastEpisode: row.linked_podcast_episode || undefined,
    linkedWorkshopId: row.linked_workshop_id || undefined,
    owner: row.owner || '',
    created_at: row.created_at,
  };
}

export function useRevenueRealtime() {
  const [ops, setOps] = useState<SbRevenueOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('revenue_ops')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setOps((data || []).map(mapRevenueOp));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load revenue ops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('revenue-ops-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_ops' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addOp = useCallback(async (o: Omit<SbRevenueOp, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('revenue_ops').insert({
      org_name: o.orgName,
      contact_name: o.contactName,
      contact_email: o.contactEmail,
      type: o.type,
      stage: o.stage,
      amount: o.amount,
      currency: o.currency,
      expected_close: o.expectedClose,
      actual_close: o.actualClose,
      notes: o.notes,
      linked_podcast_episode: o.linkedPodcastEpisode,
      linked_workshop_id: o.linkedWorkshopId,
      owner: o.owner,
    }).select().single();
    if (error) throw error;
    setOps(prev => [mapRevenueOp(data), ...prev]);
    return mapRevenueOp(data);
  }, []);

  const updateOp = useCallback(async (id: string, updates: Partial<SbRevenueOp>) => {
    const payload: any = {};
    if (updates.orgName !== undefined) payload.org_name = updates.orgName;
    if (updates.contactName !== undefined) payload.contact_name = updates.contactName;
    if (updates.contactEmail !== undefined) payload.contact_email = updates.contactEmail;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.stage !== undefined) payload.stage = updates.stage;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.expectedClose !== undefined) payload.expected_close = updates.expectedClose;
    if (updates.actualClose !== undefined) payload.actual_close = updates.actualClose;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.linkedPodcastEpisode !== undefined) payload.linked_podcast_episode = updates.linkedPodcastEpisode;
    if (updates.linkedWorkshopId !== undefined) payload.linked_workshop_id = updates.linkedWorkshopId;
    if (updates.owner !== undefined) payload.owner = updates.owner;

    const { error } = await supabase.from('revenue_ops').update(payload).eq('id', id);
    if (error) throw error;
    setOps(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  const deleteOp = useCallback(async (id: string) => {
    const { error } = await supabase.from('revenue_ops').delete().eq('id', id);
    if (error) throw error;
    setOps(prev => prev.filter(o => o.id !== id));
  }, []);

  return { ops, loading, error, addOp, updateOp, deleteOp };
}
