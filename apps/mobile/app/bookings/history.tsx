import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { Card, OperationalHero, theme } from '../../components/ui';

type Booking = {
  id: string;
  scheduled_at: string;
  address: string | null;
  status: string | null;
  quoted_price: number | null;
  service: {
    name: string;
  } | null;
};

export default function BookingHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        scheduled_at,
        address,
        status,
        quoted_price,
        service:services(name)
      `)
      .eq('customer_id', user.id)
      .order('scheduled_at', { ascending: false });

    if (!error) {
  const normalized: Booking[] = (data ?? []).map((booking) => ({
    id: booking.id,
    scheduled_at: booking.scheduled_at,
    address: booking.address,
    status: booking.status,
    quoted_price: booking.quoted_price,
    service: Array.isArray(booking.service)
      ? booking.service[0] ?? null
      : booking.service ?? null,
  }));

  setBookings(normalized);
}

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const history = bookings.filter((booking) => {
    const status = (booking.status ?? '').toLowerCase();
    const past = new Date(booking.scheduled_at).getTime() < Date.now();

    return (
      past ||
      status === 'completed' ||
      status === 'cancelled'
    );
  });

  return (
    <SafeAreaView style={styles.page} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.gold}
          />
        }
      >
        <Pressable
          onPress={() => router.push('/bookings')}
          style={styles.back}
        >
          <Text style={styles.backText}>‹  APPOINTMENTS</Text>
        </Pressable>

        <OperationalHero eyebrow="YOUR JOURNEY" title="Booking history" copy="Review your previous SARJ grooming sessions." icon="↺" />

        <View style={styles.line} />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={theme.gold} />
            <Text style={styles.loadingText}>
              Loading your history…
            </Text>
          </View>
        ) : history.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No booking history yet
            </Text>

            <Text style={styles.emptyText}>
              Completed and past appointments will appear here.
            </Text>

            <Pressable
              onPress={() => router.push('/book')}
              style={styles.bookButton}
            >
              <Text style={styles.bookButtonText}>
                BOOK YOUR FIRST SESSION →
              </Text>
            </Pressable>
          </Card>
        ) : (
          history.map((booking) => (
            <HistoryCard
              key={booking.id}
              booking={booking}
              onPress={() =>
                router.push({
                  pathname: '/bookings/[id]',
                  params: { id: booking.id },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const date = new Date(booking.scheduled_at);
  const status = (booking.status ?? 'completed').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.service}>
            {booking.service?.name ?? 'Grooming session'}
          </Text>

          <Text style={styles.date}>
            {date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text
          style={[
            styles.status,
            status === 'CANCELLED' && styles.cancelled,
          ]}
        >
          {status}
        </Text>

        {booking.quoted_price != null && (
          <Text style={styles.price}>
            K{booking.quoted_price}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    padding: 20,
    paddingBottom: 125,
  },

  back: {
    marginBottom: 28,
  },

  backText: {
    color: theme.goldSoft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  kicker: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  title: {
    color: theme.text,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 7,
  },

  subtitle: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  line: {
    height: 1,
    backgroundColor: theme.line,
    marginVertical: 25,
  },

  loading: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 10,
  },

  card: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  pressed: {
    opacity: 0.72,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#28200D',
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    color: theme.gold,
    fontSize: 17,
    fontWeight: '900',
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  service: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },

  date: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 5,
  },

  arrow: {
    color: theme.goldSoft,
    fontSize: 26,
  },

  divider: {
    height: 1,
    backgroundColor: theme.line,
    marginVertical: 13,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  status: {
    color: theme.gold,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  cancelled: {
    color: theme.danger,
  },

  price: {
    color: theme.goldSoft,
    fontSize: 11,
    fontWeight: '900',
  },

  empty: {
    padding: 20,
  },

  emptyTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
  },

  emptyText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  bookButton: {
    minHeight: 48,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookButtonText: {
    color: theme.bg,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
