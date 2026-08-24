# Notion-first recalibration

## Purpose

This branch starts the replacement of the legacy Notion-to-Sheets and Notion-to-Supabase paths with a simpler publishing path:

```text
Notion (Published + Public records)
  -> Node sync script
  -> content/generated/*.mdx in GitHub
  -> deployment preview / production after merge
```

## Rules

- Notion is the editable source of truth for editorial and operational records.
- GitHub owns code, generated public content, tests, automation, and deployment history.
- The browser never receives a Notion token.
- Only `Status = Published` and `Audience = Public` records are generated.
- This workflow starts manual-only and defaults to dry-run.
- Existing production code, Supabase directories, Sheets workflows, and open pull requests remain untouched in this first commit.

## Secrets

Configure these GitHub Actions secrets before a real sync:

- `NOTION_API_TOKEN`
- `NOTION_CONTENT_DATA_SOURCE_ID`

Share only the public-content data source with the Notion integration. Do not share People, Flows, Moves, Money, Needs, Decisions, or private Check-ins.

## Local verification

```bash
NOTION_API_TOKEN=ntn_xxx \
NOTION_CONTENT_DATA_SOURCE_ID=your-data-source-id \
node scripts/notion-content-to-repo.mjs --dry-run
```

## Promotion gates

Before merging to `main`:

1. Confirm the generated content model renders correctly in a deployment preview.
2. Confirm no secret appears in frontend bundles or committed files.
3. Confirm only approved public content was selected.
4. Add an application-level content loader for `content/generated`.
5. Replace or retire legacy mirrors only after the new route is proven.
