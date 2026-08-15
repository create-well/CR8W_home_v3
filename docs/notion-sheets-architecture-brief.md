# CR8W Notion-to-Sheets Architecture Brief

## Direct recommendation

Use **Notion as the canonical operating database**, Google Sheets as a simple human-readable mirror and append-only backup, and stable Notion page IDs as the only record identity. Do not use organization names, contact emails, URLs, or titles as upsert keys. Keep the current Supabase and legacy paths intact during migration, then move downstream matching to the stable `record_key` after the mirror has passed a rollback window.

This structure addresses the current failure modes: name-based matching, inconsistent `Sync Status` casing, missing schema validation, incomplete pagination, and credentials that can be valid locally but malformed or mismatched in GitHub Actions.

## Canonical Revenue Ops database

| Property | Notion type | Required | Controlled values or format | Mirror column |
|---|---|---:|---|---|
| Organization | Title | Yes | Trimmed display name | B |
| Owner | Select | Yes | `Monny`, `Istorya`, `Take Home Studio`, `Unassigned` | C |
| Contact Name | Rich text | No | Trimmed text | D |
| Contact Email | Email | No | Lowercase before hashing | E |
| Actual Close | Date | No | `YYYY-MM-DD` | F |
| Type | Select | Yes | `sponsor`, `grant`, `donation`, `merch`, `ticket`, `other` | G |
| Linked Podcast Episode | URL | No | Canonical URL | H |
| Created | Created time | Yes | Preserve Notion timestamp | I |
| Expected Close | Date | No | `YYYY-MM-DD` | J |
| Currency | Select | Yes | `USD`, `PHP`, `CAD`, `EUR`, `Other` | K |
| Linked Workshop ID | Number | No | Integer | L |
| Amount | Number | No | Non-negative | M |
| Notes | Rich text | No | Trimmed text | N |
| Sync Status | Select | Yes | `Pending`, `Synced`, `Error`, `Archived` | O |
| Stage | Select | Yes | `prospect`, `pitched`, `negotiating`, `closed-won`, `closed-lost`, `paused` | P |
| Record Key | Rich text | Yes | `rev_<page UUID without dashes>`; read-only | Q |
| Last Mirrored | Date | No | ISO-8601; worker-written | R |
| Record Hash | Rich text | No | SHA-256; worker-written | S |
| Internal Link | URL | No | Notion page URL; worker-written | T |

The first mirror column, A, should be `notion_page_id`. The complete mirror header is:

```text
notion_page_id, organization, owner, contact_name, contact_email, actual_close, type, linked_podcast_episode, created, expected_close, currency, linked_workshop_id, amount, notes, sync_status, stage, record_key, last_mirrored, record_hash, internal_link
```

## Identity and change detection

For every Notion page, calculate:

```text
record_key = rev_<page.id with hyphens removed>
```

Calculate `record_hash` from a fixed, normalized field order containing the business fields only. Exclude generated timestamps, the hash itself, and the internal link. This makes the same record produce the same hash in local runs, GitHub Actions, and future workers.

The backup row should contain `snapshot_id`, `snapshot_time`, `source`, `source_record_url`, `record_key`, `action`, `owner`, `status`, `payload_json`, and `notes`. Backup rows are append-only. No sync run may delete a mirror or backup row.

## Required local files

The following files have been prepared locally in the sandbox clone:

| File | Purpose |
|---|---|
| `docs/config/notion-revenue-ops.schema.json` | Machine-readable property, option, column, key, hash, and range contract. |
| `docs/notion-to-sheets-operating-contract.md` | Full pipeline stages, validation policy, backup rules, migration sequence, and rollback rules. |
| `docs/notion-sheets-architecture-brief.md` | This concise operating brief. |
| `.env.notion-sheets.example` | Safe environment template with IDs and ranges but no secrets. |
| `scripts/validate-notion-records.mjs` | Deterministic validator for required properties, options, types, stable keys, and hashes. |
| `scripts/local-sheets-write-smoke.mjs` | Local permission smoke test that writes empty batches without changing existing records. |

Real `.env` files and service-account JSON files remain ignored and must never be committed. The expected Google service account email should be validated before token exchange:

```text
cr8w-sheets-sync@cr8w-505503.iam.gserviceaccount.com
```

## Safe migration order

First, add `Record Key`, `Last Mirrored`, `Record Hash`, and `Internal Link` to the Notion database. Then add the exact controlled options and standardize all existing `Sync Status` values to the canonical capitalization. Backfill `Record Key` from the actual Notion page UUID, not from the organization name.

Next, run the validator in report-only mode. Fix missing required properties and invalid option values before enabling live writes. Run a dry-run and review counts for new, changed, unchanged, archived, and invalid records. Then run a small live write and verify both `Revenue_Ops` and `Backup_Log` by reading them back from Google Sheets.

Keep the legacy Supabase name-based upsert paths active during this transition. Once the record-key mirror has passed a rollback window and downstream consumers read the new key, migrate matching to `record_key`. Only then should the old name-based matching be retired.

## Current verification state

The direct local Google Sheets write smoke test passed with the verified read/write service account and workbook. The Google workbook contains the intended tabs, and the service account has Drive role `writer`. The remaining GitHub Actions blocker is separate: the latest Actions run failed during OAuth token exchange with `401 unauthorized_client`, which indicates that the Actions secret value still needs to be replaced with a complete JSON key for the exact read/write service account.

## Acceptance criteria

The system is ready for recurring automation only when all of the following are true:

1. The Notion schema validator reports zero invalid records.
2. The worker paginates until `has_more` is false.
3. Every row has a stable `record_key` and deterministic `record_hash`.
4. A dry-run reports counts without writing.
5. A live run writes both mirror and backup ranges.
6. A read-back confirms the expected row counts and latest snapshot.
7. A failed write produces an explicit failed run, never a false success.
8. A corrected record can be retried without duplicating its backup identity.
9. Legacy rollback paths remain available until downstream migration is complete.
