# UnaDomot — Literal UI / UX & Front-End Reconstruction Specification

**Source of truth:** the uploaded `unadomot-repo.zip`, inspected directly.  
**Archive inventory:** 199 files; 170 JavaScript, 10 CSS, 3 HTML, 9 files under `vault/`; approximately 36,514 text lines (UTF-8 files).  
**Purpose:** reconstruct the implementation represented by this repository, not an imagined redesign.

## Evidence convention

- **Literal** — directly stated in a source file: element tree, class string, CSS declaration, route condition, copy, data field, or asset path.
- **Derived** — direct consequence of multiple source statements.
- **Not specified** — no reliable exact value exists in this archive. Do not invent it.
- **Conflict / defect** — incomplete or contradictory implementation evidence. Preserve it as a known condition.

---

## 1. Product scope and runtime identity

### Product definition

The README describes UnaDomot as a rental-property listing web app for the Nigerian market. Its stated capabilities are:
- Browse rental listings with photos, prices and property details.
- Search/filter by location, price range and property type.
- View listings on an interactive clustered map.
- Chat with landlords or agents from listing pages.
- Save favorite listings.
- Post listings with photos uploaded through Cloudinary.
- Show verified-lister badges.
- Notifications for messages and activity.
- Light mode, dark mode and high-contrast accessibility mode.
- Offline access to previously viewed content.

The README says users can browse without an account, but must sign up to chat, save listings or post property.

### Runtime stack

Directly stated by README and `index.html`:
- React 18.2.0 UMD and ReactDOM 18.2.0 UMD, loaded from `unpkg.com`.
- Firebase compat SDK 10.8.0: app, auth, Firestore and Storage, loaded from `gstatic.com`.
- Tailwind CSS CDN (`cdn.tailwindcss.com`).
- Leaflet and MarkerCluster bundled locally under `/vault/js/` and `/vault/css/`.
- Cloudinary for property image uploads.
- Netlify deployment configuration and SPA redirects.
- Service worker and `manifest.json` for PWA/offline behavior.
- No `package.json` or lockfile is present in this archive. README explicitly says there is no build step.

### HTML shell and boot sequence

`index.html` is the application shell. It loads:
1. `/env-loader.local.js` as optional (`onerror="void(0)"`).
2. `/env-loader.js`.
3. Google Analytics (`G-YPZP5WK6H9`).
4. Tailwind CDN and global stylesheets.
5. Local Leaflet CSS and JS.
6. Responsive stylesheet loader.
7. Early dark-mode bootstrap.
8. `<div id="root"></div>`.
9. Splash markup.
10. React/Firebase and app modules through deferred script tags.
11. `app.js`.

Splash:
- Image: `/vault/img/unadomot.jpg`
- `alt="UnaDomot"`
- Classes: `splash-screen`, `splash-center`, `splash-logo`
- `window.hideSplashScreen()` adds `hidden` to splash and `ready` to `#root`, then removes splash after 300ms.
- `App` calls the hide function 100ms after the page component becomes ready.

Exact rendered splash image size is not specified as a single universal pixel value in the HTML shell; use the actual asset and the complete `.splash-*` CSS declarations.

---

## 2. Global design system and visual tokens

### Typography

`index.html` declares this system font stack:

`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`

It enables antialiasing with `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`. No custom font files are bundled. Google Fonts is preconnected, but the shell's explicit font-family is the system stack above.

### Light theme: exact CSS mappings

From `styles/themes/light.css`:

| Class / role | Literal value |
|---|---|
| Body background | `#f0fdf4` |
| Body text | `#111827` |
| `.text-gray-900` | `#111827` |
| `.text-gray-800` | `#1f2937` |
| `.text-gray-700` | `#374151` |
| `.text-gray-600` | `#4b5563` |
| `.text-gray-500` | `#6b7280` |
| `.text-gray-400` | `#9ca3af` |
| `.text-gray-300` | `#d1d5db` |
| `.text-gray-200` | `#e5e7eb` |
| `.bg-white` | `#ffffff` |
| `.bg-gray-50` | `#f9fafb` |
| `.bg-gray-100` | `#f3f4f6` |
| `.bg-gray-200` | `#e5e7eb` |
| `.bg-gray-300` | `#d1d5db` |
| `.bg-green-50` | `#f0fdf4` |
| `.bg-green-100` | `#dcfce7` |
| `.bg-green-200` | `#bbf7d0` |
| `.bg-green-950` | `#052e16` |
| `.text-green-950` | `#052e16` |
| `.text-green-900` | `#14532d` |
| `.text-green-800` | `#166534` |
| `.text-green-700` | `#15803d` |
| `.text-green-600` | `#16a34a` |
| `.text-green-500` | `#22c55e` |
| `.bg-green-600` | `#16a34a` |
| `.bg-green-700` | `#15803d` |
| `.bg-green-800` | `#166534` |
| `.bg-green-900` | `#14532d` |
| `.bg-red-50` / `.bg-error` | `#fef2f2` |
| `.text-red-700` / `.text-error` | `#b91c1c` |
| `.bg-red-500` | `#ef4444` |
| `.bg-red-600` | `#dc2626` |
| `.bg-yellow-50` / `.bg-warning` | `#fefce8` |
| `.text-yellow-700` / `.text-warning` | `#a16207` |
| `.bg-blue-50` / `.bg-info` | `#eff6ff` |
| `.text-blue-700` / `.text-info` | `#1d4ed8` |
| `.border-gray-100` | `#f3f4f6` |
| `.border-gray-200` | `#e5e7eb` |
| `.border-gray-300` | `#d1d5db` |

Light links excluding `.btn-primary` and `.btn-secondary` are `#166534`; hover is `#15803d`. Fixed bottom header, fixed top header and sticky top elements use `#f0fdf4`. HTML theme-color is `#C8E9BE`.

### Dark theme: exact CSS mappings

`styles/themes/dark.css` activates under `body.dark-mode`:
- Body background `#0f1722`, text `#f1f5f9`.
- Gray-900/800/700 text -> `#f1f5f9`.
- Gray-600/500 text -> `#cbd5e1`; gray-400 -> `#9ca3af`.
- White/gray-50/gray-100 surfaces -> `#1a2634`.
- Gray-200/gray-300 surfaces -> `#2a3745`.
- Green-50 -> `#0f1722`; green-100 -> `#1e3a2e`.
- Gray borders -> `#334155`.
- Green background accent classes -> `#34d399` with foreground `#0f1722`.
- Green text accents -> `#34d399`.
- Links -> `#34d399`; hover -> `#6ee7b7`.
- Fixed/sticky headers -> `#1a2634`, bottom border `#334155`.
- Theme-color meta -> `#0f1722`.

