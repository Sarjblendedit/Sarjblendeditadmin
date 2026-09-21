import { Stack, usePathname } from 'expo-router';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  BrandHeader,
  BottomNav,
  theme,
} from '../components/ui';
import { BookingNotificationListener } from '../components/BookingNotificationListener';
import { PushNotificationRegistration } from '../components/PushNotificationRegistration';

type NavKey =
  | 'home'
  | 'book'
  | 'appointments'
  | 'history'
  | 'account';

function CustomerShell() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  /*
   * Authentication/public routes do not use
   * the customer application shell.
   */
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/reset-password' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/auth/');

  if (isPublicRoute) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.bg,
          },
          animation: 'slide_from_right',
        }}
      />
    );
  }

  /*
   * Determine which item should be highlighted
   * in the persistent bottom navigation.
   */
  const active: NavKey =
    pathname === '/'
      ? 'home'
      : pathname === '/book'
        ? 'book'
        : pathname.startsWith('/bookings/history')
          ? 'history'
          : pathname.startsWith('/bookings')
            ? 'appointments'
            : 'account';

  return (
    <View style={styles.shell}>
      <BookingNotificationListener />
      <PushNotificationRegistration />
      {/* =================================================
          STICKY CUSTOMER HEADER
      ================================================= */}

      <BrandHeader />

      {/* =================================================
          CUSTOMER SCREEN AREA
      ================================================= */}

      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.bg,
            },
            animation: 'slide_from_right',
          }}
        />
      </View>

      {/* =================================================
          SPACE RESERVED FOR FIXED BOTTOM NAV
      =================================================

          This prevents the final content of scrollable
          screens from disappearing behind the navbar.
      ================================================= */}

      

      {/* =================================================
          FIXED BOTTOM NAVIGATION
      ================================================= */}

      <BottomNav active={active} />
    </View>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <CustomerShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.bg,
  },

  bottomSpace: {
    backgroundColor: theme.bg,
  },
});
