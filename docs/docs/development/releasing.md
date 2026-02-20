# Releasing

## What this page is for

Prepare and publish backend changes using the current release workflow.

## Steps

1. Ensure tests and lint pass.

```bash
cd backend
pnpm test
pnpm lint
pnpm typecheck
```

2. Create/update changesets if versioned release is needed.

```bash
pnpm changeset
```

3. Version packages.

```bash
pnpm version
```

4. Publish artifacts.

```bash
pnpm release
```

## Verify

- `backend/CHANGELOG.md` reflects the release.
- Release commit/tag is present in git history.

## Troubleshooting

- Missing changeset warnings: add a changeset before versioning.
- Publish/auth failures: verify package registry credentials and CI secrets.
