import React from 'react';

type InlinePart = React.ReactNode;

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderInline(text: string, keyPrefix: string): InlinePart[] {
  const tokenPattern = /(!?\[[^\]]*\]\([^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|<https?:\/\/[^>]+>)/g;
  return text.split(tokenPattern).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const image = part.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (image) {
      const source = safeUrl(image[2]);
      return source ? <img key={key} src={source} alt={image[1]} loading="lazy" /> : part;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) {
      const href = safeUrl(link[2]);
      return href ? <a key={key} href={href} target="_blank" rel="noreferrer">{link[1]}</a> : part;
    }

    if (part.startsWith('`') && part.endsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <s key={key}>{part.slice(2, -2)}</s>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith('<') && part.endsWith('>')) {
      const href = safeUrl(part.slice(1, -1));
      return href ? <a key={key} href={href} target="_blank" rel="noreferrer">{href}</a> : part;
    }

    return part;
  });
}

type ListItem = { text: string; checked?: boolean };

function isBlockStart(line: string): boolean {
  return /^(#{1,3}\s|>\s|[-*]\s|\d+\.\s|```|---$|!\[.*\]\([^)]*\)$|<https?:\/\/[^>]+>$)/.test(line);
}

export function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let index = 0;
  let key = 0;
  const nextKey = () => `block-${key++}`;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], nextKey());
      if (level === 1) nodes.push(<h1 key={nextKey()}>{content}</h1>);
      if (level === 2) nodes.push(<h2 key={nextKey()}>{content}</h2>);
      if (level === 3) nodes.push(<h3 key={nextKey()}>{content}</h3>);
      index += 1;
      continue;
    }

    if (line === '---') {
      nodes.push(<hr key={nextKey()} />);
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      nodes.push(<pre key={nextKey()}><code className={language ? `language-${language}` : undefined}>{code.join('\n')}</code></pre>);
      continue;
    }

    if (line.startsWith('> ')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quote.push(lines[index].slice(2));
        index += 1;
      }
      nodes.push(<blockquote key={nextKey()}>{renderInline(quote.join(' '), nextKey())}</blockquote>);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (image) {
      const source = safeUrl(image[2]);
      if (source) nodes.push(<p key={nextKey()}><img src={source} alt={image[1]} loading="lazy" /></p>);
      index += 1;
      continue;
    }

    const isBullet = /^[-*]\s+/.test(line);
    const isNumbered = /^\d+\.\s+/.test(line);
    if (isBullet || isNumbered) {
      const listType = isBullet ? 'ul' : 'ol';
      const items: ListItem[] = [];
      const expression = isBullet ? /^[-*]\s+(.*)$/ : /^\d+\.\s+(.*)$/;
      while (index < lines.length) {
        if (!lines[index].trim()) { index += 1; continue; }
        const match = lines[index].match(expression);
        if (!match) break;
        const todo = match[1].match(/^\[([ xX])\]\s+(.*)$/);
        items.push(todo ? { text: todo[2], checked: todo[1].toLowerCase() === 'x' } : { text: match[1] });
        index += 1;
      }
      const children = items.map((item, itemIndex) => (
        <li key={`${nextKey()}-${itemIndex}`} className={item.checked === undefined ? undefined : 'public-content-todo'}>
          {item.checked !== undefined && <span aria-hidden="true">{item.checked ? '☑' : '☐'} </span>}
          {renderInline(item.text, `list-${itemIndex}`)}
        </li>
      ));
      nodes.push(listType === 'ul' ? <ul key={nextKey()}>{children}</ul> : <ol key={nextKey()}>{children}</ol>);
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    nodes.push(<p key={nextKey()}>{renderInline(paragraph.join(' '), nextKey())}</p>);
  }

  return <>{nodes}</>;
}
