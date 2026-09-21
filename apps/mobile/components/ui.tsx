import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReactNode } from 'react';
import type {
  AppStateStatus,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { supabase } from '../lib/supabase';

/* =========================================================
   SARJ DESIGN SYSTEM
========================================================= */

export const theme = {
  bg: '#070707',
  surface: '#0E0F10',
  surface2: '#141516',
  surface3: '#1B1D1F',
  surface4: '#222426',

  line: '#292B2E',
  lineSoft: '#202225',

  text: '#F7F5EF',
  textSoft: '#D8D5CC',
  muted: '#96938B',
  mutedDark: '#68665F',

  gold: '#D7B84B',
  goldSoft: '#F1D67B',
  goldBright: '#F7DF8A',
  goldDark: '#8D7120',
  goldSurface: '#2A2411',

  danger: '#D96A6A',
  success: '#78B88A',

  white: '#FFFFFF',
  black: '#000000',
};

/*
 * Shared sizing tokens.
 *
 * Pages should use these values instead of inventing their
 * own spacing and dimensions.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 30,
  page: 20,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const typography = {
  eyebrow: 10,
  caption: 11,
  bodySmall: 12,
  body: 14,
  bodyLarge: 16,
  titleSmall: 18,
  title: 24,
  titleLarge: 30,
  hero: 36,
};

/* =========================================================
   LOGO
========================================================= */

export function Logo({
  small = false,
}: {
  small?: boolean;
}) {
  const pathname = usePathname();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('logo_url')
        .eq('id', true)
        .maybeSingle();

      if (error) {
        console.warn(
          'Unable to load SARJ business logo:',
          error.message,
        );
        return;
      }

      const url =
        typeof data?.logo_url === 'string' &&
        data.logo_url.trim().length > 0
          ? data.logo_url.trim()
          : null;

      setLogoUrl(url);
      setImageFailed(false);
    } catch (error) {
      console.error(
        'Failed to load SARJ business logo:',
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  /* Reload when route changes. */
  useEffect(() => {
    void loadLogo();
  }, [pathname]);

  /* Reload whenever app becomes active. */
  useEffect(() => {
    const handleAppStateChange = (
      nextState: AppStateStatus,
    ) => {
      if (nextState === 'active') {
        void loadLogo();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  /* Listen for business_settings changes. */
  useEffect(() => {
    let mounted = true;

    const channelName = `sarj-business-logo-${Date.now()}`;

    const setupRealtime = async () => {
      try {
        const existingChannels = supabase
          .getChannels()
          .filter(channel =>
            channel.topic.startsWith(
              'realtime:sarj-business-logo',
            ),
          );

        for (const existingChannel of existingChannels) {
          await supabase.removeChannel(existingChannel);
        }

        if (!mounted) {
          return null;
        }

        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'business_settings',
              filter: 'id=eq.true',
            },
            payload => {
              const newRow = payload.new as {
                logo_url?: string | null;
              };

              const nextLogo =
                typeof newRow.logo_url === 'string' &&
                newRow.logo_url.trim().length > 0
                  ? newRow.logo_url.trim()
                  : null;

              if (!mounted) {
                return;
              }

              setLogoUrl(nextLogo);
              setImageFailed(false);
              setLoading(false);
            },
          );

        channel.subscribe(status => {
          if (status === 'SUBSCRIBED') {
            console.log(
              'SARJ BUSINESS LOGO REALTIME: connected',
            );
          }

          if (status === 'CHANNEL_ERROR') {
            console.warn(
              'SARJ BUSINESS LOGO REALTIME: channel error',
            );
          }

          if (status === 'TIMED_OUT') {
            console.warn(
              'SARJ BUSINESS LOGO REALTIME: timed out',
            );
          }
        });

        if (!mounted) {
          await supabase.removeChannel(channel);
          return null;
        }

        return channel;
      } catch (error) {
        console.warn(
          'SARJ business logo realtime setup failed:',
          error,
        );

        return null;
      }
    };

    let channel: ReturnType<typeof supabase.channel> | null =
      null;

    void setupRealtime().then(createdChannel => {
      if (!mounted) {
        if (createdChannel) {
          void supabase.removeChannel(createdChannel);
        }

        return;
      }

      channel = createdChannel ?? null;
    });

    return () => {
      mounted = false;

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  const displayUrl = logoUrl
    ? `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}mobileLogo=1`
    : null;

  const size = small ? 40 : 72;
  const radiusValue = small ? 13 : 22;

  return (
    <View
      style={[
        styles.logoWrap,
        {
          width: size,
          height: size,
          borderRadius: radiusValue,
        },
      ]}
    >
      {displayUrl && !imageFailed ? (
        <Image
          key={displayUrl}
          source={{ uri: displayUrl }}
          style={[
            styles.logoImage,
            {
              width: size,
              height: size,
              borderRadius: radiusValue,
            },
          ]}
          resizeMode="contain"
          onLoad={() => {
            setLoading(false);

            console.log(
              'SARJ BUSINESS LOGO LOADED:',
              logoUrl,
            );
          }}
          onError={event => {
            setLoading(false);
            setImageFailed(true);

            console.warn(
              'SARJ BUSINESS LOGO FAILED:',
              event.nativeEvent.error,
              logoUrl,
            );
          }}
        />
      ) : null}

      {loading && !displayUrl ? (
        <ActivityIndicator
          size={small ? 'small' : 'large'}
          color={theme.bg}
        />
      ) : null}

      {!loading && !displayUrl ? (
        <View
          style={[
            styles.logoFallback,
            {
              width: size,
              height: size,
              borderRadius: radiusValue,
            },
          ]}
        >
          <Text style={styles.logoFallbackText}>S</Text>
        </View>
      ) : null}

      {imageFailed ? (
        <View
          style={[
            styles.logoFallback,
            {
              width: size,
              height: size,
              borderRadius: radiusValue,
            },
          ]}
        >
          <Text style={styles.logoFallbackText}>S</Text>
        </View>
      ) : null}
    </View>
  );
}

/* =========================================================
   BRAND HEADER
========================================================= */

export function BrandHeader({
  firstName,
  onProfile = () => router.push('/settings'),
  onNotifications = () =>
    router.push('/notifications'),
}: {
  firstName?: string;
  onProfile?: () => void;
  onNotifications?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const [headerName, setHeaderName] = useState(
    firstName ?? '',
  );

  const [avatarUrl, setAvatarUrl] = useState<
    string | null
  >(null);

  const [avatarFailed, setAvatarFailed] =
    useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadHeaderProfile = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.warn(
          'Header auth lookup failed:',
          userError.message,
        );
        return;
      }

      if (!user) {
        setHeaderName('');
        setAvatarUrl(null);
        setAvatarFailed(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'first_name, full_name, avatar_url',
        )
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn(
          'Header profile lookup failed:',
          profileError.message,
        );
        return;
      }

      const profileFirstName =
        profile?.first_name?.trim() ||
        profile?.full_name
          ?.trim()
          ?.split(' ')[0] ||
        user.user_metadata?.first_name?.trim() ||
        user.user_metadata?.full_name
          ?.trim()
          ?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        '';

      setHeaderName(profileFirstName);

      const savedAvatar =
        typeof profile?.avatar_url === 'string' &&
        profile.avatar_url.trim().length > 0
          ? profile.avatar_url.trim()
          : null;

      setAvatarUrl(savedAvatar);
      setAvatarFailed(false);

      const { count: notificationCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', user.id)
        .eq('is_read', false);

      setUnreadCount(notificationCount ?? 0);

      console.log('HEADER PROFILE:', {
        userId: user.id,
        name: profileFirstName,
        avatarUrl: savedAvatar,
      });
    } catch (error) {
      console.error(
        'Failed to load header profile:',
        error,
      );
    }
  };

  useEffect(() => {
    void loadHeaderProfile();
  }, [pathname]);

  useEffect(() => {
    if (firstName !== undefined) {
      setHeaderName(firstName);
    }
  }, [firstName]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadHeaderProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`header-notification-count-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${user.id}`,
          },
          () => void loadHeaderProfile(),
        )
        .subscribe();
    };

    void subscribeToNotifications();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [pathname]);

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 10) + 8,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <Logo small />

        <View style={styles.brandText}>
          <Text
            style={styles.brandName}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            SARJ BLENDED IT
          </Text>

          <Text style={styles.brandSub}>
            {headerName
              ? `HI, ${headerName.toUpperCase()}`
              : 'MOBILE GROOMING'}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          onPress={onNotifications}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [
            styles.headerIconButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.bellGlyph}>🔔</Text>
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onProfile}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={({ pressed }) => [
            styles.profileButton,
            pressed && styles.pressed,
          ]}
        >
          {avatarUrl && !avatarFailed ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.profilePhoto}
              resizeMode="cover"
              onLoad={() => {
                console.log(
                  'HEADER AVATAR LOADED:',
                  avatarUrl,
                );
              }}
              onError={event => {
                console.warn(
                  'HEADER AVATAR FAILED:',
                  event.nativeEvent.error,
                  avatarUrl,
                );

                setAvatarFailed(true);
              }}
            />
          ) : (
            <View style={styles.profileIcon}>
              <View style={styles.profileHead} />
              <View style={styles.profileBody} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   PRIMARY BUTTON
========================================================= */

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'gold',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'gold' | 'dark';
}) {
  const scale = useRef(
    new Animated.Value(1),
  ).current;

  const press = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => press(0.975)}
        onPressOut={() => press(1)}
        onPress={onPress}
        accessibilityRole="button"
        style={[
          styles.primary,
          variant === 'dark' &&
            styles.primaryDark,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'dark'
                ? theme.goldSoft
                : theme.bg
            }
          />
        ) : (
          <Text
            style={[
              styles.primaryText,
              variant === 'dark' &&
                styles.primaryTextDark,
            ]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

export function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingMain}>
        <Text style={styles.eyebrow}>
          {eyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {action && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.action}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* =========================================================
   OPERATIONAL PAGE HERO
========================================================= */

export function OperationalHero({
  eyebrow,
  title,
  copy,
  icon = '✦',
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  icon?: string;
}) {
  return (
    <View style={styles.operationalHero}>
      <View style={styles.operationalHeroGoldOrb} />
      <View style={styles.operationalHeroBlueOrb} />
      <View style={styles.operationalHeroMark}>
        <Text style={styles.operationalHeroIcon}>{icon}</Text>
        <Text style={styles.operationalHeroMarkText}>SARJ</Text>
      </View>
      <Text style={styles.operationalHeroEyebrow}>{eyebrow}</Text>
      <Text style={styles.operationalHeroTitle}>{title}</Text>
      {copy ? <Text style={styles.operationalHeroCopy}>{copy}</Text> : null}
    </View>
  );
}

/* =========================================================
   LOADING SCREEN
========================================================= */

export function LoadingScreen({
  label = 'Loading your SARJ experience…',
}: {
  label?: string;
}) {
  const pulse = useRef(
    new Animated.Value(0.55),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  return (
    <View style={styles.loadingPage}>
      <Animated.View
        style={{ opacity: pulse }}
      >
        <Logo />
      </Animated.View>

      <Text style={styles.loadingTitle}>
        SARJ
      </Text>

      <Text style={styles.loadingLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   SKELETON
========================================================= */

export function Skeleton({
  width = '100%',
  height = 58,
  style,
}: {
  width?:
    | number
    | `${number}%`
    | 'auto';
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(
    new Animated.Value(0.45),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          opacity,
        },
        style,
      ]}
    />
  );
}

/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

type NavKey =
  | 'home'
  | 'book'
  | 'appointments'
  | 'history'
  | 'account';

export function BottomNav({
  active,
}: {
  active: NavKey;
}) {
  const insets = useSafeAreaInsets();
  const item = (
    key: NavKey,
    label: string,
    icon: string,
    action: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={action}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.navItem,
        active === key && styles.navItemActive,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.navIcon,
          active === key &&
            styles.navIconActive,
        ]}
      >
        <Text
          style={[
            styles.navIconText,
            active === key &&
              styles.navIconTextActive,
          ]}
        >
          {icon}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.navLabel,
          active === key &&
            styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.navWrapper,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.nav}>
        {item(
          'home',
          'Home',
          '⌂',
          () => router.push('/'),
        )}

        {item(
          'book',
          'Book',
          '+',
          () => router.push('/book'),
        )}

        {item(
          'appointments',
          'Appointments',
          '□',
          () => router.push('/bookings'),
        )}

        {item(
          'history',
          'History',
          '↺',
          () =>
            router.push(
              '/bookings/history',
            ),
        )}

        {item(
          'account',
          'Account',
          '○',
          () => router.push('/account'),
        )}
      </View>
    </View>
  );
}

/* =========================================================
   CARD
========================================================= */

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* =========================================================
   BACK BUTTON
========================================================= */

export function BackButton({
  title = 'Back',
}: {
  title?: string;
}) {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.back}>
        ‹
      </Text>

      <Text style={styles.backTitle}>
        {title}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* -------------------------------------------------------
     LOGO
  ------------------------------------------------------- */

  logoWrap: {
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 7,
  },

  logoImage: {
    backgroundColor: theme.gold,
  },

  logoFallback: {
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoFallbackText: {
    color: theme.bg,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

  header: {
    minHeight: 78,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    borderBottomWidth: 1,
    borderBottomColor: theme.lineSoft,
    backgroundColor: theme.bg,
  },

  brandRow: {
    flex: 1,
    minWidth: 0,

    flexDirection: 'row',
    alignItems: 'center',
  },

  brandText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },

  brandName: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  brandSub: {
    color: theme.goldSoft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 3,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,

    borderWidth: 1,
    borderColor: theme.line,

    backgroundColor: theme.surface2,

    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  bellGlyph: {
    fontSize: 20,
  },

  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: theme.danger,
    borderWidth: 2,
    borderColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadgeText: {
    color: theme.white,
    fontSize: 9,
    fontWeight: '900',
  },

  bellIcon: {
    width: 22,
    height: 24,

    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bellTop: {
    width: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.goldSoft,
    marginBottom: -1,
  },

  bellBody: {
    width: 17,
    height: 17,

    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,

    backgroundColor: theme.goldSoft,
  },

  bellBase: {
    width: 21,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.goldSoft,
    marginTop: -1,
  },

  bellClapper: {
    position: 'absolute',
    bottom: -1,

    width: 5,
    height: 5,
    borderRadius: 3,

    backgroundColor: theme.goldSoft,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,

    borderWidth: 1,
    borderColor: theme.goldDark,

    backgroundColor: theme.surface2,

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',
  },

  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
  },

  profileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,

    backgroundColor: theme.goldSurface,

    alignItems: 'center',
    justifyContent: 'center',
  },

  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,

    backgroundColor: theme.goldSoft,
    marginBottom: 2,
  },

  profileBody: {
    width: 16,
    height: 9,

    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,

    backgroundColor: theme.goldSoft,
  },

  /* -------------------------------------------------------
     BUTTONS
  ------------------------------------------------------- */

  primary: {
    minHeight: 52,
    paddingHorizontal: 20,

    borderRadius: radius.md,

    backgroundColor: theme.gold,

    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryDark: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  primaryText: {
    color: theme.bg,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  primaryTextDark: {
    color: theme.text,
  },

  pressed: {
    opacity: 0.72,
  },

  /* -------------------------------------------------------
     SECTION HEADINGS
  ------------------------------------------------------- */

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',

    marginTop: spacing.section,
    marginBottom: 14,
  },

  sectionHeadingMain: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: theme.gold,
    fontSize: typography.eyebrow,
    lineHeight: 13,

    fontWeight: '900',
    letterSpacing: 1.6,
  },

  sectionTitle: {
    color: theme.text,
    fontSize: typography.title,
    lineHeight: 29,

    fontWeight: '900',

    marginTop: 4,
  },

  operationalHero: {
    minHeight: 154,
    padding: 18,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#5D4B1D',
    backgroundColor: '#17140B',
    position: 'relative',
    justifyContent: 'flex-end',
  },

  operationalHeroGoldOrb: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    top: -82,
    right: -46,
    backgroundColor: '#574114',
  },

  operationalHeroBlueOrb: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    right: 42,
    bottom: -62,
    backgroundColor: '#173F50',
  },

  operationalHeroMark: {
    position: 'absolute',
    top: 17,
    right: 20,
    alignItems: 'center',
  },

  operationalHeroIcon: { color: theme.goldSoft, fontSize: 27, fontWeight: '900' },
  operationalHeroMarkText: { color: theme.text, fontSize: 8, letterSpacing: 1.3, fontWeight: '900' },
  operationalHeroEyebrow: { color: theme.goldSoft, fontSize: 9, letterSpacing: 1.4, fontWeight: '900' },
  operationalHeroTitle: { color: theme.text, fontSize: 27, lineHeight: 31, fontWeight: '900', letterSpacing: -0.7, marginTop: 6, maxWidth: '75%' },
  operationalHeroCopy: { color: theme.textSoft, fontSize: 11, lineHeight: 16, marginTop: 5, maxWidth: '76%' },

  actionButton: {
    marginLeft: 12,
    paddingVertical: 4,
  },

  action: {
    color: theme.goldSoft,
    fontSize: 10,
    lineHeight: 13,

    fontWeight: '900',
    letterSpacing: 0.7,
  },

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  loadingPage: {
    flex: 1,

    backgroundColor: theme.bg,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: spacing.page,
  },

  loadingTitle: {
    color: theme.text,
    fontSize: 22,
    lineHeight: 27,

    fontWeight: '900',

    marginTop: 15,
    letterSpacing: 2,
  },

  loadingLabel: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 16,

    marginTop: 7,

    textAlign: 'center',
  },

  /* -------------------------------------------------------
     SKELETON
  ------------------------------------------------------- */

  skeleton: {
    backgroundColor: theme.surface3,
    borderRadius: radius.md,
  },

  /* -------------------------------------------------------
     BOTTOM NAVIGATION
  ------------------------------------------------------- */

  navWrapper: {
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.lineSoft,
  },

  nav: {
    minHeight: 64,
    backgroundColor: theme.surface,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 7,
  },

  navItem: {
    flex: 1,

    minHeight: 54,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 2,
  },

  navItemActive: {
    backgroundColor: '#20211B',
    borderRadius: radius.sm,
  },

  navIcon: {
    width: 34,
    height: 30,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 2,
  },

  navIconActive: {
    backgroundColor: '#3A3015',
  },

  navIconText: {
    color: theme.muted,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '700',
  },

  navIconTextActive: {
    color: theme.gold,
  },

  navLabel: {
    color: theme.muted,

    fontSize: 8,
    lineHeight: 11,

    fontWeight: '800',
    letterSpacing: 0.25,

    textAlign: 'center',
  },

  navLabelActive: {
    color: theme.goldSoft,
  },

  /* -------------------------------------------------------
     CARDS
  ------------------------------------------------------- */

  card: {
    backgroundColor: theme.surface2,

    borderWidth: 1,
    borderColor: theme.line,

    borderRadius: radius.lg,

    overflow: 'hidden',
  },

  /* -------------------------------------------------------
     BACK BUTTON
  ------------------------------------------------------- */

  backButton: {
    minHeight: 36,

    flexDirection: 'row',
    alignItems: 'center',

    alignSelf: 'flex-start',
  },

  back: {
    color: theme.goldSoft,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '400',

    marginRight: 5,
    marginTop: -2,
  },

  backTitle: {
    color: theme.goldSoft,

    fontSize: 11,
    lineHeight: 14,

    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
