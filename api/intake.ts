// Public intake endpoint. Disabled by default.
//
// Creates a minimal PEOPLE record with Source = "Public Form" and
// Well Level = "Arrive". Consent Captured is deliberately left BLANK so the
// Next Right Invitation gate continues to block all outbound contact until a
// human captures consent. Do not set it here.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DATA_SOURCES, createPage, tokenPresent } from './notion';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.INTAKE_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!tokenPresent() || !DATA_SOURCES.people) {
    return res.status(503).json({ error: 'Intake is not configured' });
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded ?? 'unknown')
    .split(',')[0]
    .trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const allowed = new Set(['name', 'email']);
  const extra = Object.keys(body).filter((k) => !allowed.has(k));
  if (extra.length) {
    return res.status(400).json({ error: `Unexpected fields: ${extra.join(', ')}` });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (name.length < 1 || name.length > 200) {
    return res.status(400).json({ error: 'A name between 1 and 200 characters is required' });
  }
  if (!EMAIL.test(email) || email.length > 320) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    await createPage(DATA_SOURCES.people, {
      Name: { title: [{ text: { content: name } }] },
      Email: { email },
      Source: { select: { name: 'Public Form' } },
      'Well Level': { select: { name: 'Arrive' } },
    });

    return res.status(202).json({ received: true });
  } catch (err) {
    console.error('intake: Notion write failed', err);
    return res.status(502).json({ error: 'Could not record the submission' });
  }
}
