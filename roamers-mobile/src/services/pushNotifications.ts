/**
 * pushNotifications.ts
 *
 * Handles Expo push notification registration:
 *  1. Request permission
 *  2. Get Expo push token
 *  3. Send token to Roamers backend for storage (with optional email link)
 *  4. Configure foreground notification display
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking, Alert } from 'react-native';
import { API_BASE } from '../constants/theme';

/* Show notifications even when app is in foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/* Internal token cache to avoid redundant Expo API calls */
let _cachedToken: string | null = null;

/**
 * Request permission and register device push token with backend.
 * Safe to call on every app start — backend upserts the token.
 * @param email  optional user email to link token to account
 */
export async function registerPushToken(email?: string): Promise<void> {
  try {
    /* Push notifications only work on physical devices */
    if (!Device.isDevice) return;

    /* Request permission */
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission refusee - status:', finalStatus);
      /* If permanently denied, guide user to system settings */
      Alert.alert(
        'Activer les notifications',
        'Pour recevoir des confirmations de réservation et des mises à jour, activez les notifications Roamers dans les Paramètres.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Ouvrir Paramètres', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    /* Android needs a notification channel */
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:             'Roamers',
        importance:       Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#B8172E',
        sound:            'default',
        showBadge:        true,
      });
    }

    /* Get raw FCM/APNS device token — works without EAS/Expo push service */
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;
    _cachedToken = token;
    console.log('[Push] Token FCM obtenu:', typeof token === 'string' ? token.slice(0, 20) + '…' : token);

    /* Register with backend — include email if known */
    await fetch(`${API_BASE}/api/push-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: Device.modelName || '',
        ...(email ? { email } : {}),
      }),
    });

    console.log('[Push] Token enregistre' + (email ? ' pour ' + email : ''));
  } catch (err: any) {
    /* Non-blocking — never crash the app for a push token failure */
    console.warn('[Push] Erreur enregistrement:', err?.message || err);
  }
}

/**
 * Link the cached push token to a user email (called after login / session restore).
 * No extra Expo API call — uses cached token from previous registerPushToken().
 */
export async function linkTokenToEmail(email: string): Promise<void> {
  try {
    if (!email) return;
    /* If we don't have a cached token yet, do a full registration with email */
    if (!_cachedToken) {
      await registerPushToken(email);
      return;
    }
    await fetch(`${API_BASE}/api/push-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token:    _cachedToken,
        platform: Platform.OS,
        email,
      }),
    });
    console.log('[Push] Token lie a', email);
  } catch (err: any) {
    console.warn('[Push] Erreur liaison email:', err?.message || err);
  }
}

/**
 * Add a listener that fires when a notification is tapped.
 * Returns the subscription (call .remove() to clean up).
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener for foreground notifications.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}
