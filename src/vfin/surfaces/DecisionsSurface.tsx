import { useMemo, useState } from 'react';
import type { VfinDecision, VfinPayload } from '../contracts';
import { VfinViewShell } from '../components/VfinViewShell';

interface DecisionsSurfaceProps {
  payload: VfinPayload;
  initialDecisions?: readonly VfinDecision[];
  onRetry?: () => void;
  onAdd?: (decision: VfinDecision) => void;
  onDecide?: (decision: VfinDecision) => void;
  onDefer?: (decision: VfinDecision) => void;
}

const urgencyLabel: Record<VfinDecision['urgency'], string> = {
  now: 'Needs deciding now',
  'this-week': 'This week',
  'when-clear': 'When clarity arrives',
};

const urgencyClass: Record<VfinDecision['urgency'], string> = {
  now: 'vfin-card--now',
  'this-week': 'vfin-card--week',
  'when-clear': 'vfin-card--clear',
};

export function DecisionsSurface({ payload, initialDecisions = [], onRetry, onAdd, onDecide, onDefer }: DecisionsSurfaceProps) {
  const [decisions, setDecisions] = useState<VfinDecision[]>(() => [...initialDecisions]);
  const [isAdding, setIsAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [urgency, setUrgency] = useState<VfinDecision['urgency']>('this-week');
  const [answerById, setAnswerById] = useState<Record<string, string>>({});

  const pending = useMemo(() => {
    const order: Record<VfinDecision['urgency'], number> = { now: 0, 'this-week': 1, 'when-clear': 2 };
    return decisions
      .filter((decision) => decision.status === 'pending' || decision.status === 'deferred')
      .sort((a, b) => order[a.urgency] - order[b.urgency]);
  }, [decisions]);

  const decided = useMemo(() => decisions.filter((decision) => decision.status === 'decided'), [decisions]);

  function addDecision(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    const decision: VfinDecision = {
      id: `decision-${Date.now()}`,
      question: question.trim(),
      context: context.trim() || undefined,
      urgency,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setDecisions((current) => [decision, ...current]);
    onAdd?.(decision);
    setQuestion('');
    setContext('');
    setUrgency('this-week');
    setIsAdding(false);
  }

  function markDecided(decision: VfinDecision) {
    const updated: VfinDecision = {
      ...decision,
      status: 'decided',
      answer: answerById[decision.id]?.trim() || undefined,
      decidedAt: new Date().toISOString(),
    };
    setDecisions((current) => current.map((item) => item.id === decision.id ? updated : item));
    onDecide?.(updated);
  }

  function defer(decision: VfinDecision) {
    const updated: VfinDecision = { ...decision, status: 'deferred', urgency: 'when-clear' };
    setDecisions((current) => current.map((item) => item.id === decision.id ? updated : item));
    onDefer?.(updated);
  }

  return (
    <VfinViewShell
      title="Decisions"
      state={payload.modules.decisions}
      onRetry={onRetry}
      emptyTitle="Nothing needs deciding right now"
      emptyBody="A clear queue is good tending, not avoidance."
      restrictedBody="Decision context is shared only when the appropriate access is in place."
    >
      <p className="vfin-meta">A calm place to add, decide, or defer what needs clarity. Pia’s Care and Source Flow stewardship remains consent-aware.</p>

      <div className="vfin-actions" style={{ margin: '1rem 0' }}>
        <button type="button" onClick={() => setIsAdding((current) => !current)}>{isAdding ? 'Cancel' : '+ Add decision'}</button>
      </div>

      {isAdding && (
        <form className="vfin-inline-form" onSubmit={addDecision}>
          <label>
            What needs a decision?
            <input value={question} onChange={(event) => setQuestion(event.target.value)} required />
          </label>
          <label>
            Context, if useful
            <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={2} />
          </label>
          <label>
            Urgency
            <select value={urgency} onChange={(event) => setUrgency(event.target.value as VfinDecision['urgency'])}>
              <option value="now">Needs deciding now</option>
              <option value="this-week">This week</option>
              <option value="when-clear">When clarity arrives</option>
            </select>
          </label>
          <div className="vfin-actions"><button type="submit">Add to queue</button></div>
        </form>
      )}

      {pending.length === 0 && !isAdding ? (
        <div className="vfin-card"><strong>Nothing needs deciding right now.</strong><p className="vfin-meta">Let the space stay clear until the next right invitation appears.</p></div>
      ) : (
        pending.map((decision) => (
          <article key={decision.id} className={`vfin-card ${urgencyClass[decision.urgency]}`}>
            <p className="vfin-meta">{urgencyLabel[decision.urgency]}{decision.status === 'deferred' ? ' · deferred' : ''}</p>
            <h3>{decision.question}</h3>
            {decision.context && <p>{decision.context}</p>}
            <label className="vfin-meta">
              Decision note
              <input value={answerById[decision.id] ?? ''} onChange={(event) => setAnswerById((current) => ({ ...current, [decision.id]: event.target.value }))} placeholder="What is clear now?" />
            </label>
            <div className="vfin-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" onClick={() => markDecided(decision)}>Decide</button>
              <button type="button" onClick={() => defer(decision)}>Defer</button>
            </div>
          </article>
        ))
      )}

      {decided.length > 0 && (
        <section aria-label="Decided items">
          <h3>Decided</h3>
          {decided.map((decision) => (
            <article key={decision.id} className="vfin-card">
              <strong>{decision.question}</strong>
              {decision.answer && <p className="vfin-meta">{decision.answer}</p>}
            </article>
          ))}
        </section>
      )}
    </VfinViewShell>
  );
}
