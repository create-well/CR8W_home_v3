# Architecture Decision Record: Canonical Write Surface

## Status
Accepted (current target contract)

## Decision
1. Notion is the canonical write surface for CR8W operational records.
2. Google Sheets and repository outputs are mirrors/backups, not canonical writers.
3. No new Supabase features or migrations may be introduced while the migration path is unresolved.
4. Existing Supabase and legacy KV paths remain rollback surfaces until explicit removal is approved.
5. Any PR that adds or expands a Notion-to-Supabase mirror must not merge without an approved superseding ADR.

## Rationale
- This keeps one authoritative write path while migration decisions are unresolved.
- It preserves rollback safety by retaining existing legacy paths without expanding them.

## Migration Checklist (concise)
- [ ] Keep Notion schema and sync contract stable.
- [ ] Maintain mirror-only Google Sheets/repository outputs.
- [ ] Avoid introducing new Supabase features/migrations.
- [ ] Use existing Supabase/KV paths only as rollback surfaces.
- [ ] Require approved superseding ADR before merging any new Notion-to-Supabase mirror behavior.
