# UnaDomot

UnaDomot is a property listing web app built for the Nigerian rental market. The name is Nigerian Pidgin — "dey your domot" means something like "be at your doorstep" — and that's basically the idea: connect people looking for a place with landlords and agents directly, without the usual runaround.

The app lets landlords and agents post properties, and lets renters browse, save favorites, chat with listers, and find places on a map. It's designed to work on phones as well as desktops, and it keeps working even when your connection drops.

---

## What it does

- Browse rental listings with photos, prices, and property details
- Search and filter by location, price range, and property type
- View listings on an interactive map with clustering
- Chat directly with landlords or agents from a listing page
- Save favorite listings to come back to later
- Post your own listings with photos (via Cloudinary upload)
- Verified badge system to distinguish verified listers
- Notifications for messages and activity
- Light and dark mode, with high contrast accessibility option
- Works offline — previously viewed content stays accessible

---

## For non-technical people

You don't need to install anything to use UnaDomot. Just open it in your browser on your phone or computer and start browsing. You can search without creating an account, but you'll need to sign up to chat with a landlord, save listings, or post your own property.

If you want to list a property, create an account, tap "Post Listing," fill in the details, and upload your photos. Your listing will appear on the map and in search results immediately.

---

## For developers

### Tech stack

- React 18 (UMD, loaded via CDN — no build step required)
- Firebase (Firestore for the database, Firebase Auth for accounts, Firebase Storage)
- Cloudinary for image uploads and hosting
- Leaflet with MarkerCluster for the map view
- Tailwind CSS (also CDN-loaded)
- Netlify for hosting and redirects
- Service Worker for offline support and PWA behaviour

### Project structure

```
components/       Shared UI components (header, chat, cards, modals, etc.)
contexts/         React context providers (auth modal, notifications, routing cache, form drafts)
data/             Static data (Nigerian states list)
hooks/            Custom React hooks
pages/            Page-level components, each broken into their own hooks and sub-components
services/         Firebase initialisation
styles/           CSS files including themes (light, dark, high-contrast) and responsive splits
utils/            Helpers for routing, validation, caching, Firestore queries, error handling, etc.
vault/            Locally bundled assets (Leaflet JS/CSS, app images)
```

### Getting started

1. Clone the repository.

2. Copy `.env.example` to `.env` and fill in your Firebase and Cloudinary credentials:

```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_UPLOAD_PRESET=...
```

3. The app has no build step. Open `index.html` directly in a browser for local development, or serve it with any static file server:

```bash
npx serve .
```

4. For production, deploy to Netlify. The `netlify.toml` and `_redirects` files are already configured for SPA routing.

### Firebase setup

You'll need a Firebase project with Firestore, Authentication (Email/Password and Google), and Storage enabled. The `firestore.rules` and `storage.rules` files in the repo contain the security rules — deploy them to your project:

```bash
firebase deploy --only firestore:rules,storage
```

### Environment variables

The app uses a two-file environment loader: `env-loader.local.js` (git-ignored, for local development) and `env-loader.js` (for production, generated at deploy time). If you're deploying to Netlify, set the environment variables in your Netlify site settings and the loader will pick them up.

### PWA and offline

The service worker is registered in `index.html` and handles caching. The `manifest.json` makes the app installable on Android and iOS. An `offline.html` page is shown when the user navigates to a page that hasn't been cached yet.

---

## License

MIT — see `LICENSE.txt`.
