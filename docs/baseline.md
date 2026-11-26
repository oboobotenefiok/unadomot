# Baseline

Recorded before Phase 0 hardening. Commands were not run in the authoring environment; CI is the source of truth.

| Command | Status |
|---|---|
| `cargo fmt --check` | UNVERIFIED - needs CI |
| `cargo clippy --all-targets -- -D warnings` | UNVERIFIED - needs CI |
| `cargo test` with Postgres | UNVERIFIED - needs CI |
| `flutter pub get` | UNVERIFIED - needs CI |
| `flutter analyze` | UNVERIFIED - needs CI |
| `flutter test` | UNVERIFIED - needs CI |

## Known baseline gaps

- `Cargo.lock` was not committed.
- The Docker builder used Rust 1.82 while CI used stable.
- `.gitignore` did not cover Rust, Flutter, or signing files.
- The legacy React and Firebase app occupied the repository root.
