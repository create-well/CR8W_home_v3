import React, { useState } from 'react';
import type { Collaborator, Task, Station } from '../api';

interface Props {
  collaborators: Collaborator[];
  tasks: Task[];
  stations: Station[];
  onAddCollaborator: (c: Omit<Collaborator, 'id' | 'created_at'>) => void;
  onUpdateCollaborator: (id: number, updates: Partial<Collaborator>) => void;
}

const ROLE_LABELS: Record<string, string> = {
  core: 'Core Team',
  'co-creator': 'Co-Creator',
  advisor: 'Advisor',
  alumni: 'Alumni',
};

const TIER_LABELS: Record<string, string> = {
  full: 'Full Access',
  workshops: 'Workshops Only',
  well: 'Well Only',
  'view-only': 'View Only',
};

const HD_TYPES: Record<string, { emoji: string; label: string }> = {
  'MG 5/1': { emoji: '☀️', label: 'Manifesting Generator' },
  'Generator 5/1': { emoji: '◎', label: 'Generator' },
  'Projector 2/4': { emoji: '◉', label: 'Projector' },
  'MG 3/5': { emoji: '⚡', label: 'Manifesting Generator' },
};

export function TeamView({ collaborators, tasks, stations, onAddCollaborator, onUpdateCollaborator }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cRole, setCRole] = useState<Collaborator['role']>('co-creator');
  const [cTier, setCTier] = useState<Collaborator['accessTier']>('workshops');
  const [cHdType, setCHdType] = useState('');
  const [cNote, setCNote] = useState('');

  const handleAdd = () => {
    if (!cName || !cEmail) return;
    onAddCollaborator({
      name: cName, email: cEmail, role: cRole, accessTier: cTier,
      hdType: cHdType || undefined, profileNote: cNote || undefined, active: true,
    });
    setCName(''); setCEmail(''); setCRole('co-creator'); setCTier('workshops'); setCHdType(''); setCNote('');
    setShowAdd(false);
  };

  // Core team always shown
  const coreTeam = collaborators.filter(c => c.role === 'core');
  const coCreators = collaborators.filter(c => c.role === 'co-creator');
  const advisors = collaborators.filter(c => c.role === 'advisor');
  const alumni = collaborators.filter(c => c.role === 'alumni');

  // Task counts by person
  const taskCount = (name: string) => tasks.filter(t => t.person?.toLowerCase() === name.toLowerCase() && t.status !== 'done').length;
  const stationCount = (name: string) => stations.filter(s => s.owner.toLowerCase() === name.toLowerCase()).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>◉ Team</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Collaborator</button>
      </div>

      {/* Core Team */}
      <h2>Core Team</h2>
      <div className="view-grid" style={{ marginBottom: 30 }}>
        {coreTeam.map(c => (
          <div key={c.id} className="card" style={{ borderTop: '4px solid var(--rust)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{c.name}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email}</div>
              </div>
              <span className="badge badge-rust">{ROLE_LABELS[c.role]}</span>
            </div>
            {c.hdType && (
              <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                {HD_TYPES[c.hdType]?.emoji} {c.hdType} · {HD_TYPES[c.hdType]?.label}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <span className="badge badge-clay">{taskCount(c.name)} tasks</span>
              <span className="badge badge-camel">{stationCount(c.name)} stations</span>
              <span className="badge badge-info">{TIER_LABELS[c.accessTier]}</span>
            </div>
            {c.profileNote && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                “{c.profileNote}”
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Co-Creators */}
      {coCreators.length > 0 && (
        <>
          <h2>Co-Creators</h2>
          <div className="view-grid" style={{ marginBottom: 30 }}>
            {coCreators.map(c => (
              <div key={c.id} className="card" style={{ borderTop: '4px solid var(--camel)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ marginBottom: 2 }}>{c.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email}</div>
                  </div>
                  <span className="badge badge-camel">{ROLE_LABELS[c.role]}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge badge-info">{TIER_LABELS[c.accessTier]}</span>
                  {!c.active && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Inactive</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Advisors & Alumni */}
      {(advisors.length > 0 || alumni.length > 0) && (
        <>
          <h2>Extended Network</h2>
          <div className="view-grid">
            {advisors.map(c => (
              <div key={c.id} className="card" style={{ opacity: 0.85 }}>
                <h3>{c.name}</h3>
                <span className="badge badge-clay">Advisor</span>
                <span className="badge badge-info" style={{ marginLeft: 6 }}>{TIER_LABELS[c.accessTier]}</span>
              </div>
            ))}
            {alumni.map(c => (
              <div key={c.id} className="card" style={{ opacity: 0.7 }}>
                <h3>{c.name}</h3>
                <span className="badge badge-info">Alumni</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Collaborator Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">◉ New Collaborator</span>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Name</label>
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Role</label>
                <select value={cRole} onChange={e => setCRole(e.target.value as Collaborator['role'])}>
                  <option value="core">Core Team</option>
                  <option value="co-creator">Co-Creator</option>
                  <option value="advisor">Advisor</option>
                  <option value="alumni">Alumni</option>
                </select>
              </div>
              <div className="form-group">
                <label>Access Tier</label>
                <select value={cTier} onChange={e => setCTier(e.target.value as Collaborator['accessTier'])}>
                  <option value="full">Full Access</option>
                  <option value="workshops">Workshops Only</option>
                  <option value="well">Well Only</option>
                  <option value="view-only">View Only</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Human Design Type</label>
              <input value={cHdType} onChange={e => setCHdType(e.target.value)} placeholder="e.g. MG 5/1, Projector 2/4" />
            </div>
            <div className="form-group">
              <label>Profile Note</label>
              <textarea value={cNote} onChange={e => setCNote(e.target.value)} placeholder="Recognition needs, role notes..." />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleAdd}>Add Collaborator</button>
          </div>
        </div>
      )}
    </div>
  );
}
