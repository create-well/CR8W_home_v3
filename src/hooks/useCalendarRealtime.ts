import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CalendarEventKV } from '../api';

function mapEvent(row: any): CalendarEventKV {
  return {
    id: row.id,
    title: row.title || '',
    start: row.start || '',
    end: row.end || '',
    location: row.location || '',
    description: row.description || '',
    creator: row.creator || '',
    synced_at: row.synced_at,
  };
}

export function useCalendarRealtime() {
  const [events, setEvents] = useState<CalendarEventKV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start', { ascending: true });
      if (err) throw err;
      setEvents((data || []).map(mapEvent));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('calendar-events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addEvent = useCallback(async (e: Omit<CalendarEventKV, 'id' | 'synced_at'>) => {
    const { data, error } = await supabase.from('calendar_events').insert({
      title: e.title,
      start: e.start,
      end: e.end,
      location: e.location,
      description: e.description,
      creator: e.creator,
    }).select().single();
    if (error) throw error;
    setEvents(prev => [...prev, mapEvent(data)].sort((a, b) => a.start.localeCompare(b.start)));
    return mapEvent(data);
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEventKV>) => {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.start !== undefined) payload.start = updates.start;
    if (updates.end !== undefined) payload.end = updates.end;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.creator !== undefined) payload.creator = updates.creator;

    const { error } = await supabase.from('calendar_events').update(payload).eq('id', id);
    if (error) throw error;
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, ...updates } : ev).sort((a, b) => a.start.localeCompare(b.start)));
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
    setEvents(prev => prev.filter(ev => ev.id !== id));
  }, []);

  return { events, loading, error, addEvent, updateEvent, deleteEvent };
}
