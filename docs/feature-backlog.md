# Feature backlog

## Find and pin my location on the map

Status: planned for the Flutter map screen.

- Request foreground location permission only when the user taps the locate button.
- Center the map on the user's current position and zoom to street level.
- Show a distinct pulsing dot for the user's location, separate from listing pins.
- Let the user long-press or tap a "Pin here" action to drop a temporary pin.
- Show the selected pin's coordinates and a reverse-geocoded address when available.
- Handle denied permission, denied-forever, location disabled, and timeout states with a clear retry path.
- Never block listing browsing when location is unavailable.

## Sign-out cleanup

Status: required for the Flutter auth flow.

- Clear access and refresh tokens from secure storage.
- Clear the cached user profile, admin flag, and verification state.
- Clear favorites, saved searches, conversations, and unread counts.
- Clear map pins, selected location, and any pending location request.
- Cancel in-flight authenticated requests and drop queued mutations.
- Reset navigation to the logged-out home screen.
- Keep only non-sensitive preferences such as theme and font size.
