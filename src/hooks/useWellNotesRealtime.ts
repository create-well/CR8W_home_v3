import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Realtime WellNote. Field names match the legacy KV shape (src/api.ts
// `WellNote`) except `id`, which is a uuid string on the new table.
// The legacy /well-notes server routes stay intact as the rollback path.
export interface SbWellNote {
  id: string;
  content: string;
  landed: number;
  created_at: string;
}

function mapNote(row: any): SbWellNote {
  return {
    id: row.id,
    content: row.content || '',
    landed: row.landed || 0,
    created_at: row.created_at,
  };
}

export function useWellNotesRealtime() {
  const [notes, setNotes] = useState<SbWellNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ascending order matches the legacy KV list (append-only, oldest first),
  // so HubView slice(0, 3) and WellView rendering keep their current behavior.
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('well_notes')
        .select('*')
        .order('created_at', { ascending: true });
      if (err) throw err;
      setNotes((data || []).map(mapNote));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load well notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('well-notes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'well_notes' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addNote = useCallback(async (content: string) => {
    const { data, error } = await supabase.from('well_notes').insert({
      content,
    }).select().single();
    if (error) throw error;
    setNotes(prev => [...prev, mapNote(data)]);
    return mapNote(data);
  }, []);

  const landNote = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const landed = note.landed + 1;
    const { error } = await supabase.from('well_notes').update({ landed }).eq('id', id);
    if (error) throw error;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, landed } : n));
  }, [notes]);

  return { notes, loading, error, addNote, landNote };
}