The early HTML bootstrap reads `localStorage.getItem('darkMode') === 'true'` and applies `dark-mode` before React renders to avoid a light flash. The shared stylesheet applies a filter to Leaflet tiles in dark mode.

### High-contrast theme

`styles/themes/high-contrast.css` activates under `body.high-contrast`:
- Body black `#000000`, white text `#ffffff`.
- Buttons, links, inputs, selects, textareas: black background, yellow text `#ffff00`, 2px white border.
- Images: `brightness(0.8) contrast(1.5)`.
- Fixed top/bottom bars: black with 2px yellow top/bottom borders.
- SVG: yellow stroke, no fill.
- Combined `.high-contrast.dark-mode`: white body background/black text; buttons and links white background/blue text with 2px black border.

The stylesheet comment calls this “WCAG AAA”; that is a source comment, not an independent audit.

### Custom shared controls

`.toggle-checkbox` in `styles/styles.css` and `styles/mobile.css`:
- `appearance:none`, 40×20px, background `#e2e8f0`, radius 20px, relative, pointer cursor, 0.2s background transition.
- Checked background `#052e16`.
- `::after`: 18×18px white circle, radius 50%, top 1px, left 1px, transform transition 0.2s.
- Checked `::after`: `translateX(20px)`.

`.loading-spinner`:
- 40×40px.
- 4px solid `#f3f3f3`, top border `#C8E9BE`, circular.
- `spin 1s linear infinite`.

No centralized design-token JSON or Figma token export exists. Preserve the literal Tailwind class strings and CSS declarations instead of normalizing them into a new design system.

---

## 3. Responsive behavior and global layout

### Responsive stylesheet switch

The inline script in `index.html` checks `window.innerWidth`:
- `< 768px`: append `/styles/mobile.css`.
- `>= 768px`: append `/styles/desktop.css`.

On resize, it debounces for 250ms, removes loaded `mobile.css`/`desktop.css` links, and appends the appropriate file. This is runtime stylesheet swapping.

### Mobile layout

Literal declarations in `styles/mobile.css`:
- `html`, `body`, `#root`: full height.
- `html`, `body`, `#root`: horizontal overflow hidden; body/root width 100%; body position relative.
- Fixed top/bottom elements span left 0, right 0, width 100%.
- `body.has-bottom-header main`: bottom padding 80px by default.
- At max-width 640px, bottom padding is 70px.
- At 641–1024px, bottom padding is 70px.
- Fixed bottom nav shadow `0 -2px 10px rgba(0,0,0,0.1)`, z-index 9999, transform transition 0.3s, GPU/compositing declarations.
- At max-width 640px: bottom nav container horizontal padding 8px; `.text-xs` is 10px; selected hidden `sm` elements are forcibly hidden.
- Fixed top elements z-index 40.
- Non-home main top padding 60px by default and 56px at max-width 640px.
- Homepage main top padding 0.
- `.carousel-slide`: 16:9 aspect ratio, max-height 400px.
- `.fixed.inset-0.z-40`: fills viewport and hides overflow; `.z-50` assigned z-index 50.

### Desktop layout

Literal declarations in `styles/desktop.css`:
- Mobile bottom nav is hidden with `display:none !important` under `body.has-bottom-header`.
- `.desktop-nav`: fixed left rail, top 0, width 240px, height 100vh, white background, right border `1px solid #e5e7eb`, z-index 50, horizontal padding 16px, vertical overflow auto, shadow `2px 0 10px rgba(0,0,0,0.05)`.
- `.desktop-nav-item`: flex, centered, gap 12px, padding 12px 16px, margin 16px 0, radius 12px, gray text, 0.2s transition, pointer cursor, user-select none.
- Hover: background `#f3f4f6`, text `#052e16`.
- Active: background `#052e16`, white text.
- Nav icons/images 24×24px; labels 14px, weight 500.
- Descendants of `.desktop-nav-item` ignore pointer events.
- Main content shifts right 240px, width `calc(100% - 240px)`, max-width 100%.
- `.desktop-top-bar`: fixed top 0, left 240px, right 0, height 80px, white background, bottom border `1px solid #e5e7eb`, z-index 45, horizontal padding 24px, flex centered, space-between, gap 16px, shadow `0 2px 10px rgba(0,0,0,0.05)`.
- `.desktop-search-section`: flex 1, max-width 600px, gap 12px.
- `.desktop-filter-icon`: 44×44px, gray-100 background, 12px radius.
- `.desktop-search-input`: width 100%, height 44px, padding `0 44px 0 16px`, 1px gray border, 12px radius, 14px font.
- Focus border `#052e16`; focus ring `0 0 0 3px rgba(5,46,22,0.1)`.
- `.desktop-actions`: flex centered, gap 8px, no shrink.
- Consult the complete `.desktop-action-btn` declaration in `styles/desktop.css` for its precise hit area.

### Header mode behavior

`components/Header.js` implements:
- Desktop top bar only when `isDesktop && isHomePage && viewMode === 'grid'`.
- Desktop top bar includes filter action (`title="Filter listings"`), search input (`placeholder="Search properties, locations..."`), conditional clear button (`title="Clear search"`), suggestion dropdown, map/grid toggle, notification bell and accessibility action.
- Suggestion dropdown is capped at six.
- Map/grid title switches between `Switch to map view` and `Switch to grid view`.
- Notification bell opens notifications for signed-in users; otherwise it opens login.
- Accessibility image is `/vault/img/accessibility.png`, `alt="Accessibility"`, `w-5 h-5`.
- Mobile bottom navigation is the original mobile header mode.
- Mobile nav hides when scrolling down after 50px and reappears when scrolling up.

---

## 4. Routing, navigation, and page inventory

### Route table

`app.js` normalizes `/index.html` and empty path to `/`, strips trailing slash on non-root paths, uses `history.pushState`, removes query strings from the route key and reads `window.location.search` separately.

