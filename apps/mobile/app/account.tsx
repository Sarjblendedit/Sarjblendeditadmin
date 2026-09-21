import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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
import {
  Card,
  OperationalHero,
  PrimaryButton,
  SectionHeading,
  Skeleton,
  theme,
} from '../components/ui';

type Booking = {
  id: string;
  scheduled_at: string;
  status: string;
  service: {
    name: string;
  } | null;
};

type BookingRow = {
  id: string;
  scheduled_at: string;
  status: string;
  service:
    | {
        name: string;
      }[]
    | null;
};

type AccountSection =
  | 'main'
  | 'help'
  | 'security'
  | 'privacy'
  | 'about';

export default function Account() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] =
    useState<AccountSection>('main');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        const [
          { data: profile, error: profileError },
          { data: bookingData, error: bookingsError },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle(),

          supabase
            .from('bookings')
            .select(
              `
                id,
                scheduled_at,
                status,
                service:services(name)
              `,
            )
            .eq('customer_id', user.id)
            .order('scheduled_at', { ascending: false }),
        ]);

        if (profileError) {
          console.error(
            'Failed to load profile:',
            profileError,
          );
        }

        if (bookingsError) {
          console.error(
            'Failed to load bookings:',
            bookingsError,
          );
        }

        setName(
          profile?.full_name ||
            user.email?.split('@')[0] ||
            'Customer',
        );

        setEmail(user.email ?? '');
        setAvatarUrl(profile?.avatar_url ?? null);

        const rows = (bookingData ?? []) as unknown as BookingRow[];

        const normalizedBookings: Booking[] = rows.map(
          (booking) => ({
            id: booking.id,
            scheduled_at: booking.scheduled_at,
            status: booking.status,
            service: Array.isArray(booking.service)
              ? booking.service[0] ?? null
              : booking.service ?? null,
          }),
        );

        setBookings(normalizedBookings);
      } catch (error) {
        console.error('Failed to load account:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadAccount();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert(
          'Sign out failed',
          error.message || 'Please try again.',
        );
        return;
      }

      router.replace('/');
    } catch (error) {
      console.error('Sign out failed:', error);

      Alert.alert(
        'Sign out failed',
        'Please try again.',
      );
    }
  };

  const changePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert(
        'New password required',
        'Please enter a new password.',
      );
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Password too short',
        'Your password must contain at least 8 characters.',
      );
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert(
        'Confirm your password',
        'Please enter your new password again.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'The two password fields must match.',
      );
      return;
    }

    try {
      setUpdatingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error(
          'Password update failed:',
          error,
        );

        Alert.alert(
          'Password update failed',
          error.message ||
            'We could not update your password.',
        );

        return;
      }

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password updated',
        'Your SARJ account password has been updated successfully.',
      );
    } catch (error) {
      console.error(
        'Unexpected password update error:',
        error,
      );

      Alert.alert(
        'Password update failed',
        'Something went wrong. Please try again.',
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const callSARJ = async () => {
    try {
      const phoneUrl = 'tel:+260975616716';

      const supported = await Linking.canOpenURL(phoneUrl);

      if (!supported) {
        Alert.alert(
          'Unable to call',
          'Your device cannot open the phone application.',
        );
        return;
      }

      await Linking.openURL(phoneUrl);
    } catch (error) {
      console.error('Failed to open phone:', error);

      Alert.alert(
        'Unable to call',
        'Please call +260 9756 16716 directly.',
      );
    }
  };

  const emailSARJ = async () => {
    try {
      const emailUrl =
        'mailto:info@sarjblendedit.com?subject=SARJ%20Support';

      const supported = await Linking.canOpenURL(emailUrl);

      if (!supported) {
        Alert.alert(
          'Unable to open email',
          'No email application is available on this device.',
        );
        return;
      }

      await Linking.openURL(emailUrl);
    } catch (error) {
      console.error('Failed to open email:', error);

      Alert.alert(
        'Unable to open email',
        'Please contact SARJ directly.',
      );
    }
  };

  const renderBackHeader = (
    kicker: string,
    titleText: string,
    description: string,
  ) => {
    return (
      <View style={styles.subHeader}>
        <Pressable
          onPress={() => setActiveSection('main')}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <View style={styles.subHeaderCopy}>
          <Text style={styles.subKicker}>{kicker}</Text>

          <Text style={styles.subTitle}>
            {titleText}
          </Text>

          <Text style={styles.subDescription}>
            {description}
          </Text>
        </View>
      </View>
    );
  };

  const renderHelp = () => {
    return (
      <SafeAreaView
        style={styles.page}
        edges={['left', 'right', 'bottom']}
      >
        <ScrollView
          contentContainerStyle={styles.subContent}
          showsVerticalScrollIndicator={false}
        >
          {renderBackHeader(
            'HELP & SUPPORT',
            'How can we help?',
            'Get assistance with bookings, your account or SARJ services.',
          )}

          <View style={styles.supportCard}>
            <View style={styles.supportIcon}>
              <Text style={styles.supportIconText}>?</Text>
            </View>

            <View style={styles.supportCopy}>
              <Text style={styles.supportTitle}>
                Booking help
              </Text>

              <Text style={styles.supportText}>
                Need help making, changing or understanding a
                booking? Contact SARJ directly and we can assist
                with your appointment.
              </Text>
            </View>
          </View>

          <View style={styles.supportCard}>
            <View style={styles.supportIcon}>
              <Text style={styles.supportIconText}>S</Text>
            </View>

            <View style={styles.supportCopy}>
              <Text style={styles.supportTitle}>
                Account help
              </Text>

              <Text style={styles.supportText}>
                For profile, account or security issues, you can
                use Settings and Password & Security, or contact
                SARJ directly.
              </Text>
            </View>
          </View>

          <View style={styles.supportCard}>
            <View style={styles.supportIcon}>
              <Text style={styles.supportIconText}>☎</Text>
            </View>

            <View style={styles.supportCopy}>
              <Text style={styles.supportTitle}>
                Contact SARJ
              </Text>

              <Text style={styles.supportText}>
                Speak directly with SARJ BLENDED IT for support
                with your service or account.
              </Text>
            </View>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionCardKicker}>
              GET IN TOUCH
            </Text>

            <Text style={styles.actionCardTitle}>
              Contact SARJ
            </Text>

            <Text style={styles.actionCardText}>
              Choose how you would like to contact SARJ.
            </Text>

            <Pressable
              onPress={callSARJ}
              style={({ pressed }) => [
                styles.contactAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.contactActionIcon}>
                <Text style={styles.contactActionIconText}>
                  ☎
                </Text>
              </View>

              <View style={styles.contactActionCopy}>
                <Text style={styles.contactActionTitle}>
                  Call SARJ
                </Text>

                <Text style={styles.contactActionDetail}>
                  +260 9756 16716
                </Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </Pressable>

            <Pressable
              onPress={emailSARJ}
              style={({ pressed }) => [
                styles.contactAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.contactActionIcon}>
                <Text style={styles.contactActionIconText}>
                  @
                </Text>
              </View>

              <View style={styles.contactActionCopy}>
                <Text style={styles.contactActionTitle}>
                  Email SARJ
                </Text>

                <Text style={styles.contactActionDetail}>
                  Contact support by email
                </Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderSecurity = () => {
    return (
      <SafeAreaView
        style={styles.page}
        edges={['left', 'right', 'bottom']}
      >
        <ScrollView
          contentContainerStyle={styles.subContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderBackHeader(
            'SECURITY',
            'Password & Security',
            'Manage your SARJ account password and security.',
          )}

          <View style={styles.securityAccountCard}>
            <View style={styles.securityAccountIcon}>
              <Text style={styles.securityAccountIconText}>
                @
              </Text>
            </View>

            <View style={styles.securityAccountCopy}>
              <Text style={styles.securityAccountLabel}>
                ACCOUNT EMAIL
              </Text>

              <Text
                style={styles.securityAccountEmail}
                numberOfLines={1}
              >
                {email || 'No email available'}
              </Text>
            </View>
          </View>

          <View style={styles.passwordCard}>
            <Text style={styles.passwordTitle}>
              Change password
            </Text>

            <Text style={styles.passwordDescription}>
              Enter a new password below. Your new password must
              contain at least 8 characters.
            </Text>

            <Text style={styles.inputLabel}>
              NEW PASSWORD
            </Text>

            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={theme.mutedDark}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>
              CONFIRM PASSWORD
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter password again"
              placeholderTextColor={theme.mutedDark}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              style={styles.input}
            />

            <PrimaryButton
              title={
                updatingPassword
                  ? 'UPDATING...'
                  : 'UPDATE PASSWORD  →'
              }
              onPress={changePassword}
              disabled={updatingPassword}
            />
          </View>

          <View style={styles.securityInfoCard}>
            <Text style={styles.securityInfoTitle}>
              Keep your account secure
            </Text>

            <Text style={styles.securityInfoText}>
              Never share your SARJ password with another person.
              If you think someone else has access to your account,
              change your password immediately.
            </Text>
          </View>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.securitySignout,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.securitySignoutText}>
              SIGN OUT OF ACCOUNT
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderPrivacy = () => {
    return (
      <SafeAreaView
        style={styles.page}
        edges={['left', 'right', 'bottom']}
      >
        <ScrollView
          contentContainerStyle={styles.subContent}
          showsVerticalScrollIndicator={false}
        >
          {renderBackHeader(
            'PRIVACY',
            'Your privacy',
            'Information about your SARJ account and booking data.',
          )}

          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <Text style={styles.privacyIconText}>P</Text>
            </View>

            <Text style={styles.privacyTitle}>
              Your account information
            </Text>

            <Text style={styles.privacyText}>
              Your SARJ account uses information such as your name
              and email address to identify your account and provide
              the services available through the app.
            </Text>
          </View>

          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <Text style={styles.privacyIconText}>B</Text>
            </View>

            <Text style={styles.privacyTitle}>
              Your bookings
            </Text>

            <Text style={styles.privacyText}>
              Your booking information is associated with your
              account so you can view and manage your appointments.
            </Text>
          </View>

          <View style={styles.privacyCard}>
            <View style={styles.privacyIcon}>
              <Text style={styles.privacyIconText}>S</Text>
            </View>

            <Text style={styles.privacyTitle}>
              Account security
            </Text>

            <Text style={styles.privacyText}>
              Keep your login details private. You can change your
              password at any time from Password & Security.
            </Text>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionCardKicker}>
              PRIVACY QUESTIONS
            </Text>

            <Text style={styles.actionCardTitle}>
              Need more information?
            </Text>

            <Text style={styles.actionCardText}>
              Contact SARJ if you have a question about your
              account information or how your information is used.
            </Text>

            <Pressable
              onPress={callSARJ}
              style={({ pressed }) => [
                styles.contactAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.contactActionIcon}>
                <Text style={styles.contactActionIconText}>
                  ☎
                </Text>
              </View>

              <View style={styles.contactActionCopy}>
                <Text style={styles.contactActionTitle}>
                  Contact SARJ
                </Text>

                <Text style={styles.contactActionDetail}>
                  +260 9756 16716
                </Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderAbout = () => {
    return (
      <SafeAreaView
        style={styles.page}
        edges={['left', 'right', 'bottom']}
      >
        <ScrollView
          contentContainerStyle={styles.subContent}
          showsVerticalScrollIndicator={false}
        >
          {renderBackHeader(
            'ABOUT SARJ',
            'SARJ BLENDED IT',
            'Learn more about the service and the SARJ experience.',
          )}

          <View style={styles.aboutHero}>
            <View style={styles.aboutLogo}>
              <Text style={styles.aboutLogoText}>S</Text>
            </View>

            <Text style={styles.aboutBrand}>
              SARJ BLENDED IT
            </Text>

            <Text style={styles.aboutTagline}>
              Premium mobile grooming brought directly to you.
            </Text>
          </View>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutCardTitle}>
              The SARJ experience
            </Text>

            <Text style={styles.aboutCardText}>
              SARJ BLENDED IT provides mobile grooming services
              designed to come directly to you.
            </Text>

            <Text style={styles.aboutCardText}>
              Use the app to explore services, make appointments,
              view your bookings and manage your account.
            </Text>
          </View>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutCardTitle}>
              Service locations
            </Text>

            <Text style={styles.aboutCardText}>
              SARJ services can be arranged for your home, office,
              hotel or event.
            </Text>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionCardKicker}>
              SARJ BLENDED IT
            </Text>

            <Text style={styles.actionCardTitle}>
              Get in touch
            </Text>

            <Text style={styles.actionCardText}>
              Contact SARJ for service information, bookings or
              support.
            </Text>

            <Pressable
              onPress={callSARJ}
              style={({ pressed }) => [
                styles.contactAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.contactActionIcon}>
                <Text style={styles.contactActionIconText}>
                  ☎
                </Text>
              </View>

              <View style={styles.contactActionCopy}>
                <Text style={styles.contactActionTitle}>
                  Call SARJ
                </Text>

                <Text style={styles.contactActionDetail}>
                  +260 9756 16716
                </Text>
              </View>

              <Text style={styles.contactArrow}>›</Text>
            </Pressable>
          </View>

          <Text style={styles.aboutFooter}>
            SARJ BLENDED IT
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderSubsection = () => {
    switch (activeSection) {
      case 'help':
        return renderHelp();

      case 'security':
        return renderSecurity();

      case 'privacy':
        return renderPrivacy();

      case 'about':
        return renderAbout();

      default:
        return null;
    }
  };

  if (activeSection !== 'main') {
    return renderSubsection();
  }

  return (
    <SafeAreaView
      style={styles.page}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page intro */}
        <OperationalHero
          eyebrow="YOUR ACCOUNT"
          title="Your account"
          copy="Manage your profile, appointments and SARJ preferences."
          icon="◉"
        />

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <Text style={styles.avatarText}>
                {name.slice(0, 1).toUpperCase() || 'S'}
              </Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {name}
            </Text>

            <Text
              style={styles.email}
              numberOfLines={1}
            >
              {email}
            </Text>

            <View style={styles.memberBadge}>
              <View style={styles.memberDot} />

              <Text style={styles.memberText}>
                SARJ CLIENT
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={10}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.editText}>
              EDIT
            </Text>

            <Text style={styles.editArrow}>
              ›
            </Text>
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <Quick
            icon="○"
            label="Notifications"
            onPress={() =>
              router.push('/notifications')
            }
          />

          <Quick
            icon="+"
            label="New booking"
            onPress={() =>
              router.push('/book')
            }
          />

          <Quick
            icon="⚙"
            label="Settings"
            onPress={() =>
              router.push('/settings')
            }
          />
        </View>

        {/* Appointments */}
        <View style={styles.section}>
          <SectionHeading
            eyebrow="APPOINTMENTS"
            title="Your bookings"
            action="BOOK"
            onAction={() =>
              router.push('/book')
            }
          />

          {loading ? (
            <View style={styles.loadingStack}>
              <Skeleton
                height={88}
                style={styles.skeleton}
              />

              <Skeleton height={88} />
            </View>
          ) : bookings.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>
                  +
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                Your chair is waiting.
              </Text>

              <Text style={styles.emptyCopy}>
                Make your first appointment in a few taps and let
                SARJ take care of the rest.
              </Text>

              <PrimaryButton
                title="BOOK NOW  →"
                onPress={() =>
                  router.push('/book')
                }
              />
            </Card>
          ) : (
            <View style={styles.bookingList}>
              {bookings.map((booking) => (
                <Pressable
                  key={booking.id}
                  onPress={() =>
                    router.push({
                      pathname: '/bookings/[id]',
                      params: {
                        id: booking.id,
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.booking,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.bookingIcon}>
                    <Text style={styles.bookingIconText}>
                      S
                    </Text>
                  </View>

                  <View style={styles.bookingInfo}>
                    <Text
                      style={styles.bookingName}
                      numberOfLines={1}
                    >
                      {booking.service?.name ??
                        'Grooming appointment'}
                    </Text>

                    <Text
                      style={styles.date}
                      numberOfLines={1}
                    >
                      {formatBookingDate(
                        booking.scheduled_at,
                      )}
                    </Text>
                  </View>

                  <View style={styles.bookingRight}>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />

                      <Text style={styles.status}>
                        {booking.status.replaceAll(
                          '_',
                          ' ',
                        )}
                      </Text>
                    </View>

                    <Text style={styles.arrow}>
                      ›
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.linksCard}>
  <AccountLink
    label="Help & Support"
    detail="Get help with bookings, payments and your account"
    onPress={() => router.push('/help')}
  />

  <View style={styles.linkDivider} />

  <AccountLink
    label="Password & Security"
    detail="Manage your password and account security"
    onPress={() => router.push('/security')}
  />

  <View style={styles.linkDivider} />

  <AccountLink
    label="Privacy"
    detail="Privacy and personal information"
    onPress={() => router.push('/privacy')}
  />

  <View style={styles.linkDivider} />

  <AccountLink
    label="About SARJ"
    detail="Learn more about SARJ BLENDED IT"
    onPress={() => router.push('/about')}
  />
</View>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.signout,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.signoutText}>
            SIGN OUT
          </Text>
        </Pressable>

        <Text style={styles.footer}>
          SARJ BLENDED IT
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Quick({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickItem,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.quickIconWrap}>
        <Text style={styles.quickIcon}>
          {icon}
        </Text>
      </View>

      <Text style={styles.quickLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function AccountLink({
  label,
  detail,
  onPress,
}: {
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountLink,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.linkIcon}>
        <Text style={styles.linkIconText}>
          •
        </Text>
      </View>

      <View style={styles.linkContent}>
        <Text style={styles.linkLabel}>
          {label}
        </Text>

        <Text style={styles.linkDetail}>
          {detail}
        </Text>
      </View>

      <Text style={styles.linkArrow}>
        ›
      </Text>
    </Pressable>
  );
}

function formatBookingDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 120,
  },

  intro: {
    marginBottom: 20,
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 330,
  },

  profileCard: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: theme.goldSoft,
    fontSize: 25,
    fontWeight: '900',
  },

  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: theme.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },

  email: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 3,
  },

  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  memberDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.gold,
    marginRight: 6,
  },

  memberText: {
    color: theme.goldDark,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  editButton: {
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingVertical: 7,
  },

  editText: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  editArrow: {
    color: theme.gold,
    fontSize: 17,
    lineHeight: 17,
    marginTop: 1,
  },

  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  quickItem: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },

  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIcon: {
    color: theme.gold,
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '900',
  },

  quickLabel: {
    color: theme.textSoft,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 9,
    textAlign: 'center',
  },

  section: {
    marginTop: 30,
  },

  loadingStack: {
    marginTop: 2,
  },

  skeleton: {
    marginBottom: 10,
  },

  emptyCard: {
    marginTop: 2,
    padding: 20,
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyIconText: {
    color: theme.gold,
    fontSize: 23,
    fontWeight: '700',
  },

  emptyTitle: {
    color: theme.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },

  emptyCopy: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 17,
  },

  bookingList: {
    marginTop: 2,
  },

  booking: {
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  bookingIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  bookingIconText: {
    color: theme.gold,
    fontSize: 16,
    fontWeight: '900',
  },

  bookingInfo: {
    flex: 1,
    minWidth: 0,
  },

  bookingName: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },

  date: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  bookingRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 90,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.gold,
    marginRight: 5,
  },

  status: {
    color: theme.goldSoft,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  arrow: {
    color: theme.mutedDark,
    fontSize: 25,
    lineHeight: 25,
    marginTop: 3,
  },

  linksCard: {
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  accountLink: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.surface3,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  linkIconText: {
    color: theme.gold,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '900',
  },

  linkContent: {
    flex: 1,
  },

  linkLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
  },

  linkDetail: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 3,
  },

  linkArrow: {
    color: theme.mutedDark,
    fontSize: 24,
    marginLeft: 8,
  },

  linkDivider: {
    height: 1,
    backgroundColor: theme.lineSoft,
  },

  signout: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#452929',
    backgroundColor: '#130D0D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  signoutText: {
    color: '#D18181',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  footer: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 22,
  },

  pressed: {
    opacity: 0.68,
  },

  // ---------------------------------------------------------
  // ACCOUNT SUB-SECTIONS
  // ---------------------------------------------------------

  subContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 120,
  },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backArrow: {
    color: theme.text,
    fontSize: 31,
    lineHeight: 31,
    marginTop: -2,
  },

  subHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 13,
  },

  subKicker: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.7,
    marginBottom: 5,
  },

  subTitle: {
    color: theme.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  subDescription: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  supportCard: {
    flexDirection: 'row',
    padding: 17,
    borderRadius: 19,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 11,
  },

  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  supportIconText: {
    color: theme.gold,
    fontSize: 17,
    fontWeight: '900',
  },

  supportCopy: {
    flex: 1,
  },

  supportTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },

  supportText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  actionCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginTop: 3,
  },

  actionCardKicker: {
    color: theme.gold,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  actionCardTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },

  actionCardText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  contactAction: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: theme.surface3,
    borderWidth: 1,
    borderColor: theme.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
  },

  contactActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactActionIconText: {
    color: theme.gold,
    fontSize: 15,
    fontWeight: '900',
  },

  contactActionCopy: {
    flex: 1,
    marginLeft: 11,
  },

  contactActionTitle: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '900',
  },

  contactActionDetail: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 3,
  },

  contactArrow: {
    color: theme.mutedDark,
    fontSize: 24,
    marginLeft: 8,
  },

  securityAccountCard: {
    minHeight: 76,
    borderRadius: 19,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  securityAccountIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityAccountIconText: {
    color: theme.gold,
    fontSize: 16,
    fontWeight: '900',
  },

  securityAccountCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },

  securityAccountLabel: {
    color: theme.goldDark,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  securityAccountEmail: {
    color: theme.text,
    fontSize: 13,
    marginTop: 4,
  },

  passwordCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  passwordTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
  },

  passwordDescription: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 18,
  },

  inputLabel: {
    color: theme.goldDark,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.surface3,
    borderWidth: 1,
    borderColor: theme.line,
    color: theme.text,
    paddingHorizontal: 14,
    fontSize: 13,
    marginBottom: 15,
  },

  securityInfoCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 19,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  securityInfoTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },

  securityInfoText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  securitySignout: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#452929',
    backgroundColor: '#130D0D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
  },

  securitySignoutText: {
    color: '#D18181',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  privacyCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 11,
  },

  privacyIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  privacyIconText: {
    color: theme.gold,
    fontSize: 14,
    fontWeight: '900',
  },

  privacyTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  privacyText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6,
  },

  aboutHero: {
    padding: 25,
    borderRadius: 21,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
  },

  aboutLogo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aboutLogoText: {
    color: theme.gold,
    fontSize: 31,
    fontWeight: '900',
  },

  aboutBrand: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 13,
    letterSpacing: 0.2,
  },

  aboutTagline: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },

  aboutCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginTop: 11,
  },

  aboutCardTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  aboutCardText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
  },

  aboutFooter: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 22,
  },
});
