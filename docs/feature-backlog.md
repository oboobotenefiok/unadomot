# Feature backlog

## Find and pin my location on the map

Status: complete.

- Request foreground location permission only when the user taps the locate button.
- Center the map on the user's current position and zoom to street level.
- Show a pulsing blue dot for the user's location, separate from listing pins.
- Let the user long-press the map to drop a temporary red pin.
- Show a clear-pin action when a temporary pin is present.
- Handle denied permission, denied-forever, location disabled, and timeout states with a dismissible error banner.
- Never block listing browsing when location is unavailable.

Remaining optional polish:

- Add reverse geocoding for the selected pin.
- Add iOS location permission entries once the iOS platform folder exists.

## Sign-out cleanup

Status: complete.

- Clear access and refresh tokens from secure storage.
- Clear cached listings, details, favorites, drafts, affinity scores, saved searches, and conversations with unread counts.
- Clear cached profile, admin flag, and verification state.
- Clear map pins, selected location, and pending location results.
- Discard in-flight authenticated requests and queued mutations.
- Reset navigation to the logged-out root screen.
- Keep only non-sensitive preferences such as theme, contrast, text size, and onboarding state.
- Complete local cleanup even when the server logout request fails.
