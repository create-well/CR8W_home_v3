import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const event = req.headers.get('x-github-event') || 'unknown';
  const payload = await req.json().catch(() => ({}));
  const changed = [
    ...(payload.head_commit?.added || []),
    ...(payload.head_commit?.modified || []),
    ...(payload.head_commit?.removed || [])
  ].filter((path: string) => path.startsWith('content/'));

  return new Response(JSON.stringify({
    ok: true,
    event,
    changed,
    status: 'received',
    note: 'Webhook receiver is scaffolded. Next step: verify signature and call sync-from-github for changed content files.'
  }), { headers: { 'Content-Type': 'application/json' } });
});
