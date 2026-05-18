'use strict';
/**
 * utils/fcm.js
 *
 * Firebase Admin SDK wrapper for direct FCM push delivery.
 * Lazy-initialized on first call — safe to require() even if
 * FIREBASE_SERVICE_ACCOUNT is not yet configured.
 *
 * Env var:
 *   FIREBASE_SERVICE_ACCOUNT — full JSON content of the service account key
 *   (paste contents of the firebase-adminsdk-*.json file as a single-line string)
 */

var _messaging = null;

function init() {
  if (_messaging) return _messaging;

  var raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return null;
  }

  try {
    var serviceAccount = JSON.parse(raw);
    var admin          = require('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[FCM] Firebase Admin SDK initialised — project:', serviceAccount.project_id);
    }

    _messaging = admin.messaging();
    return _messaging;
  } catch (err) {
    console.error('[FCM] Init failed:', err.message);
    return null;
  }
}

/** Convert all values in a plain object to strings (FCM requirement). */
function stringifyData(obj) {
  if (!obj || typeof obj !== 'object') return {};
  var out = {};
  Object.keys(obj).forEach(function(k) {
    out[k] = String(obj[k]);
  });
  return out;
}

/**
 * Send a single push notification to one FCM device token.
 * @param  {string}  token  - raw FCM device token
 * @param  {string}  title
 * @param  {string}  body
 * @param  {object}  [data] - optional string key-value data payload
 * @returns {Promise<boolean>} true on success
 */
async function sendOne(token, title, body, data) {
  var msg = init();
  if (!msg) return false;

  try {
    await msg.send({
      token:        token,
      notification: { title: title, body: body },
      android: {
        priority: 'high',
        notification: {
          sound:     'default',
          channelId: 'default',
          icon:      'notification_icon',
          color:     '#B8172E',
          imageUrl:  'https://roamers-v2.vercel.app/ROAMERS_LOGO.png'
        }
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } }
      },
      data: stringifyData(data)
    });
    return true;
  } catch (err) {
    console.warn('[FCM] sendOne failed for token …' + String(token).slice(-8) + ':', err.message);
    return false;
  }
}

/**
 * Send to multiple FCM device tokens (batched in chunks of 500).
 * @param  {string[]} tokens
 * @param  {string}   title
 * @param  {string}   body
 * @param  {object}   [data]
 * @returns {Promise<{success: number, fail: number}>}
 */
async function sendMulti(tokens, title, body, data) {
  var msg = init();
  if (!msg) return { success: 0, fail: tokens.length };
  if (!tokens.length) return { success: 0, fail: 0 };

  var success = 0;
  var fail    = 0;
  var payload = {
    notification: { title: title, body: body },
    android: {
      priority: 'high',
      notification: {
        sound:     'default',
        channelId: 'default',
        icon:      'notification_icon',
        color:     '#B8172E',
        imageUrl:  'https://roamers-v2.vercel.app/ROAMERS_LOGO.png'
      }
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } }
    },
    data: stringifyData(data)
  };

  for (var i = 0; i < tokens.length; i += 500) {
    var chunk = tokens.slice(i, i + 500);
    try {
      var result = await msg.sendEachForMulticast(
        Object.assign({ tokens: chunk }, payload)
      );
      success += result.successCount;
      fail    += result.failureCount;
    } catch (err) {
      console.warn('[FCM] sendMulti chunk failed:', err.message);
      fail += chunk.length;
    }
  }

  return { success: success, fail: fail };
}

module.exports = { sendOne: sendOne, sendMulti: sendMulti };
