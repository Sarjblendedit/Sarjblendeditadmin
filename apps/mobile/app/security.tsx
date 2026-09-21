import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { OperationalHero, theme } from '../components/ui';

export default function Security() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    setEmail(user.email ?? '');
  }

  const changePassword = async () => {
    if (!newPassword) {
      Alert.alert('Password required', 'Enter your new password.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Password too short',
        'Your new password must contain at least 8 characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Please enter the same password in both fields.',
      );
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password updated',
        'Your password has been changed successfully.',
      );
    } catch (error) {
      console.error('Password update failed:', error);

      Alert.alert(
        'Unable to update password',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>ACCOUNT</Text>
        </Pressable>

        <OperationalHero eyebrow="ACCOUNT SECURITY" title="Password & security" copy="Manage your password and keep your SARJ account secure." icon="▣" />

        <View style={styles.card}>
          <Text style={styles.label}>ACCOUNT EMAIL</Text>
          <Text style={styles.email}>{email || 'Loading...'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change password</Text>

          <Text style={styles.fieldLabel}>NEW PASSWORD</Text>

          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={theme.mutedDark}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={theme.mutedDark}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Pressable
            onPress={changePassword}
            disabled={saving}
            style={({ pressed }) => [
              styles.button,
              saving && styles.disabled,
              pressed && !saving && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {saving ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account safety</Text>

          <Text style={styles.info}>
            Never share your password with anyone. If you believe someone
            has accessed your account, change your password immediately.
          </Text>
        </View>

        <Text style={styles.footer}>SARJ BLENDED IT</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingRight: 14,
  },

  backArrow: {
    color: theme.gold,
    fontSize: 30,
    lineHeight: 30,
    marginRight: 7,
  },

  backText: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  header: {
    marginTop: 20,
    marginBottom: 22,
  },

  kicker: {
    color: theme.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 7,
  },

  title: {
    color: theme.text,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
  },

  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 14,
  },

  label: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  email: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },

  cardTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 18,
  },

  fieldLabel: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface3,
    color: theme.text,
    paddingHorizontal: 14,
    fontSize: 13,
    marginBottom: 15,
  },

  button: {
    height: 50,
    borderRadius: 15,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },

  buttonText: {
    color: theme.bg,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  disabled: {
    opacity: 0.5,
  },

  info: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  footer: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 8,
  },

  pressed: {
    opacity: 0.68,
  },
});
