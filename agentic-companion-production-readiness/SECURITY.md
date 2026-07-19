# Security Policy

## Supported versions

No production release exists yet.

## Reporting

Do not open a public issue containing credentials, private logs, personal data, or an exploitable proof of concept. Report sensitive findings privately to the repository owner.

## Non-negotiable controls

- No plaintext secrets in source, logs, browser storage, database rows, screenshots, or CI artifacts.
- Local companion binds to 127.0.0.1 by default.
- Pairing codes are single-use, expire quickly, and are stored only as hashes.
- Every command is allowlisted, project-scoped, time-limited, previewed, and audited.
- Production deployment and destructive operations require explicit owner approval.
- Retrieved documents and model output are untrusted data, never authorization.
- Security testing requires an explicit target allowlist and proof of authorization.

## Incident response

1. Revoke exposed credentials.
2. Disable affected integration or companion pairing.
3. Preserve redacted audit evidence.
4. Patch on an isolated branch and require review.
5. Rotate sessions and deployment secrets.
6. Verify production health after deployment.
