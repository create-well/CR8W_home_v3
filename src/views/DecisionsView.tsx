import React, { useMemo, useState } from 'react';

type DecisionStatus = 'ready' | 'holding' | 'decided';
type Decision = {
  id: string;
  title: string;
  context: string;
  nextRightAction: string;
  owner: string;
  due: string;
  status: DecisionStatus;
  signal: string;
};

interface Props {
  tasks: readonly any[];
}

const starterDecisions: Decision[] = [
  {
    id: 'design-system',
    title: 'Choose the next dashboard surface to tend',
    context: 'The well has a working route structure. The next drop should deepen one shared operating surface.',
    nextRightAction: 'Name the smallest useful screen to bring into flow.',
    owner: 'Monny',
    due: 'This week',
    status: 'ready',
    signal: 'Clear enough to respond',
  },
  {
    id: 'care-consent',
    title: 'Hold the Care Loop boundary',
    context: 'Contact invitations remain consent-aware so no outreach is initiated without a clear yes.',
    nextRightAction: 'Confirm the consent signal before opening a channel.',
    owner: 'Pia',
    due: 'When invited',
    status: 'holding',
    signal: 'Waiting for permission',
  },
  {
    id: 'source-flow',
    title: 'Tend the next source-flow channel',
    context: 'Resource movement is tracked as a shared source and structure, not as pressure to close.',
    nextRightAction: 'Choose the relationship or resource that wants tending next.',
    owner: 'Pia',
    due: 'Next right invitation',
    status: 'ready',
    signal: 'Open for a response',
  },
];

const statusLabels: Record<DecisionStatus, string> = {
  ready: 'Ready to respond',
  holding: 'Holding the boundary',
  decided: 'Decision landed',
};

export function DecisionsView({ tasks }: Props) {
  const [filter, setFilter] = useState<'all' | DecisionStatus>('all');
  const [decisions, setDecisions] = useState(starterDecisions);

  const visible = useMemo(
    () => filter === 'all' ? decisions : decisions.filter(decision => decision.status === filter),
    [decisions, filter],
  );

  const landDecision = (id: string) => {
    setDecisions(previous => previous.map(decision => decision.id === id ? { ...decision, status: 'decided' } : decision));
  };

  return (
    <div className="decisions-view" data-testid="decisions-view">
      <div className="decisions-intro">
        <div>
          <p className="decisions-kicker">A place to pause, see, and choose</p>
          <p className="decisions-description">The queue holds what wants a clear response without forcing the river.</p>
        </div>
        <div className="decisions-summary" aria-label="Decision queue summary">
          <strong>{decisions.filter(decision => decision.status !== 'decided').length}</strong>
          <span>open decisions</span>
        </div>
      </div>

      <div className="decisions-toolbar" role="toolbar" aria-label="Filter decisions">
        <span className="decisions-toolbar-label">Show</span>
        {(['all', 'ready', 'holding', 'decided'] as const).map(option => (
          <button
            key={option}
            type="button"
            className={filter === option ? 'decision-filter is-active' : 'decision-filter'}
            onClick={() => setFilter(option)}
          >
            {option === 'all' ? 'All' : statusLabels[option]}
          </button>
        ))}
      </div>

      {tasks.length > 0 && (
        <div className="decisions-source-note">{tasks.length} active task{tasks.length === 1 ? '' : 's'} can be brought into this queue when they need a decision.</div>
      )}

      <div className="decision-list">
        {visible.map(decision => (
          <article className={`decision-card decision-card-${decision.status}`} key={decision.id}>
            <div className="decision-card-topline">
              <span className="decision-signal"><span className="decision-signal-dot" />{decision.signal}</span>
              <span className="decision-due">{decision.due}</span>
            </div>
            <h2>{decision.title}</h2>
            <p className="decision-context">{decision.context}</p>
            <div className="decision-next">
              <span className="decision-next-label">Next right invitation</span>
              <strong>{decision.nextRightAction}</strong>
            </div>
            <div className="decision-card-footer">
              <span className="decision-owner">Held by <strong>{decision.owner}</strong></span>
              {decision.status !== 'decided' ? (
                <button type="button" className="btn-primary decision-land-button" onClick={() => landDecision(decision.id)}>
                  Land this decision
                </button>
              ) : (
                <span className="decision-landed">Landed in the flow</span>
              )}
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 && <div className="view-shell-message view-shell-empty">Nothing is waiting in this state. The quiet is useful information.</div>}
    </div>
  );
}
