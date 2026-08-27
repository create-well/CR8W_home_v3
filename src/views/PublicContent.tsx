import React, { useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, FileText } from 'lucide-react';
import { getPublicContent, getPublicContentBySlug } from '../lib/content';
import { MarkdownContent } from '../components/MarkdownContent';

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-content-site">
      <header className="public-content-header">
        <a className="public-content-wordmark" href="/" aria-label="Create Well home">
          <span aria-hidden="true">◌</span>
          Create Well
        </a>
        <nav className="public-content-nav" aria-label="Public content navigation">
          <a href="/content">From The Well</a>
          <a href="/#podcast">Podcast</a>
        </nav>
      </header>
      {children}
      <footer className="public-content-footer">
        <span>Create Well Collective</span>
        <a href="/content">From The Well</a>
      </footer>
    </div>
  );
}

function ContentType({ type }: { type: string }) {
  return <span className="public-content-type">{type || 'Field Note'}</span>;
}

export function PublicContentIndex() {
  const items = getPublicContent();

  useEffect(() => {
    document.title = 'From The Well | Create Well';
  }, []);

  return (
    <PageShell>
      <main className="public-content-index">
        <section className="public-content-hero" aria-labelledby="public-content-heading">
          <p className="public-content-eyebrow"><BookOpen size={15} aria-hidden="true" /> From The Well</p>
          <h1 id="public-content-heading">Stories, signals, and practices for making a life that fits.</h1>
          <p>
            Notes from the Create Well Collective: shared in public, shaped by the rhythms that keep us connected to what matters.
          </p>
        </section>

        {items.length > 0 ? (
          <section className="public-content-grid" aria-label="Published content">
            {items.map((item) => (
              <article className="public-content-card" key={item.slug}>
                <div className="public-content-card-meta">
                  <ContentType type={item.type} />
                  {item.syncedAt && <span>{formatDate(item.syncedAt)}</span>}
                </div>
                <h2><a href={`/content/${encodeURIComponent(item.slug)}`}>{item.title}</a></h2>
                {item.description && <p>{item.description}</p>}
                <a className="public-content-read-link" href={`/content/${encodeURIComponent(item.slug)}`}>
                  Read note <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </article>
            ))}
          </section>
        ) : (
          <section className="public-content-empty" aria-live="polite">
            <FileText size={24} aria-hidden="true" />
            <h2>The well is gathering.</h2>
            <p>Published notes will appear here as they are shared.</p>
          </section>
        )}
      </main>
    </PageShell>
  );
}

export function PublicContentPage({ slug }: { slug: string }) {
  const item = getPublicContentBySlug(slug);

  useEffect(() => {
    document.title = item ? `${item.title} | Create Well` : 'Note not found | Create Well';
  }, [item]);

  if (!item) return <PublicContentNotFound />;

  return (
    <PageShell>
      <main className="public-content-article-wrap">
        <article className="public-content-article">
          <a className="public-content-back" href="/content">
            <ArrowLeft size={16} aria-hidden="true" /> All notes
          </a>
          <header className="public-content-article-header">
            <ContentType type={item.type} />
            <h1>{item.title}</h1>
            {item.description && <p className="public-content-article-dek">{item.description}</p>}
            {item.syncedAt && (
              <p className="public-content-date"><CalendarDays size={15} aria-hidden="true" /> Updated {formatDate(item.syncedAt)}</p>
            )}
          </header>
          <div className="public-content-prose">
            <MarkdownContent markdown={item.body || item.description} />
          </div>
        </article>
      </main>
    </PageShell>
  );
}

export function PublicContentNotFound() {
  useEffect(() => {
    document.title = 'Note not found | Create Well';
  }, []);

  return (
    <PageShell>
      <main className="public-content-empty public-content-not-found">
        <FileText size={24} aria-hidden="true" />
        <h1>This note is not available.</h1>
        <p>It may still be in the well, or the link may no longer be current.</p>
        <a className="public-content-button" href="/content">Visit From The Well</a>
      </main>
    </PageShell>
  );
}
