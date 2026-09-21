import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { BackButton, Card, LoadingScreen, OperationalHero, theme } from '../components/ui';

type Note = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  booking_id: string | null;
};

export default function Notifications() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('id,title,body,is_read,created_at,booking_id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });
    setItems((data as Note[]) ?? []);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('id,title,body,is_read,created_at,booking_id')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (!error) {
        setItems((data as Note[]) ?? []);
      }
      setLoading(false);

      channel = supabase
        .channel(`customer-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${user.id}`,
          },
          payload => {
            const notification = payload.new as Note;
            setItems(current => {
              if (current.some(item => item.id === notification.id)) {
                return current;
              }
              return [notification, ...current];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${user.id}`,
          },
          payload => {
            const notification = payload.new as Note;
            setItems(current =>
              current.map(item =>
                item.id === notification.id
                  ? { ...item, ...notification }
                  : item
              )
            );
          }
        )
        .subscribe();
    };

    void start();

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const open = async (item: Note) => {
    if (!item.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', item.id);

      setItems(old =>
        old.map(x =>
          x.id === item.id ? { ...x, is_read: true } : x
        )
      );
    }

    if (item.booking_id) {
      const isRatingNotification =
        item.title.toLowerCase().includes('rate') ||
        item.title.toLowerCase().includes('review');

      if (isRatingNotification) {
        router.push({
          pathname: '/rate/[id]',
          params: { id: item.booking_id },
        });
        return;
      }

      router.push({
        pathname: '/bookings/[id]',
        params: { id: item.booking_id },
      });
    }
  };

  if (loading) {
    return <LoadingScreen label="Loading notifications..." />;
  }

  return (
    <SafeAreaView style={s.page}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void refreshNotifications().finally(() => setRefreshing(false));
            }}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <BackButton title="Account" />
        </Pressable>

        <OperationalHero eyebrow="LIVE ACTIVITY" title="Notifications" copy="Your booking updates, confirmations and service alerts." icon="🔔" />

        {items.length === 0 ? (
          <Card style={s.empty}>
            <View style={s.emptyIcon}>
              <Text style={s.emptyIconText}>OK</Text>
            </View>
            <Text style={s.emptyTitle}>You are all caught up.</Text>
            <Text style={s.emptyText}>
              Booking updates and reminders will appear here.
            </Text>
          </Card>
        ) : (
          items.map(item => (
            <Pressable
              key={item.id}
              onPress={() => void open(item)}
              style={({ pressed }) => [
                s.item,
                !item.is_read && s.unread,
                pressed && s.pressed,
              ]}
            >
              <View style={[s.dot, item.is_read && s.dotRead]} />
              <View style={s.copy}>
                <Text style={s.itemTitle}>{item.title}</Text>
                <Text style={s.body}>{item.body}</Text>
                <Text style={s.time}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 40 },
  kicker: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 28,
  },
  title: {
    color: theme.text,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 7,
    marginBottom: 20,
  },
  item: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 9,
    alignItems: 'flex-start',
  },
  unread: {
    borderColor: '#5A481A',
    backgroundColor: '#19160D',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.gold,
    marginTop: 5,
  },
  dotRead: { backgroundColor: '#4A4A4A' },
  copy: { flex: 1 },
  itemTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
  body: { color: theme.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  time: { color: '#666', fontSize: 9, marginTop: 8 },
  arrow: { color: '#666', fontSize: 22 },
  empty: { padding: 25, alignItems: 'center' },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#29220E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { color: theme.gold, fontSize: 13, fontWeight: '900' },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginTop: 14 },
  emptyText: {
    color: theme.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 5,
  },
  pressed: { opacity: 0.72 },
});
