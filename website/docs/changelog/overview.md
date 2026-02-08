---
sidebar_position: 1
title: Changelog Overview
---

# Changelog

Welcome to the RAGler changelog! This section tracks all notable changes, improvements, and bug fixes across versions.

## Versioning

RAGler follows [Semantic Versioning](https://semver.org/):
- **Major (1.x.x):** Breaking changes requiring user action
- **Minor (x.1.x):** Backward-compatible new features
- **Patch (x.x.1):** Backward-compatible bug fixes

## Release Process

RAGler uses [Changesets](https://github.com/changesets/changesets) for version management:

1. **Development:** Features and fixes are merged with changeset files
2. **Version bump:** Changesets aggregates changes and updates CHANGELOG.md
3. **Release:** Tagged release is published with compiled changelog
4. **Documentation:** This section is automatically updated from CHANGELOG.md

## Current Version

**Latest stable:** v1.0.0 (2026-02-08)

## Version History

| Version | Release Date | Type | Highlights |
|---------|--------------|------|------------|
| [1.0.0](/docs/changelog/versions/1.0.0) | 2026-02-08 | Major | Initial public release |

## Upgrade Guides

When upgrading between major versions, consult these guides:

- **v0.x → v1.0:** Not applicable (initial release)
- Future upgrade guides will be added here

## How to Stay Updated

### Subscribe to Updates

- **GitHub Releases:** Watch the [GitHub repository](https://github.com/ragler-oss/ragler/releases)
- **Blog:** Follow the [RAGler Blog](/blog) for release announcements
- **RSS Feed:** Subscribe to the blog RSS feed

### Breaking Changes

Breaking changes are always announced in:
1. Major version changelog
2. Blog post with migration guide
3. GitHub release notes

**We commit to:**
- Clear migration paths for breaking changes
- Deprecation warnings in advance
- Comprehensive upgrade documentation

## Contributing to Changelog

If you're a contributor:

1. **Add a changeset** for every PR that affects behavior:
   ```bash
   cd backend
   pnpm changeset
   ```

2. **Select version bump type:**
   - Patch: Bug fix, internal improvement
   - Minor: New feature (backward-compatible)
   - Major: Breaking change

3. **Write clear description:**
   - What changed (user-facing)
   - Why it changed (context)
   - How to adapt (if breaking)

See [Development Guide](/docs/development/releasing) for details.

## Changelog Format

Each version page includes:

- **Overview:** High-level summary of the release
- **Breaking Changes:** (Major versions only) What breaks and how to fix
- **New Features:** User-facing additions
- **Improvements:** Enhancements to existing features
- **Bug Fixes:** Resolved issues
- **Internal Changes:** Refactors, dependencies, dev tools (if significant)
- **Contributors:** Community members who contributed

## Feedback

Found a bug? Have a feature request?

- **Issues:** [GitHub Issues](https://github.com/ragler-oss/ragler/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ragler-oss/ragler/discussions)
- **Security:** See [Security Policy](https://github.com/ragler-oss/ragler/security/policy)

## Related Documentation

- [Getting Started](/docs/getting-started/installation) — Install the latest version
- [Product Guide](/docs/product/intro) — Learn about features
- [Architecture](/docs/architecture/overview) — Understand the system design
- [Development](/docs/development/setup) — Contribute to RAGler
