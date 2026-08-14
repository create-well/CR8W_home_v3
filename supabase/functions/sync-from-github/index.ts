import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  return new Response(JSON.stringify({
    ok: true,
    status: 'scaffolded',
    note: 'Pull sync scaffold is intentionally conservative. Wire this to github-webhook after table-specific parsers are reviewed.'
  }), { headers: { 'Content-Type': 'application/json' } });
});