| Route | Lazy-load target | Component | Exact behavior / issue |
|---|---|---|---|
| `/` | `pages/home/index.js` | `HomePage` | Main discovery page |
| `/listings` | `/pages/ListingsPage.js` | `ListingsPage` | **Target file absent from archive** |
| `/listing/{value}` | `pages/ListingByCodePage.js` or `pages/listing-detail/index.js` | `ListingByCodePage` / `ListingDetailPage` | Listing code regex `^\d{6}-\d{3}-[a-z0-9]{3}$`; otherwise ID detail |
| `/profile` | `pages/profile/index.js` | `ProfilePage` | Current user's profile |
| `/chat` | `pages/ChatPage.js` | `ChatPage` | Chat list/conversation |
| `/favorites` | `pages/FavoritesPage.js` | `FavoritesPage` | Saved listings |
| `/post` | no page | — | Navigates to `/`, then opens post modal after 100ms if `window.__openAuthModal` exists |
| `/edit/{id}` | no page | — | Navigates to `/listing/{id}` and attempts to open post modal with `{ listingId }` |
| `/verify` | `pages/VerificationPage.js` | `VerificationPage` | Verification route |
| `/checkout` | `pages/CheckoutNoticePage.js` | `CheckoutNoticePage` | Checkout notice |
| `/forgot-password` | `/pages/ForgotPasswordPage.js` | `ForgotPasswordPage` | **Target file absent**; `ForgotPasswordModal.js` exists but is not this route |
| `/admin` | `pages/AdminPage.js` | `AdminPage` | Admin console |
| `/terms` | `pages/TermsPage.js` | `TermsPage` | Terms page |
| `/privacy` | `pages/PrivacyPage.js` | `PrivacyPage` | Privacy page |
| `/{username}` | `pages/PublicProfilePage.js` | `PublicProfilePage` | Regex `^[a-z0-9_]{3,20}$`; own username redirects `/profile` |
| other | `pages/NotFoundPage.js` | `NotFoundPage` | 404 fallback |

### Router state and cache

`App` state:
- `user` starts `null`.
- `loading` starts `true`.
- `currentPath` initializes from `window.location.pathname`.
- `pageComponent`, `pageData`, `pageState` start `null`.

`navigate(path,state)`:
- Prefixes `/` if missing.
- Caches current component/data/scroll position before navigation.
- Home cache extras: `window.__homePageState`, including map center, map zoom and view mode.
- Profile cache extras: `window.__profilePageState`.
- Favorites cache extras: `window.__favoritesPageState`.
- Calls `history.pushState(state,'',path)` and updates route key.

`popstate` restores cached component/data/state and scrolls to cached position after 50ms; otherwise clears component/data and uses event history state.

Auth uses `auth.onAuthStateChanged`. Success stores user and clears loading. Error is logged through `window.ErrorLogger` and clears loading.

### Error boundary and loader

`PageErrorBoundary` logs page errors via `window.ErrorLogger.critical`. Fallback:
- Emoji `🏚`.
- Heading `Something went wrong`.
- Message: current error message, or `This page ran into a problem. Your data is safe.`
- Button `← Go Back` invokes `window.history.back()`.
- Button `Home` navigates `/` via `window.__navigate`, otherwise assigns `window.location.href='/'`.

`PageLoader` is a full-screen `bg-green-50` flex-centered skeleton: circular gray pulse (`w-12 h-12`) and horizontal gray pulse (`h-3 w-24`).

### Provider tree

The app nests:
1. `ErrorProvider`
2. `AccessibilityProvider`
3. `AuthModalProvider`
4. `RouteCacheProvider`
5. `NotificationProvider`
6. Page/layout

Each provider has a `window.*` fallback that returns children if unavailable. Preserve order and boundaries.

---

## 5. Page specifications

### Home — `pages/home/index.js`

Root: `HomePage({ user, navigate, cachedState, locationState })`.

- Page supports `grid` and map view modes.
- Mobile grid view renders a sticky top filter/search region.
- Desktop grid view delegates the desktop top bar to `Header`.
- Home composition can show carousel, listing grid or map depending on state.
- Filter modal and accessibility modal are conditional.
- Notification bell is rendered for authenticated users.
- Owner-only edit/delete controls overlay listing images.
- `body.homepage` is set for `/`.
- Home main uses `bg-green-50`.
- Mobile grid header: sticky `top-0 z-30`, `bg-green-50/95`, backdrop blur, bottom border, `px-4 py-4`, transform transition.
- FilterBar uses `window.FilterBar || FilterBar`.
- SearchBar uses `window.SearchBar || SearchBar`.
- `ViewToggle` changes view.
- Accessibility image path `/vault/img/accessibility.png`, alt `Accessibility`, class `w-5 h-5`.
- Carousel wrapper is `desktop-carousel` on desktop, `px-4` otherwise.
- Listing card click calls `handleListingClick(listing)`.
- Owner edit control is blue; delete control red.
- Listing image fills width/height and uses `object-cover`.
- Price chip: `bg-green-950 text-white px-2 py-1 rounded-md font-bold text-sm shadow-lg z-20`.
- Mobile card: `bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition page-transition`.
- Mobile card body `p-2`; title bold gray-900, `mb-0.5`, `line-clamp-1`; location gray-600, `line-clamp-1`.
- Search suggestions scan `state`, `lga`, `propertyType`, and `title`, case-insensitive, deduplicate, cap six.
- Search submit is exposed through `window.__homePageState.handleSearchSubmit`.
- Home default map center `[9.0820, 8.6753]` (Nigeria) if no saved center.
- `isDesktop` initializes from `window.innerWidth >= 768`.
- Desktop grid column class is dynamically returned by `layout.getGridCols(settings.fontSize,'listings')`; do not hardcode a replacement count.
- Route cache explicitly preserves map center, zoom and view mode.

### Listing detail — `pages/listing-detail/index.js`

Root: `ListingDetailPage({ user, navigate, locationState })`.

State includes listing, listing user, loading, favorite state, favorite-check state, deleting state, report state; gallery and comments are managed by child hooks/components.

Loading state:
- White full-screen surface.
- 4:3 gray image placeholder with rounded-xl.
- Gray title, location and price bars.

Unavailable state:
- `min-h-screen bg-green-50 flex items-center justify-center p-4`.
- Emoji `🏠`.
- Heading `Listing Not Available`.
- Explanatory paragraph and back button.

Status pills:
- Pending: yellow-100/yellow-800, yellow pulsing dot.
- Rejected: red-100/red-800 and `✕`.
- Removed: gray-100/gray-600 and `🗑️`.

Top fixed header:
- `fixed top-0 left-0 right-0 z-40`
- white/95 backdrop blur, bottom border, shadow
- inner `container mx-auto px-4 py-3`
- back button and truncated title/context.

The page renders `window.DeleteConfirmationModal`, `ImageGallery`, and `Lightbox`. Listing body begins `p-5 pt-20`.

Feature components:
`ActionButtons`, `Amenities`, `Badges`, `CommentForm`, `CommentItem`, `CommentsSection`, `Description`, `ImageGallery`, `LandlordCard`, `Lightbox`, `ListingInfo`, `MessageButton`, `ProfileCard`, `PropertyDetails`, `ReportButton`.

Hooks/utilities:
`useComments`, `useImageGallery`, `useListing`, `commentHelpers`, listing-detail `constants.js`, `useSimilarListings`.

### Own profile — `pages/profile/index.js`

Root: `ProfilePage({ user, navigate, initialTab='listings', cachedState, locationState })`.

