# Deploying Clarity on Render

## The startup error in plain English

If the build succeeds but startup logs show:

```text
Production requires WORKSPACE_ACCESS_TOKEN with at least 24 characters
```

the application is working as designed: Render runs Node services with `NODE_ENV=production`, and Clarity refuses to expose an unprotected BA workspace. This is **not** a Vite build error and not caused by the Node version alone.

Newer versions report all runtime configuration problems together. Set the missing values in Render, then redeploy.

## Fix an existing Render web service

1. Open **Render Dashboard → your Clarity web service → Environment**.
2. Add or update:

| Key | Value |
|---|---|
| `WORKSPACE_ACCESS_TOKEN` | A strong random secret, at least 24 characters. This is the BA workspace login passphrase. |
| `SECURE_COOKIES` | `true` |
| `TRUST_PROXY_HOPS` | `1` |
| `HOST` | `0.0.0.0` |
| `NODE_ENV` | `production` (Render normally supplies this) |

Generate a secret locally if needed; do not paste it into Git or chat:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Store it in a password manager. You will enter it on the Clarity sign-in screen. Do **not** use `ANTHROPIC_API_KEY` as the workspace passphrase; they are different secrets.

3. Confirm service settings:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

The app reads Render’s `PORT` automatically. Do not hardcode port 3000 in the start command.

4. Optional AI: add `ANTHROPIC_API_KEY` in the same Environment page. Without it, Clarity runs in labelled guided mode. Never put the key in a `VITE_*` variable.
5. Optional custom domain: set `PUBLIC_ORIGIN` to the exact browser origin, for example `https://requirements.example.org`, with no path or trailing slash. If omitted, Clarity derives the default origin from Render’s `RENDER_EXTERNAL_URL`.
6. Save changes and **Manual Deploy → Deploy latest commit**.
7. Confirm logs show `Clarity workspace listening` and `protected workspace`, then open the service URL and sign in with `WORKSPACE_ACCESS_TOKEN`.

## Persistence: do not skip this for real interviews

Clarity currently stores interviews, reviews, and artifacts in a local JSON file. Render’s free web-service filesystem is ephemeral: local files are lost on redeploy, restart, or spin-down, and free services cannot attach persistent disks. A paid service can attach a disk. [1](https://render.com/docs/free)

For real stakeholder data:

- Use a **paid** instance.
- Add a persistent disk mounted at `/var/data`.
- Set `DATA_DIR=/var/data/clarity`.
- Keep **one instance**; the JSON store is not multi-process/multi-replica safe.
- Back up the disk and test restoration.

A free instance can demonstrate the UI after the environment variables are set, but it is **not a durable interview system**. Do not collect real evidence there. Upgrading a free service may also lose its existing local data; export anything important first. [1](https://render.com/docs/free)

## Blueprint option

The repository includes [`render.yaml`](../render.yaml) for a new Blueprint deployment. It configures:

- Node 22, `npm ci && npm run build`, `npm start`, and `/api/health`.
- Secure production cookies and one trusted proxy hop.
- A generated `WORKSPACE_ACCESS_TOKEN` (Render creates it once if absent).
- A **paid Starter** instance and a 1 GB disk at `/var/data`, with `DATA_DIR=/var/data/clarity`.
- Optional dashboard-provided `ANTHROPIC_API_KEY` and `PUBLIC_ORIGIN`.

Review pricing before applying. Render can generate a random secret for an environment variable using `generateValue: true`; retrieve the generated value from the service environment to sign in. [1](https://render.com/docs/blueprint-spec)

Adding `render.yaml` to the repository does **not** automatically fix a manually created service. Either apply it as a Blueprint or copy the settings into the existing service.

## Node version

The repository pins the tested Node 22 runtime through `.node-version` and `package.json`. Render’s Node version can be specified with a version file or `NODE_VERSION`. The original `>=22` engine allowed Render to select Node 26; that was not the cause of this particular error, but pinning makes builds reproducible.

## Verify after deployment

```text
GET https://<your-service>.onrender.com/api/health
→ {"ok":true,"version":"12.0.0"}
```

Then verify:

- The sign-in screen appears and the workspace secret works.
- A test engagement and answer survive a manual restart **only if persistent storage is configured**.
- Private stakeholder links open on the public HTTPS origin.
- Catalog sync works; a private catalog repository needs a server-side `GITHUB_TOKEN` with read access.
- If AI is enabled, a new question is labelled AI-adaptive; provider failures remain visible and do not expose keys.

## Still failing?

- **Token error:** the variable is missing/empty, shorter than 24 characters, or set on the wrong service/environment group. Newer startup errors report whether the runtime value was empty or how many characters were received, without logging the secret itself. If the variable exists in Render, confirm the deploy started **after** saving it and that it belongs to the deployed service/environment.
- **Secure-cookie error:** set `SECURE_COOKIES=true`; use the HTTPS Render URL.
- **Port scan timeout:** start command must be `npm start`; do not override `PORT` with an unexposed value.
- **403 on save/login:** check `PUBLIC_ORIGIN` exactly matches the browser origin, without a trailing slash.
- **Data disappears:** you are on ephemeral storage or `DATA_DIR` is outside the persistent disk mount.
- **AI unavailable:** check the server-side Anthropic key/model access; guided mode should still work.

Do not disable the production security checks to make the deploy pass.
