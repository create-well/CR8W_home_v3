export type ModuleState =
  | 'loading'
  | 'empty-but-healthy'
  | 'ready'
  | 'stale'
  | 'sync-failed'
  | 'permission-restricted';

export type SyncState = 'fresh' | 'stale' | 'failed' | 'syncing';

export interface DashboardPermissions {
  canViewMoney: boolean;
  canViewDecisions: boolean;
  canViewSystem: boolean;
  careConsent: 'granted' | 'blocked' | 'unknown';
}

export interface DashboardPayload {
  source: 'MOCK' | 'LIVE';
  lastSyncedAt: string | null;
  syncState: SyncState;
  permissions: DashboardPermissions;
  modules: {
    week: ModuleState;
    moves: ModuleState;
    care: ModuleState;
    flows: ModuleState;
    money: ModuleState;
    decisions: ModuleState;
    system: ModuleState;
  };
  data: {
    tasks: readonly unknown[];
    careInvitations: readonly unknown[];
    flows: readonly unknown[];
    money: readonly unknown[];
    decisions: readonly unknown[];
  };
}
