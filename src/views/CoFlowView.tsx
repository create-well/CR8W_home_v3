import React, { useState } from 'react';
import type { CoFlowDate, Task } from '../api';
import type { SbCheckin } from '../hooks/useCoFlowRealtime';

interface Props {
  dates: CoFlowDate[];
  checkins: SbCheckin[];
  tasks: Task[];
  onAddDate: (d: Omit<CoFlowDate, 'id' | 'created_at'>) => void;
  onUpdateDate: (id: number, updates: Partial<CoFlowDate>) => void;
  onAddCheckin: (c: Omit<SbCheckin, 'id' | 'created_at'>) => void;
}

const PROFILE_NAMES: Record<string, string> = {
  mb: 'Monny',
  sunshine: 'Sunshine',
  bingle: 'Bingle',
  omar: 'Omar',
  pia: 'Pia',
};

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

  // Checkin form (Supabase schema)
  const [cProfile, setCProfile] = useState('mb');
  const [cBody, setCBody] = useState('');
  const [cPulse, setCPulse] = useState('');
  const [cBlockers, setCBlockers] = useState('');
  const [cNeeds, setCNeeds] = useState('');
  const [cMeetingDate, setCMeetingDate] = useState('');

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
    if (!cMeetingDate) return;
    onAddCheckin({
      profileId: cProfile,
      bodyStatus: cBody,
      creativePulse: cPulse,
      blockers: cBlockers,
      needs: cNeeds,
      meetingDate: cMeetingDate,
    });
    setCProfile('mb'); setCBody(''); setCPulse(''); setCBlockers(''); setCNeeds(''); setCMeetingDate('');
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
            <h2>CoFlow Check-ins</h2>
            <button className="btn-primary" onClick={() => setShowAddCheckin(true)}>+ Check-in</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {checkins.sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()).map(c => (
              <div key={c.id} className="card" style={{ background: 'var(--cream)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="badge badge-rust">{PROFILE_NAMES[c.profileId] || c.profileId}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {c.meetingDate ? new Date(c.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                  </span>
                </div>

                {c.bodyStatus && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>Body</span>
                    <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{c.bodyStatus}</div>
                  </div>
                )}

                {c.creativePulse && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>Creative Pulse</span>
                    <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{c.creativePulse}</div>
                  </div>
                )}

                {c.blockers && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--danger)' }}>Blockers</span>
                    <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{c.blockers}</div>
                  </div>
                )}

                {c.needs && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--success)' }}>Needs</span>
                    <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{c.needs}</div>
                  </div>
                )}
              </div>
            ))}

            {checkins.length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
                No check-ins yet. Add the first one before your next CoFlow.
              </div>
            )}
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
              <span className="modal-title">🌊 CoFlow Check-in</span>
              <button className="modal-close" onClick={() => setShowAddCheckin(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Who</label>
              <select value={cProfile} onChange={e => setCProfile(e.target.value)}>
                <option value="mb">Monny</option>
                <option value="sunshine">Sunshine</option>
                <option value="bingle">Bingle</option>
                <option value="omar">Omar</option>
                <option value="pia">Pia</option>
              </select>
            </div>
            <div className="form-group">
              <label>Meeting date</label>
              <input type="date" value={cMeetingDate} onChange={e => setCMeetingDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Body status</label>
              <input value={cBody} onChange={e => setCBody(e.target.value)} placeholder="How's your body today? Jaw clench? Breath?" />
            </div>
            <div className="form-group">
              <label>Creative pulse</label>
              <input value={cPulse} onChange={e => setCPulse(e.target.value)} placeholder="What's alive creatively? What wants to move?" />
            </div>
            <div className="form-group">
              <label>Blockers</label>
              <textarea value={cBlockers} onChange={e => setCBlockers(e.target.value)} placeholder="What's damming the flow?" style={{ minHeight: 50 }} />
            </div>
            <div className="form-group">
              <label>Needs</label>
              <textarea value={cNeeds} onChange={e => setCNeeds(e.target.value)} placeholder="What do you need from the team this week?" style={{ minHeight: 50 }} />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleAddCheckin}>Submit Check-in</button>
          </div>
        </div>
      )}
    </div>
  );
}
