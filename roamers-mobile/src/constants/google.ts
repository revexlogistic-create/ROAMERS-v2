/**
 * Google OAuth client IDs (PUBLIC identifiers — safe to keep in source).
 *
 * Create these in Google Cloud Console → APIs & Services → Credentials:
 *   • Web client ID     → used as the ID-token audience (REQUIRED)
 *   • Android client ID → package `ma.roamerscommunity.app` + your release SHA-1
 *   • iOS client ID     → bundle `ma.roamerscommunity.app` (only if you ship iOS)
 *
 * Paste the values below, replacing the PASTE_* placeholders. The Google button
 * stays hidden until at least the web client ID is filled in.
 */
export const GOOGLE_WEB_CLIENT_ID     = '1012258210508-m4q5q3io2v8g3tcjdkp40vi9ihnjhrsb.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = '1012258210508-rau4u8htc60hi6flm4a3hvjnn4ga068h.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID     = 'PASTE_IOS_CLIENT_ID.apps.googleusercontent.com';

/** True once BOTH the web and Android client IDs are configured. */
export const GOOGLE_CONFIGURED =
  !GOOGLE_WEB_CLIENT_ID.startsWith('PASTE_') &&
  !GOOGLE_ANDROID_CLIENT_ID.startsWith('PASTE_');
