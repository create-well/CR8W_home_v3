import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SbWorkshop {
  id: string;
  title: string;
  description: string;
  workshopDate: string;
  workshopTime: string;
  location: string;
  capacity: number;
  attendees: number;
  status: string;
  createdBy: string;
  created_at: string;
}

export interface SbApplicant {
  id: string;
  fullName: string;
  email: string;
  workshopId: string | null;
  status: string;
  applicationData: Record<string, any>;
  created_at: string;
}

function mapWorkshop(row: any): SbWorkshop {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    workshopDate: row.workshop_date || '',
    workshopTime: row.workshop_time || '',
    location: row.location || '',
    capacity: row.capacity || 0,
    attendees: row.attendees || 0,
    status: row.status || 'planning',
    createdBy: row.created_by || '',
    created_at: row.created_at,
  };
}

function mapApplicant(row: any): SbApplicant {
  return {
    id: row.id,
    fullName: row.full_name || '',
    email: row.email || '',
    workshopId: row.workshop_id || null,
    status: row.status || 'applied',
    applicationData: row.application_data || {},
    created_at: row.created_at,
  };
}

export function useWorkshopRealtime() {
  const [workshops, setWorkshops] = useState<SbWorkshop[]>([]);
  const [applicants, setApplicants] = useState<SbApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [wRes, aRes] = await Promise.all([
        supabase.from('workshops').select('*').order('workshop_date', { ascending: true }),
        supabase.from('applicants').select('*').order('created_at', { ascending: false }),
      ]);
      if (wRes.error) throw wRes.error;
      if (aRes.error) throw aRes.error;
      setWorkshops((wRes.data || []).map(mapWorkshop));
      setApplicants((aRes.data || []).map(mapApplicant));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load workshops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const wsChannel = supabase
      .channel('workshops-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshops' }, () => fetchAll())
      .subscribe();
    const appChannel = supabase
      .channel('applicants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, () => fetchAll())
      .subscribe();
    return () => {
      wsChannel.unsubscribe();
      appChannel.unsubscribe();
    };
  }, [fetchAll]);

  // ── Workshop CRUD ────────────────────────────────────────────────────────────
  const addWorkshop = useCallback(async (w: Omit<SbWorkshop, 'id' | 'created_at' | 'attendees' | 'createdBy'>) => {
    const { data, error } = await supabase.from('workshops').insert({
      title: w.title,
      description: w.description,
      workshop_date: w.workshopDate,
      workshop_time: w.workshopTime,
      location: w.location,
      capacity: w.capacity,
      status: w.status,
    }).select().single();
    if (error) throw error;
    setWorkshops(prev => [...prev, mapWorkshop(data)]);
    return mapWorkshop(data);
  }, []);

  const updateWorkshop = useCallback(async (id: string, updates: Partial<SbWorkshop>) => {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.workshopDate !== undefined) payload.workshop_date = updates.workshopDate;
    if (updates.workshopTime !== undefined) payload.workshop_time = updates.workshopTime;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.capacity !== undefined) payload.capacity = updates.capacity;
    if (updates.attendees !== undefined) payload.attendees = updates.attendees;
    if (updates.status !== undefined) payload.status = updates.status;

    const { error } = await supabase.from('workshops').update(payload).eq('id', id);
    if (error) throw error;
    setWorkshops(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const deleteWorkshop = useCallback(async (id: string) => {
    const { error } = await supabase.from('workshops').delete().eq('id', id);
    if (error) throw error;
    setWorkshops(prev => prev.filter(w => w.id !== id));
  }, []);

  // ── Applicant CRUD ───────────────────────────────────────────────────────────
  const addApplicant = useCallback(async (a: Omit<SbApplicant, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('applicants').insert({
      full_name: a.fullName,
      email: a.email,
      workshop_id: a.workshopId,
      status: a.status,
      application_data: a.applicationData,
    }).select().single();
    if (error) throw error;
    setApplicants(prev => [mapApplicant(data), ...prev]);
    return mapApplicant(data);
  }, []);

  const updateApplicant = useCallback(async (id: string, updates: Partial<SbApplicant>) => {
    const payload: any = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.workshopId !== undefined) payload.workshop_id = updates.workshopId;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.applicationData !== undefined) payload.application_data = updates.applicationData;

    const { error } = await supabase.from('applicants').update(payload).eq('id', id);
    if (error) throw error;
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteApplicant = useCallback(async (id: string) => {
    const { error } = await supabase.from('applicants').delete().eq('id', id);
    if (error) throw error;
    setApplicants(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    workshops,
    applicants,
    loading,
    error,
    addWorkshop,
    updateWorkshop,
    deleteWorkshop,
    addApplicant,
    updateApplicant,
    deleteApplicant,
  };
}
