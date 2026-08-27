import type { DashboardPayload, ModuleState } from '../types/dashboard';

export type VfinPayload = DashboardPayload;

export interface VfinDecision {
  id: string;
  question: string;
  context?: string;
  urgency: 'now' | 'this-week' | 'when-clear';
  status: 'pending' | 'decided' | 'deferred';
  answer?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface VfinSystemCheck {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'error' | 'neutral';
}

export function isVisibleModule(state: ModuleState): boolean {
  return state === 'ready' || state === 'stale';
}

export function sourceFlowState(payload: VfinPayload): ModuleState {
  if (!payload.permissions.canViewSourceFlow) return 'permission-restricted';
  return payload.modules.sourceFlow;
}

export function careState(payload: VfinPayload): ModuleState {
  if (payload.permissions.careConsent !== 'granted') return 'permission-restricted';
  return payload.modules.care;
}
