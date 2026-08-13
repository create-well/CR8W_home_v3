import React, { useState, useMemo } from 'react';
import type { Episode, Guest, TopicDrop } from '../api';

interface Props {
  episodes: Episode[];
  guests: Guest[];
  topicDrops: TopicDrop[];
  onAddEpisode: (e: Omit<Episode, 'id' | 'created_at'>) => void;
  onUpdateEpisode: (id: string, e: Partial<Episode>) => void;
  onDeleteEpisode: (id: string) => void;
  onAddGuest: (g: Omit<Guest, 'id' | 'created_at'>) => void;
  onUpdateGuest: (id: string, g: Partial<Guest>) => void;
  onAddTopicDrop: (d: Omit<TopicDrop, 'id' | 'created_at'>) => void;
  onUpdateTopicDrop: (id: string, d: Partial<TopicDrop>) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS: Record<string, string> = {
  Sun: 'Team check-in',
  Mon: 'Drops open',
  Tue: 'Flow Motion + guest prep deadline',
  Wed: 'Weeecording Day',
  Thu: 'Edit batched',
  Fri: 'Backup recording',
  Sat: 'Rest',
};

const EPISODE_STATUSES: Episode['status'][] = [
  'drops open',
  'synthesized',
  'topic locked',
  'prepped',
  'recorded',
  'decomprocessed',
  'editing',
  'depanty',
  'published',
];

const STATUS_COLORS: Record<string, string> = {
  'drops open': '#8A7D72',
  'synthesized': '#5B8BA0',
  'topic locked': '#D4A771',
  'prepped': '#7A9E7E',
  'recorded': '#C25B38',
  'decomprocessed': '#E8AF93',
  'editing': '#D4A771',
  'depanty': '#7A9E7E',
  'published': '#C25B38',
};

const GUEST_STAGES: Guest['stage'][] = [
  'aligned',
  'invited',
  'scheduled',
  'prepped',
  'recorded',
  'aired',
  'thanked',
];

export function PodcastView({
  episodes,
  guests,
  topicDrops,
  onAddEpisode,
  onUpdateEpisode,
  onDeleteEpisode,
  onAddGuest,
  onUpdateGuest,
  onAddTopicDrop,
  onUpdateTopicDrop,
}: Props) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'well' | 'guests' | 'recording'>('pipeline');
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showAddDrop, setShowAddDrop] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [dropAnonymous, setDropAnonymous] = useState(false);
  const [dropText, setDropText] = useState('');
  const [dropper, setDropper] = useState('');
  const [synthText, setSynthText] = useState('');
  const [synthEpisodeId, setSynthEpisodeId] = useState<string | null>(null);

  // ── Rhythm Strip ────────────────────────────────────────────────────────────
  const today = new Date();
  const todayDay = DAYS[today.getDay()];

  // ── Episode form state ──────────────────────────────────────────────────────
  const [epForm, setEpForm] = useState<Partial<Episode>>({
    episodeNum: episodes.length > 0 ? Math.max(...episodes.map(e => e.episodeNum)) + 1 : 1,
    status: 'drops open',
    topic: '',
    recordingDate: '',
    roles: {},
  });

  // ── Guest form state ────────────────────────────────────────────────────────
  const [guestForm, setGuestForm] = useState<Partial<Guest>>({
    name: '',
    contact: '',
    connectionType: 'community member',
    stage: 'aligned',
  });

  // Sort episodes by episode number
  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => b.episodeNum - a.episodeNum),
    [episodes]
  );

  // Group episodes by status for pipeline view
  const episodesByStatus = useMemo(() => {
    const map: Record<string, Episode[]> = {};
    EPISODE_STATUSES.forEach(s => (map[s] = []));
    sortedEpisodes.forEach(e => {
      if (map[e.status]) map[e.status].push(e);
    });
    return map;
  }, [sortedEpisodes]);

  // Active episode (most recent non-published)
  const activeEpisode = sortedEpisodes.find(e => e.status !== 'published') || sortedEpisodes[0];

  // Guest prep warning: find guests with stage 'scheduled' where topic not sent and recording is this week
  const guestsNeedingPrep = guests.filter(
    g => g.stage === 'scheduled' && !g.topicSent && g.recordingDate
  );

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAddEpisode = () => {
    if (!epForm.topic || !epForm.episodeNum) return;
    onAddEpisode(epForm as Omit<Episode, 'id' | 'created_at'>);
    setShowAddEpisode(false);
    setEpForm({
      episodeNum: (epForm.episodeNum || 0) + 1,
      status: 'drops open',
      topic: '',
      recordingDate: '',
      roles: {},
    });
  };

  const handleAddGuest = () => {
    if (!guestForm.name) return;
    onAddGuest(guestForm as Omit<Guest, 'id' | 'created_at'>);
    setShowAddGuest(false);
    setGuestForm({ name: '', contact: '', connectionType: 'community member', stage: 'aligned' });
  };

  const handleAddDrop = () => {
    if (!dropText.trim()) return;
    onAddTopicDrop({
      text: dropText.trim(),
      dropper: dropAnonymous ? null : dropper || null,
      candidate: false,
    });
    setDropText('');
    setDropper('');
    setDropAnonymous(false);
    setShowAddDrop(false);
  };

  const handleLockTopic = (epId: string) => {
    onUpdateEpisode(epId, { status: 'topic locked' });
  };

  const handleMoveStatus = (epId: string, newStatus: Episode['status']) => {
    onUpdateEpisode(epId, { status: newStatus });
  };

  const handleSynthesize = () => {
    if (!synthText.trim() || !synthEpisodeId) return;
    onUpdateEpisode(synthEpisodeId, {
      status: 'synthesized',
    });
    // Also mark drops as candidate
    topicDrops
      .filter(d => d.text.toLowerCase().includes(synthText.toLowerCase().slice(0, 20)))
      .forEach(d => onUpdateTopicDrop(d.id, { candidate: true, whyLanded: synthText }));
    setSynthText('');
    setSynthEpisodeId(null);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderRhythmStrip = () => (
    <div className="card view-full" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>🎙️</span>
        <h3 style={{ margin: 0 }}>Weekly Rhythm</h3>
        {todayDay === 'Wed' && (
          <span className="badge badge-rust" style={{ marginLeft: 'auto' }}>Weeecording Day 🎙️</span>
        )}
        {todayDay === 'Tue' && guestsNeedingPrep.length > 0 && (
          <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>
            ⚠️ {guestsNeedingPrep.length} guest{guestsNeedingPrep.length > 1 ? 's' : ''} not prepped
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {DAYS.map(day => {
          const isToday = day === todayDay;
          return (
            <div
              key={day}
              style={{
                flex: '1 0 100px',
                padding: '10px 8px',
                borderRadius: 'var(--radius-md)',
                background: isToday ? 'var(--rust)' : 'var(--cream)',
                color: isToday ? 'var(--cream)' : 'var(--charcoal)',
                textAlign: 'center',
                opacity: isToday ? 1 : 0.7,
                minWidth: 90,
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem' }}>
                {day}
              </div>
              <div style={{ fontSize: '0.72rem', marginTop: 4, lineHeight: 1.3 }}>
                {DAY_LABELS[day]}
              </div>
              {isToday && (
                <div style={{ fontSize: '0.65rem', marginTop: 4, opacity: 0.9 }}>TODAY</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderEpisodeCard = (ep: Episode) => (
    <div
      key={ep.id}
      className="pipeline-card"
      style={{ borderLeft: `3px solid ${STATUS_COLORS[ep.status] || '#8A7D72'}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="badge" style={{ background: `${STATUS_COLORS[ep.status]}20`, color: STATUS_COLORS[ep.status] }}>
          EP {String(ep.episodeNum).padStart(3, '0')}
        </span>
        {ep.movedToFriday && <span style={{ fontSize: '0.72rem' }}>🌊 moved to Fri</span>}
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
        {ep.topic || '(no topic yet)'}
      </div>
      {ep.recordingDate && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          🎙️ {new Date(ep.recordingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
      {ep.guestId && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
          👤 {guests.find(g => g.id === ep.guestId)?.name || 'Guest'}
        </div>
      )}
      {ep.roles && Object.entries(ep.roles).filter(([,v]) => v).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {Object.entries(ep.roles).filter(([,v]) => v).map(([role, person]) => (
            <span key={role} className="badge badge-clay" style={{ fontSize: '0.65rem' }}>
              {role.replace(/([A-Z])/g, ' $1').trim()}: {person}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {EPISODE_STATUSES.map((s, i) => {
          const currentIdx = EPISODE_STATUSES.indexOf(ep.status);
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isNext = i === currentIdx + 1;
          return (
            <button
              key={s}
              className="btn-ghost"
              style={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                borderRadius: 'var(--radius-sm)',
                opacity: isPast ? 0.5 : isCurrent ? 1 : isNext ? 0.85 : 0.4,
                background: isCurrent ? `${STATUS_COLORS[s]}15` : 'transparent',
                borderColor: isCurrent ? STATUS_COLORS[s] : undefined,
              }}
              onClick={() => isNext && handleMoveStatus(ep.id, s)}
              disabled={!isNext}
              title={isNext ? `Move to ${s}` : s}
            >
              {isPast ? '✓' : isCurrent ? '▸' : '○'} {s}
            </button>
          );
        })}
      </div>
      {ep.decomprocessingNotes && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
          💧 {ep.decomprocessingNotes.slice(0, 80)}{ep.decomprocessingNotes.length > 80 ? '...' : ''}
        </div>
      )}
    </div>
  );

  const renderPipeline = () => (
    <div className="view-grid">
      {renderRhythmStrip()}

      <div className="card view-full">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>🎙️ Episode Pipeline</h3>
          <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => setShowAddEpisode(true)}>
            + New eppy
          </button>
        </div>

        {episodes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
            The well is still filling 💧<br />
            <span style={{ fontSize: '0.85rem' }}>Drop your first topic to get flowing.</span>
          </p>
        ) : (
          <div className="pipeline">
            {EPISODE_STATUSES.map(status => (
              <div key={status} className="pipeline-col" style={{ minWidth: 240, flex: '1 1 240px' }}>
                <div className="pipeline-header">
                  <span style={{ color: STATUS_COLORS[status] }}>{status}</span>
                  <span className="pipeline-count">{episodesByStatus[status]?.length || 0}</span>
                </div>
                {episodesByStatus[status]?.map(renderEpisodeCard)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTopicWell = () => {
    const drops = [...topicDrops].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const candidates = drops.filter(d => d.candidate);
    const rawDrops = drops.filter(d => !d.candidate && !d.locked);

    return (
      <div className="view-grid">
        {renderRhythmStrip()}

        <div className="card view-full">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>💧 The Topic Well</h3>
            <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => setShowAddDrop(true)}>
              Drop it in
            </button>
          </div>

          {drops.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              The well is quiet. Toss in topics anytime.
            </p>
          )}

          {/* Raw Drops */}
          {rawDrops.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 10 }}>Fresh Drops</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {rawDrops.map(d => (
                  <div
                    key={d.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--cream)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', marginBottom: 6 }}>{d.text}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {d.dropper || '🫧 anonymous'} · {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'recent'}
                      </span>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                        onClick={() => onUpdateTopicDrop(d.id, { candidate: true })}
                      >
                        Make candidate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flow Motion / Synthesis */}
          <div style={{ marginBottom: 24, padding: '16px', borderRadius: 'var(--radius-lg)', background: 'rgba(194,91,56,0.05)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: 10 }}>🌊 Flow Motion (Monny's synthesis)</h4>
            {activeEpisode && activeEpisode.status === 'drops open' ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Read the raw drops. Propose 2–3 candidate topics with a "why this landed" note.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Candidate topic: CREATING AND ____"
                    value={synthText}
                    onChange={e => setSynthText(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <button
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    onClick={handleSynthesize}
                    disabled={!synthText.trim()}
                  >
                    Synthesize
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Topic already locked for EP {String(activeEpisode?.episodeNum || 0).padStart(3, '0')}: {activeEpisode?.topic}
              </p>
            )}
          </div>

          {/* Candidates */}
          {candidates.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 10 }}>Candidates</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {candidates.map(d => (
                  <div
                    key={d.id}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--cream)',
                      boxShadow: 'var(--shadow-sm)',
                      borderLeft: `3px solid ${d.gut === 'mmm-hmm' ? 'var(--success)' : d.gut === 'unh-unh' ? 'var(--danger)' : 'var(--camel)'}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 4 }}>{d.text}</div>
                    {d.whyLanded && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>
                        “{d.whyLanded}”
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className={`badge ${d.gut === 'mmm-hmm' ? 'badge-success' : 'badge-clay'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
                        onClick={() => onUpdateTopicDrop(d.id, { gut: 'mmm-hmm' })}
                      >
                        mmm-hmm
                      </button>
                      <button
                        className={`badge ${d.gut === 'unh-unh' ? 'badge-danger' : 'badge-clay'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
                        onClick={() => onUpdateTopicDrop(d.id, { gut: 'unh-unh' })}
                      >
                        unh-unh
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {d.voteCount || 0} votes
                      </span>
                      {activeEpisode && activeEpisode.status === 'drops open' && (
                        <button
                          className="btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.72rem', marginLeft: 'auto' }}
                          onClick={() => {
                            onUpdateEpisode(activeEpisode.id, { topic: d.text, status: 'topic locked' });
                            onUpdateTopicDrop(d.id, { locked: true });
                          }}
                        >
                          🔒 Lock topic
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGuests = () => (
    <div className="view-grid">
      {renderRhythmStrip()}

      <div className="card view-full">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>👤 Guest Flow</h3>
          <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => setShowAddGuest(true)}>
            + Add guest
          </button>
        </div>

        {guestsNeedingPrep.length > 0 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(184,74,50,0.08)',
            borderLeft: '3px solid var(--danger)',
            marginBottom: 16,
          }}>
            <strong style={{ color: 'var(--danger)' }}>⚠️ Guest prep deadline today (Tuesday)</strong>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {guestsNeedingPrep.map(g => (
                <div key={g.id} style={{ fontSize: '0.85rem' }}>
                  {g.name} — recording {g.recordingDate ? new Date(g.recordingDate).toLocaleDateString() : 'TBD'}
                </div>
              ))}
            </div>
          </div>
        )}

        {guests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
            No guests yet. Community voices first.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {guests.map(g => (
              <div
                key={g.id}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--cream)',
                  boxShadow: 'var(--shadow-sm)',
                  borderLeft: `3px solid ${
                    g.stage === 'thanked' ? 'var(--success)' :
                    g.stage === 'recorded' ? 'var(--rust)' :
                    g.stage === 'scheduled' && !g.topicSent ? 'var(--danger)' :
                    'var(--camel)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{g.name}</span>
                  <span className="badge badge-clay" style={{ fontSize: '0.65rem' }}>{g.connectionType}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  {g.contact}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {GUEST_STAGES.map((s, i) => {
                    const currentIdx = GUEST_STAGES.indexOf(g.stage);
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <span
                        key={s}
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: 100,
                          background: isCurrent ? 'var(--rust)' : isPast ? 'var(--success)' : 'var(--sandstone)',
                          color: isCurrent || isPast ? 'white' : 'var(--charcoal)',
                          opacity: isPast ? 0.6 : 1,
                        }}
                      >
                        {isPast ? '✓' : isCurrent ? '▸' : '○'} {s}
                      </span>
                    );
                  })}
                </div>
                {g.episodeNum && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    EP {String(g.episodeNum).padStart(3, '0')}
                    {g.recordingDate && ` · ${new Date(g.recordingDate).toLocaleDateString()}`}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {!g.topicSent && g.stage === 'scheduled' && (
                    <button
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                      onClick={() => onUpdateGuest(g.id, { topicSent: true, topicSentDate: new Date().toISOString().split('T')[0] })}
                    >
                      Mark topic sent
                    </button>
                  )}
                  {g.stage === 'recorded' && (
                    <button
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                      onClick={() => onUpdateGuest(g.id, { stage: 'aired' })}
                    >
                      Mark aired
                    </button>
                  )}
                  {g.stage === 'aired' && !g.thanked && (
                    <button
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                      onClick={() => onUpdateGuest(g.id, { thanked: true, stage: 'thanked' })}
                    >
                      Mark thanked
                    </button>
                  )}
                  <button
                    className="btn-ghost"
                    style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                    onClick={() => {
                      const nextStage = GUEST_STAGES[GUEST_STAGES.indexOf(g.stage) + 1];
                      if (nextStage) onUpdateGuest(g.id, { stage: nextStage });
                    }}
                    disabled={g.stage === 'thanked'}
                  >
                    Advance →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderRecordingDay = () => {
    const todayEp = activeEpisode;
    if (!todayEp) return (
      <div className="view-grid">
        {renderRhythmStrip()}
        <div className="card view-full" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No active episode. Start one in the pipeline.</p>
        </div>
      </div>
    );

    return (
      <div className="view-grid">
        {renderRhythmStrip()}

        {/* Role Banner */}
        <div className="card view-full" style={{ background: 'var(--rust)', color: 'var(--cream)' }}>
          <h2 style={{ color: 'var(--cream)', marginBottom: 8 }}>🎙️ Weeecording Day — EP {String(todayEp.episodeNum).padStart(3, '0')}</h2>
          <div style={{ fontSize: '1.1rem', marginBottom: 14, opacity: 0.95 }}>
            {todayEp.topic || '(topic not locked yet)'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {todayEp.roles && Object.entries(todayEp.roles).filter(([,v]) => v).map(([role, person]) => (
              <div key={role} style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {role.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{person}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gear Card */}
        <div className="card">
          <h3>🔧 Gear Check (Omar)</h3>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Rodecaster: Noise Gate OFF, Compressor ON, Limiter ON at -3dB',
              'Mics on stands + pop filters',
              'Levels: speech green/yellow (-16 to -12dB), laugh stays under red',
              'DJI synced + batteries full',
              'Backup audio running',
              '25-min DJI cutaway cued',
            ].map((item, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" style={{ marginTop: 3 }} />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Ritual Run-of-Show */}
        <div className="card">
          <h3>🌊 Ritual Flow</h3>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Collective Breath', time: '0 min' },
              { label: 'Get It Off Your Chest', time: '5 min' },
              { label: 'Discussion', time: '25 min breath marker', highlight: true },
              { label: 'Accoutrement', time: 'media deadline Thu night' },
              { label: 'Closing Ritual', time: '💧 creative well / 💧 reflections / 💧 wildcard' },
              { label: 'Benediction', time: '' },
              { label: 'Collective Sigh', time: '' },
            ].map((step, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: step.highlight ? 'rgba(194,91,56,0.08)' : 'var(--cream)',
                borderLeft: step.highlight ? '3px solid var(--rust)' : '3px solid transparent',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{step.label}</div>
                {step.time && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{step.time}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Decomprocessing */}
        <div className="card">
          <h3>💧 Decomprocessing Notes</h3>
          <textarea
            placeholder="What flowed, what flooded..."
            value={todayEp.decomprocessingNotes || ''}
            onChange={e => onUpdateEpisode(todayEp.id, { decomprocessingNotes: e.target.value })}
            style={{ width: '100%', marginTop: 10 }}
          />
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        borderBottom: '2px solid var(--sandstone)',
        paddingBottom: 8,
      }}>
        {[
          { key: 'pipeline' as const, label: '🎙️ Pipeline' },
          { key: 'well' as const, label: '💧 Topic Well' },
          { key: 'guests' as const, label: '👤 Guests' },
          { key: 'recording' as const, label: '🔴 Recording Day' },
        ].map(tab => (
          <button
            key={tab.key}
            className="topnav-link"
            style={{
              background: activeTab === tab.key ? 'rgba(194,91,56,0.08)' : 'transparent',
              color: activeTab === tab.key ? 'var(--rust)' : 'var(--text-muted)',
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pipeline' && renderPipeline()}
      {activeTab === 'well' && renderTopicWell()}
      {activeTab === 'guests' && renderGuests()}
      {activeTab === 'recording' && renderRecordingDay()}

      {/* Add Episode Modal */}
      {showAddEpisode && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddEpisode(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">+ New Eppy</span>
              <button className="modal-close" onClick={() => setShowAddEpisode(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Episode #</label>
              <input type="number" value={epForm.episodeNum || ''} onChange={e => setEpForm({ ...epForm, episodeNum: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Topic (CREATING AND ____)</label>
              <input type="text" placeholder="e.g. Creating & Surviving" value={epForm.topic || ''} onChange={e => setEpForm({ ...epForm, topic: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Recording Date</label>
              <input type="date" value={epForm.recordingDate || ''} onChange={e => setEpForm({ ...epForm, recordingDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={epForm.status || 'drops open'} onChange={e => setEpForm({ ...epForm, status: e.target.value as Episode['status'] })}>
                {EPISODE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Flow Keeper</label>
                <input type="text" value={epForm.roles?.flowKeeper || ''} onChange={e => setEpForm({ ...epForm, roles: { ...epForm.roles, flowKeeper: e.target.value } })} />
              </div>
              <div className="form-group">
                <label>Grounding Opener</label>
                <input type="text" value={epForm.roles?.groundingOpener || ''} onChange={e => setEpForm({ ...epForm, roles: { ...epForm.roles, groundingOpener: e.target.value } })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Taste Editor</label>
                <input type="text" value={epForm.roles?.tasteEditor || ''} onChange={e => setEpForm({ ...epForm, roles: { ...epForm.roles, tasteEditor: e.target.value } })} />
              </div>
              <div className="form-group">
                <label>Tech Anchor</label>
                <input type="text" value={epForm.roles?.techAnchor || ''} onChange={e => setEpForm({ ...epForm, roles: { ...epForm.roles, techAnchor: e.target.value } })} />
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleAddEpisode}>
              Drop it in
            </button>
          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddGuest(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">+ Add Guest</span>
              <button className="modal-close" onClick={() => setShowAddGuest(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={guestForm.name || ''} onChange={e => setGuestForm({ ...guestForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Contact (iMessage / social)</label>
              <input type="text" value={guestForm.contact || ''} onChange={e => setGuestForm({ ...guestForm, contact: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Connection Type</label>
                <select value={guestForm.connectionType || 'community member'} onChange={e => setGuestForm({ ...guestForm, connectionType: e.target.value as Guest['connectionType'] })}>
                  <option value="community member">Community member</option>
                  <option value="collaborator">Collaborator</option>
                  <option value="reciprocal pod">Reciprocal pod</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select value={guestForm.stage || 'aligned'} onChange={e => setGuestForm({ ...guestForm, stage: e.target.value as Guest['stage'] })}>
                  {GUEST_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleAddGuest}>
              Add guest
            </button>
          </div>
        </div>
      )}

      {/* Add Drop Modal */}
      {showAddDrop && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddDrop(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">💧 Drop a topic</span>
              <button className="modal-close" onClick={() => setShowAddDrop(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Your drop</label>
              <textarea
                placeholder="CREATING AND ____"
                value={dropText}
                onChange={e => setDropText(e.target.value)}
                style={{ minHeight: 60 }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={dropAnonymous} onChange={e => setDropAnonymous(e.target.checked)} />
                🫧 Anonymous (synthesizer can't see who dropped it)
              </label>
            </div>
            {!dropAnonymous && (
              <div className="form-group">
                <label>Name / emoji</label>
                <input type="text" placeholder="Monny 🌊" value={dropper} onChange={e => setDropper(e.target.value)} />
              </div>
            )}
            <button className="btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleAddDrop}>
              Toss it in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
