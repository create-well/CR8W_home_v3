export const privateTemplate = `# CR8W Internal Operations Hub

<callout icon="🔒" color="yellow_bg">
This is the private operating surface. Use it for source links, sync health, backup review, release notes, and decisions.
</callout>

## Command center

- [Open CR8W Dashboard](https://cr8w.com)
- [Open Google Sheets Mirror](https://docs.google.com/spreadsheets/d/1GBOY57tM-5h-HfHoGllsbnZGv9tgqlNvjvHQW5RVTdA/edit)
- [Open Live Sync Hub](https://app.notion.com/p/ec19c5b25473828b970d81d7012dc08e)

## Health snapshot

<table header-row="true">
	<tr>
		<td>Signal</td>
		<td>Current value</td>
		<td>Owner</td>
	</tr>
	<tr>
		<td>Google Sheets mirror</td>
		<td>Seeded / awaiting recurring automation</td>
		<td>Monny</td>
	</tr>
</table>

## Release and rollback

- Current release commit:
- Production URL: [cr8w.com](https://cr8w.com)
- Rollback candidate:
- Last smoke test:
`;

export const collaboratorTemplate = `# CR8W Co-Creator Workspace

<callout icon="🌿" color="green_bg">
This is the shared working view. Use it to see what is active, what needs a response, and what is ready for collaboration.
</callout>

## Start here

- [Open the CR8W dashboard](https://cr8w.com)
- [Open the shared Revenue view](https://docs.google.com/spreadsheets/d/1GBOY57tM-5h-HfHoGllsbnZGv9tgqlNvjvHQW5RVTdA/edit)
- [Drop an idea in The Well](https://cr8w.com)

## This week

<table header-row="true">
	<tr>
		<td>Workstream</td>
		<td>What is moving</td>
		<td>Owner</td>
	</tr>
	<tr>
		<td>The Well</td>
		<td>Ideas, downloads, and threads</td>
		<td>Everyone</td>
	</tr>
</table>

## Collaboration rules

- Update only fields explicitly marked as collaborative.
- Do not delete mirrored records.
- Escalate financial, permission, or release changes to Monny.
`;
