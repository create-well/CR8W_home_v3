import React, { useState } from 'react';
import type { CoFlowDate, CoFlowCheckin, Task } from '../api';

interface Props {
  dates: CoFlowDate[];
  checkins: CoFlowCheckin[];
  tasks: Task[];
  onAddDate: (d: Omit<CoFlowDate, 'id' | 'created_at'>) => void;
  onUpdateDate: (id: number, updates: Partial<CoFlowDate>) => void;
  onAddCheckin: (c: Omit<CoFlowCheckin, 'id' | 'created_at'>) => void;
}

const MOODS = [
  { key: 'fire', emoji: '🔥', label: 'On fire' },
  { key: 'sun', emoji: '☀️', label: 'Bright' },
  { key: 'cloud', emoji: '☁️', label: 'Neutral' },
  { key: 'rain', emoji: '🌧️', label: 'Low' },
  { key: 'storm', emoji: '⛈️', label: 'Stormy' },
];

export function CoFlowView({ dates, checkins, tasks, onAddDate, onUpdateDate, onAddCheckin }: Props) {
  const [tab, setTab] = useState<'meetings' | 'checkins'>('meetings');
  const [showAddDate, setShowAddDate] = useState(false);
  const [showAddCheckin, setShowAddCheckin] = useState(false);

  // Meeting form
  const [dDate, setDDate] = useState('');
  const [dStart, setDStart] = useState('');
  const [dEnd, setDEnd] = useState('');
  const [dLocation, setDLocation] = useState('');
  const [dHost, setDHost] = useState('');
  const [dTheme, setDTheme] = useState('');

  // Checkin form
  const [cWeekOf, setCWeekOf] = useState('');
  const [cAuthor, setCAuthor] = useState('monny');
  const [cConfirm, setCConfirm] = useState(false);
  const [cLocation, setCLocation] = useState('');
  const [cAgenda, setCAgenda] = useState('');
  const [cMood, setCMood] = useState('');
  const [cNotes, setCNotes] = useState('');

  const upcoming = dates.filter(d => d.status === 'upcoming').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const archived = dates.filter(d => d.status === 'archived').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddDate = () => {
    if (!dDate) return;
    onAddDate({
      date: dDate, timeRange: `${dStart}–${dEnd}`, startTime: dStart, endTime: dEnd,
      location: dLocation, host: dHost, theme: dTheme,
      rsvp: {}, agendaItems: [], notes: '', vibeCheck: '', status: 'upcoming',
    });
    setDDate(''); setDStart(''); setDEnd(''); setDLocation(''); setDHost(''); setDTheme('');
    setShowAddDate(false);
  };

  const handleAddCheckin = () => {
    if (!cWeekOf) return;
    onAddCheckin({
      weekOf: cWeekOf, author: cAuthor, confirmTime: cConfirm,
      locationSuggestion: cLocation, agendaItems: cAgenda.split('\n').filter(Boolean),
      mood: cMood || undefined, notes: cNotes || undefined,
    });
    setCWeekOf(''); setCAuthor('monny'); setCConfirm(false); setCLocation(''); setCAgenda(''); setCMood(''); setCNotes('');
    setShowAddCheckin(false);
  };

  return (
    <div>
      <h1>🌊 CoFlow</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Structured check-ins for creative operations. Behind h0es doors. Podyap prep.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={tab === 'meetings' ? 'btn-primary' : 'btn-ghost'} style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setTab('meetings')}>
          📅 Meetings
        </button>
        <button className={tab === 'checkins' ? 'btn-primary' : 'btn-ghost'} style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setTab('checkins')}>
          ✅ Check-ins
        </button>
      </div>

      {tab === 'meetings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Upcoming</h2>
            <button className="btn-primary" onClick={() => setShowAddDate(true)}>+ Schedule</button>
          </div>

          <div className="view-grid">
            {upcoming.map(d => (
              <div key={d.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3>{d.theme || 'CoFlow Check-in'}</h3>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={() => onUpdateDate(d.id, { status: 'archived' })}>
                    Archive
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  {new Date(d.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  <br />
                  {d.startTime} – {d.endTime} · {d.location}
                </div>
                {d.host && <span className="badge badge-camel">Host: {d.host}</span>}
                {d.agendaItems && d.agendaItems.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>Agenda:</div>
                    {d.agendaItems.map((item, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={item.done} readOnly style={{ width: 14, height: 14 }} />
                        {item.text} <span style={{ color: 'var(--text-muted)' }}>({item.lead})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {archived.length > 0 && (
            <>
              <h2 style={{ marginTop: 30 }}>Archived</h2>
              <div className="view-grid">
                {archived.slice(0, 4).map(d => (
                  <div key={d.id} className="card" style={{ opacity: 0.7 }}>
                    <h3>{d.theme || 'Past meeting'}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(d.date).toLocaleDateString()} · {d.sessionNotes ? 'Notes saved' : 'No notes'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'checkins' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>PlayD8s Check-ins</h2>
            <button className="btn-primary" onClick={() => setShowAddCheckin(true)}>+ Check-in</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {checkins.sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()).map(c => (
              <div key={c.id} className="card" style={{ background: 'var(--cream)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="badge badge-rust">{c.author}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Week of {new Date(c.weekOf).toLocaleDateString()}
                  </span>
                </div>
                {c.mood && (
                  <div style={{ marginBottom: 8 }}>
                    {MOODS.find(m => m.key === c.mood)?.emoji} {MOODS.find(m => m.key === c.mood)?.label}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Time confirmed?</span> {c.confirmTime ? '✅ Yes' : '⚠️ Needs adjusting'}
                </div>
                {c.locationSuggestion && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>Location:</span> {c.locationSuggestion}
                  </div>
                )}
                {c.agendaItems && c.agendaItems.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Agenda items:</div>
                    {c.agendaItems.map((item, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', padding: '2px 0' }}>• {item}</div>
                    ))}
                  </div>
                )}
                {c.notes && (
                  <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    “{c.notes}”
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddDate && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddDate(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">📅 Schedule CoFlow</span>
              <button className="modal-close" onClick={() => setShowAddDate(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={dDate} onChange={e => setDDate(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start</label>
                <input type="time" value={dStart} onChange={e => setDStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End</label>
                <input type="time" value={dEnd} onChange={e => setDEnd(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={dLocation} onChange={e => setDLocation(e.target.value)} placeholder="Where?" />
            </div>
            <div className="form-group">
              <label>Host</label>
              <select value={dHost} onChange={e => setDHost(e.target.value)}>
                <option value="">Select host</option>
                <option value="sunshine">Sunshine</option>
                <option value="monny">Monny</option>
                <option value="bingle">Bingle</option>
                <option value="omar">Omar</option>
              </select>
            </div>
            <div className="form-group">
              <label>Theme</label>
              <input value={dTheme} onChange={e => setDTheme(e.target.value)} placeholder="Optional theme" />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleAddDate}>Schedule</button>
          </div>
        </div>
      )}

      {/* Add Checkin Modal */}
      {showAddCheckin && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddCheckin(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">✅ PlayD8s Check-in</span>
              <button className="modal-close" onClick={() => setShowAddCheckin(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Week of</label>
              <input type="date" value={cWeekOf} onChange={e => setCWeekOf(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Who</label>
              <select value={cAuthor} onChange={e => setCAuthor(e.target.value)}>
                <option value="monny">Monny</option>
                <option value="sunshine">Sunshine</option>
                <option value="bingle">Bingle</option>
                <option value="omar">Omar</option>
                <option value="pia">Pia</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mood</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {MOODS.map(m => (
                  <button
                    key={m.key}
                    className={cMood === m.key ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => setCMood(m.key)}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={cConfirm} onChange={e => setCConfirm(e.target.checked)} style={{ marginRight: 6 }} />
                Time confirmed
              </label>
            </div>
            <div className="form-group">
              <label>Location suggestion</label>
              <input value={cLocation} onChange={e => setCLocation(e.target.value)} placeholder="Where works for you?" />
            </div>
            <div className="form-group">
              <label>Agenda items (one per line)</label>
              <textarea value={cAgenda} onChange={e => setCAgenda(e.target.value)} placeholder="What needs airtime?" style={{ minHeight: 60 }} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="Anything else?" style={{ minHeight: 40 }} />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleAddCheckin}>Submit Check-in</button>
          </div>
        </div>
      )}
    </div>
  );
}
