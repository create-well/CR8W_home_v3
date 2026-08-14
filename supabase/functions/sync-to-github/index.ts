import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DEFAULT_CONFIG, githubFetch, interpolatePath, serializeRow, sha256 } from '../_shared/github_sync.ts';

async function loadSecrets(supabase: any): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('get_notion_secrets');
  if (error) throw new Error(`Vault read error: ${error.message}`);
  const map = new Map<string, string>();
  for (const row of data || []) map.set(row.name, row.decrypted_secret);
  return map;
}

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: source } = await supabase.from('github_sync_sources').select('*').eq('active', true).maybeSingle();
  const config = { ...DEFAULT_CONFIG, branch: source?.branch || DEFAULT_CONFIG.branch, basePath: source?.base_path || DEFAULT_CONFIG.basePath };
  const [owner, repo] = config.repo.split('/');
  const secrets = await loadSecrets(supabase);
  const token = secrets.get('GITHUB_TOKEN');
  if (!token) return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not found in vault.secrets' }), { status: 500 });

  const runInsert = await supabase.from('github_sync_runs').insert({ source_id: source?.id, direction: 'push', status: 'running' }).select().single();
  const run = runInsert.data;
  let created = 0, updated = 0, skipped = 0;
  const details: any[] = [];

  try {
    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      if (tableConfig.direction === 'github_to_db') continue;
      const { data: rows, error } = await supabase.from(tableName).select('*').limit(200);
      if (error) { skipped++; details.push({ tableName, error: error.message }); continue; }
      for (const row of rows || []) {
        const relative = interpolatePath(tableConfig.path, row);
        const filePath = `${config.basePath}/${relative}`;
        const content = serializeRow(tableName, row, tableConfig);
        const dbHash = await sha256(content);
        const mapping = await supabase.from('github_sync_mappings').select('*').eq('source_id', source.id).eq('table_name', tableName).eq('row_id', String(row.id)).maybeSingle();
        if (mapping.data?.last_db_hash === dbHash) { skipped++; continue; }
        const body: Record<string, unknown> = {
          message: `Sync ${tableName}/${row.id} to GitHub`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: config.branch
        };
        if (mapping.data?.github_sha) body.sha = mapping.data.github_sha;
        const result = await githubFetch(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replaceAll('%2F', '/')}`, { method: 'PUT', body: JSON.stringify(body) });
        await supabase.from('github_sync_mappings').upsert({
          source_id: source.id,
          table_name: tableName,
          row_id: String(row.id),
          file_path: filePath,
          file_format: tableConfig.format,
          github_sha: result.content?.sha,
          github_blob_url: result.content?.git_url,
          github_html_url: result.content?.html_url,
          last_db_hash: dbHash,
          last_file_hash: dbHash,
          sync_direction: tableConfig.direction,
          conflict_policy: tableConfig.conflictPolicy,
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'source_id,table_name,row_id' });
        mapping.data?.github_sha ? updated++ : created++;
      }
    }
    await supabase.from('github_sync_runs').update({ status: 'success', finished_at: new Date().toISOString(), created_count: created, updated_count: updated, skipped_count: skipped, details }).eq('id', run.id);
    return new Response(JSON.stringify({ ok: true, created, updated, skipped, details }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    await supabase.from('github_sync_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error: e.message, details }).eq('id', run.id);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
