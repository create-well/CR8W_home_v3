import React, { useState } from 'react';
import type { Workshop, WorkshopProgram, WorkshopResource, Applicant } from '../api';

interface Props {
  workshops: Workshop[];
  programs: WorkshopProgram[];
  resources: WorkshopResource[];
  applicants: Applicant[];
  onAddWorkshop: (w: Omit<Workshop, 'id' | 'created_at'>) => void;
  onUpdateWorkshop: (id: number, updates: Partial<Workshop>) => void;
  onDeleteWorkshop: (id: number) => void;
  onAddApplicant: (a: Omit<Applicant, 'id' | 'created_at'>) => void;
  onUpdateApplicant: (id: number, updates: Partial<Applicant>) => void;
}

const STAGES: { key: Applicant['stage']; label: string; color: string }[] = [
  { key: 'applied', label: 'Applied', color: 'var(--info)' },
  { key: 'vetted', label: 'Vetted', color: 'var(--camel)' },
  { key: 'scheduled', label: 'Scheduled', color: 'var(--success)' },
  { key: 'marketed', label: 'Marketed', color: 'var(--clay)' },
  { key: 'completed', label: 'Completed', color: 'var(--rust)' },
  { key: 'declined', label: 'Declined', color: 'var(--text-muted)' },
];

export function WorkshopsView({ workshops, programs, resources, applicants, onAddWorkshop, onUpdateWorkshop, onDeleteWorkshop, onAddApplicant, onUpdateApplicant }: Props) {
  const [tab, setTab] = useState<'pipeline' | 'workshops' | 'programs' | 'resources'>('pipeline');
  const [showAddWorkshop, setShowAddWorkshop] = useState(false);
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Workshop form state
  const [wTitle, setWTitle] = useState('');
  const [wDesc, setWDesc] = useState('');
  const [wFacilitator, setWFacilitator] = useState<Workshop['facilitator']>('monny');
  const [wDate, setWDate] = useState('');
  const [wCapacity, setWCapacity] = useState(20);
  const [wLocation, setWLocation] = useState('');
  const [wTags, setWTags] = useState('');

  // Applicant form state
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aWorkshopId, setAWorkshopId] = useState('');
  const [aSource, setASource] = useState<Applicant['source']>('form');
  const [aNotes, setANotes] = useState('');

  const filteredWorkshops = filterStatus === 'all'
    ? workshops
    : workshops.filter(w => w.status === filterStatus);

  const handleAddWorkshop = () => {
    if (!wTitle || !wDate) return;
    onAddWorkshop({
      title: wTitle, description: wDesc, facilitator: wFacilitator,
      date: wDate, capacity: wCapacity, participants: 0,
      location: wLocation, tags: wTags.split(',').map(t => t.trim()).filter(Boolean),
      status: 'planning',
    });
    setWTitle(''); setWDesc(''); setWFacilitator('monny'); setWDate(''); setWCapacity(20); setWLocation(''); setWTags('');
    setShowAddWorkshop(false);
  };

  const handleAddApplicant = () => {
    if (!aName || !aEmail) return;
    onAddApplicant({
      name: aName, email: aEmail, phone: aPhone || undefined,
      workshopId: aWorkshopId ? parseInt(aWorkshopId) : undefined,
      stage: 'applied', source: aSource, notes: aNotes,
    });
    setAName(''); setAEmail(''); setAPhone(''); setAWorkshopId(''); setASource('form'); setANotes('');
    setShowAddApplicant(false);
  };

  const applicantsByStage = (stage: Applicant['stage']) => applicants.filter(a => a.stage === stage);

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
        {(['pipeline', 'workshops', 'programs', 'resources'] as const).map(t => (
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
            {STAGES.map(s => (
              <div key={s.key} className="pipeline-col">
                <div className="pipeline-header" style={{ color: s.color }}>
                  <span>{s.label}</span>
                  <span className="pipeline-count">{applicantsByStage(s.key).length}</span>
                </div>
                {applicantsByStage(s.key).map(a => (
                  <div key={a.id} className="pipeline-card">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {a.email} · {a.source}
                    </div>
                    {a.assignedTo && (
                      <span className="badge badge-info" style={{ marginTop: 6 }}>Assigned: {a.assignedTo}</span>
                    )}
                    <select
                      style={{ marginTop: 8, width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                      value={a.stage}
                      onChange={e => onUpdateApplicant(a.id, { stage: e.target.value as Applicant['stage'] })}
                    >
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
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
              <option value="ideation">Ideation</option>
              <option value="planning">Planning</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
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
                  <span className="badge badge-rust">{w.facilitator}</span>
                  <span className="badge badge-clay">{w.status}</span>
                  <span className="badge badge-camel">{w.participants}/{w.capacity}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {w.location}
                </div>
                {w.googleDocLink && (
                  <a href={w.googleDocLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', display: 'block', marginTop: 8 }}>
                    📄 Google Doc →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'programs' && (
        <div className="view-grid">
          {programs.map(p => (
            <div key={p.id} className="card">
              <h3>{p.seriesName}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.description}</p>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Sessions:</div>
                {p.sessionOutline.map(s => (
                  <div key={s.number} style={{ fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid rgba(58,58,58,0.05)' }}>
                    {s.number}. {s.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {programs.length === 0 && (
            <div className="card view-full" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No programs yet. Build one from a workshop.
            </div>
          )}
        </div>
      )}

      {tab === 'resources' && (
        <div>
          <table className="cr8w-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Type</th>
                <th>Author</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.id}>
                  <td><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></td>
                  <td><span className="badge badge-info">{r.type}</span></td>
                  <td>{r.author}</td>
                  <td>{r.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {resources.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 20 }}>No resources yet.</p>
          )}
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
                <label>Facilitator</label>
                <select value={wFacilitator} onChange={e => setWFacilitator(e.target.value as Workshop['facilitator'])}>
                  <option value="monny">Monny</option>
                  <option value="sunshine">Sunshine</option>
                  <option value="bingle">Bingle</option>
                  <option value="omar">Omar</option>
                  <option value="pia">Pia</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={wDate} onChange={e => setWDate(e.target.value)} />
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
              <label>Tags (comma separated)</label>
              <input value={wTags} onChange={e => setWTags(e.target.value)} placeholder="wellshop, journaling, etc" />
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
              <label>Phone</label>
              <input value={aPhone} onChange={e => setAPhone(e.target.value)} placeholder="+1..." />
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
              <label>Source</label>
              <select value={aSource} onChange={e => setASource(e.target.value as Applicant['source'])}>
                <option value="form">Application Form</option>
                <option value="referral">Referral</option>
                <option value="instagram">Instagram</option>
                <option value="podcast">Podcast</option>
                <option value="event">Event</option>
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