- Background `bg-green-50`.
- Main wrapper `max-w-7xl mx-auto px-4 py-8`.
- Loading skeleton uses `SkeletonLoader.ProfileCard`, tab placeholder and `SkeletonLoader.ListingGrid({ count:8, cols:4 })`.
- Error banner: red-50/red-700, `p-4`, rounded, red-200 border.
- Main components: `ProfileHeader`, `ProfileTabs`, `ListingsTab`, `SettingsTab`.
- Edit modal: `EditProfileModal`.
- Popup: `PopupModal` when `settingsHook.activePopup`.
- Initial tab is `listings`.
- Hooks: `useListings`, `useProfile`, `useSettings`, `useUsername`.
- Constants: `pages/profile/utils/constants.js`.

### Public username profile — `pages/PublicProfilePage.js`

Username route segment is lowercase letters/digits/underscore, 3–20 chars. The module owns loading, error, profile user, listings, favorites/checking maps, current user UID and username. Not-found branch:
- Emoji `😕`
- Heading `User Not Found`
- Explanatory copy
- Home navigation button.

`pages/userByUsernamePage.js` also exists, but the router uses `PublicProfilePage.js` for username routes.

### Favorites — `pages/FavoritesPage.js`

State includes favorites array, loading and toast `{ show, message, type:'success' }`. Uses favorites helpers and listing UI. Exact empty-state copy and markup are in the page file and `components/ListingCard.js`.

### Chat — `pages/ChatPage.js`

State:
- `selectedChat`
- `view`, initialized to `chat` when an initial chat ID exists, otherwise `list`
- `loading`
- `isDesktop`, initialized from viewport width.

Related components: `ChatList`, `ChatInterface`, `ChatMessage`. The list component owns conversation rows; interface owns active conversation/composer; message component owns message rendering.

### Admin — `pages/AdminPage.js`

State includes:
- `isAdmin`
- `activeTab`, initial `listings`
- all listings, loading, filter, search, index fallback
- selected listings and bulk action loading
- reports, loading, filter and index fallback
- landlord verification list/loading/index/rejection reason/open item
- agent verification list/loading/index/rejection reason/open item
- pending listings/loading/index/rejection reason
- admin creation loading.

Source comment lists tabs: `listings`, `pending`, `reports`, `landlord_verifications`, `agent_verifications`.

### Verification, checkout, legal and fallback

- `pages/VerificationPage.js`: error/loading state; verification logic in `utils/verification.js` and `hooks/useVerification.js`.
- `pages/CheckoutNoticePage.js`: dedicated route exists. Its existence does not prove full payment checkout is implemented.
- `pages/TermsPage.js`: preserve literal legal text.
- `pages/PrivacyPage.js`: preserve literal legal text.
- `pages/NotFoundPage.js`: fallback route.

### Missing route targets

- `/listings` lazy-loads `/pages/ListingsPage.js`, absent from ZIP.
- `/forgot-password` lazy-loads `/pages/ForgotPasswordPage.js`, absent from ZIP.
- `components/ForgotPasswordModal.js` exists but is not equivalent to the missing route module.

---

## 6. Shared component inventory

Exact filenames and source files are authoritative for DOM structure, class names, text, icons, handlers, conditional branches and dimensions.

| Source file | Role evidenced by implementation name |
|---|---|
| `components/AccessibilityPanel.js` | Accessibility settings panel |
| `components/AccessibilityProvider.js` | Accessibility provider |
| `components/AuthModal.js` | Authentication modal shell |
| `components/AuthModalContext.js` | Auth modal context module |
| `components/BackButton.js` | Back navigation control |
| `components/ChatInterface.js` | Active chat conversation/composer |
| `components/ChatList.js` | Conversation list |
| `components/ChatMessage.js` | Individual chat message |
| `components/DeleteConfirmationModal.js` | Delete confirmation |
| `components/DetailRightPanel.js` | Listing detail right panel |
| `components/Footer.js` | Shared footer |
| `components/ForgotPasswordModal.js` | Password reset modal |
| `components/Header.js` | Responsive navigation/header |
| `components/Layout.js` | Shared app layout |
| `components/ListingCard.js` | Reusable listing card |
| `components/LoadingSpinner.js` | Loading spinner |
| `components/LoginForm.js` | Login form |
| `components/MapView.js` | Shared map view |
| `components/NotificationBell.js` | Notification trigger/list |
| `components/PasswordStrengthMeter.js` | Password strength display |
| `components/PostListingWizard.js` | Listing create/edit wizard |
| `components/ReactionButton.js` | Reaction control |
| `components/ReportModal.js` | Report submission modal |
| `components/RoleBadge.js` | Role badge |
| `components/RouteCache.js` | Route cache component |
| `components/ScrollToTopButton.js` | Scroll-to-top action |
| `components/SignupForm.js` | Registration form |
| `components/SimilarListings.js` | Similar listing recommendations |
| `components/SkeletonLoader.js` | Skeleton collection |
| `components/SmartForm.js` | Form wrapper/engine |
| `components/SmartFormField.js` | Smart field |
| `components/UnreadBadge.js` | Unread count badge |
| `components/ValidationIndicator.js` | Validation status |
| `components/VerificationBadge.js` | Verified status badge |
| `components/VerificationWarning.js` | Verification warning |

### Listing wizard

`components/PostListingWizard.js` is 59,455 bytes in the archive. It is the actual create/edit form implementation; do not replace it with a generic form. State includes:
- `selectedRole`, initial `landlord`; supported values `landlord` and `agent`.
- Separate `landlordForm` and `agentForm` objects.
- `errors`
- `loading`
- `profile`
- `uploadingDocs`

Exact step order, field order, field labels/options, validations and transitions are in that source file.

### Authentication and forms

Auth-related files:
- `AuthModal.js`
- `LoginForm.js`
- `SignupForm.js`
- `ForgotPasswordModal.js`
- `PasswordStrengthMeter.js`
- `AuthModalContext.js`
- `contexts/AuthModalContext.js`

Do not merge login, signup and reset-password modes into a single undifferentiated form.

Form/validation modules:
- `SmartForm.js`
- `SmartFormField.js`
- `ValidationIndicator.js`
- `PasswordStrengthMeter.js`
- `hooks/useSmartValidation.js`
- `utils/smartValidation.js`
- `utils/validation.js`
- `utils/validationPatterns.js`
- `utils/validationMessages.js`

Literal placeholder strings found across the repository include:
`Full name`, `Email address`, `Password`, `Confirm password`, `Phone number`, `Enter your ID number`, `Your display name`, `Tell us about yourself...`, `Describe the property...`, `Brief description...`, `Search listings...`, `Search location...`, `Min`, `Max`, `Any`, `150000`, `••••••••`, `you@example.com`, `your@email.com`, `Type a message...`, `Sending...`, and `Sign in to comment`.

