// Internal operational dashboard projection, read-only.
// Notion is canonical. This endpoint returns a restricted field set and never
// exposes PEOPLE contact data, consent state, Money, Notes, or Retro text.
//
// Reliability rule: stale beats wrong. On a Notion failure this returns
// degraded:true rather than a number the system is unsure about.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DATA_SOURCES,
  queryAll,
  readDate,
  readNumber,
  readRelationCount,
  readSelect,
  readText,
  readTitle,
  tokenPresent,
} from './notion';

function mapFlow(page: any) {
  return {
    id: page.id,
    name: readTitle(page, 'Name'),
    type: readSelect(page, 'Type'),
    status: readSelect(page, 'Status'),
    date: readDate(page, 'Date'),
    mediaCutoff: readDate(page, 'Media Cutoff'),
    venue: readText(page, 'Venue'),
    capacity: readNumber(page, 'Capacity'),
    moveCount: readRelationCount(page, 'Moves'),
  };
}

function mapMove(page: any) {
  return {
    id: page.id,
    name: readTitle(page, 'Name'),
    status: readSelect(page, 'Status'),
    type: readSelect(page, 'Type'),
    due: readDate(page, 'Due'),
    blockedBy: readText(page, 'Blocked By'),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!tokenPresent()) {
    return res.status(503).json({
      degraded: true,
      reason: 'NOTION_TOKEN not configured',
      syncedAt: null,
      flows: [],
      moves: [],
    });
  }

  try {
    const [flowPages, movePages] = await Promise.all([
      queryAll(DATA_SOURCES.flows, undefined, [
        { property: 'Date', direction: 'ascending' },
      ]),
      queryAll(
        DATA_SOURCES.moves,
        { property: 'Status', select: { does_not_equal: 'Dropped' } },
        [{ property: 'Due', direction: 'ascending' }],
      ),
    ]);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json({
      degraded: false,
      syncedAt: new Date().toISOString(),
      flows: flowPages.map(mapFlow),
      moves: movePages.map(mapMove),
    });
  } catch (err) {
    console.error('dashboard: Notion read failed', err);
    return res.status(200).json({
      degraded: true,
      reason: 'Notion read failed',
      syncedAt: null,
      flows: [],
      moves: [],
    });
  }
}
