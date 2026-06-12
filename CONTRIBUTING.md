# Contributing

## Commit Messages

This repository uses Conventional Commits so release-please can generate release
pull requests, changelogs, and semantic versions from commit history.

Use this format:

```text
type(optional-scope): short imperative summary
```

Common types:

- `feat:` for user-visible features. Release impact: SemVer minor.
- `fix:` for bug fixes. Release impact: SemVer patch.
- `test:` for test-only changes.
- `ci:` for GitHub Actions and release automation changes.
- `docs:` for documentation-only changes.
- `chore:` for maintenance that does not affect runtime behavior.

Breaking changes must use `!` after the type or include a `BREAKING CHANGE:`
footer:

```text
feat(api)!: require timezone when creating bookings
```

Agents working in this repository must follow the same format, for example:

```text
test(e2e): cover guest booking flow
ci: add release please workflow
fix(frontend): show booking conflicts in the form
```
