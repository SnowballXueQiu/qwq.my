<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Post summaries

Each post can carry an AI summary in `content/posts/<slug>/summary.json`, written by the agent working on the repo (no API call). After editing posts, run `pnpm summaries`: it compares every post with the text its summary was written from. Rewrite only what it flags (`STALE`, `MISSING`, `RECHECK`), in every language the entry has, then run `pnpm summaries stamp <slug>`. Small edits keep their summary. Posts that aren't articles (a paragraph, a few photos, lyrical prose) get `{ "skip": "why" }` instead.

## Commits

No `Co-Authored-By` trailers or any other AI attribution in commit messages or PR descriptions, even if your tool suggests them: subject and body only. Commits are GPG-signed (`commit.gpgsign` is on); after rewriting history, check `git log --format='%h %G?'` shows `G` for every rewritten commit.