This is a cross-repository extraction, not a claim that these fields appear on the same screen. Use each component's source for exact placement and conditions.

---

## 7. Map and location discovery subsystem

### Map module inventory

Under `pages/home/components/map/`:
- `MapControls.js`
- `MapCore.js`
- `MapGeolocation.js`
- `MapLayers.js`
- `MapMarkers.js`
- `MapPopup.js`
- `SearchBar.js`
- `LocationSearch.js`
- `index.js`
- `useNavigation.js`
- `utils.js`

Other home modules:
- `AccessibilityModal.js`
- `Carousel.js`
- `FilterBar.js`
- `ListingGrid.js`
- `LocationSearch.js`
- `PriceRangeSlider.js`
- `RecentViews.js`
- `SearchBar.js`
- `ViewToggle.js`

Home hooks:
- `useCarousel`
- `useFavorites`
- `useFilters`
- `useListings`
- `useOtherLocations`
- `useSearch`

### Map behavior and state

- Default map center is Nigeria `[9.0820, 8.6753]` when no saved center is supplied.
- Map state includes `currentCenter`, `currentZoom`, `mapInstance`, all listings, visible listings, popup listing collection, current popup index and current popup listing.
- Geolocation state: `userLocation`, `locationStatus` initially `idle`, `locationError`.
- Legend state: `legendCollapsed` initially `true`.
- Cluster state: continent count, country count, state counts and LGA counts.
- Region state: selected region, region listings, region panel visibility and current region index.
- Leaflet and MarkerCluster are bundled locally.
- CSS cluster levels are continent/country/state/LGA.
- `.leaflet-marker-icon.custom-listing-pin` is hidden by shared stylesheet; inspect marker JS and CSS together.
- Dark mode filters map tiles and changes popup/control colors.

### Cluster dimensions

`styles/styles.css`:
- Continent: 40×40px, 14px font, background `#0a3622`, 2px white border.
- Country: 35×35px, 13px font, background `#052e16`, 2px white border.
- State: 32×32px, 12px font, background `#166534`, 2px white border.
- LGA: 28×28px, 11px font, background `#22c55e`, 2px white border.
- At max-width 640px, cluster dimensions/font sizes are reduced; exact responsive declarations are in the same stylesheet.

Map initial zoom is set in home state and is not a universal design token.

---

## 8. Data model, services and persistence

### Backend services

`services/firebase.js` initializes Firebase from environment configuration. The application uses Firebase Authentication, Firestore, Firebase Storage and Cloudinary (`utils/cloudinary.js`) for image upload.

### Firestore collections observed

Literal collection names referenced in source:
- `users`
- `listings`
- `chats`
- `messages`
- `notifications`
- `favorites`
- `reports`
- `comments`
- `admins`
- `typing`
- `heartbeats`
- `dailyCounters`
- `checkoutNotices`
- `adminLogs`

No formal typed schema or migration file is present. These names are observed references, not a complete schema.

### Query fields observed

Fields explicitly used in queries/order/filter include:
`createdAt`, `savedAt`, `read`, `timestamp`, `status`, `senderId`, `price`, `bedrooms`, `propertyType`, `listingCode`, `username`, `email`, `isOnline`, `furnishing`, `__name__`.

Do not assume every document contains every field.

### Utility/service inventory

| Path | Responsibility indicated by module and usage |
|---|---|
| `services/firebase.js` | Firebase initialization |
| `utils/firestoreQueries.js` | Firestore query helpers |
| `utils/firestoreRetry.js` | Firestore retry behavior |
| `utils/cloudinary.js` | Cloudinary upload |
| `utils/geocoding.js` | Address/coordinate lookup |
| `utils/favorites.js` | Favorites |
| `utils/chat.js` | Chat helpers |
| `utils/messaging.js` | Message helpers |
| `utils/notifications.js` | Notifications |
| `utils/verification.js` | Verification |
| `utils/share.js` | Sharing |
| `utils/cache.js` | Cache operations |
| `utils/routeCache.js` | Route cache |
| `utils/sanitize.js` | Sanitization |
| `utils/idGenerator.js` | Identifier generation |
| `utils/toast.js` | Toast display |
| `utils/validation.js` | Validation |
| `utils/validationPatterns.js` | Validation patterns |
| `utils/validationMessages.js` | Validation copy |
| `utils/smartValidation.js` | Smart validation |
| `utils/errors/*` | Error boundary/provider/logger/fallback/toast/modal |

`firestore.rules` and `storage.rules` are present and must be preserved as security contracts. UI visibility does not define backend permissions.

---

## 9. Interaction and state catalog

### Auth and authorization
- Auth state is observed with `auth.onAuthStateChanged`.
- `user` starts `null` until auth resolves.
- Favorites listener is initialized with `user.uid` when signed in, `null` otherwise.
- Header notification action opens notifications when signed in; otherwise login.
- README says chat, favorites and posting require an account.
- `useRequireAuth.js` and auth modal context are present.
- Listing wizard role values: `landlord`, `agent`.
- Admin page owns `isAdmin` and protected management tabs.

### Favorites
- Home/listing/profile pages use favorite state and checking state.
- Favorites page owns array/loading/toast state.
- App initializes `FavoritesHelpers.initFavoritesListener`.
- Tooltip/title strings include `Save to favorites` and `Remove from favorites`.
- Preserve auth-specific branches from each source component.

### Chat and notifications
- Chat page supports list and chat views.
- Initial chat ID selects `chat`; otherwise initial view is `list`.
- Composer placeholder `Type a message...`; sending state `Sending...`.
- Notification listener tracks unread count.
- Components: `NotificationBell`, `NotificationContext`, `UnreadBadge`.
- Firestore references include messages and typing collections.

### Listing lifecycle
Source includes owner edit/delete controls, delete confirmation, listing status pills, reporting, admin approval/rejection/restore/hide actions, pending listing queue and verification queues. Preserve exact status text and branches from the source modules.

### Search and filters
- Search suggestions scan `state`, `lga`, `propertyType`, `title`.
- Suggestions are case-insensitive, deduplicated and capped at six.
- Search history is held in home search hook state.
- Filter hook stores committed filters and temporary filters.
- Price range slider stores local min/max and preset visibility.
- Location filter stores available LGAs.
- Literal price presets: `Under ₦500k`, `₦500k - ₦1M`, `₦1M - ₦3M`, `₦3M - ₦5M`, `Above ₦5M`.
- Sort labels found: `Price ↑`, `Price ↓`, `Smart`.
- Property type, furnishing, bedroom, bathroom and size filters are distributed across filter components/hooks.

