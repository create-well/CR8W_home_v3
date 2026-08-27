import type { DashboardPayload } from '../types/dashboard';

/**
 * MOCK data only. Replace this provider at the application boundary when the
 * live dashboard payload is ready; route components should not fetch directly.
 */
export const mockDashboard: DashboardPayload = {
  source: 'MOCK',
  lastSyncedAt: new Date().toISOString(),
  syncState: 'fresh',
  permissions: {
    canViewSourceFlow: true,
    canViewDecisions: true,
    canViewSystem: true,
    careConsent: 'blocked',
  },
  modules: {
    week: 'empty-but-healthy',
    moves: 'empty-but-healthy',
    care: 'permission-restricted',
    flows: 'empty-but-healthy',
    sourceFlow: 'empty-but-healthy',
    decisions: 'empty-but-healthy',
    system: 'ready',
  },
  data: {
    tasks: [],
    careInvitations: [],
    flows: [],
    sourceFlow: [],
    decisions: [],
  },
};
