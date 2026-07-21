/**
 * CR8W Create Well — Vercel API entry for the exact path /api/server.
 *
 * All routing logic lives in api/server/[[...path]].ts (the optional catch-all
 * that handles /api/server and every /api/server/<resource>/<id>/... path).
 * This file re-exports that handler so Vercel keeps a dedicated function for
 * the bare /api/server route while sub-routes stay in one source of truth.
 */
export { default } from './server/[[...path]]';
