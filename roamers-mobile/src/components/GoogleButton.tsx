import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { googleLogin } from '../services/api';
import { RADIUS } from '../constants/theme';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_CONFIGURED } from '../constants/google';

/* Load the native module defensively. If anything is off with the native side,
   we capture it here instead of letting it crash the whole app at startup. */
let GoogleSignin: any = null;
let statusCodes: any = {};
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes || {};
} catch (e) {
  GoogleSignin = null;
}

let _configured = false;
function ensureConfigured(): boolean {
  if (!GoogleSignin || !GOOGLE_CONFIGURED) return false;
  if (_configured) return true;
  try {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    _configured = true;
    return true;
  } catch (e) {
    return false;
  }
}

function extractIdToken(res: any): string | null {
  return res?.data?.idToken || res?.idToken || res?.data?.user?.idToken || null;
}

export default function GoogleButton({ onDone }: { onDone?: () => void }) {
  const { loginWithToken } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (!ensureConfigured()) {
      Alert.alert('Indisponible', 'La connexion Google n\'est pas disponible sur cet appareil.');
      return;
    }
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res: any = await GoogleSignin.signIn();
      const idToken = extractIdToken(res);
      if (!idToken) {
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

  /* Render nothing if the native module is missing or config isn't set —
     never block or crash the screen. */
  if (!GoogleSignin || !GOOGLE_CONFIGURED) return null;

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
