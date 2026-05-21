import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  AppState, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/pushNotifications';
import { getAppVersion } from './src/services/api';
import * as Notifications from 'expo-notifications';
import { API_BASE, COLORS } from './src/constants/theme';

const APP_VERSION_CODE = 32;
const DISMISSED_KEY = 'update_dismissed_vc';

export default function App() {
  const notifListener    = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const appState         = useRef(AppState.currentState);

  const [updateInfo, setUpdateInfo]   = useState<{ versionCode: number; versionName: string; downloadUrl: string; releaseNotes: string } | null>(null);
  const [bannerVisible, setBanner]    = useState(false);
  const slideAnim                     = useRef(new Animated.Value(120)).current;

  /* ── show / hide banner with slide animation ── */
  function showBanner() {
    setBanner(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  }
  function hideBanner() {
    Animated.timing(slideAnim, { toValue: 120, duration: 220, useNativeDriver: true }).start(() => setBanner(false));
  }

  /* ── check for update, show banner if needed ── */
  const checkUpdate = useCallback(async () => {
    try {
      const info = await getAppVersion();
      if (info.versionCode <= APP_VERSION_CODE) return;
      const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
      if (dismissed && parseInt(dismissed, 10) >= info.versionCode) return;
      setUpdateInfo(info);
      showBanner();
    } catch {}
  }, []);

  /* ── dismiss: remember this version so banner doesn't reappear ── */
  async function dismiss() {
    if (updateInfo) await AsyncStorage.setItem(DISMISSED_KEY, String(updateInfo.versionCode));
    hideBanner();
  }

  /* ── download: open APK URL ── */
  function download() {
    if (updateInfo) Linking.openURL(API_BASE + updateInfo.downloadUrl);
  }

  useEffect(() => {
    registerPushToken();

    notifListener.current = addNotificationReceivedListener((n) => {
      console.log('[Push] Reçu:', n.request.content.title);
    });
    responseListener.current = addNotificationResponseListener((r) => {
      console.log('[Push] Tappé:', r.notification.request.content.data);
    });

    /* Check on launch */
    checkUpdate();

    /* Re-check when app comes back to foreground */
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        checkUpdate();
      }
      appState.current = next;
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
      sub.remove();
    };
  }, [checkUpdate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />

          {/* ── Floating update banner ── */}
          {bannerVisible && updateInfo && (
            <Animated.View
              style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
              pointerEvents="box-none"
            >
              <View style={styles.bannerInner}>
                <View style={styles.bannerLeft}>
                  <View style={styles.bannerDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>
                      Mise à jour v{updateInfo.versionName} disponible
                    </Text>
                    {updateInfo.releaseNotes ? (
                      <Text style={styles.bannerSub} numberOfLines={2}>
                        {updateInfo.releaseNotes}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.bannerActions}>
                  <TouchableOpacity style={styles.dlBtn} onPress={download} activeOpacity={0.85}>
                    <Text style={styles.dlBtnTxt}>⬇ Installer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dismissBtn} onPress={dismiss} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.dismissTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 72,   /* sits above the tab bar */
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  bannerInner: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '66',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 16,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 17,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  dlBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 9,
    flex: 1,
    alignItems: 'center',
  },
  dlBtnTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  dismissBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissTxt: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },
});
