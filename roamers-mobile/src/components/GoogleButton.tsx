import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { googleLogin } from '../services/api';
import { RADIUS } from '../constants/theme';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_CONFIGURED } from '../constants/google';

/* Configure once at module load. webClientId is what mints the ID token the
   backend verifies; the Android OAuth client (package + SHA-1) is matched
   automatically by Google Play Services — no redirect URIs involved. */
if (GOOGLE_CONFIGURED) {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
}

/** Pull the ID token out of whatever shape this SDK version returns. */
function extractIdToken(res: any): string | null {
  return res?.data?.idToken || res?.idToken || res?.data?.user?.idToken || null;
}

export default function GoogleButton({ onDone }: { onDone?: () => void }) {
  const { loginWithToken } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res: any = await GoogleSignin.signIn();
      const idToken = extractIdToken(res);
      if (!idToken) {
        /* type === 'cancelled' has no token */
        if (res?.type === 'cancelled') return;
        throw new Error('Aucun jeton Google reçu.');
      }
      const data = await googleLogin(idToken);
      await loginWithToken(data.token, data.user);
      onDone?.();
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED || e?.code === statusCodes.IN_PROGRESS) {
        /* user cancelled / already in progress — stay silent */
      } else if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play requis', 'Les services Google Play ne sont pas disponibles sur cet appareil.');
      } else {
        Alert.alert('Connexion Google échouée', e?.message || 'Veuillez réessayer.');
      }
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
      <TouchableOpacity style={styles.btn} activeOpacity={0.85} disabled={busy} onPress={handlePress}>
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
