// Public programming feed. Public-safe subset only.
// A Flow appears here only when Public? is checked AND Status is one of the
// publishable states. Notes, Retro, Drive Folder, and every relation are dropped.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DATA_SOURCES,
  queryAll,
  readDate,
  readSelect,
  readText,
  readTitle,
  tokenPresent,
} from './notion';

const PUBLISHABLE = ['Ready', 'Approved', 'Happened', 'Wrapped'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!tokenPresent()) {
    return res.status(503).json({ degraded: true, syncedAt: null, flows: [] });
  }

  try {
    const pages = await queryAll(
      DATA_SOURCES.flows,
      {
        and: [
          { property: 'Public?', checkbox: { equals: true } },
          { or: PUBLISHABLE.map((s) => ({ property: 'Status', select: { equals: s } })) },
        ],
      },
      [{ property: 'Date', direction: 'descending' }],
    );

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');

    return res.status(200).json({
      degraded: false,
      syncedAt: new Date().toISOString(),
      flows: pages.map((page: any) => ({
        id: page.id,
        name: readTitle(page, 'Name'),
        type: readSelect(page, 'Type'),
        status: readSelect(page, 'Status'),
        date: readDate(page, 'Date'),
        venue: readText(page, 'Venue'),
      })),
    });
  } catch (err) {
    console.error('public-flows: Notion read failed', err);
    return res.status(200).json({ degraded: true, syncedAt: null, flows: [] });
  }
}
