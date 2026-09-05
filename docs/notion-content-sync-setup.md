# Notion-to-Website Sync Setup Checklist

This checklist configures the `Notion content to website` GitHub Actions workflow in `create-well/CR8W_home_v3`. The workflow reads published pages from a Notion data source, renders them into generated MDX files under `content/`, and commits changes back to `main` so the connected Vercel project can publish them.

## 1. Confirm the deployment prerequisites

- [ ] Confirm the repository is `create-well/CR8W_home_v3` and the workflow file exists at `.github/workflows/notion-content-sync.yml`.
- [ ] Confirm the Vercel project is connected to `create-well/CR8W_home_v3` and that `cr8w.com` remains attached.
- [ ] Confirm the repository’s default production branch is `main`.
- [ ] Confirm the Vercel build succeeds when a generated-content commit is pushed.

The workflow is currently active and scheduled for minute 37 of every hour (`37 * * * *`). It also supports manual dispatch. No scheduled runs were found during the initial audit, so successful execution cannot be confirmed until the credentials below are configured and a manual dry run is started.

## 2. Create or verify the Notion integration

- [ ] Open [Notion My Integrations](https://www.notion.so/profile/integrations) and create or select the integration used by Create Well.
- [ ] Copy the integration’s internal token. Treat it as a password; do not paste it into source files, issues, commits, Vercel logs, or chat messages.
- [ ] Ensure the integration has read access to the website-content database/data source and to the pages contained in it.
- [ ] In Notion, open the content database/data source, use the **Connections** or **Add connections** menu, then grant access to the integration.
- [ ] Confirm the integration can read child blocks, images, bookmarks, embeds, and nested content blocks where those are used.

A token alone is insufficient. Notion pages and data sources must also be explicitly shared with the integration. A missing share commonly appears as a 404 or an empty result set even when the token is valid.

## 3. Prepare the Notion content data source

The extracted Perplexity Space configuration uses a Notion **Content database** containing one row/page per website item. The repository supports that database contract as the primary compatibility path and can also use a newer Notion data source. The Space-schema properties are:

| Property | Recommended Notion type | Required by default | Purpose |
|---|---|---:|---|
| `Content Title` | Title | Yes | Page title and fallback slug source in the Perplexity Space schema |
| `Status` | Select or Status | Yes | Only `Published` pages are rendered |
| `Slug` | Rich text | No | Explicit URL/content slug; otherwise derived from `Content Title` |
| `Type` | Select or Rich text | No | Content type frontmatter |
| `Audience` | Select or Rich text | No | Intended audience frontmatter |
| `Description` | Rich text | No | Description and frontmatter |

- [ ] Standardize the publication value to `Published` for pages intended to appear on the website.
- [ ] Keep draft, archived, and internal pages on non-published statuses.
- [ ] Use lowercase, URL-safe values in `Slug` when an explicit slug is needed.
- [ ] Keep the page body in normal Notion blocks rather than relying on unsupported block types.
- [ ] Check that any external image or media URLs are durable; Notion-hosted file URLs may expire.

## 4. Obtain the database or data-source ID

The extracted Perplexity Space source expects a Notion **database ID** stored as `NOTION_CONTENT_DB`. The repository also supports a newer Notion **data-source ID** stored as `NOTION_CONTENT_DATA_SOURCE_ID`. Use exactly one identifier, not a page ID and not the integration ID.

- [ ] For the Perplexity Space schema, open the target Notion Content database and copy its database ID into `NOTION_CONTENT_DB`.
- [ ] For a newer Notion data-source architecture, copy the data-source ID into `NOTION_CONTENT_DATA_SOURCE_ID`. The worker accepts either the raw UUID or the `collection://` form and removes the prefix automatically.
- [ ] Confirm the identifier belongs to the same database/data source shared with the integration.
- [ ] Do not configure both values unless intentionally overriding the Space compatibility mode with the newer data-source path.
- [ ] Test the identifier using the dry run before allowing live writes.

## 5. Configure GitHub Actions

The repository requires one encrypted secret and one database/data-source repository variable. For the extracted Perplexity Space configuration, use `NOTION_CONTENT_DB`.

| GitHub setting | Exact name | Value |
|---|---|---|
| Actions secret | `NOTION_TOKEN` | The Notion internal integration token |
| Actions variable — Space compatibility path | `NOTION_CONTENT_DB` | The Notion Content database ID |
| Actions variable — newer API alternative | `NOTION_CONTENT_DATA_SOURCE_ID` | The website content data-source ID; use instead of `NOTION_CONTENT_DB` |
| Optional variable | `NOTION_PUBLISHED_STATUSES` | Comma-separated publication values; default is `Published` |
| Optional variable | `NOTION_VERSION` | Override only when the intended Notion API version differs from the worker default |

Using the GitHub web interface:

1. Open the repository’s **Settings → Secrets and variables → Actions**.
2. Under **Secrets**, choose **New repository secret**, enter `NOTION_TOKEN`, paste the token, and save it.
3. Under **Variables**, choose **New repository variable**, enter `NOTION_CONTENT_DB`, paste the Perplexity Space Content database ID, and save it.
4. Alternatively, for a newer data-source implementation, enter `NOTION_CONTENT_DATA_SOURCE_ID` and paste the data-source ID instead.
5. Optionally add `NOTION_PUBLISHED_STATUSES` with the exact allowed values, such as `Published` or `Published,Featured`.
6. Do not put the token in a variable; keep it in the encrypted **Secrets** section.

The worker also supports these optional environment overrides, but they are not required for the default schema:

```text
# `NOTION_CONTENT_DB` defaults to 2022-06-28 and Content Title.
# `NOTION_CONTENT_DATA_SOURCE_ID` defaults to 2025-09-03 and Title.
NOTION_VERSION=2022-06-28
NOTION_STATUS_PROPERTY=Status
NOTION_TITLE_PROPERTY=Content Title
NOTION_SLUG_PROPERTY=Slug
NOTION_TYPE_PROPERTY=Type
NOTION_AUDIENCE_PROPERTY=Audience
NOTION_DESCRIPTION_PROPERTY=Description
CONTENT_DIR=content
NOTION_PAGE_SIZE=100
NOTION_MAX_RETRIES=3
```

## 6. Run a safe dry run

After saving the secret and variable:

- [ ] Open **Actions → Notion content to website**.
- [ ] Choose **Run workflow** on the `main` branch.
- [ ] Leave `dry_run` enabled.
- [ ] Start the workflow and open the `Render published Notion pages` log.
- [ ] Confirm the job queries the expected number of pages and reports the expected published count.
- [ ] Confirm there is no `401`, `403`, `404`, `NOTION_TOKEN`, database, or data-source validation error.
- [ ] Confirm no commit is created by the dry run.

A successful dry run prints a JSON summary similar to:

```json
{
  "dryRun": true,
  "queried": 12,
  "published": 5,
  "outputDir": "/home/runner/work/CR8W_home_v3/CR8W_home_v3/content",
  "files": []
}
```

The exact counts will depend on the Notion data source. Never treat the example counts as expected production values.

## 7. Run a live manual sync

Only after the dry run is correct:

- [ ] Run the workflow again with `dry_run` disabled.
- [ ] Confirm the worker completes successfully.
- [ ] Confirm the `Commit generated content` step creates a commit only when generated content changes.
- [ ] Confirm the commit lands on `main` and triggers a Vercel deployment.
- [ ] Confirm the generated files are present under `content/` and that `.notion-sync-manifest.json` contains only worker-owned filenames.
- [ ] Open the resulting Vercel deployment and verify the public website still returns HTTP 200.

## 8. Confirm the hourly schedule

- [ ] Wait for or monitor the next scheduled run at minute 37 of the hour.
- [ ] Confirm the run appears under **Actions → Notion content to website** with event `schedule`.
- [ ] Confirm the job reaches `Render published Notion pages` successfully.
- [ ] Confirm any changed published pages are committed and deployed.
- [ ] Confirm unchanged content produces the message `No published content changes.`
- [ ] Confirm failed runs send the repository’s normal GitHub notifications.

## 9. Troubleshooting matrix

| Symptom | Likely cause | Resolution |
|---|---|---|
| `Missing required environment variable: NOTION_TOKEN` | Secret is absent, misspelled, or unavailable to the workflow | Create the encrypted secret with the exact name `NOTION_TOKEN`. |
| `Missing required environment variable: NOTION_CONTENT_DATA_SOURCE_ID or NOTION_CONTENT_DB` | Neither supported repository variable is present | For the Perplexity Space schema, create `NOTION_CONTENT_DB`; otherwise create `NOTION_CONTENT_DATA_SOURCE_ID`. |
| Notion `401` | Token is invalid or revoked | Create a new internal integration token and update the GitHub secret. |
| Notion `403` or `404` | Integration was not connected to the data source/page | Share the data source and relevant pages with the integration. |
| `published: 0` unexpectedly | Status property/value mismatch or no pages are published | Check the `Status` property and set `NOTION_PUBLISHED_STATUSES` to the exact Notion values. |
| Content is missing | Unsupported block type or inaccessible media | Convert the block to a supported type and use durable external media URLs. |
| Commit step fails | Workflow token lacks write permission or branch protection blocks pushes | Check repository Actions permissions, `contents: write`, branch rules, and required checks. |
| Vercel does not deploy | Git connection or production branch configuration is wrong | Confirm the Vercel project is linked to `create-well/CR8W_home_v3` and production branch is `main`. |

## 10. Security and rollback

- [ ] Never print or echo `NOTION_TOKEN`.
- [ ] Rotate the token immediately if it appears in a log or commit.
- [ ] Use dry-run mode before changing publication status or schema.
- [ ] Do not delete Notion pages as part of rollback.
- [ ] To roll back malformed generated content, revert the generated-content commit or restore the prior deployment, then correct the Notion page before rerunning.
- [ ] Preserve `.notion-sync-manifest.json` because it limits stale-file cleanup to files generated by this worker.

## Definition of done

The setup is complete when the dry run succeeds, the live manual run creates or confirms the expected generated content, a scheduled run completes successfully, the resulting commit deploys through Vercel, and `cr8w.com` serves the expected website content.

### References

1. [Notion API — Authorization](https://developers.notion.com/docs/authorization)
2. [Notion API — Working with databases and data sources](https://developers.notion.com/docs/working-with-databases)
3. [Notion API — Share pages and databases with integrations](https://developers.notion.com/docs/getting-started)
4. [GitHub Actions — Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
5. [GitHub Actions — Variables](https://docs.github.com/en/actions/learn-github-actions/variables)
6. [GitHub Actions — Manually running a workflow](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow)
