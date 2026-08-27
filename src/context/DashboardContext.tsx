import { createContext, useContext, type ReactNode } from 'react';
import { mockDashboard } from '../lib/mockDashboard';
import type { DashboardPayload } from '../types/dashboard';

const DashboardContext = createContext<DashboardPayload | null>(null);

export function DashboardProvider({ payload = mockDashboard, children }: { payload?: DashboardPayload; children: ReactNode }) {
  return <DashboardContext.Provider value={payload}>{children}</DashboardContext.Provider>;
}

export function useDashboardPayload() {
  const payload = useContext(DashboardContext);
  if (!payload) throw new Error('useDashboardPayload must be used inside DashboardProvider');
  return payload;
}
