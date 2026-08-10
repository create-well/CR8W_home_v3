import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SbWorkshopFeedback {
  id: string;
  workshopId: string;
  applicantId: string | null;
  submittedBy: string;
  feedbackType: 'attendee' | 'facilitator' | 'ops';
  overallRating: number | null;
  contentRating: number | null;
  facilitationRating: number | null;
  venueRating: number | null;
  bodyBefore: string | null;
  bodyAfter: string | null;
  energyShift: string | null;
  whatResonated: string | null;
  whatFellFlat: string | null;
  creativeBreakthrough: string | null;
  arrivedOnTime: boolean | null;
  stayedFullDuration: boolean | null;
  wouldReturn: boolean | null;
  wouldRecommend: boolean | null;
  notes: string | null;
  created_at: string;
}

function mapFeedback(row: any): SbWorkshopFeedback {
  return {
    id: row.id,
    workshopId: row.workshop_id || '',
    applicantId: row.applicant_id || null,
    submittedBy: row.submitted_by || 'anonymous',
    feedbackType: row.feedback_type || 'attendee',
    overallRating: row.overall_rating ?? null,
    contentRating: row.content_rating ?? null,
    facilitationRating: row.facilitation_rating ?? null,
    venueRating: row.venue_rating ?? null,
    bodyBefore: row.body_before || null,
    bodyAfter: row.body_after || null,
    energyShift: row.energy_shift || null,
    whatResonated: row.what_resonated || null,
    whatFellFlat: row.what_fell_flat || null,
    creativeBreakthrough: row.creative_breakthrough || null,
    arrivedOnTime: row.arrived_on_time ?? null,
    stayedFullDuration: row.stayed_full_duration ?? null,
    wouldReturn: row.would_return ?? null,
    wouldRecommend: row.would_recommend ?? null,
    notes: row.notes || null,
    created_at: row.created_at,
  };
}

export function useWorkshopFeedbackRealtime() {
  const [feedback, setFeedback] = useState<SbWorkshopFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workshop_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFeedback((data || []).map(mapFeedback));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('workshop-feedback-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_feedback' }, () => fetchAll())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  const addFeedback = useCallback(async (f: Omit<SbWorkshopFeedback, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('workshop_feedback').insert({
      workshop_id: f.workshopId,
      applicant_id: f.applicantId,
      submitted_by: f.submittedBy,
      feedback_type: f.feedbackType,
      overall_rating: f.overallRating,
      content_rating: f.contentRating,
      facilitation_rating: f.facilitationRating,
      venue_rating: f.venueRating,
      body_before: f.bodyBefore,
      body_after: f.bodyAfter,
      energy_shift: f.energyShift,
      what_resonated: f.whatResonated,
      what_fell_flat: f.whatFellFlat,
      creative_breakthrough: f.creativeBreakthrough,
      arrived_on_time: f.arrivedOnTime,
      stayed_full_duration: f.stayedFullDuration,
      would_return: f.wouldReturn,
      would_recommend: f.wouldRecommend,
      notes: f.notes,
    }).select().single();
    if (error) throw error;
    setFeedback(prev => [mapFeedback(data), ...prev]);
    return mapFeedback(data);
  }, []);

  const deleteFeedback = useCallback(async (id: string) => {
    const { error } = await supabase.from('workshop_feedback').delete().eq('id', id);
    if (error) throw error;
    setFeedback(prev => prev.filter(f => f.id !== id));
  }, []);

  return { feedback, loading, error, addFeedback, deleteFeedback };
}
