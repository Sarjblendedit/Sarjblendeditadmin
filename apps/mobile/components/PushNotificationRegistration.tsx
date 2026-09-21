import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { supabase } from '../lib/supabase';

export async function registerForPushNotifications() {
  try {
        // Expo Go no longer includes Android remote notification support.
        // Do this check before loading the native module, because merely
        // requiring it causes Expo Go to show a runtime error on SDK 53+.
        if (Constants.appOwnership === 'expo') return false;

        // Load at runtime so an older Expo Go/native build can still open the
        // app while a new build with expo-notifications is being prepared.
        const Notifications = require('expo-notifications') as typeof import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (!Constants.isDevice) return false;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('booking-updates', {
            name: 'Booking updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 180, 90, 180],
            sound: 'default',
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        const permission = existing.granted
          ? existing
          : await Notifications.requestPermissionsAsync();
        if (!permission.granted) return false;

        const projectId =
          Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.warn('Expo project ID is missing; push token registration skipped.');
          return false;
        }

        const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        const { error } = await supabase.from('push_notification_devices').upsert(
          {
            expo_push_token: expoPushToken,
            customer_id: user.id,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'expo_push_token' }
        );
        if (error) throw error;
        return true;
  } catch (error) {
    console.warn('Push notification registration is unavailable in this build.', error);
    return false;
  }
}

export function PushNotificationRegistration() {
  useEffect(() => {
    void registerForPushNotifications();
  }, []);

  return null;
}
