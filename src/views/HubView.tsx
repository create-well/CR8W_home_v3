import React from 'react';
import type { Task, Workshop, CoFlowDate, WellNote, Announcement, BrainDump } from '../api';

interface Props {
  tasks: Task[];
  workshops: Workshop[];
  coFlowDates: CoFlowDate[];
  wellNotes: WellNote[];
  announcements: Announcement[];
  brainDumps: BrainDump[];
  onNavigate: (v: string) => void;
}

export function HubView({ tasks, workshops, coFlowDates, wellNotes, announcements, brainDumps, onNavigate }: Props) {
  const upcomingWorkshops = workshops
    .filter(w => new Date(w.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const upcomingCoFlow = coFlowDates
    .filter(d => d.status === 'upcoming')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);

  const myTasks = tasks.filter(t => t.status !== 'done').slice(0, 5);
  const recentNotes = wellNotes.slice(0, 3);
  const activeAnnouncements = announcements.filter(a => a.active !== 0).slice(0, 3);

  return (
    <div className="view-grid">
      {/* Quick Actions */}
      <div className="card view-full">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>◎</span> Hub — What's flowing today?
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn-primary" onClick={() => onNavigate('workshops')}>
            🌿 Workshops
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('well')}>
            💧 Drop an idea
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('coflow')}>
            🌊 CoFlow check-in
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('revenue')}>
            ✦ Revenue
          </button>
        </div>
      </div>

      {/* Active Announcements */}
      {activeAnnouncements.length > 0 && (
        <div className="card view-full">
          <h3>📢 Announcements</h3>
          {activeAnnouncements.map(a => (
            <div key={a.id} style={{
              padding: '10px 14px', marginBottom: 8, borderRadius: 'var(--radius-md)',
              background: a.priority === 'high' ? 'rgba(194,91,56,0.08)' : 'rgba(122,158,126,0.08)',
              borderLeft: `3px solid ${a.priority === 'high' ? 'var(--rust)' : 'var(--success)'}`,
            }}>
              {a.text}
            </div>
          ))}
        </div>
      )}

      {/* My Tasks */}
      <div className="card">
        <h3>⚡ Your Tasks</h3>
        {myTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>All caught up. The river flows.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {myTasks.map(t => (
              <div key={t.id} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: t.status === 'blocked' ? 'rgba(184,74,50,0.06)' : 'rgba(58,58,58,0.03)',
                borderLeft: `3px solid ${t.priority === 'high' ? 'var(--rust)' : t.priority === 'medium' ? 'var(--camel)' : 'var(--success)'}`,
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {t.status} · {t.priority} priority {t.due_date ? `· Due ${t.due_date}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Workshops */}
      <div className="card">
        <h3>🌿 Upcoming Workshops</h3>
        {upcomingWorkshops.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No workshops scheduled. Plan one?</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {upcomingWorkshops.map(w => (
              <div key={w.id} style={{
                padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'var(--cream)', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontWeight: 600 }}>{w.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} · {w.location} · {w.status}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className="badge badge-rust">{w.facilitator}</span>
                  <span className="badge badge-clay" style={{ marginLeft: 6 }}>{w.participants}/{w.capacity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => onNavigate('workshops')}>
          View all workshops →
        </button>
      </div>

      {/* CoFlow Dates */}
      <div className="card">
        <h3>🌊 Behind H0es Doors</h3>
        {upcomingCoFlow.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No meetings scheduled.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {upcomingCoFlow.map(d => (
              <div key={d.id} style={{
                padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'var(--cream)', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontWeight: 600 }}>{d.theme || 'CoFlow Check-in'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} · {d.startTime || d.timeRange} · {d.location}
                </div>
                {d.host && <span className="badge badge-camel" style={{ marginTop: 6 }}>Host: {d.host}</span>}
              </div>
            ))}
          </div>
        )}
        <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => onNavigate('coflow')}>
          View CoFlow →
        </button>
      </div>

      {/* Well Notes */}
      <div className="card">
        <h3>💧 Recent Drops</h3>
        {recentNotes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>The well is quiet. Drop something in.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {recentNotes.map(n => (
              <div key={n.id} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--cream)', fontSize: '0.85rem', fontStyle: 'italic',
              }}>
                “{n.content.slice(0, 120)}{n.content.length > 120 ? '...' : ''}”
                <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'normal' }}>
                  {n.landed || 0} lands
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => onNavigate('well')}>
          Visit the Well →
        </button>
      </div>

      {/* Brain Dumps */}
      {brainDumps.length > 0 && (
        <div className="card view-full">
          <h3>🧠 Brain Dumps</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginTop: 10 }}>
            {brainDumps.slice(0, 4).map(b => (
              <div key={b.id} style={{
                padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'var(--cream)', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontSize: '0.85rem' }}>{b.content.slice(0, 180)}{b.content.length > 180 ? '...' : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {b.author} · {b.tags}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
