# Feature backlog

## Find and pin my location on the map

Status: implemented in the Flutter map screen.

- Request foreground location permission only when the user taps the locate button.
- Center the map on the user's current position and zoom to street level.
- Show a distinct blue dot for the user's location, separate from listing pins.
- Let the user long-press the map to drop a temporary red pin.
- Show a clear-pin action when a temporary pin is present.
- Handle denied permission, denied-forever, location disabled, and timeout states with a dismissible error banner.
- Never block listing browsing when location is unavailable.

Remaining polish:

- Animate the user dot with a pulse.
- Add optional reverse geocoding for the selected pin.
- Add Android and iOS location permission entries once platform folders exist.

## Sign-out cleanup

Status: implemented for local state, with remaining in-flight work.

- Clear access and refresh tokens from secure storage.
- Clear cached listings, details, favorites, drafts, affinity scores, saved searches, and conversations with unread counts.
- Increment a session epoch so screens can discard stale authenticated work.
- Reset navigation to the logged-out root screen.
- Keep only non-sensitive preferences such as theme, contrast, text size, and onboarding state.
- Complete local cleanup even when the server logout request fails.

Remaining work:

- Clear cached profile, admin flag, and verification state held by individual screens.
- Clear map pins and selected location on sign-out.
- Cancel in-flight authenticated requests and drop queued mutations.
