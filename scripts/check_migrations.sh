#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${BASE_REF:-origin/rewrite/flutter-rust-postgres}"
MIGRATIONS_DIR="services/api/migrations"

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "error: base ref '$BASE_REF' not found" >&2
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "error: $MIGRATIONS_DIR not found" >&2
  exit 1
fi

fail=0

while IFS=$'\t' read -r status path; do
  [ -z "${status:-}" ] && continue

  case "$status" in
    A)
      name="$(basename "$path")"
      if ! [[ "$name" =~ ^([0-9]{14})_[a-z0-9_]+\.sql$ ]]; then
        echo "error: new migration '$name' must be named YYYYMMDDHHMMSS_description.sql" >&2
        fail=1
        continue
      fi

      version="${BASH_REMATCH[1]}"
      max_version="$(git ls-tree -r --name-only "$BASE_REF" -- "$MIGRATIONS_DIR" \
        | sed -n 's#.*/\([0-9]\{14\}\)_.*\.sql#\1#p' \
        | sort -n | tail -n 1)"
      max_version="${max_version:-0}"

      if (( 10#$version <= 10#$max_version )); then
        echo "error: new migration '$name' version $version is not greater than existing max $max_version" >&2
        fail=1
      fi
      ;;
    M|D|R*)
      echo "error: existing migration '$path' was modified, deleted, or renamed" >&2
      fail=1
      ;;
  esac
done < <(git diff --name-status "$BASE_REF"...HEAD -- "$MIGRATIONS_DIR")

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "Migration integrity check passed."
