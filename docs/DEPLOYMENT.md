# Deployment and configuration

## Local development

```bash
npm ci
npm run build
npm start
```

Open port 3000. `npm run dev` watches the Node server; it serves the existing frontend build. After frontend edits, run `npm run build` again. Alternatively run the API on port 3000 and `npx vite --host 0.0.0.0` for frontend HMR; Vite proxies `/api` to the API. Browser-facing API calls remain relative URLs.

The first development start creates illustrative records unless `SEED_DEMO=false`. They are labelled in the UI and can be removed. Production never seeds examples.

## Protected deployment

1. Use Node.js 22+ and install with `npm ci`.
2. Build with `npm run build`.
3. Set a strong, unique `WORKSPACE_ACCESS_TOKEN` (at least 24 characters; preferably a randomly generated secret of 32+ bytes).
4. Terminate HTTPS at a trusted reverse proxy. Set `SECURE_COOKIES=true`.
5. Set `PUBLIC_ORIGIN` to the exact external origin, without a trailing slash, when the proxy changes Host/origin handling.
6. Set `TRUST_PROXY_HOPS` only to the number of trusted proxy hops you control. Do not blindly trust arbitrary forwarded headers.
7. Persist `DATA_DIR` on a protected volume. Run as a non-root service account. Back up the store and test restoration.
8. Start:

```bash
NODE_ENV=production \
WORKSPACE_ACCESS_TOKEN='replace-with-a-long-random-secret' \
SECURE_COOKIES=true \
PUBLIC_ORIGIN='https://requirements.example.org' \
DATA_DIR='/var/lib/clarity' \
node server/index.mjs
```

Production startup fails without a sufficiently strong passphrase or secure-cookie configuration. The passphrase protects BA endpoints; stakeholders use their own private links. This is a shared single-workspace passphrase, not individual enterprise identity. Put an identity-aware proxy/SSO in front if attributable BA login is required. Reviewer names in the app are attestations entered by the BA, not authenticated reviewer accounts.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP listener |
| `HOST` | `0.0.0.0` | Bind address for containers/previews |
| `DATA_DIR` | `./data` | Persistent workspace JSON and signing secret |
| `WORKSPACE_ACCESS_TOKEN` | empty | BA passphrase; required in production |
| `SECURE_COOKIES` | `false` | Must be `true` in production behind HTTPS |
| `PUBLIC_ORIGIN` | request host | Exact allowed mutation origin when configured |
| `TRUST_PROXY_HOPS` | `0` | Trusted reverse-proxy hops; configure conservatively |
| `SEED_DEMO` | enabled in development | `false` disables initial examples |
| `ANTHROPIC_API_KEY` | empty | Optional server-side Claude access |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` | Confirm current model availability/access in your provider account |
| `CATALOG_REPOSITORY` | this repository | Allowed `owner/name` catalog source |
| `CATALOG_PATH` | `catalog/solutions.json` | Repository-relative JSON registry |
| `CATALOG_REF` | `main` | Branch, tag, or commit ref |
| `GITHUB_TOKEN` | empty | Optional server-side read access for a private catalog repo |

Use your secret manager or service environment. `.env` is ignored by Git. Never put keys in `VITE_*` variables, source code, URLs, or stakeholder prompts.

## AI behaviour and cost

Without a key, all workflows run in guided mode. With a key, each newly prepared ordinary question can make one provider call; cached/pending questions are reused. Final generation can make one synthesis call. Requests time out after 15 seconds. Question failure falls back visibly; synthesis failure requires explicit BA permission for guided synthesis. The synthesis input budget is 180,000 serialized characters; exceeding it does not silently discard evidence.

Configure provider spend limits and monitor usage. Recent interview context is bounded for question generation, while the full original record remains in the store and deterministic handoff. Validate the selected model ID and provider data-processing terms before sending real organisational information.

## Catalog publication

The UI’s local additions live in the workspace store. To share a baseline across deployments, publish verified records in the configured repository’s `catalog/solutions.json`, then use **Sync repository**. The sync source is server-configured; users cannot supply arbitrary fetch URLs. Schema validation occurs before replacement. Existing engagements retain their original solution snapshot.

`npm run catalog:sync` updates the checked-in registry from the configured source. Review the diff before committing. Do not treat a specification-only entry as a deployed system.

## Persistence, backup, and scaling

The JSON store is appropriate for a controlled single-workspace pilot. Mutations are serialized within one process and written atomically. **Do not run multiple replicas against the same JSON file.** For concurrent enterprise use, replace the store with a transactional database and add object storage, identity, retention jobs, and distributed rate limiting before scaling.

Back up the entire data directory, including its signing secret, with access controls and encryption appropriate to the content. Test restore into an isolated environment. Atomic rename protects against partial writes, not disk loss or malicious administrator changes. Artifact hashes detect content changes but are not signatures.

## Operational checklist

- [ ] HTTPS, strong workspace secret, secure cookies, correct proxy origin configuration.
- [ ] Protected persistent volume, non-root service, tested backup/restore and retention policy.
- [ ] Provider key in a secret manager, model access verified, spend alerts configured.
- [ ] Catalog contains verified records and accurate lifecycle status.
- [ ] Invite-sharing process and 90-day expiry understood by BAs and participants.
- [ ] Technical/security reviewers understand that proposed controls require testing.
- [ ] `npm run check` and browser tests pass in the deployment CI.
- [ ] Monitoring, incident response, and dependency update ownership assigned.
