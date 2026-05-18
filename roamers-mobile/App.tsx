import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/pushNotifications';
import * as Notifications from 'expo-notifications';

export default function App() {
  const notifListener   = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    /* Register device push token with backend on every launch */
    registerPushToken();

    /* Log foreground notifications (can be used to show in-app banners later) */
    notifListener.current = addNotificationReceivedListener((notification) => {
      console.log('[Push] Reçu:', notification.request.content.title);
    });

    /* Handle tap on notification */
    responseListener.current = addNotificationResponseListener((response) => {
      console.log('[Push] Tappé:', response.notification.request.content.data);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
