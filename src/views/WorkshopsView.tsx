import React, { useState } from 'react';
import type { SbWorkshop, SbApplicant } from '../hooks/useWorkshopRealtime';

interface Props {
  workshops: SbWorkshop[];
  applicants: SbApplicant[];
  onAddWorkshop: (w: Omit<SbWorkshop, 'id' | 'created_at' | 'attendees' | 'createdBy'>) => void;
  onUpdateWorkshop: (id: string, updates: Partial<SbWorkshop>) => void;
  onDeleteWorkshop: (id: string) => void;
  onAddApplicant: (a: Omit<SbApplicant, 'id' | 'created_at'>) => void;
  onUpdateApplicant: (id: string, updates: Partial<SbApplicant>) => void;
}

const APPLICANT_STAGES = [
  { key: 'applied', label: 'Applied', color: 'var(--info)' },
  { key: 'vetted', label: 'Vetted', color: 'var(--camel)' },
  { key: 'scheduled', label: 'Scheduled', color: 'var(--success)' },
  { key: 'marketed', label: 'Marketed', color: 'var(--clay)' },
  { key: 'completed', label: 'Completed', color: 'var(--rust)' },
  { key: 'declined', label: 'Declined', color: 'var(--text-muted)' },
];

const WORKSHOP_STATUSES = ['ideation', 'planning', 'scheduled', 'active', 'completed', 'cancelled'];

export function WorkshopsView({ workshops, applicants, onAddWorkshop, onUpdateWorkshop, onDeleteWorkshop, onAddApplicant, onUpdateApplicant }: Props) {
  const [tab, setTab] = useState<'pipeline' | 'workshops'>('pipeline');
  const [showAddWorkshop, setShowAddWorkshop] = useState(false);
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Workshop form state
  const [wTitle, setWTitle] = useState('');
  const [wDesc, setWDesc] = useState('');
  const [wDate, setWDate] = useState('');
  const [wTime, setWTime] = useState('');
  const [wCapacity, setWCapacity] = useState(20);
  const [wLocation, setWLocation] = useState('');
  const [wStatus, setWStatus] = useState('planning');

  // Applicant form state
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aWorkshopId, setAWorkshopId] = useState('');
  const [aNotes, setANotes] = useState('');

  const filteredWorkshops = filterStatus === 'all'
    ? workshops
    : workshops.filter(w => w.status === filterStatus);

  const handleAddWorkshop = () => {
    if (!wTitle || !wDate) return;
    onAddWorkshop({
      title: wTitle, description: wDesc,
      workshopDate: wDate, workshopTime: wTime,
      capacity: wCapacity, location: wLocation, status: wStatus,
    });
    setWTitle(''); setWDesc(''); setWDate(''); setWTime(''); setWCapacity(20); setWLocation(''); setWStatus('planning');
    setShowAddWorkshop(false);
  };

  const handleAddApplicant = () => {
    if (!aName || !aEmail) return;
    onAddApplicant({
      fullName: aName, email: aEmail,
      workshopId: aWorkshopId || null,
      status: 'applied', applicationData: { notes: aNotes },
    });
    setAName(''); setAEmail(''); setAWorkshopId(''); setANotes('');
    setShowAddApplicant(false);
  };

  const applicantsByStage = (stage: string) => applicants.filter(a => a.status === stage);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h1>🌿 Workshops</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowAddApplicant(true)}>+ Applicant</button>
          <button className="btn-primary" onClick={() => setShowAddWorkshop(true)}>+ Workshop</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {(['pipeline', 'workshops'] as const).map(t => (
          <button
            key={t}
            className={tab === t ? 'btn-primary' : 'btn-ghost'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <div>
          <div className="pipeline">
            {APPLICANT_STAGES.map(s => (
              <div key={s.key} className="pipeline-col">
                <div className="pipeline-header" style={{ color: s.color }}>
                  <span>{s.label}</span>
                  <span className="pipeline-count">{applicantsByStage(s.key).length}</span>
                </div>
                {applicantsByStage(s.key).map(a => (
                  <div key={a.id} className="pipeline-card">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.fullName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {a.email}
                    </div>
                    {a.workshopId && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--camel)', marginTop: 4 }}>
                        {workshops.find(w => w.id === a.workshopId)?.title || 'Unknown workshop'}
                      </div>
                    )}
                    <select
                      style={{ marginTop: 8, width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                      value={a.status}
                      onChange={e => onUpdateApplicant(a.id, { status: e.target.value })}
                    >
                      {APPLICANT_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                ))}
                {applicantsByStage(s.key).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>
                    Empty
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'workshops' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px' }}>
              <option value="all">All statuses</option>
              {WORKSHOP_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="view-grid">
            {filteredWorkshops.map(w => (
              <div key={w.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ marginBottom: 4 }}>{w.title}</h3>
                  <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => onDeleteWorkshop(w.id)}>
                    ✕
                  </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  {w.description?.slice(0, 120)}{w.description && w.description.length > 120 ? '...' : ''}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span className="badge badge-clay">{w.status}</span>
                  <span className="badge badge-camel">{w.attendees}/{w.capacity}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {w.workshopDate ? new Date(w.workshopDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                  {w.workshopTime ? ` · ${w.workshopTime}` : ''}
                  {w.location ? ` · ${w.location}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Workshop Modal */}
      {showAddWorkshop && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddWorkshop(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">🌿 New Workshop</span>
              <button className="modal-close" onClick={() => setShowAddWorkshop(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Title</label>
              <input value={wTitle} onChange={e => setWTitle(e.target.value)} placeholder="Workshop title" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={wDesc} onChange={e => setWDesc(e.target.value)} placeholder="What is this workshop about?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={wDate} onChange={e => setWDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" value={wTime} onChange={e => setWTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" value={wCapacity} onChange={e => setWCapacity(parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={wLocation} onChange={e => setWLocation(e.target.value)} placeholder="Location or URL" />
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={wStatus} onChange={e => setWStatus(e.target.value)}>
                {WORKSHOP_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleAddWorkshop}>
              Create Workshop
            </button>
          </div>
        </div>
      )}

      {/* Add Applicant Modal */}
      {showAddApplicant && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddApplicant(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">👤 New Applicant</span>
              <button className="modal-close" onClick={() => setShowAddApplicant(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Name</label>
              <input value={aName} onChange={e => setAName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={aEmail} onChange={e => setAEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label>Workshop</label>
              <select value={aWorkshopId} onChange={e => setAWorkshopId(e.target.value)}>
                <option value="">None / General</option>
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={aNotes} onChange={e => setANotes(e.target.value)} placeholder="Any initial notes..." />
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleAddApplicant}>
              Add Applicant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
