import type { DashboardPayload } from '../types/dashboard';
import type { VfinDecision } from './contracts';

/** Development-only fixture. It never replaces the workflow app's live hooks. */
export const VFIN_MOCK_PAYLOAD: DashboardPayload = {
  source: 'MOCK',
  lastSyncedAt: null,
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
    decisions: 'ready',
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

export const VFIN_MOCK_DECISIONS: readonly VfinDecision[] = [
  {
    id: 'pia-care-consent',
    question: 'What consent is in place before a Care channel opens?',
    context: 'Pia tends Care and Source Flow through explicit consent, never assumed availability.',
    urgency: 'this-week',
    status: 'pending',
    createdAt: '2026-08-27T00:00:00.000Z',
  },
];
