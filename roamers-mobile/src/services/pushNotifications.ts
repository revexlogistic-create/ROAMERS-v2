/**
 * pushNotifications.ts
 *
 * Handles Expo push notification registration:
 *  1. Request permission
 *  2. Get Expo push token
 *  3. Send token to Roamers backend for storage
 *  4. Configure foreground notification display
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE } from '../constants/theme';

/* Show notifications even when app is in foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Request permission and register device push token with backend.
 * Safe to call on every app start — backend upserts the token.
 */
export async function registerPushToken(): Promise<void> {
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
      console.log('[Push] Permission refusée');
      return;
    }

    /* Android needs a notification channel */
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:       'Roamers',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#B8172E',
        sound:      'default',
      });
    }

    /* Get Expo push token — projectId from app.json extra.eas.projectId */
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '06333419-b790-4476-9d61-2f6673870118',
    });
    const token = tokenData.data;
    console.log('[Push] Token obtenu:', token);

    /* Register with backend */
    await fetch(`${API_BASE}/api/push-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: Device.modelName || '',
      }),
    });

    console.log('[Push] Token enregistré sur le serveur');
  } catch (err: any) {
    /* Non-blocking — never crash the app for a push token failure */
    console.warn('[Push] Erreur enregistrement:', err?.message || err);
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