### Gallery and comments
- Gallery state: selected image, lightbox visibility, touch start/end.
- Comments state: list, loading, expanded state, new comment text, submission state, current user data.
- Components: `CommentForm`, `CommentItem`, `CommentsSection`, `Lightbox`.
- Comment placeholder when signed out: `Sign in to comment`.

### Toasts and errors
- `useToast` and `utils/toast.js`.
- `DeleteConfirmationModal`, `ReportModal`.
- Error modules: ErrorBoundary, ErrorFallback, ErrorLogger, ErrorModal, ErrorProvider, ErrorToast, constants.
- Page error copy is recorded in Section 4.

---

## 10. Accessibility, themes and PWA

### Accessibility controls

Modules:
- `AccessibilityProvider`
- `AccessibilityPanel`
- home `AccessibilityModal`
- `useAccessibility`
- `accessibilityContext`
- `accessibilityLayout`
- `accessibility-base.css`
- `high-contrast.css`

Visible option labels found:
- `High Contrast`
- `Dyslexia Font`
- `Reduce Motion`
- `Underline Links`

`accessibility-base.css` includes `body.show-links a` underline styling: underline, 2px thickness, 2px offset. Exact font substitution and motion-reduction rules must be copied from the provider and CSS source.

### PWA and offline
- `manifest.json` linked from `index.html`.
- `service-worker.js` present and registered by shell.
- `offline.html` is offline fallback.
- README says previously viewed content remains accessible offline.
- Bundled images/audio are listed in Section 11.

Separate caching mechanisms exist:
- service worker asset cache
- `utils/cache.js`
- `utils/routeCache.js`
- `contexts/RouteCacheContext.js`
- `hooks/useCache.js`
- `hooks/usePersistentState.js`
- `components/RouteCache.js`

Do not conflate these mechanisms.

---

## 11. Assets, icons and media inventory

| Path | Type / role |
|---|---|
| `vault/img/unadomot.jpg` | Splash/logo (`alt="UnaDomot"`) |
| `vault/img/hero.png` | Bundled hero image |
| `vault/img/accessibility.png` | Accessibility icon/image |
| `vault/aud/notification.mp3` | Notification sound |
| `vault/js/leaflet.js` | Local Leaflet runtime |
| `vault/js/leaflet.markercluster.js` | Local MarkerCluster plugin |
| `vault/css/leaflet.css` | Leaflet stylesheet |
| `vault/css/MarkerCluster.css` | Marker cluster stylesheet |
| `vault/css/MarkerCluster.Default.css` | Default marker cluster stylesheet |

React components use inline SVG. Preserve exact `viewBox`, `stroke`, `fill`, `strokeWidth`, `strokeLinecap`, `strokeLinejoin`, width/height classes and path `d` values. Do not replace with visually similar icons from another icon pack.

External resources include Tailwind CDN, Google Analytics, React/ReactDOM UMD, Firebase SDKs, Google/Firebase/Cloudinary services and remote map tiles. These are not all embedded in the archive.

---

## 12. Reconstruction constraints and known gaps

### Hard gaps
1. `pages/ListingsPage.js` is missing, although `/listings` attempts to load it.
2. `pages/ForgotPasswordPage.js` is missing, although `/forgot-password` attempts to load it. `components/ForgotPasswordModal.js` is not a substitute.
3. No `package.json` or lockfile exists.
4. No source maps, Figma files, screenshots or pixel-measurement references exist.
5. No formal Firestore document schema exists.
6. No centralized design-token file exists.
7. Some runtime images/data and map tiles are remote or user/data dependent.

### Implementation conflicts to preserve as evidence
- README describes app capabilities, but `/listings` target module is absent.
- `/forgot-password` route target is absent while a reset modal exists.
- `pages/userByUsernamePage.js` exists, but router uses `pages/PublicProfilePage.js`.
- Both `components/AuthModalContext.js` and `contexts/AuthModalContext.js` exist; compare exports and load order before treating them as duplicates.
- `styles.css` and `mobile.css` both contain base Tailwind directives and toggle/spinner definitions.
- Responsive stylesheet swaps at 768px; mobile CSS itself has 640px and 641–1024px media queries.
- Both `Header.js` and `Layout.js` participate in global navigation/layout; inspect both before relocating responsibilities.

### Pixel precision limits
The repository supports literal source reconstruction, but does not by itself establish:
- Browser-specific rendered pixels.
- Exact device screenshots or viewport snapshots.
- Runtime listing data or Cloudinary image payloads.
- User-specific auth/favorite/theme/accessibility/map state.
- Third-party map tile appearance at a given time/zoom.
- Identical font rasterization across Android/iOS/Desktop.

Use exact class strings and CSS declarations, then validate with screenshots at agreed viewport sizes and representative data. Mark unspecified measurements unresolved instead of guessing.

### Engineering sequence
1. Preserve route conditions and missing route targets as explicit tickets.
2. Rebuild shell, providers, header and layout first.
3. Port stylesheets in their actual load order, preserving specificity and `!important`.
4. Port components with exact class strings and SVG paths.
5. Preserve auth/role conditional branches.
6. Preserve Firestore collection names, query fields, rules and async states.
7. Implement stylesheet switch at exactly 768px.
8. Rebuild map behavior with Leaflet/MarkerCluster and local assets.
9. Screenshot-test below 640px, 640–767px, at 768px and desktop widths.
10. Do not invent any visual values absent from source.

---

## 13. Complete source-file appendix

Every file in the uploaded ZIP is indexed below. Line counts are UTF-8 text lines where decoding succeeded; binary files are marked `binary`. Paths are relative to repository root.

