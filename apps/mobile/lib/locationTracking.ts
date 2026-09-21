import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from './supabase';

export const LOCATION_TASK_NAME =
  'sarj-live-location';

type LocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  altitude: number | null;
};

type LocationShare = {
  booking_id: string;
  customer_id: string;
  enabled: boolean;
  started_at: string | null;
  stopped_at: string | null;
  last_seen_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type ActiveShare = {
  booking_id: string;
};

/**
 * Save the customer's latest GPS position.
 */
async function saveLocation(
  bookingId: string,
  customerId: string,
  location: LocationPoint,
) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('booking_live_locations')
    .upsert(
      {
        booking_id: bookingId,
        customer_id: customerId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy_meters: location.accuracy,
        heading: location.heading,
        speed_mps: location.speed,
        altitude_meters: location.altitude,
        recorded_at: now,
        updated_at: now,
      },
      {
        onConflict: 'booking_id',
      },
    );

  if (error) {
    console.warn(
      'SARJ location update failed:',
      error.message,
    );

    return;
  }

  const { error: shareError } =
    await supabase
      .from('booking_location_shares')
      .update({
        last_seen_at: now,
        updated_at: now,
      })
      .eq('booking_id', bookingId)
      .eq('customer_id', customerId)
      .eq('enabled', true);

  if (shareError) {
    console.warn(
      'SARJ location share update failed:',
      shareError.message,
    );
  }
}

/**
 * Return the location-sharing record for a booking.
 */
export async function getLocationShare(
  bookingId: string,
): Promise<LocationShare | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('booking_location_shares')
    .select(
      'booking_id,customer_id,enabled,started_at,stopped_at,last_seen_at,created_at,updated_at',
    )
    .eq('booking_id', bookingId)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn(
      'SARJ location share lookup failed:',
      error.message,
    );

    return null;
  }

  return data as LocationShare | null;
}

/**
 * Find the customer's currently active tracking booking.
 *
 * Only one appointment should actively broadcast GPS
 * from the customer's device at a time.
 */
async function getActiveShareForUser(
  customerId: string,
): Promise<ActiveShare | null> {
  const { data, error } = await supabase
    .from('booking_location_shares')
    .select('booking_id')
    .eq('customer_id', customerId)
    .eq('enabled', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      'SARJ active location lookup failed:',
      error.message,
    );

    return null;
  }

  return data as ActiveShare | null;
}

/**
 * Background location task.
 *
 * Expo calls this task whenever new GPS coordinates
 * are available while background tracking is active.
 */
if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        console.warn(
          'SARJ background location error:',
          error.message,
        );

        return;
      }

      const locations =
        (
          data as {
            locations?: Location.LocationObject[];
          }
        )?.locations ?? [];

      if (!locations.length) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      /*
       * Important:
       * Only the currently active appointment receives
       * this device's GPS position.
       */
      const activeShare =
        await getActiveShareForUser(user.id);

      if (!activeShare) {
        return;
      }

      /*
       * Process the newest point.
       * There is no need to upload every buffered
       * coordinate individually.
       */
      const point =
        locations[locations.length - 1];

      if (!point) {
        return;
      }

      await saveLocation(
        activeShare.booking_id,
        user.id,
        {
          latitude:
            point.coords.latitude,
          longitude:
            point.coords.longitude,
          accuracy:
            point.coords.accuracy,
          heading:
            point.coords.heading,
          speed:
            point.coords.speed,
          altitude:
            point.coords.altitude,
        },
      );
    },
  );
}

/**
 * Request foreground and background location permissions.
 */
export async function requestLocationPermission() {
  const foreground =
    await Location.requestForegroundPermissionsAsync();

  if (
    foreground.status !==
    Location.PermissionStatus.GRANTED
  ) {
    return false;
  }

  const background =
    await Location.requestBackgroundPermissionsAsync();

  return (
    background.status ===
    Location.PermissionStatus.GRANTED
  );
}

/**
 * Start live location sharing for a booking.
 */
