import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type RsvpStatus = 'invited' | 'going' | 'maybe' | 'declined';

export interface SbLead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  eventId: string | null;
  invitedBy: string | null;
  rsvpStatus: RsvpStatus;
  rsvpAt: string | null;
  source: string | null;
  surveyData: Record<string, any>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapLead(row: any): SbLead {
  return {
    id: row.id,
    fullName: row.full_name || '',
    email: row.email || null,
    phone: row.phone || null,
    eventId: row.event_id || null,
    invitedBy: row.invited_by || null,
    rsvpStatus: row.rsvp_status || 'invited',
    rsvpAt: row.rsvp_at || null,
    source: row.source || null,
    surveyData: row.survey_data || {},
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useLeadsRealtime() {
  const [leads, setLeads] = useState<SbLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setLeads((data || []).map(mapLead));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addLead = useCallback(async (l: Omit<SbLead, 'id' | 'created_at' | 'updated_at' | 'rsvpAt' | 'surveyData'> & { rsvpAt?: string | null; surveyData?: Record<string, any> }) => {
    const { data, error } = await supabase.from('leads').insert({
      full_name: l.fullName,
      email: l.email || null,
      phone: l.phone || null,
      event_id: l.eventId || null,
      invited_by: l.invitedBy || null,
      rsvp_status: l.rsvpStatus || 'invited',
      rsvp_at: l.rsvpAt ?? (l.rsvpStatus && l.rsvpStatus !== 'invited' ? new Date().toISOString() : null),
      source: l.source || null,
      survey_data: l.surveyData || {},
      notes: l.notes || null,
    }).select().single();
    if (error) throw error;
    setLeads(prev => [mapLead(data), ...prev]);
    return mapLead(data);
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<SbLead>) => {
    const payload: any = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.eventId !== undefined) payload.event_id = updates.eventId;
    if (updates.invitedBy !== undefined) payload.invited_by = updates.invitedBy;
    if (updates.rsvpStatus !== undefined) {
      payload.rsvp_status = updates.rsvpStatus;
      payload.rsvp_at = updates.rsvpAt ?? new Date().toISOString();
    }
    if (updates.rsvpAt !== undefined) payload.rsvp_at = updates.rsvpAt;
    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.surveyData !== undefined) payload.survey_data = updates.surveyData;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) throw error;
    setLeads(prev => prev.map(l => l.id === id
      ? { ...l, ...updates, rsvpAt: payload.rsvp_at !== undefined ? payload.rsvp_at : l.rsvpAt }
      : l));
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  return { leads, loading, error, addLead, updateLead, deleteLead };
}
