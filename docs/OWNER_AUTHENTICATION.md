# Owner Authentication

Build: `2026.07.17-auth2`

## Password change

The authenticated owner can set a new 12–128 character password in Settings. The Worker stores only a salted password hash, deletes every existing session, and issues the current device a fresh HTTP-only session cookie.

## Passkeys

The authenticated owner can register multiple WebAuthn passkeys. Registration and authentication require a five-minute, single-use server challenge, verified origin, verified relying-party domain, and authenticator user verification. D1 stores only the public credential and replay counter; the private key stays with the device or password manager.

Password login remains available as recovery. Owners can list and remove registered passkeys in Settings. Passkeys registered on the workers.dev address will not automatically transfer to a future custom domain because WebAuthn credentials are domain-bound.

Run `migrations/0003_passkeys.sql` against production D1 before using passkeys.
