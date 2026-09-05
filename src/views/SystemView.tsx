import React, { useMemo, useState } from 'react';

type HealthState = 'healthy' | 'watch' | 'attention';

type SystemCheck = {
  id: string;
  name: string;
  purpose: string;
  state: HealthState;
  detail: string;
  lastChecked: string;
  action?: string;
};

interface Props {
  collaborators: readonly any[];
  tasks: readonly any[];
  stations: readonly any[];
}

const checks: SystemCheck[] = [
  { id: 'well', name: 'The Well', purpose: 'Core dashboard source', state: 'healthy', detail: 'Connected and ready for the next signal.', lastChecked: 'Just now' },
  { id: 'sync', name: 'Shared sync', purpose: 'Freshness across views', state: 'healthy', detail: 'The latest shared payload is available to all views.', lastChecked: '2 min ago' },
  { id: 'consent', name: 'Care boundaries', purpose: 'Consent before contact', state: 'healthy', detail: 'Contact invitations stay hidden until permission is present.', lastChecked: '5 min ago' },
  { id: 'source', name: 'Source flow', purpose: 'Resource movement', state: 'watch', detail: 'One channel is waiting for its next right invitation.', lastChecked: '18 min ago', action: 'Review source flow' },
];

const stateLabel: Record<HealthState, string> = { healthy: 'In good flow', watch: 'Worth tending', attention: 'Needs attention' };

export function SystemView({ collaborators, tasks, stations }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const attentionCount = checks.filter(check => check.state !== 'healthy').length;
  const systemState: HealthState = attentionCount > 0 ? 'watch' : 'healthy';
  const activeInputs = useMemo(() => collaborators.length + tasks.length + stations.length, [collaborators.length, tasks.length, stations.length]);

  return (
    <div className="system-view" data-testid="system-view">
      <div className="system-intro">
        <div>
          <p className="system-kicker">A clear view of what holds the flow</p>
          <p className="system-description">System Health makes the conditions visible: what is connected, what is fresh, and where a gentle tending move may help.</p>
        </div>
        <div className={`system-health-badge system-health-${systemState}`}><span className="system-health-dot" />{stateLabel[systemState]}</div>
      </div>

      <section className="system-overview-grid" aria-label="System overview">
        <div className="system-stat-card"><span className="system-stat-label">Sources online</span><strong>{checks.filter(check => check.state === 'healthy').length}/{checks.length}</strong><span>shared checks</span></div>
        <div className="system-stat-card"><span className="system-stat-label">Active inputs</span><strong>{activeInputs}</strong><span>signals held in context</span></div>
        <div className="system-stat-card"><span className="system-stat-label">Needs tending</span><strong>{attentionCount}</strong><span>{attentionCount === 1 ? 'one open channel' : 'open channels'}</span></div>
      </section>

      <section className="system-panel" aria-labelledby="system-checks-heading">
        <div className="system-panel-heading"><div><p className="system-eyebrow">Conditions</p><h2 id="system-checks-heading">What is holding right now</h2></div><span className="system-updated">Checked moments ago</span></div>
        <div className="system-check-list">
          {checks.map(check => (
            <div className={`system-check-row system-check-${check.state}`} key={check.id}>
              <button type="button" className="system-check-toggle" aria-expanded={expanded === check.id} onClick={() => setExpanded(expanded === check.id ? null : check.id)}>
                <span className="system-check-icon"><span /></span>
                <span className="system-check-copy"><strong>{check.name}</strong><small>{check.purpose}</small></span>
                <span className="system-check-state">{stateLabel[check.state]}</span>
                <span className="system-check-chevron">{expanded === check.id ? '−' : '+'}</span>
              </button>
              {expanded === check.id && <div className="system-check-detail"><p>{check.detail}</p><span>Last checked {check.lastChecked}</span>{check.action && <button type="button" className="btn-ghost">{check.action}</button>}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="system-guidance" aria-label="System guidance">
        <span className="system-guidance-mark">◉</span>
        <div><p className="system-eyebrow">Next right tending</p><h2>Keep the system legible, not busy.</h2><p>When a source is quiet, let that be information. When a condition needs care, make the smallest useful adjustment and return to flow.</p></div>
      </section>
    </div>
  );
}
