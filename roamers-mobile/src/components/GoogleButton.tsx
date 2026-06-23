import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { googleLogin } from '../services/api';
import { RADIUS } from '../constants/theme';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_CONFIGURED,
} from '../constants/google';

/* Required so the auth popup can close itself and return to the app */
WebBrowser.maybeCompleteAuthSession();

/**
 * "Continuer avec Google" button. Renders nothing until the Google client IDs
 * are configured (see src/constants/google.ts), so the build is safe to ship
 * before Google Cloud setup is finished.
 */
export default function GoogleButton({ onDone }: { onDone?: () => void }) {
  const { loginWithToken } = useAuth();
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = (response.params as any)?.id_token;
      if (idToken) { handleToken(idToken); return; }
      setBusy(false);
    } else {
      /* error / dismiss / cancel */
      setBusy(false);
    }
  }, [response]);

  async function handleToken(idToken: string) {
    try {
      const data = await googleLogin(idToken);
      await loginWithToken(data.token, data.user);
      onDone?.();
    } catch (e: any) {
      Alert.alert('Connexion Google échouée', e?.message || 'Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  }

  if (!GOOGLE_CONFIGURED) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>ou</Text>
        <View style={styles.line} />
      </View>
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        disabled={!request || busy}
        onPress={() => { setBusy(true); promptAsync(); }}
      >
        {busy ? (
          <ActivityIndicator color="#3c4043" />
        ) : (
          <>
            <Text style={styles.g}>G</Text>
            <Text style={styles.txt}>Continuer avec Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { width: '100%' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line:    { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  or:      { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginHorizontal: 12 },
  btn:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 13, gap: 10,
  },
  g:   { color: '#4285F4', fontSize: 18, fontWeight: '900' },
  txt: { color: '#3c4043', fontSize: 15, fontWeight: '700' },
});
