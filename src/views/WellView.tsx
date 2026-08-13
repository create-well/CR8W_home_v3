import React, { useState } from 'react';
import type { ForumPost, ForumReply, BrainDump } from '../api';
import type { SbWellNote, WellNotesRealtimeStatus } from '../hooks/useWellNotesRealtime';

interface Props {
  forum: ForumPost[];
  forumReplies: ForumReply[];
  wellNotes: SbWellNote[];
  wellNotesStatus: WellNotesRealtimeStatus;
  wellNotesError: string | null;
  onRetryWellNotes: () => void;
  brainDumps: BrainDump[];
  onAddForumPost: (post: Omit<ForumPost, 'id' | 'created_at'>) => void;
  onAddForumReply: (postId: number, reply: { author: string; content: string }) => void;
  onAddWellNote: (content: string) => void;
  onLandWellNote: (id: string) => void;
  onAddBrainDump: (dump: Omit<BrainDump, 'id' | 'created_at'>) => void;
}

export function WellView({ forum, forumReplies, wellNotes, wellNotesStatus, wellNotesError, onRetryWellNotes, brainDumps, onAddForumPost, onAddForumReply, onAddWellNote, onLandWellNote, onAddBrainDump }: Props) {
  const [tab, setTab] = useState<'forum' | 'drops' | 'braindumps'>('forum');
  const [forumContent, setForumContent] = useState('');
  const [forumTag, setForumTag] = useState('');
  const [forumAuthor, setForumAuthor] = useState('monny');
  const [replyContent, setReplyContent] = useState<Record<number, string>>({});
  const [wellContent, setWellContent] = useState('');
  const [brainContent, setBrainContent] = useState('');
  const [brainTags, setBrainTags] = useState('');
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  const handlePost = () => {
    if (!forumContent.trim()) return;
    onAddForumPost({ author: forumAuthor, content: forumContent, tag: forumTag || undefined });
    setForumContent(''); setForumTag('');
  };

  const handleWellDrop = () => {
    if (!wellContent.trim()) return;
    onAddWellNote(wellContent);
    setWellContent('');
  };

  const handleBrainDump = () => {
    if (!brainContent.trim()) return;
    onAddBrainDump({ author: forumAuthor, content: brainContent, tags: brainTags });
    setBrainContent(''); setBrainTags('');
  };

  const repliesFor = (postId: number) => forumReplies.filter(r => r.postId === postId);

  return (
    <div data-testid="well-view">
      <h1>💧 The Well</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Async drops. Ideas, downloads, threads. The water holds what you release.
      </p>
      <div data-testid="well-notes-status" role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', marginBottom: 16, borderRadius: 8, background: wellNotesStatus === 'error' ? '#f7e1d8' : 'var(--cream)' }}>
        <span>{wellNotesStatus === 'live' ? '● Well live' : wellNotesStatus === 'connecting' ? '○ Reconnecting to the Well…' : wellNotesStatus === 'loading' ? '○ Loading the Well…' : wellNotesError || 'The Well is temporarily unavailable.'}</span>
        {(wellNotesStatus === 'error' || wellNotesStatus === 'connecting') && (
          <button data-testid="well-notes-retry" className="btn-ghost" type="button" onClick={onRetryWellNotes} style={{ padding: '4px 10px' }}>Retry</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['forum', 'drops', 'braindumps'] as const).map(t => (
          <button key={t} data-testid={`well-tab-${t}`} className={tab === t ? 'btn-primary' : 'btn-ghost'} style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setTab(t)}>
            {t === 'forum' ? '💬 Forum' : t === 'drops' ? '💧 Drops' : '🧠 Brain Dumps'}
          </button>
        ))}
      </div>

      {tab === 'forum' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Start a thread</h3>
            <div className="form-group">
              <textarea value={forumContent} onChange={e => setForumContent(e.target.value)} placeholder="What's moving in you?" style={{ minHeight: 60 }} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tag</label>
                <input value={forumTag} onChange={e => setForumTag(e.target.value)} placeholder="e.g. idea, question, resource" />
              </div>
              <div className="form-group">
                <label>As</label>
                <select value={forumAuthor} onChange={e => setForumAuthor(e.target.value)}>
                  <option value="monny">Monny</option>
                  <option value="sunshine">Sunshine</option>
                  <option value="bingle">Bingle</option>
                  <option value="omar">Omar</option>
                  <option value="pia">Pia</option>
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={handlePost}>Drop it in</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {forum.map(post => (
              <div key={post.id} className="card" style={{ background: 'var(--cream)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge badge-rust" style={{ marginBottom: 8, display: 'inline-block' }}>{post.author}</span>
                    {post.tag && <span className="badge badge-clay" style={{ marginLeft: 6 }}>{post.tag}</span>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p style={{ margin: '10px 0', lineHeight: 1.6 }}>{post.content}</p>

                <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}>
                  {repliesFor(post.id).length} replies {expandedPost === post.id ? '▲' : '▼'}
                </button>

                {expandedPost === post.id && (
                  <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--sandstone)' }}>
                    {repliesFor(post.id).map(r => (
                      <div key={r.id} style={{ marginBottom: 10, fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--rust)' }}>{r.author}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.75rem' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                        </span>
                        <p style={{ margin: '4px 0 0' }}>{r.content}</p>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input
                        value={replyContent[post.id] || ''}
                        onChange={e => setReplyContent(p => ({ ...p, [post.id]: e.target.value }))}
                        placeholder="Reply..."
                        style={{ flex: 1, padding: '8px 12px' }}
                      />
                      <button className="btn-primary" style={{ padding: '8px 14px' }} onClick={() => {
                        const content = replyContent[post.id];
                        if (!content?.trim()) return;
                        onAddForumReply(post.id, { author: forumAuthor, content });
                        setReplyContent(p => ({ ...p, [post.id]: '' }));
                      }}>Reply</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'drops' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Drop a note</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              Anonymous-ish. Land what you catch. Others can land it too.
            </p>
            <textarea data-testid="well-note-input" value={wellContent} onChange={e => setWellContent(e.target.value)} placeholder="A download, a wondering, a phrase..." style={{ minHeight: 60 }} />
            <button data-testid="well-note-submit" className="btn-primary" style={{ marginTop: 10 }} onClick={handleWellDrop}>Drop in the well</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {wellNotes.map(note => (
              <div key={note.id} className="card" style={{ background: 'var(--cream)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ fontStyle: 'italic', lineHeight: 1.6, marginBottom: 12 }}>“{note.content}”</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => onLandWellNote(note.id)}>
                    🌊 Land ({note.landed || 0})
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'braindumps' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Brain Dump</h3>
            <textarea value={brainContent} onChange={e => setBrainContent(e.target.value)} placeholder="Unfiltered. Raw. Yours." style={{ minHeight: 80 }} />
            <input value={brainTags} onChange={e => setBrainTags(e.target.value)} placeholder="Tags (comma separated)" style={{ marginTop: 8 }} />
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleBrainDump}>Dump it</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {brainDumps.map(b => (
              <div key={b.id} className="card" style={{ background: 'var(--cream)' }}>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{b.content.slice(0, 300)}{b.content.length > 300 ? '...' : ''}</p>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-camel">{b.author}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.tags}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
