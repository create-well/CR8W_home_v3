import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task } from '../api';

function mapTask(row: any): Task {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    assigneeId: row.assignee_id || undefined,
    createdBy: row.created_by || undefined,
    dueDate: row.due_date || undefined,
    tag: row.tag || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useTasksRealtime() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setTasks((data || []).map(mapTask));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addTask = useCallback(async (t: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('tasks').insert({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee_id: t.assigneeId || null,
      created_by: t.createdBy || null,
      due_date: t.dueDate || null,
      tag: t.tag || null,
    }).select().single();
    if (error) throw error;
    setTasks(prev => [mapTask(data), ...prev]);
    return mapTask(data);
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId || null;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
    if (updates.tag !== undefined) payload.tag = updates.tag || null;

    const { error } = await supabase.from('tasks').update(payload).eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return { tasks, loading, error, addTask, updateTask, deleteTask };
}
