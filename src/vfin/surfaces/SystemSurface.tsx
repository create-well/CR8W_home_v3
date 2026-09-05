import type { VfinPayload, VfinSystemCheck } from '../contracts';
import { VfinViewShell } from '../components/VfinViewShell';

interface SystemSurfaceProps {
  payload: VfinPayload;
  checks?: readonly VfinSystemCheck[];
  onRetry?: () => void;
}

function stateLabel(payload: VfinPayload): string {
  if (payload.syncState === 'fresh') return 'Fresh';
  if (payload.syncState === 'syncing') return 'Syncing';
  if (payload.syncState === 'stale') return 'Stale';
  return 'Sync failed';
}

export function SystemSurface({ payload, checks = [], onRetry }: SystemSurfaceProps) {
  const inventory = [
    ['Moves', payload.data.tasks.length],
    ['Care invitations', payload.data.careInvitations.length],
    ['FLOWS', payload.data.flows.length],
    ['Source Flow items', payload.data.sourceFlow.length],
    ['Decisions', payload.data.decisions.length],
  ] as const;

  const standardChecks: readonly VfinSystemCheck[] = [
    { label: 'Sync state', value: stateLabel(payload), status: payload.syncState === 'failed' ? 'error' : payload.syncState === 'stale' ? 'warn' : 'ok' },
    { label: 'Last refreshed', value: payload.lastSyncedAt ? new Date(payload.lastSyncedAt).toLocaleString() : 'No successful refresh recorded', status: payload.lastSyncedAt ? 'neutral' : 'warn' },
    { label: 'Care boundary', value: payload.permissions.careConsent === 'granted' ? 'Explicit consent recorded' : 'Consent required before outreach', status: payload.permissions.careConsent === 'granted' ? 'ok' : 'warn' },
    { label: 'Source Flow', value: payload.permissions.canViewSourceFlow ? 'Authorized steward access' : 'Steward access restricted', status: payload.permissions.canViewSourceFlow ? 'ok' : 'warn' },
    { label: 'Router and data boundary', value: 'Host-provided DashboardPayload; no direct service calls', status: 'ok' },
    ...checks,
  ];

  return (
    <VfinViewShell
      title="System"
      state={payload.modules.system}
      onRetry={onRetry}
      emptyTitle="System is quiet"
      emptyBody="No operational signals need attention right now."
      restrictedBody="System details are available only to authorized stewards."
    >
      <p className="vfin-meta">Health, freshness, and the conditions of flow—without exposing credentials, raw secrets, or direct service controls.</p>

      <section aria-labelledby="vfin-system-health" className="vfin-card" style={{ marginTop: '1rem' }}>
        <h3 id="vfin-system-health">System health</h3>
        {standardChecks.map((check) => (
          <div key={`${check.label}-${check.value}`} className="vfin-status-row">
            <span>{check.label}</span>
            <strong className={`vfin-status-${check.status}`}>{check.value}</strong>
          </div>
        ))}
      </section>

      <section aria-labelledby="vfin-system-inventory" className="vfin-card">
        <h3 id="vfin-system-inventory">Data inventory</h3>
        {inventory.map(([label, count]) => (
          <div key={label} className="vfin-status-row"><span>{label}</span><strong>{count}</strong></div>
        ))}
      </section>

      <section aria-labelledby="vfin-system-contract" className="vfin-card">
        <h3 id="vfin-system-contract">Operating contract</h3>
        <p className="vfin-meta">The shared router retains This Week, Moves, Care, FLOWS, The Source, Decisions, and System. The legacy `/money` path remains compatible for The Source.</p>
        <p className="vfin-meta">Pia appears in the Source Flow stewardship model. Care channels and outreach remain unavailable until explicit consent is present.</p>
      </section>
    </VfinViewShell>
  );
}
