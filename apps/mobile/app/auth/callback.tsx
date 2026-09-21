import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

import { supabase } from '../../lib/supabase';
import { theme } from '../../components/ui';

/**
 * Supabase returns customers here after they tap a confirmation email.  Native
 * apps must exchange the one-time `code` themselves; unlike a website there
 * is no browser URL session for Supabase to detect automatically.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string }>();
  const incomingUrl = Linking.useURL();

  useEffect(() => {
    let active = true;

    const completeVerification = async () => {
      // `useURL` covers links tapped while SARJ is already open; getInitialURL
      // covers links that launch SARJ from a closed state.
      const url = incomingUrl ?? await Linking.getInitialURL();
      if (!url) {
        if (active) router.replace('/login');
        return;
      }

      const parsed = Linking.parse(url);
      const code = typeof params.code === 'string'
        ? params.code
        : typeof parsed.queryParams?.code === 'string'
          ? parsed.queryParams.code
          : undefined;

      let error: Error | null = null;
      if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else {
        // Older confirmation templates can return tokens in the URL fragment.
        const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
        const tokens = new URLSearchParams(fragment);
        const access_token = tokens.get('access_token');
        const refresh_token = tokens.get('refresh_token');
        if (access_token && refresh_token) {
          ({ error } = await supabase.auth.setSession({ access_token, refresh_token }));
        } else {
          error = new Error('The confirmation link is missing its secure sign-in code. Please request a new link.');
        }
      }

      if (error) {
        if (active) {
          Alert.alert('Verification could not finish', error.message);
          router.replace('/login');
        }
        return;
      }

      if (active) router.replace('/');
    };

    void completeVerification();
    return () => { active = false; };
  }, [incomingUrl, params.code]);

  return (
    <View style={styles.page}>
      <ActivityIndicator color={theme.gold} size="large" />
      <Text style={styles.title}>Confirming your account</Text>
      <Text style={styles.copy}>Please wait while we securely sign you in.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: theme.bg },
  title: { marginTop: 20, color: theme.text, fontSize: 22, fontWeight: '900' },
  copy: { marginTop: 8, color: theme.muted, fontSize: 13, textAlign: 'center' },
});
