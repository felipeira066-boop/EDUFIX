# EDUFIX project guide

## Context

EDUFIX is a Portuguese study platform with a public landing page, Supabase Auth, school-stage selection, subject pages, interactive adventures, and an account-based shop. The browser app is static HTML, CSS, and JavaScript; Supabase provides authentication and PostgreSQL data. Netlify publishes `site`.

## Development and deployment

- Serve `site` over HTTP; do not use `file://`. In VS Code, run the task **EDUFIX: servir site estático**, or use Live Server with that folder as its root.
- There is no frontend build, .NET backend, SQL Server project, or dedicated test suite.
- `netlify.toml` configures the static publish directory. Supabase migrations in `supabase/migrations` are applied separately in the Supabase SQL Editor; a site deploy does not apply database changes.
- Setup, local run, Supabase Auth URL configuration, and publishing steps are in `README.md`.

## Architecture and security

- Browser modules and static pages live in `site`. Page scripts use `account.js` and `supabase-client.js`; course metadata is in `course-catalog.js`.
- The Supabase URL and publishable key in `supabase-client.js` are public browser configuration. Never put a `service_role` key, database password, or SMTP secret in frontend files.
- `access.js` redirects users for navigation only; static pages are not server-protected. Row Level Security in Supabase is the authority for private data access.
- Profile permissions allow a user to read their own profile and update only their school stage. Coins and inventory are read-only to the browser; `purchase_product` validates item prices and updates balance and inventory transactionally.
- Keep authentication, profile, inventory, and purchase behavior aligned with `supabase/migrations/20261101000000_initial_schema.sql`. Do not bypass RLS or move trusted purchase logic into browser code.
- Use semantic HTML, modular JavaScript, and Portuguese for user-facing text. Preserve existing page styles and accessible status messages.

## Change and verification workflow

- Inspect Git status and relevant callers before editing. Preserve existing work and review the final diff.
- Validate JavaScript syntax and page loading when practical. No .NET build or SQL Server build applies to this project.
- Do not claim a Supabase migration or live authentication was tested unless it was actually applied to the configured project.
