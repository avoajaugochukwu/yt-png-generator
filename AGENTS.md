<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Docs hygiene

After each change, review and update the docs when needed:
- `README.md` — public-facing overview, setup, env vars, pipeline.
- `CHANGELOG.md` — append user-visible changes under `## [Unreleased]` (Keep a Changelog style).
- `docs/` — any topic-specific docs that exist (create the directory only when there is content that does not belong in the README).

Only update when the change is user-visible or affects setup/operation. Do not churn docs for internal refactors with no outside effect.
