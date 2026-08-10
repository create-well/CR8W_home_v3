import React, { useState } from 'react';
import type { SbRevenueOp } from '../hooks/useRevenueRealtime';
import type { SbWorkshop } from '../hooks/useWorkshopRealtime';

interface Props {
  opportunities: SbRevenueOp[];
  workshops: SbWorkshop[];
  onAddOp: (r: Omit<SbRevenueOp, 'id' | 'created_at'>) => void;
  onUpdateOp: (id: string, updates: Partial<SbRevenueOp>) => void;
  onDeleteOp: (id: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  prospect: 'var(--info)',
  pitched: 'var(--camel)',
  negotiating: 'var(--warning)',
  'closed-won': 'var(--success)',
  'closed-lost': 'var(--danger)',
  paused: 'var(--text-muted)',
};

const TYPE_LABELS: Record<string, string> = {
  sponsor: '💰 Sponsor',
  grant: '📝 Grant',
  donation: '🎁 Donation',
  merch: '👕 Merch',
  ticket: '🎟️ Ticket',
  other: '🔹 Other',
};

export function RevenueView({ opportunities, workshops, onAddOp, onUpdateOp, onDeleteOp }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');

  // Form state
  const [rOrg, setROrg] = useState('');
  const [rContact, setRContact] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rType, setRType] = useState<SbRevenueOp['type']>('sponsor');
  const [rAmount, setRAmount] = useState('');
  const [rCurrency, setRCurrency] = useState('USD');
  const [rExpected, setRExpected] = useState('');
  const [rNotes, setRNotes] = useState('');
  const [rOwner, setROwner] = useState('monny');

  const filtered = opportunities.filter(o => {
    if (filterType !== 'all' && o.type !== filterType) return false;
    if (filterStage !== 'all' && o.stage !== filterStage) return false;
    return true;
  });

  const totalPipeline = filtered
    .filter(o => !['closed-lost', 'paused'].includes(o.stage))
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  const totalClosed = filtered
    .filter(o => o.stage === 'closed-won')
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  const handleAdd = () => {
    if (!rOrg) return;
    onAddOp({
      orgName: rOrg, contactName: rContact || undefined, contactEmail: rEmail || undefined,
      type: rType, stage: 'prospect', amount: rAmount ? parseFloat(rAmount) : undefined,
      currency: rCurrency, expectedClose: rExpected || undefined,
      notes: rNotes, owner: rOwner,
    });
    setROrg(''); setRContact(''); setREmail(''); setRType('sponsor'); setRAmount(''); setRCurrency('USD'); setRExpected(''); setRNotes(''); setROwner('monny');
    setShowAdd(false);
  };

  const stageCounts = opportunities.reduce((acc, o) => {
    acc[o.stage] = (acc[o.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1>✦ Revenue</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Opportunity</button>
      </div>

      {/* KPI Cards */}
      <div className="view-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--rust)', marginTop: 4 }}>
            ${totalPipeline.toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closed</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
            ${totalClosed.toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Opps</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--camel)', marginTop: 4 }}>
            {opportunities.filter(o => !['closed-won', 'closed-lost'].includes(o.stage)).length}
          </div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {['prospect', 'pitched', 'negotiating', 'closed-won', 'closed-lost', 'paused'].map(stage => (
          <div key={stage} style={{
            padding: '10px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--sandstone)', minWidth: 100, textAlign: 'center',
            borderTop: `3px solid ${STAGE_COLORS[stage]}`,
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{stage.replace('-', ' ')}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem' }}>
              {stageCounts[stage] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px' }}>
          <option value="all">All types</option>
          <option value="sponsor">Sponsor</option>
          <option value="grant">Grant</option>
          <option value="donation">Donation</option>
          <option value="merch">Merch</option>
          <option value="ticket">Ticket</option>
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{ padding: '8px 12px' }}>
          <option value="all">All stages</option>
          <option value="prospect">Prospect</option>
          <option value="pitched">Pitched</option>
          <option value="negotiating">Negotiating</option>
          <option value="closed-won">Closed Won</option>
          <option value="closed-lost">Closed Lost</option>
        </select>
      </div>

      {/* Opportunities Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="cr8w-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Type</th>
              <th>Stage</th>
              <th>Amount</th>
              <th>Expected Close</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{o.orgName}</div>
                  {o.contactName && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{o.contactName}</div>}
                </td>
                <td><span className="badge badge-clay">{TYPE_LABELS[o.type]}</span></td>
                <td>
                  <select
                    value={o.stage}
                    onChange={e => onUpdateOp(o.id, { stage: e.target.value as SbRevenueOp['stage'] })}
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    <option value="prospect">Prospect</option>
                    <option value="pitched">Pitched</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="closed-won">Closed Won</option>
                    <option value="closed-lost">Closed Lost</option>
                    <option value="paused">Paused</option>
                  </select>
                </td>
                <td style={{ fontWeight: 600 }}>
                  {o.amount ? `$${o.amount.toLocaleString()} ${o.currency}` : '—'}
                </td>
                <td>{o.expectedClose ? new Date(o.expectedClose).toLocaleDateString() : '—'}</td>
                <td>{o.owner}</td>
                <td>
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Edit</button>
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: 6, color: 'var(--danger)' }} onClick={() => onDeleteOp(o.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
            No opportunities yet. Add your first sponsor or grant lead.
          </p>
        )}
      </div>

      {/* Add Opportunity Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">✦ New Opportunity</span>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Organization</label>
              <input value={rOrg} onChange={e => setROrg(e.target.value)} placeholder="Company, foundation, or individual" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Contact Name</label>
                <input value={rContact} onChange={e => setRContact(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select value={rType} onChange={e => setRType(e.target.value as SbRevenueOp['type'])}>
                  <option value="sponsor">Sponsor</option>
                  <option value="grant">Grant</option>
                  <option value="donation">Donation</option>
                  <option value="merch">Merch</option>
                  <option value="ticket">Ticket</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Owner</label>
                <select value={rOwner} onChange={e => setROwner(e.target.value)}>
                  <option value="monny">Monny</option>
                  <option value="sunshine">Sunshine</option>
                  <option value="bingle">Bingle</option>
                  <option value="omar">Omar</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Amount</label>
                <input type="number" value={rAmount} onChange={e => setRAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input value={rCurrency} onChange={e => setRCurrency(e.target.value)} placeholder="USD" />
              </div>
            </div>
            <div className="form-group">
              <label>Expected Close Date</label>
              <input type="date" value={rExpected} onChange={e => setRExpected(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={rNotes} onChange={e => setRNotes(e.target.value)} placeholder="Context, next steps, relationship notes..." />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleAdd}>Add Opportunity</button>
          </div>
        </div>
      )}
    </div>
  );
}
