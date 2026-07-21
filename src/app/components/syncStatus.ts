// Gap 2: human-readable sync status shared across dashboard surfaces.
export type SyncState = 'synced' | 'syncing' | 'offline' | 'retry';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
  message?: string;
}

export const SYNC_LABEL: Record<SyncState, string> = {
  synced: 'Up to date',
  syncing: 'Syncing…',
  offline: 'Offline — will retry',
  retry: 'Retrying…',
};

// Relative "2m ago" style formatter for last-synced timestamps.
export function formatLastSynced(iso: string | null): string {
  if (!iso) return 'Never synced';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never synced';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Badge text combining state label + freshness, e.g. "Up to date · 2m ago".
export function syncBadge(status: SyncStatus): string {
  const label = SYNC_LABEL[status.state];
  if (status.state === 'synced') return `${label} · ${formatLastSynced(status.lastSyncedAt)}`;
  return status.message ? `${label} — ${status.message}` : label;
}