| File | Category | Lines |
|---|---|---:|
| `.github/workflows/build-apk-manual.yml` | CI workflow | 187 |
| `.github/workflows/build-apk.yml` | CI workflow | 26 |
| `.github/workflows/dispatch-test.yml` | CI workflow | 10 |
| `.github/workflows/fly-deploy.yml` | CI workflow | 21 |
| `.gitignore` | Project/configuration | 43 |
| `LICENSE.txt` | Project/configuration | 21 |
| `README.md` | Project/configuration | 103 |
| `_redirects` | Project/configuration | 5 |
| `app.js` | Root runtime / config | 406 |
| `components/AccessibilityPanel.js` | Shared component | 110 |
| `components/AccessibilityProvider.js` | Shared component | 84 |
| `components/AuthModal.js` | Shared component | 220 |
| `components/AuthModalContext.js` | Shared component | 46 |
| `components/BackButton.js` | Shared component | 118 |
| `components/ChatInterface.js` | Shared component | 511 |
| `components/ChatList.js` | Shared component | 287 |
| `components/ChatMessage.js` | Shared component | 66 |
| `components/DeleteConfirmationModal.js` | Shared component | 58 |
| `components/DetailRightPanel.js` | Shared component | 122 |
| `components/Footer.js` | Shared component | 138 |
| `components/ForgotPasswordModal.js` | Shared component | 183 |
| `components/Header.js` | Shared component | 482 |
| `components/Layout.js` | Shared component | 300 |
| `components/ListingCard.js` | Shared component | 337 |
| `components/LoadingSpinner.js` | Shared component | 17 |
| `components/LoginForm.js` | Shared component | 443 |
| `components/MapView.js` | Shared component | 255 |
| `components/NotificationBell.js` | Shared component | 382 |
| `components/PasswordStrengthMeter.js` | Shared component | 98 |
| `components/PostListingWizard.js` | Shared component | 1474 |
| `components/ReactionButton.js` | Shared component | 93 |
| `components/ReportModal.js` | Shared component | 185 |
| `components/RoleBadge.js` | Shared component | 70 |
| `components/RouteCache.js` | Shared component | 52 |
| `components/ScrollToTopButton.js` | Shared component | 61 |
| `components/SignupForm.js` | Shared component | 650 |
| `components/SimilarListings.js` | Shared component | 75 |
| `components/SkeletonLoader.js` | Shared component | 255 |
| `components/SmartForm.js` | Shared component | 147 |
| `components/SmartFormField.js` | Shared component | 225 |
| `components/UnreadBadge.js` | Shared component | 13 |
| `components/ValidationIndicator.js` | Shared component | 88 |
| `components/VerificationBadge.js` | Shared component | 37 |
| `components/VerificationWarning.js` | Shared component | 41 |
| `contexts/AuthModalContext.js` | React context | 59 |
| `contexts/FormDraftContext.js` | React context | 108 |
| `contexts/NotificationContext.js` | React context | 266 |
| `contexts/RouteCacheContext.js` | React context | 222 |
| `data/nigeria-states.js` | Static data | 1035 |
| `env-loader.js` | Root runtime / config | 42 |
| `env-loader.local.example.js` | Root runtime / config | 24 |
| `firestore.rules` | Project/configuration | 235 |
| `hooks/useAccessibility.js` | React hook | 20 |
| `hooks/useCache.js` | React hook | 84 |
| `hooks/useChatMessages.js` | React hook | 324 |
| `hooks/usePageState.js` | React hook | 114 |
| `hooks/usePersistentState.js` | React hook | 26 |
| `hooks/useReactions.js` | React hook | 112 |
| `hooks/useRequireAuth.js` | React hook | 18 |
| `hooks/useScrollDirection.js` | React hook | 70 |
| `hooks/useSimilarListings.js` | React hook | 103 |
| `hooks/useSmartValidation.js` | React hook | 193 |
| `hooks/useToast.js` | React hook | 52 |
| `hooks/useVerification.js` | React hook | 57 |
| `index.html` | Root runtime / config | 721 |
| `inject-env.js` | Root runtime / config | 17 |
| `manifest.json` | Project/configuration | 20 |
| `netlify.toml` | Project/configuration | 88 |
| `offline.html` | Root runtime / config | 125 |
| `pages/AdminPage.js` | Page / page module | 1548 |
| `pages/ChatPage.js` | Page / page module | 180 |
| `pages/CheckoutNoticePage.js` | Page / page module | 227 |
| `pages/FavoritesPage.js` | Page / page module | 481 |
| `pages/ListingByCodePage.js` | Page / page module | 94 |
| `pages/NotFoundPage.js` | Page / page module | 23 |
| `pages/PrivacyPage.js` | Page / page module | 86 |
| `pages/ProfileRedirectPage.js` | Page / page module | 32 |
| `pages/PublicProfilePage.js` | Page / page module | 657 |
| `pages/TermsPage.js` | Page / page module | 87 |
| `pages/VerificationPage.js` | Page / page module | 572 |
| `pages/home/components/AccessibilityModal.js` | Page / page module | 104 |
| `pages/home/components/Carousel.js` | Page / page module | 187 |
| `pages/home/components/FilterBar.js` | Page / page module | 271 |
| `pages/home/components/ListingGrid.js` | Page / page module | 533 |
| `pages/home/components/LocationSearch.js` | Page / page module | 118 |
| `pages/home/components/PriceRangeSlider.js` | Page / page module | 114 |
| `pages/home/components/RecentViews.js` | Page / page module | 117 |
| `pages/home/components/SearchBar.js` | Page / page module | 221 |
| `pages/home/components/ViewToggle.js` | Page / page module | 43 |
| `pages/home/components/map/LocationSearch.js` | Page / page module | 118 |
| `pages/home/components/map/MapControls.js` | Page / page module | 133 |
| `pages/home/components/map/MapCore.js` | Page / page module | 118 |
| `pages/home/components/map/MapGeolocation.js` | Page / page module | 91 |
| `pages/home/components/map/MapLayers.js` | Page / page module | 424 |
| `pages/home/components/map/MapMarkers.js` | Page / page module | 153 |
| `pages/home/components/map/MapPopup.js` | Page / page module | 436 |
| `pages/home/components/map/SearchBar.js` | Page / page module | 159 |
| `pages/home/components/map/index.js` | Page / page module | 345 |
| `pages/home/components/map/useNavigation.js` | Page / page module | 43 |
| `pages/home/components/map/utils.js` | Page / page module | 63 |
| `pages/home/hooks/useCarousel.js` | Page / page module | 109 |
| `pages/home/hooks/useFavorites.js` | Page / page module | 59 |
| `pages/home/hooks/useFilters.js` | Page / page module | 92 |
| `pages/home/hooks/useListings.js` | Page / page module | 65 |
| `pages/home/hooks/useOtherLocations.js` | Page / page module | 120 |
| `pages/home/hooks/useSearch.js` | Page / page module | 186 |
| `pages/home/index.js` | Page / page module | 1238 |
| `pages/home/utils/affinity.js` | Page / page module | 46 |
| `pages/home/utils/constants.js` | Page / page module | 61 |
| `pages/home/utils/scoring.js` | Page / page module | 117 |
| `pages/listing-detail/components/ActionButtons.js` | Page / page module | 72 |
| `pages/listing-detail/components/Amenities.js` | Page / page module | 18 |
| `pages/listing-detail/components/Badges.js` | Page / page module | 42 |
| `pages/listing-detail/components/CommentForm.js` | Page / page module | 109 |
| `pages/listing-detail/components/CommentItem.js` | Page / page module | 95 |
| `pages/listing-detail/components/CommentsSection.js` | Page / page module | 75 |
| `pages/listing-detail/components/Description.js` | Page / page module | 11 |
| `pages/listing-detail/components/ImageGallery.js` | Page / page module | 222 |
| `pages/listing-detail/components/LandlordCard.js` | Page / page module | 70 |
| `pages/listing-detail/components/Lightbox.js` | Page / page module | 44 |
| `pages/listing-detail/components/ListingInfo.js` | Page / page module | 35 |
| `pages/listing-detail/components/MessageButton.js` | Page / page module | 21 |
| `pages/listing-detail/components/ProfileCard.js` | Page / page module | 76 |
| `pages/listing-detail/components/PropertyDetails.js` | Page / page module | 24 |
| `pages/listing-detail/components/ReportButton.js` | Page / page module | 13 |
| `pages/listing-detail/hooks/useComments.js` | Page / page module | 330 |
| `pages/listing-detail/hooks/useImageGallery.js` | Page / page module | 93 |
| `pages/listing-detail/hooks/useListing.js` | Page / page module | 130 |
| `pages/listing-detail/index.js` | Page / page module | 562 |
| `pages/listing-detail/utils/commentHelpers.js` | Page / page module | 56 |
| `pages/listing-detail/utils/constants.js` | Page / page module | 51 |
| `pages/profile/components/EditProfileModal.js` | Page / page module | 164 |
| `pages/profile/components/ListingsTab.js` | Page / page module | 60 |
| `pages/profile/components/PopupModal.js` | Page / page module | 183 |
| `pages/profile/components/ProfileHeader.js` | Page / page module | 109 |
| `pages/profile/components/ProfileTabs.js` | Page / page module | 51 |
| `pages/profile/components/SettingsTab.js` | Page / page module | 152 |
| `pages/profile/hooks/useListings.js` | Page / page module | 59 |
| `pages/profile/hooks/useProfile.js` | Page / page module | 95 |
| `pages/profile/hooks/useSettings.js` | Page / page module | 75 |
| `pages/profile/hooks/useUsername.js` | Page / page module | 75 |
| `pages/profile/index.js` | Page / page module | 354 |
| `pages/profile/utils/constants.js` | Page / page module | 81 |
| `pages/userByUsernamePage.js` | Page / page module | 78 |
| `service-worker.js` | Root runtime / config | 156 |
| `services/firebase.js` | Service | 343 |
| `storage.rules` | Project/configuration | 47 |
| `styles/accessibility-base.css` | Stylesheet | 123 |
| `styles/desktop.css` | Stylesheet | 778 |
| `styles/mobile.css` | Stylesheet | 739 |
| `styles/styles.css` | Stylesheet | 541 |
| `styles/themes/dark.css` | Stylesheet | 1188 |
| `styles/themes/high-contrast.css` | Stylesheet | 48 |
| `styles/themes/light.css` | Stylesheet | 112 |
| `utils/LazyLoad.js` | Utility | 55 |
| `utils/accessibilityContext.js` | Utility | 14 |
| `utils/accessibilityLayout.js` | Utility | 160 |
| `utils/cache.js` | Utility | 231 |
| `utils/chat.js` | Utility | 498 |
| `utils/cloudinary.js` | Utility | 62 |
| `utils/errors/ErrorBoundary.js` | Utility | 43 |
| `utils/errors/ErrorFallback.js` | Utility | 44 |
| `utils/errors/ErrorLogger.js` | Utility | 170 |
| `utils/errors/ErrorModal.js` | Utility | 86 |
| `utils/errors/ErrorProvider.js` | Utility | 81 |
| `utils/errors/ErrorToast.js` | Utility | 90 |
| `utils/errors/constants.js` | Utility | 156 |
| `utils/errors/index.js` | Utility | 16 |
| `utils/favorites.js` | Utility | 543 |
| `utils/firestoreQueries.js` | Utility | 226 |
| `utils/firestoreRetry.js` | Utility | 99 |
| `utils/geocoding.js` | Utility | 66 |
| `utils/idGenerator.js` | Utility | 167 |
| `utils/loadingPriority.js` | Utility | 175 |
| `utils/messaging.js` | Utility | 115 |
| `utils/notifications.js` | Utility | 371 |
| `utils/preload.js` | Utility | 36 |
| `utils/reactionHelpers.js` | Utility | 239 |
| `utils/routeCache.js` | Utility | 218 |
| `utils/router.js` | Utility | 65 |
| `utils/sanitize.js` | Utility | 64 |
| `utils/share.js` | Utility | 121 |
| `utils/smartValidation.js` | Utility | 159 |
| `utils/toast.js` | Utility | 28 |
| `utils/validation.js` | Utility | 447 |
| `utils/validationMessages.js` | Utility | 108 |
| `utils/validationPatterns.js` | Utility | 67 |
| `utils/verification.js` | Utility | 84 |
| `vault/aud/notification.mp3` | Bundled asset / vendor library | binary |
| `vault/css/MarkerCluster.Default.css` | Bundled asset / vendor library | 60 |
| `vault/css/MarkerCluster.css` | Bundled asset / vendor library | 14 |
| `vault/css/leaflet.css` | Bundled asset / vendor library | 661 |
| `vault/img/accessibility.png` | Bundled asset / vendor library | binary |
| `vault/img/hero.png` | Bundled asset / vendor library | binary |
| `vault/img/unadomot.jpg` | Bundled asset / vendor library | binary |
| `vault/js/leaflet.js` | Bundled asset / vendor library | 6 |
| `vault/js/leaflet.markercluster.js` | Bundled asset / vendor library | 2 |
| `verify-email.html` | Root runtime / config | 354 |
| `version.js` | Root runtime / config | 2 |

---

## Appendix A. Primary files to inspect first

1. `index.html` — shell, boot scripts, responsive CSS loading, splash, SDK versions and script order.
2. `app.js` — route dispatch, auth state, providers, page loading, error boundary and route cache.
3. `components/Layout.js` — shared layout.
4. `components/Header.js` — mobile bottom nav and desktop top bar.
5. `styles/styles.css` — shared CSS and map cluster rules.
6. `styles/mobile.css` — mobile layout.
7. `styles/desktop.css` — desktop sidebar/top bar.
8. `styles/themes/light.css`, `dark.css`, `high-contrast.css` — theme overrides.
9. `pages/home/index.js` and home submodules — discovery/search/map.
10. `pages/listing-detail/index.js` and its submodules — listing detail.
11. `pages/profile/index.js` and its submodules — profile/settings.
12. `components/PostListingWizard.js` — post/edit form.
13. `pages/AdminPage.js` — admin console.
14. `firestore.rules` and `storage.rules` — backend access rules.

**Implementation rule:** this document is a source-grounded map. When it and a source file disagree, the source file wins. Missing pages and unspecified pixel measurements must remain explicit gaps, not fabricated UI.
