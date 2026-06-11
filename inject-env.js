// inject-env.js — runs on Netlify during build, never in the browser
const fs = require('fs');

const env = `window.__ENV = {
  FIREBASE_API_KEY:             "${process.env.FIREBASE_API_KEY}",
  FIREBASE_AUTH_DOMAIN:         "${process.env.FIREBASE_AUTH_DOMAIN}",
  FIREBASE_PROJECT_ID:          "${process.env.FIREBASE_PROJECT_ID}",
  FIREBASE_STORAGE_BUCKET:      "${process.env.FIREBASE_STORAGE_BUCKET}",
  FIREBASE_MESSAGING_SENDER_ID: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  FIREBASE_APP_ID:              "${process.env.FIREBASE_APP_ID}",
  FIREBASE_MEASUREMENT_ID:      "${process.env.FIREBASE_MEASUREMENT_ID}",
  CLOUDINARY_CLOUD_NAME:        "${process.env.CLOUDINARY_CLOUD_NAME}",
  CLOUDINARY_UPLOAD_PRESET:     "${process.env.CLOUDINARY_UPLOAD_PRESET}",
};`;

fs.writeFileSync('env-loader.js', env);
console.log('✅ env-loader.js written with live env values');