# Security and privacy boundaries

## Implemented safeguards

- **Server-side secrets:** Anthropic and optional GitHub credentials never enter frontend bundles or engagement exports.
- **Workspace access:** production requires a strong passphrase and secure cookies (enabled by default in production). Login uses a signed, expiring, HttpOnly, SameSite=Strict cookie and timing-safe secret comparison. Login attempts are rate-limited.
- **Interview isolation:** 256-bit random invite tokens; only hashes persisted; 90-day expiry; explicit rotation; stakeholder endpoints scoped to the token’s person. Other raw transcripts are not returned to an interview participant. Post-completion verification intentionally includes attributed statements needed for comparison.
- **Mutation boundaries:** same-origin checks, JSON-only request bodies, bounded input sizes, schema validation, and optimistic revisions. A stale browser cannot silently overwrite a newer answer or approval.
- **Gate integrity:** completion, verification, change-plan, and review conditions are checked on the server. The UI is not the security boundary. Generated artifacts are application-locked and hashed.
- **Output handling:** React escapes displayed text. Markdown metadata is escaped; raw evidence is retained in dynamically sized code fences and explicitly labelled untrusted data. AI evidence references are validated against stored IDs.
- **Resource limits:** bounded roster, answer length, text evidence size/count, catalog size, provider timeout, and in-memory rate limits. Text evidence is limited to `.md`, `.txt`, `.csv`, and `.json`; it is never served as executable HTML.
- **Browser headers:** CSP restricts scripts/connect/fonts to the application origin; object embedding and base URL changes are blocked. Content-type sniffing and referrer leakage are disabled. Microphone permission is scoped to self; camera and geolocation are disabled.

## What is not claimed

This is not a penetration-tested, compliance-certified, multi-tenant enterprise service. The default development workspace is intentionally unauthenticated and must not hold sensitive data. A public live preview is accessible to anyone with its URL.

The local JSON store is not encrypted by the application. File permissions and atomic writes are not disk encryption. Use encrypted protected storage and backups. The workspace secret and all evidence are sensitive. There is no automatic retention/deletion schedule, legal-hold workflow, SSO, MFA, granular BA roles, or independently authenticated reviewer identity. Named review records are human attestations entered through the workspace, not proof that the named person logged in.

Rate limits are process-local. Run one instance, or replace them with a shared limiter before scaling. Configure proxy trust only for infrastructure you control. Frame embedding is not blocked so the Arena live preview can render; add an appropriate frame-ancestors policy for your deployment.

## Data sent to optional services

- **Anthropic:** when configured, project context, the current stakeholder’s role and recent answers, and—after all interviews complete—synthesis evidence are sent to the provider. Cross-stakeholder comparison is not sent during ordinary isolated elicitation. Confirm provider retention, residency, training, and contractual terms before use.
- **Browser speech:** optional speech recognition/read-aloud may use the browser vendor’s online service. Clarity does not store audio, but cannot guarantee that the browser processes speech locally. Participants can type instead and should review transcripts.
- **GitHub:** catalog sync contacts only the configured repository/path/ref. A private repository may require a server-side read token.

Do not enter passwords, API keys, production customer datasets, or unnecessary personal information in interviews or evidence notes. The app warns participants, but a warning is not a DLP scanner. Add organisation-specific classification and redaction controls before production use.

## Threat precautions in generated handoffs

The Markdown includes STRIDE-informed **proposed** scenarios covering spoofing, tampering, repudiation, information disclosure, denial of service, and recovery/integrity. These are planning prompts based on the engagement, not discovered vulnerabilities or implemented controls. Each requires an owner, architecture-specific validation, and executable tests. The security review records human judgement; it does not convert a proposal into a tested control.

## Before handling real organisational data

1. Replace the shared passphrase with enterprise identity where required; enforce MFA and least privilege at the access layer.
2. Use HTTPS, encrypted storage/backups, secret management, and a documented retention/deletion policy.
3. Complete privacy impact assessment, provider review, threat modelling, and independent security testing.
4. Define incident response, audit-log monitoring, restore exercises, and dependency patch ownership.
5. Validate accessibility, browser speech behaviour, and participant consent in your environment.
6. Treat AI-builder instructions and stakeholder evidence as untrusted input. Do not grant the downstream builder production credentials or automatic deployment rights.

Report suspected issues to the repository maintainer through a private channel before publishing exploit details. Do not include real interview evidence or credentials in a public issue.
