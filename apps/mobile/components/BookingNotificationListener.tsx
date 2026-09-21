import { useEffect } from 'react';
import { Alert, Vibration } from 'react-native';

import { supabase } from '../lib/supabase';

type BookingNotification = {
  title: string;
  body: string;
};

/** Shows live booking updates anywhere in the signed-in mobile app. */
export function BookingNotificationListener() {
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      channel = supabase
        .channel(`booking-alerts-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${user.id}`,
          },
          async payload => {
            const { data: preferences } = await supabase
              .from('customer_preferences')
              .select('booking_updates')
              .eq('customer_id', user.id)
              .maybeSingle();

            // No row means the customer has not chosen preferences yet:
            // preserve the default behaviour and show booking updates.
            if (!active || preferences?.booking_updates === false) return;
            const notification = payload.new as BookingNotification;
            Vibration.vibrate([0, 180, 90, 180]);
            Alert.alert(notification.title, notification.body);
          }
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
