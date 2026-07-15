# Production Release Gate

This gate applies before a branch can be merged into `main` or a production
deployment can be promoted.

## Current Hold

Private media delivery is not production-verified. The application must not
ship unrelated refactors until an authorized private image returns media bytes
from the production media gateway and an unauthorized request remains denied.

The currently expected production configuration is server-only and must be set
in the Vercel Production environment, never committed to Git:

- private R2 bucket name
- private R2 access key id
- private R2 secret access key
- private R2 account id only when it differs from the public account

## Required Checks

1. Confirm the intended commit is deployed by Vercel.
2. Run lint, typecheck, tests, and a production build on the commit.
3. Verify public album browse and media delivery.
4. Verify an authorized founder can read private thumbnail and display media.
5. Verify a no-grant, revoked, and blocked account cannot read private bytes.
6. Verify single and ZIP downloads preserve the same private-access boundary.
7. Record the deployment commit, timestamp, and smoke outcome in the release
   notes without recording credentials, object keys, signed URLs, or tokens.

## Rollback

If any production smoke check fails, restore the previous verified Vercel
deployment first. Do not change database migrations or R2 objects as a first
response to an application release failure.
