import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { Card, OperationalHero, SectionHeading, theme } from '../../components/ui';

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

export default function Appointments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
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
      .order('scheduled_at', { ascending: true });

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
      loadBookings();
    }, [])
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const upcoming = bookings.filter((booking) => {
    const time = new Date(booking.scheduled_at).getTime();

    return (
      time >= Date.now() &&
      !['cancelled', 'completed'].includes(
        (booking.status ?? '').toLowerCase()
      )
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
        <OperationalHero eyebrow="YOUR BOOKINGS" title="Appointments" copy="Your upcoming SARJ grooming sessions." icon="▣" />

        <SectionHeading
          eyebrow="UPCOMING"
          title="Your appointments"
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={theme.gold} />
            <Text style={styles.loadingText}>Loading appointments…</Text>
          </View>
        ) : upcoming.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>No upcoming appointments</Text>
            <Text style={styles.emptyText}>
              Your next fresh look starts with a new booking.
            </Text>

            <Pressable
              onPress={() => router.push('/book')}
              style={styles.bookButton}
            >
              <Text style={styles.bookButtonText}>BOOK AN APPOINTMENT →</Text>
            </Pressable>
          </Card>
        ) : (
          upcoming.map((booking) => (
            <BookingCard
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

        <Pressable
          onPress={() => router.push('/bookings/history')}
          style={styles.historyButton}
        >
          <Text style={styles.historyButtonText}>
            VIEW BOOKING HISTORY →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const date = new Date(booking.scheduled_at);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.booking,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.bookingTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateMonth}>
            {date.toLocaleDateString(undefined, {
              month: 'short',
            }).toUpperCase()}
          </Text>

          <Text style={styles.dateDay}>
            {date.getDate()}
          </Text>
        </View>

        <View style={styles.bookingInfo}>
          <Text style={styles.serviceName}>
            {booking.service?.name ?? 'Grooming appointment'}
          </Text>

          <Text style={styles.dateText}>
            {date.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          <Text style={styles.timeText}>
            {date.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bookingBottom}>
        <Text style={styles.status}>
          {(booking.status ?? 'received').toUpperCase()}
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

  kicker: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  title: {
    color: theme.text,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
    marginTop: 7,
  },

  subtitle: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  loading: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 10,
  },

  booking: {
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

  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateBox: {
    width: 52,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#28200D',
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateMonth: {
    color: theme.gold,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  dateDay: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 1,
  },

  bookingInfo: {
    flex: 1,
    marginLeft: 13,
  },

  serviceName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  dateText: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 5,
  },

  timeText: {
    color: theme.goldSoft,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },

  arrow: {
    color: theme.goldSoft,
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },

  divider: {
    height: 1,
    backgroundColor: theme.line,
    marginVertical: 13,
  },

  bookingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  status: {
    color: theme.gold,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
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

  historyButton: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  historyButtonText: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
