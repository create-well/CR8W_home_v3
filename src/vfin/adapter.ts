import { canStewardSourceFlow } from '../lib/dashboardPermissions';
import type { DashboardPayload, ModuleState, SyncState } from '../types/dashboard';

export interface LiveDashboardInputs {
  profile: string;
  syncState: SyncState;
  lastSyncedAt: string | null;
  careConsent: 'granted' | 'blocked' | 'unknown';
  canViewDecisions: boolean;
  canViewSystem: boolean;
  tasks: readonly unknown[];
  careInvitations?: readonly unknown[];
  flows?: readonly unknown[];
  sourceFlow?: readonly unknown[];
  decisions?: readonly unknown[];
}

function steadyState(syncState: SyncState, hasRecords: boolean): ModuleState {
  if (syncState === 'failed') return 'sync-failed';
  if (syncState === 'stale') return 'stale';
  return hasRecords ? 'ready' : 'empty-but-healthy';
}

export function createLiveDashboardPayload(input: LiveDashboardInputs): DashboardPayload {
  const sourceFlowVisible = canStewardSourceFlow(input.profile);
  const careInvitations = input.careInvitations ?? [];
  const flows = input.flows ?? [];
  const sourceFlow = input.sourceFlow ?? [];
  const decisions = input.decisions ?? [];

  return {
    source: 'LIVE',
    lastSyncedAt: input.lastSyncedAt,
    syncState: input.syncState,
    permissions: {
      canViewSourceFlow: sourceFlowVisible,
      canViewDecisions: input.canViewDecisions,
      canViewSystem: input.canViewSystem,
      careConsent: input.careConsent,
    },
    modules: {
      week: steadyState(input.syncState, input.tasks.length > 0),
      moves: steadyState(input.syncState, input.tasks.length > 0),
      care: input.careConsent === 'granted' ? steadyState(input.syncState, careInvitations.length > 0) : 'permission-restricted',
      flows: steadyState(input.syncState, flows.length > 0),
      sourceFlow: sourceFlowVisible ? steadyState(input.syncState, sourceFlow.length > 0) : 'permission-restricted',
      decisions: input.canViewDecisions ? steadyState(input.syncState, decisions.length > 0) : 'permission-restricted',
      system: input.canViewSystem ? steadyState(input.syncState, true) : 'permission-restricted',
    },
    data: { tasks: input.tasks, careInvitations, flows, sourceFlow, decisions },
  };
}
