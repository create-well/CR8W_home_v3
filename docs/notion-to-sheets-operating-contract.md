# CR8W Notion-to-Sheets Operating Contract

## Purpose

Notion remains the source of truth for Revenue Ops records. Google Sheets is the readable mirror and append-only backup surface. The CR8W application and Supabase remain downstream operational systems. The pipeline must move records by stable identity, not by human-readable names.

> **Core rule:** A Notion page UUID is the immutable identity. `Organization`, contact email, and title are attributes, never primary keys.

## Canonical record shape

| Field | Notion type | Required | Mirror column | Rule |
|---|---|---:|---|---|
| Notion page ID | System | Yes | A | Immutable UUID from the API response. |
| Organization | Title | Yes | B | Trimmed, human-readable name. |
| Owner | Select | Yes | C | Controlled option only. |
| Contact Name | Rich text | No | D | Trim whitespace. |
| Contact Email | Email | No | E | Lowercase before hashing. |
| Actual Close | Date | No | F | Store as `YYYY-MM-DD`. |
| Type | Select | Yes | G | `sponsor`, `grant`, `donation`, `merch`, `ticket`, or `other`. |
| Linked Podcast Episode | URL | No | H | Store the canonical URL. |
| Created | Created time | Yes | I | Preserve the Notion timestamp. |
| Expected Close | Date | No | J | Store as `YYYY-MM-DD`. |
| Currency | Select | Yes | K | Prefer `USD`; explicitly set another supported currency when needed. |
| Linked Workshop ID | Number | No | L | Integer only. |
| Amount | Number | No | M | Non-negative numeric value. |
| Notes | Rich text | No | N | Trimmed text; do not use as identity. |
| Sync Status | Select | Yes | O | `Pending`, `Synced`, `Error`, or `Archived`; casing is canonical. |
| Stage | Select | Yes | P | Must match the application enum. |
| Record Key | Rich text | Yes | Q | `rev_<Notion page UUID without dashes>`. Read-only after creation. |
| Last Mirrored | Date | No | R | Written by the sync worker after a successful write. |
| Record Hash | Rich text | No | S | SHA-256 of normalized business fields. |
| Internal Link | URL | No | T | Canonical Notion page URL. |

## Why the current structure needs hardening

The existing worker maps fields by property name but does not validate the Notion schema before writing. It uses the page URL as both the first column and identity, while the legacy Supabase functions upsert by organization name. These approaches are fragile when an organization is renamed, two records share a name, a URL format changes, or a collaborator enters inconsistent casing.

The current bidirectional Supabase functions also use inconsistent sync-status casing: one path checks and writes `Synced`, while the reverse path writes lowercase `synced`. The canonical contract above standardizes this to `Pending`, `Synced`, `Error`, and `Archived`. The migration should preserve the legacy paths until all downstream consumers use the stable `record_key`.

## Deterministic key and hash rules

The worker should calculate these values before any Google write:

```text
record_key = rev_<page.id with hyphens removed>
record_hash = SHA-256(JSON.stringify([
  organization,
  owner,
  contact_name,
  contact_email,
  actual_close,
  type,
  linked_podcast_episode,
  created,
  expected_close,
  currency,
  linked_workshop_id,
  amount,
  notes,
  sync_status,
  stage
]))
```

The hash input must use a fixed field order and normalized values. It must not include `Last Mirrored`, `Record Hash`, or generated timestamps. This makes change detection repeatable across local runs, GitHub Actions, and future worker implementations.

## Pipeline stages

| Stage | Input | Required behavior | Failure policy |
|---|---|---|---|
| 1. Configuration | Environment variables and service-account JSON | Validate presence, JSON shape, client email, sheet ID, data-source ID, and ranges. | Stop before contacting Notion or Google. |
| 2. Schema discovery | Notion data-source metadata | Verify all required property names and types. | Stop with a named schema error; do not write partial rows. |
| 3. Query | Notion data-source query | Paginate until `has_more` is false. | Retry transient 429/5xx with bounded backoff. |
| 4. Normalize | Notion pages | Convert types, normalize casing, calculate `record_key` and `record_hash`. | Mark invalid records as `Error` in a local report; do not silently coerce invalid required fields. |
| 5. Plan | Normalized records plus prior hashes | Separate unchanged, changed, new, archived, and invalid records. | Do not write if any required global validation fails. |
| 6. Write mirror | Google Sheets batch update | Write only valid rows to `Revenue_Ops`; write a corresponding snapshot to `Backup_Log`. | Treat a non-2xx response as a failed sync. |
| 7. Confirm | Sheets response and read-back | Confirm updated ranges and row counts. | Mark run failed if response and read-back disagree. |
| 8. Report | Sync summary | Record run ID, counts, hashes, warnings, and error category. | Never report success when the write or confirmation failed. |

## Backup_Log contract

`Backup_Log` is append-only. Every changed or new record gets a snapshot row with:

```text
snapshot_id, snapshot_time, source, source_record_url, record_key,
action, owner, status, payload_json, notes
```

The `payload_json` value should contain the normalized record before the Sheet write. Do not place credential material, full Notion API responses, or secrets in this field. The allowed actions are `INSERT`, `UPDATE`, `UNCHANGED`, `ARCHIVE`, and `ERROR`.

## Local configuration files

Use a committed example file only. Never commit a real token or private key.

```text
.env.notion-sheets.example       # names, IDs, ranges, and safe defaults
.env.notion-sheets.local         # ignored; developer-created secrets
scripts/validate-notion-records.mjs
scripts/notion-to-sheets.mjs
scripts/notion-to-sheets-smoke.mjs
 docs/config/notion-revenue-ops.schema.json
```

The local secret value should be supplied through the environment as `GOOGLE_SERVICE_ACCOUNT_JSON` or loaded from a local ignored file. The worker should validate that `client_email` equals the expected service account before any token exchange.

## Migration sequence

1. Create or update the Notion properties to match the schema contract. Add `Record Key`, `Last Mirrored`, `Record Hash`, and `Internal Link` as read-only operational properties.
2. Add the canonical select options exactly as written. Do not create variants such as `synced`, `Closed Won`, or `closed won`.
3. Backfill `Record Key` from each page UUID. Do not derive it from organization name.
4. Keep the existing `Organization`-based Supabase upsert path active for rollback. Add record-key columns before changing the matching strategy.
5. Run the validator in report-only mode against live Notion data. Resolve schema and required-field errors before enabling writes.
6. Run a dry-run that reports insert, update, unchanged, archive, and error counts.
7. Run a live write against a small approved subset or a dedicated test row. Confirm both `Revenue_Ops` and `Backup_Log`.
8. Enable the scheduled workflow only after a successful read-back check.
9. Migrate downstream consumers to `record_key`, then retire name-based matching only after an observed rollback window.

## Rollback rules

The Notion database remains authoritative. A failed mirror run must never delete Notion pages or delete Sheet rows. To roll back a schema change, disable live writes, restore the previous worker commit, and continue reading the legacy columns. To roll back a malformed record, set its `Sync Status` to `Error`, preserve the raw source URL and validation message in the run report, and correct the Notion page before retrying.
