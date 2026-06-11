// env-loader.js
// ---------------------------------------------------------------------------
// Injects environment variables into window.__ENV at runtime.
//
// HOW IT WORKS (Netlify-specific, no build step required):
//   Netlify's build system replaces any string that looks like
//   process.env.VARIABLE_NAME with the actual value from the Site's
//   Environment Variables panel — even in plain .js files — during the
//   build/deploy phase.
//
//   We collect all values here into window.__ENV so that every other script
//   in the project reads from one single place rather than calling
//   process.env directly (which only works at build-time, not in the browser).
//
// HOW TO DEPLOY:
//   1. Go to Netlify → Site → Site configuration → Environment variables.
//   2. Add each variable listed in .env (use the same names).
//   3. Redeploy. Netlify will inject the real values into this file.
//
// LOCAL DEVELOPMENT:
//   If you run a local dev server (e.g. `npx serve .`), Netlify's substitution
//   won't run. In that case, temporarily replace the process.env.XXX strings
//   below with your real values — but NEVER commit that change.
// Or better still just use the env-loader.local.js. I'll write a clue for that if I remember.
// --------------------------------------------------------------------------
// env-loader.js — production
if (!window.__ENV) {
  window.__ENV = {
  // Firebase
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
  };
}