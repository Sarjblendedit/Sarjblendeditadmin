import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, OperationalHero, PrimaryButton, theme } from '../components/ui';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications } from '../components/PushNotificationRegistration';

type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type Preferences = {
  booking_updates: boolean;
  appointment_reminders: boolean;
  marketing: boolean;
  language: string;
  payment_preference: 'cash' | 'airtel_money' | 'mtn_momo' | 'zamtel_kwacha' | 'card';
};

const paymentLabels: Record<Preferences['payment_preference'], string> = {
  cash: 'Cash after service',
  airtel_money: 'Airtel Money',
  mtn_momo: 'MTN MoMo',
  zamtel_kwacha: 'Zamtel Kwacha',
  card: 'Card',
};

export default function Settings() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('Customer');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [notifications, setNotifications] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const [language, setLanguage] = useState('English');
  const [paymentMethod, setPaymentMethod] = useState('Cash after service');

  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    setUserId(user.id);
    setEmail(user.email ?? '');

    const [{ data, error }, { data: preferenceData, error: preferenceError }] = await Promise.all([
      supabase
      .from('profiles')
      .select('full_name, phone, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
      supabase
        .from('customer_preferences')
        .select('booking_updates, appointment_reminders, marketing, language, payment_preference')
        .eq('customer_id', user.id)
        .maybeSingle(),
    ]);

    if (error) {
      console.warn('Unable to load profile:', error.message);
      return;
    }

    const profile = data as Profile | null;

    setName(
      profile?.full_name ||
        user.email?.split('@')[0] ||
        'Customer',
    );

    setPhone(profile?.phone ?? '');
    setAvatarUrl(profile?.avatar_url ?? null);

    if (preferenceError) {
      console.warn('Unable to load preferences:', preferenceError.message);
      return;
    }

    const preferences = preferenceData as Preferences | null;
    if (preferences) {
      setNotifications(preferences.booking_updates);
      setBookingReminders(preferences.appointment_reminders);
      setMarketing(preferences.marketing);
      setLanguage(preferences.language);
      setPaymentMethod(paymentLabels[preferences.payment_preference]);
    }
  }

  async function savePreference(changes: Partial<Preferences>) {
    if (!userId) return;
    const { error } = await supabase.from('customer_preferences').upsert(
      { customer_id: userId, ...changes },
      { onConflict: 'customer_id' },
    );
    if (error) {
      Alert.alert('Unable to save preference', error.message);
      await loadProfile();
    }
  }

  const updateBookingUpdates = (value: boolean) => {
    setNotifications(value);
    void savePreference({ booking_updates: value });
  };

  const updateReminders = (value: boolean) => {
    setBookingReminders(value);
    void savePreference({ appointment_reminders: value });
  };

  const updateMarketing = (value: boolean) => {
    setMarketing(value);
    void savePreference({ marketing: value });
  };

  const updatePaymentPreference = (value: Preferences['payment_preference']) => {
    setPaymentMethod(paymentLabels[value]);
    void savePreference({ payment_preference: value });
  };

  const enableDeviceAlerts = async () => {
    const enabled = await registerForPushNotifications();
    if (enabled) {
      Alert.alert('Device alerts enabled', 'Booking updates can now appear as notifications on this device.');
      return;
    }

    Alert.alert(
      'Enable notifications',
      'Allow notifications for SARJ in your phone settings, then return here and try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open phone settings', onPress: () => void Linking.openSettings() },
      ],
    );
  };

  const refreshProfile = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  async function pickProfilePhoto() {
    if (uploading) {
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo access required',
        'Allow SARJ to access your photos so you can choose a profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];

    await uploadProfilePhoto(
      asset.uri,
      asset.mimeType ?? 'image/jpeg',
    );
  }

  async function uploadProfilePhoto(
    uri: string,
    mimeType: string,
  ) {
    if (!userId) {
      return;
    }

    setUploading(true);

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const extension =
        mimeType === 'image/png'
          ? 'png'
          : mimeType === 'image/webp'
            ? 'webp'
            : 'jpg';

      const filePath = `${userId}/profile.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      setAvatarUrl(publicUrl);

      Alert.alert(
        'Profile photo updated',
        'Your new photo has been saved.',
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to upload your photo.';

      Alert.alert('Upload failed', message);
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    if (!userId) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert(
        'Name required',
        'Please enter your name.',
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: trimmedName,
        phone: phone.trim() || null,
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      Alert.alert(
        'Unable to save',
        error.message,
      );
      return;
    }

    setName(trimmedName);
    setEditingProfile(false);

    Alert.alert(
      'Saved',
      'Your profile has been updated.',
    );
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert(
        'Unable to sign out',
        error.message,
      );
      return;
    }

    router.replace('/');
  }

  function confirmSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out of your SARJ account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: signOut,
        },
      ],
    );
  }

  const firstInitial =
    name.trim().slice(0, 1).toUpperCase() || 'C';

  return (
    <SafeAreaView
      style={s.page}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshProfile()}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
      >
        {/* PAGE INTRO */}
        <OperationalHero eyebrow="CUSTOMER SETTINGS" title="Your profile" copy="Keep your customer details and SARJ preferences up to date." icon="⚙" />

        {/* PROFILE HERO */}
        <View style={s.profileHero}>
          <Pressable
            onPress={pickProfilePhoto}
            disabled={uploading}
            style={({ pressed }) => [
              s.avatarButton,
              pressed && s.pressed,
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={s.avatarImage}
              />
            ) : (
              <Text style={s.avatarInitial}>
                {firstInitial}
              </Text>
            )}

            <View style={s.cameraBadge}>
              <Text style={s.cameraText}>
                {uploading ? '…' : '＋'}
              </Text>
            </View>
          </Pressable>

          <View style={s.profileHeroText}>
            <Text style={s.profileName}>
              {name}
            </Text>

            <Text
              style={s.profileEmail}
              numberOfLines={1}
            >
              {email}
            </Text>

            <Pressable
              onPress={pickProfilePhoto}
              disabled={uploading}
              style={({ pressed }) => [
                s.photoAction,
                pressed && s.pressed,
              ]}
            >
              <Text style={s.photoActionText}>
                {uploading
                  ? 'UPLOADING…'
                  : 'CHANGE PHOTO'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* PROFILE */}
        <Text style={s.label}>PROFILE</Text>

        <Card style={s.card}>
          {editingProfile ? (
            <>
              <View style={s.editField}>
                <Text style={s.inputLabel}>
                  FULL NAME
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={theme.mutedDark}
                  style={s.input}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.editField}>
                <Text style={s.inputLabel}>
                  PHONE NUMBER
                </Text>

                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+260..."
                  placeholderTextColor={theme.mutedDark}
                  style={s.input}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={s.editActions}>
                <Pressable
                  onPress={() =>
                    setEditingProfile(false)
                  }
                  style={({ pressed }) => [
                    s.cancelButton,
                    pressed && s.pressed,
                  ]}
                >
                  <Text style={s.cancelText}>
                    CANCEL
                  </Text>
                </Pressable>

                <View style={s.saveWrap}>
                  <PrimaryButton
                    title="SAVE PROFILE"
                    onPress={saveProfile}
                    loading={saving}
                    disabled={saving}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <Row
                label="Name"
                value={name}
                onPress={() =>
                  setEditingProfile(true)
                }
              />

              <Row
                label="Email"
                value={email || 'Not available'}
              />

              <Row
                label="Phone"
                value={phone || 'Add phone number'}
                onPress={() =>
                  setEditingProfile(true)
                }
              />

              <Row
                label="Membership"
                value="SARJ CLIENT"
              />
            </>
          )}
        </Card>

        {/* NOTIFICATIONS */}
        <Text style={s.label}>
          NOTIFICATIONS
        </Text>

        <Card style={s.card}>
          <SwitchRow
            title="Booking updates"
            description="Status changes and appointment updates."
            value={notifications}
            onValueChange={updateBookingUpdates}
          />

          <View style={s.divider} />

          <SwitchRow
            title="Appointment reminders"
            description="Receive reminders before your appointment."
            value={bookingReminders}
            onValueChange={updateReminders}
          />

          <View style={s.divider} />

          <SwitchRow
            title="SARJ offers"
            description="Occasional promotions and service news."
            value={marketing}
            onValueChange={updateMarketing}
          />

          <View style={s.divider} />

          <Row
            label="Notification inbox"
            value="View your booking messages"
            onPress={() => router.push('/notifications')}
          />

          <View style={s.divider} />

          <Row
            label="Device alerts"
            value="Enable phone notifications"
            onPress={enableDeviceAlerts}
          />
        </Card>

        {/* APP SETTINGS */}
        <Text style={s.label}>
          APP SETTINGS
        </Text>

        <Card style={s.card}>
          <Row
            label="Language"
            value={language}
          />

          <Row
            label="Appearance"
            value="Dark"
          />

          <Row
            label="Payment preference"
            value={paymentMethod}
            onPress={() =>
              Alert.alert(
                'Payment preference',
                'Choose how you prefer to pay after your SARJ service.',
                [
                  ...Object.entries(paymentLabels).map(([value, label]) => ({
                    text: label,
                    onPress: () => updatePaymentPreference(value as Preferences['payment_preference']),
                  })),
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ],
              )
            }
          />

          <Row
            label="Saved address"
            value="Manage your service locations"
            onPress={() => router.push('/addresses')}
          />
        </Card>

        {/* PRIVACY & SECURITY */}
        <Text style={s.label}>
          PRIVACY & SECURITY
        </Text>

        <Card style={s.card}>
          <Pressable
            onPress={() => router.push('/security')}
            style={({ pressed }) => [
              s.row,
              pressed && s.pressed,
            ]}
          >
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>
                Password & security
              </Text>

              <Text style={s.rowCopy}>
                Manage account access and security.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>

          <View style={s.divider} />

          <Pressable
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [
              s.row,
              pressed && s.pressed,
            ]}
          >
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>
                Privacy
              </Text>

              <Text style={s.rowCopy}>
                Review how your account information is used.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>
        </Card>

        {/* SUPPORT & INFORMATION */}
        <Text style={s.label}>
          SUPPORT & INFORMATION
        </Text>

        <Card style={s.card}>
          <Pressable
            onPress={() => router.push('/help')}
            style={({ pressed }) => [
              s.row,
              pressed && s.pressed,
            ]}
          >
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>
                Help & support
              </Text>

              <Text style={s.rowCopy}>
                Get help with bookings and your account.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>

          <View style={s.divider} />

          <Pressable
            onPress={() => router.push('/about')}
            style={({ pressed }) => [
              s.row,
              pressed && s.pressed,
            ]}
          >
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>
                About SARJ
              </Text>

              <Text style={s.rowCopy}>
                Learn more about SARJ BLENDED IT.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>
        </Card>

        {/* ACCOUNT */}
        <Text style={s.label}>
          ACCOUNT
        </Text>

        <Card style={s.card}>
          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => [
              s.row,
              pressed && s.pressed,
            ]}
          >
            <View style={s.rowMain}>
              <Text style={s.signout}>
                Sign out
              </Text>

              <Text style={s.rowCopy}>
                Sign out of this device.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>
        </Card>

        <Text style={s.version}>
          SARJ BLENDED IT · VERSION 1.0.0
        </Text>

        <View style={s.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const isAction = typeof onPress === 'function';

  const content = (
    <>
      <View style={s.rowMain}>
        <Text style={s.rowTitle}>
          {label}
        </Text>

        <Text
          style={s.rowCopy}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>

      {isAction ? (
        <Text style={s.arrow}>›</Text>
      ) : null}
    </>
  );

  if (!isAction) {
    return (
      <View style={s.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        pressed && s.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

function SwitchRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={s.switchRow}>
      <View style={s.rowMain}>
        <Text style={s.rowTitle}>
          {title}
        </Text>

        <Text style={s.rowCopy}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.line,
          true: theme.goldDark,
        }}
        thumbColor={
          value
            ? theme.goldSoft
            : theme.muted
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },

  intro: {
    marginBottom: 22,
  },

  kicker: {
    color: theme.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginTop: 0,
  },

  title: {
    color: theme.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 7,
  },

  copy: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 360,
  },

  profileHero: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface2,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarButton: {
    width: 78,
    height: 78,
    borderRadius: 28,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 27,
  },

  avatarInitial: {
    color: theme.goldSoft,
    fontSize: 30,
    fontWeight: '900',
  },

  cameraBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.surface2,
  },

  cameraText: {
    color: theme.bg,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },

  profileHeroText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },

  profileName: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
  },

  profileEmail: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 5,
  },

  photoAction: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },

  photoActionText: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  label: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 28,
    marginBottom: 9,
  },

  card: {
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },

  row: {
    minHeight: 70,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowMain: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
  },

  rowCopy: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    paddingRight: 8,
  },

  arrow: {
    color: theme.mutedDark,
    fontSize: 24,
    lineHeight: 28,
    marginLeft: 12,
  },

  divider: {
    height: 1,
    backgroundColor: theme.line,
  },

  switchRow: {
    minHeight: 78,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  editField: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  inputLabel: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 7,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 14,
    backgroundColor: theme.bg,
    paddingHorizontal: 14,
    color: theme.text,
    fontSize: 13,
  },

  editActions: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  cancelButton: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  saveWrap: {
    flex: 1,
  },

  signout: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.72,
  },

  version: {
    color: theme.mutedDark,
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 30,
  },

  bottomSpace: {
    height: 100,
  },
});