export async function startLocationSharing(
  bookingId: string,
) {
  if (!bookingId) {
    throw new Error(
      'A booking is required to share your location.',
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'You must be signed in.',
    );
  }

  /*
   * Verify that this booking belongs to the
   * signed-in customer.
   */
  const { data: booking, error: bookingError } =
    await supabase
      .from('bookings')
      .select('id,customer_id,status')
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .maybeSingle();

  if (bookingError) {
    throw new Error(
      bookingError.message,
    );
  }

  if (!booking) {
    throw new Error(
      'This appointment does not belong to your account.',
    );
  }

  const allowedStatuses = [
    'received',
    'confirmed',
    'on_the_way',
    'arrived',
    'in_progress',
  ];

  if (
    !allowedStatuses.includes(
      booking.status,
    )
  ) {
    throw new Error(
      'Live location is not available for this appointment right now.',
    );
  }

  const permitted =
    await requestLocationPermission();

  if (!permitted) {
    throw new Error(
      'Location permission is required to share your live location.',
    );
  }

  /*
   * Stop another active share for this customer
   * before starting this one.
   */
  const activeShare =
    await getActiveShareForUser(user.id);

  if (
    activeShare &&
    activeShare.booking_id !== bookingId
  ) {
    const now =
      new Date().toISOString();

    await supabase
      .from('booking_location_shares')
      .update({
        enabled: false,
        stopped_at: now,
        updated_at: now,
      })
      .eq(
        'booking_id',
        activeShare.booking_id,
      )
      .eq(
        'customer_id',
        user.id,
      );
  }

  const now =
    new Date().toISOString();

  /*
   * Create/update the sharing session.
   */
  const { error: shareError } =
    await supabase
      .from('booking_location_shares')
      .upsert(
        {
          booking_id: bookingId,
          customer_id: user.id,
          enabled: true,
          started_at: now,
          stopped_at: null,
          last_seen_at: now,
          updated_at: now,
        },
        {
          onConflict: 'booking_id',
        },
      );

  if (shareError) {
    throw new Error(
      shareError.message,
    );
  }

  /*
   * Start Expo background location updates.
   */
  const running =
    await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME,
    );

  if (!running) {
    await Location.startLocationUpdatesAsync(
      LOCATION_TASK_NAME,
      {
        accuracy:
          Location.Accuracy.Balanced,

        timeInterval: 5000,

        distanceInterval: 10,

        deferredUpdatesInterval: 5000,

        pausesUpdatesAutomatically: false,

        showsBackgroundLocationIndicator:
          true,

        foregroundService: {
          notificationTitle:
            'SARJ appointment tracking',

          notificationBody:
            'Your location is being shared with SARJ during your active appointment.',

          notificationColor:
            '#d9b950',
        },
      },
    );
  }

  /*
   * Get an immediate GPS point instead of waiting
   * for the first background callback.
   */
  const current =
    await Location.getCurrentPositionAsync(
      {
        accuracy:
          Location.Accuracy.Balanced,
      },
    );

  await saveLocation(
    bookingId,
    user.id,
    {
      latitude:
        current.coords.latitude,
      longitude:
        current.coords.longitude,
      accuracy:
        current.coords.accuracy,
      heading:
        current.coords.heading,
      speed:
        current.coords.speed,
      altitude:
        current.coords.altitude,
    },
  );
}

/**
 * Stop live location sharing for a booking.
 */
export async function stopLocationSharing(
  bookingId: string,
) {
  if (!bookingId) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const now =
    new Date().toISOString();

  const { error: shareError } =
    await supabase
      .from('booking_location_shares')
      .update({
        enabled: false,
        stopped_at: now,
        updated_at: now,
      })
      .eq('booking_id', bookingId)
      .eq('customer_id', user.id);

  if (shareError) {
    throw new Error(
      shareError.message,
    );
  }

  /*
   * Remove the live coordinate so the admin
   * dashboard cannot continue displaying stale
   * customer location as an active position.
   */
  const { error: locationError } =
    await supabase
      .from('booking_live_locations')
      .delete()
      .eq('booking_id', bookingId)
      .eq('customer_id', user.id);

  if (locationError) {
    console.warn(
      'SARJ live location cleanup failed:',
      locationError.message,
    );
  }

  /*
   * Stop the device-level GPS task only when
   * there are no other active shares.
   */
  const remaining =
    await getActiveShareForUser(
      user.id,
    );

  if (!remaining) {
    const running =
      await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME,
      );

    if (running) {
      await Location.stopLocationUpdatesAsync(
        LOCATION_TASK_NAME,
      );
    }
  }
}

/*
 * Backward-compatible aliases.
 *
 * These allow any older screen/component in the
 * project that still uses the previous function
 * names to continue working.
 */
export const startBookingTracking =
  startLocationSharing;

export const stopBookingTracking =
  stopLocationSharing;