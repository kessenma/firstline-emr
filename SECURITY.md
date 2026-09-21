# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Report privately through [GitHub Security Advisories](../../security/advisories/new).
Expect an initial response within a few days.

## Scope and status

Firstline EMR is pre-production software. It has not undergone a third-party
security audit, and it is **not** certified for HIPAA, GDPR, or any other
regulatory regime. Do not deploy it with real patient data without performing
your own security review and putting the appropriate legal and administrative
safeguards in place.

## Running it safely

- Generate every secret yourself. Never reuse a value from any example file.
  `openssl rand -base64 48` for signing keys, `openssl rand -hex 32` for API keys.
- Keep PostgreSQL off the public internet. Bind it to a private network.
- Terminate TLS in front of every service. Several compose files assume a
  reverse proxy is doing this.
- Rotate the JWT signing keys (`JWT_SECRET`, `NEXTAUTH_SECRET`, PowerSync keys)
  on any suspicion of exposure. Rotating invalidates all issued tokens.
