import React, { useState, useRef, useEffect } from 'react';

interface TerminalLine {
  type: 'prompt' | 'output' | 'error';
  text: string;
}

export function ImessageTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', text: 'iMessage Terminal v0.1 — Query your Messages database' },
    { type: 'output', text: 'Available commands: search <keyword>, contact <name>, recent <n>, help' },
    { type: 'output', text: 'Note: Messages app must be closed to access DB.' },
    { type: 'prompt', text: '$ ' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  const runCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newLines: TerminalLine[] = [{ type: 'prompt', text: `$ ${trimmed}` }];

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (command) {
      case 'help':
        newLines.push(
          { type: 'output', text: 'Commands:' },
          { type: 'output', text: '  search <keyword>  — Search messages for keyword' },
          { type: 'output', text: '  contact <name>    — Find contact by name/number' },
          { type: 'output', text: '  recent <n>        — Show n recent messages' },
          { type: 'output', text: '  chats             — List active chats' },
          { type: 'output', text: '  clear             — Clear terminal' },
        );
        break;
      case 'clear':
        setLines([{ type: 'prompt', text: '$ ' }]);
        return;
      case 'search':
        if (!arg) { newLines.push({ type: 'error', text: 'Usage: search <keyword>' }); break; }
        newLines.push({ type: 'output', text: `Searching for "${arg}"...` });
        newLines.push({ type: 'output', text: '[Browser security prevents direct DB access from web app.]' });
        newLines.push({ type: 'output', text: 'To run this query locally:' });
        newLines.push({ type: 'output', text: `  sqlite3 ~/Library/Messages/chat.db "SELECT text FROM message WHERE text LIKE '%${arg}%' ORDER BY date DESC LIMIT 20;"` });
        break;
      case 'contact':
        if (!arg) { newLines.push({ type: 'error', text: 'Usage: contact <name or number>' }); break; }
        newLines.push({ type: 'output', text: `Looking for "${arg}"...` });
        newLines.push({ type: 'output', text: '[Browser security prevents direct DB access from web app.]' });
        newLines.push({ type: 'output', text: 'To run this query locally:' });
        newLines.push({ type: 'output', text: `  sqlite3 ~/Library/Messages/chat.db "SELECT id FROM handle WHERE id LIKE '%${arg}%';"` });
        break;
      case 'recent':
        const n = parseInt(arg) || 10;
        newLines.push({ type: 'output', text: `Fetching ${n} recent messages...` });
        newLines.push({ type: 'output', text: '[Browser security prevents direct DB access from web app.]' });
        newLines.push({ type: 'output', text: 'To run this query locally:' });
        newLines.push({ type: 'output', text: `  sqlite3 ~/Library/Messages/chat.db "SELECT datetime(date/1000000000 + 978307200, 'unixepoch') as dt, text FROM message ORDER BY date DESC LIMIT ${n};"` });
        break;
      case 'chats':
        newLines.push({ type: 'output', text: 'Listing active chats...' });
        newLines.push({ type: 'output', text: '[Browser security prevents direct DB access from web app.]' });
        newLines.push({ type: 'output', text: 'To run this query locally:' });
        newLines.push({ type: 'output', text: '  sqlite3 ~/Library/Messages/chat.db "SELECT c.ROWID, h.id, COUNT(m.ROWID) as msg_count FROM chat c JOIN chat_handle_join chj ON c.ROWID = chj.chat_id JOIN handle h ON chj.handle_id = h.ROWID LEFT JOIN message m ON m.handle_id = h.ROWID GROUP BY c.ROWID, h.id ORDER BY msg_count DESC LIMIT 20;"' });
        break;
      default:
        newLines.push({ type: 'error', text: `Unknown command: ${command}. Type 'help' for available commands.` });
    }

    newLines.push({ type: 'prompt', text: '$ ' });
    setLines(prev => [...prev, ...newLines]);
  };

  return (
    <div className="terminal">
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          {line.type === 'prompt' ? (
            <span>
              <span className="terminal-prompt">{line.text}</span>
              {i === lines.length - 1 && (
                <input
                  className="terminal-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      runCommand(input);
                      setInput('');
                    }
                  }}
                  autoFocus
                />
              )}
            </span>
          ) : line.type === 'error' ? (
            <span className="terminal-error">{line.text}</span>
          ) : (
            <span className="terminal-output">{line.text}</span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
