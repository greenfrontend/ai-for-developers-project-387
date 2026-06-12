# Agent Notes

- TypeSpec is the source of truth for the API contract in `contracts/main.tsp`.
- After changing TypeSpec, run `make compile` from the repository root. This regenerates both `contracts/generated/openapi.yaml` and the frontend SDK in `frontend/src/api/generated`.
- Run `make check` to regenerate contract artifacts and verify the frontend still type-checks against the generated SDK.
- The frontend only sees contract changes through the generated SDK. TypeScript will not react to `contracts/main.tsp` edits until the generated files are refreshed.
- Adding a required field to a response model is usually compatible for frontend TypeScript because consumers do not have to read every response field. Adding a required field to a request model should surface as a TypeScript error where the frontend constructs that request body.
- Use Conventional Commits for commits made by agents and humans. Prefer scopes when useful, for example `feat(e2e): add booking flow coverage`, `fix(api): reject invalid slot`, `test: cover booking flow`, or `ci: run playwright checks`.
- Release automation is handled by release-please. Use `feat:` for SemVer minor changes, `fix:` for SemVer patch changes, and `!` or `BREAKING CHANGE:` for SemVer major changes.
