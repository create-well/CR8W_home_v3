# CR8W Dash VFIN Port

This branch carries the completed CR8W Dash VFIN implementation into the `CR8W_home_v3` workflow repository without replacing the existing Supabase-backed application. The port is isolated under `src/vfin/` so the seven-route shell, typed dashboard payload, shared `ViewShell`, persistent sync status, Decisions view, System view, Source Flow permissions, and Pia stewardship context can be reviewed and integrated incrementally.

The entrypoint is `src/vfin/app/App.tsx`, and the route contract is `src/vfin/app/routes.ts`. The original home-v3 application remains unchanged outside this additive port.
