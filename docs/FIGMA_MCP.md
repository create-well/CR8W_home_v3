# Figma MCP development workflow

The Create Well dashboard uses Figma as the design source and GitHub as the source of truth for implementation. The repository includes a credential-free `.mcp.json` configuration for supported MCP clients.

## Connect a supported editor

Figma currently supports remote MCP connections through clients listed in its MCP Catalog. Use one of the following supported workflows:

- **Cursor:** install the Figma plugin with `/add-plugin figma`.
- **Claude Code:** run `claude plugin install figma@claude-plugins-official`.
- **VS Code:** add the repository `.mcp.json`, then start the `figma` server from the MCP controls.
- **Codex:** install the Figma plugin or add `https://mcp.figma.com/mcp` as an MCP server.

Authenticate through the editor when prompted. Do not add Figma client secrets, access tokens, or redirect credentials to this repository.

## Recommended implementation flow

1. Copy the URL for the exact Figma frame or layer to implement.
2. Ask the editor to fetch design context for that URL.
3. Fetch a screenshot and variables when visual fidelity or design tokens matter.
4. Reuse the dashboard’s existing React components, Tailwind tokens, routing, Supabase patterns, and accessibility conventions.
5. Implement the change on a feature branch.
6. Run `npm ci`, `npm run build`, and the relevant checks locally.
7. Open a pull request against `main` and review the Vercel preview before merging.

## Repository and deployment

GitHub repository: https://github.com/create-well/CR8W_home_v3

The dashboard is a React/Vite application deployed to Vercel. Pushing a validated change to `main` triggers the production deployment configured for `https://cr8w.com`.

## Important limitations

The Figma remote MCP server does not currently accept unlisted MCP clients. The Manus-side connector may therefore remain unavailable even though this repository configuration is valid. Use a Figma-listed client for MCP access, then commit the resulting implementation to this GitHub repository.

## Security

Never commit OAuth client secrets, personal access tokens, Supabase service-role keys, or `.env` files. The `.gitignore` already excludes common local credential files.

## References

- [Figma MCP Server Guide](https://github.com/figma/mcp-server-guide)
- [Figma remote MCP server setup](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [Create Well dashboard repository](https://github.com/create-well/CR8W_home_v3)

