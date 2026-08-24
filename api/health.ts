// Configuration and freshness health check.
// Reports whether secrets and data-source ids are present. Never returns values.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DATA_SOURCES, tokenPresent } from './notion';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasToken = tokenPresent();
  const sources = {
    flows: Boolean(DATA_SOURCES.flows),
    moves: Boolean(DATA_SOURCES.moves),
    people: Boolean(DATA_SOURCES.people),
  };

  const ok = hasToken && sources.flows && sources.moves;

  return res.status(ok ? 200 : 503).json({
    ok,
    tokenPresent: hasToken,
    intakeEnabled: process.env.INTAKE_ENABLED === 'true',
    sources,
    checkedAt: new Date().toISOString(),
  });
}
