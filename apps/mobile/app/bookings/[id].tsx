import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import {
  getLocationShare,
  startLocationSharing,
  stopLocationSharing,
} from '../../lib/locationTracking';

import {
  BackButton,
  Card,
  LoadingScreen,
  PrimaryButton,
  theme,
} from '../../components/ui';

type Booking = {
  id: string;
  customer_id: string;
  scheduled_at: string;
  status: string;
  address: string;
  notes: string | null;
  payment_method: string;
  payment_status: string;
  quoted_price: number | null;
  services: {
    name: string;
  } | null;
};

type Event = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

type TrackingRow = {
  booking_id: string;
  customer_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  heading: number | null;
  speed_mps: number | null;
  altitude_meters: number | null;
  recorded_at: string;
  updated_at: string;
};

type LocationShare = {
  booking_id: string;
  customer_id: string;
  enabled: boolean;
  started_at: string | null;
  stopped_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

const stages = [
  'received',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
];

const TRACKING_STATUSES = [
  'received',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
];

const FINISHED_STATUSES = [
  'completed',
  'cancelled',
  'rejected',
];

export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [tracking, setTracking] = useState<TrackingRow | null>(null);
  const [locationShare, setLocationShare] =
    useState<LocationShare | null>(null);
  const [error, setError] = useState('');

  const isTrackingAllowed =
    booking !== null &&
    TRACKING_STATUSES.includes(booking.status);

  const sharingActive = sharingLocation;

  const loadBooking = useCallback(async () => {
    if (!id) {
      setError('No booking was specified.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [
        { data: bookingData, error: bookingError },
        { data: historyData, error: historyError },
        { data: locationData, error: locationError },
        { data: shareData, error: shareError },
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select(
            'id,customer_id,scheduled_at,status,address,notes,payment_method,payment_status,quoted_price,services(name)',
          )
          .eq('id', id)
          .single(),

        supabase
          .from('booking_status_history')
          .select(
            'id,status,note,created_at',
          )
          .eq('booking_id', id)
          .order('created_at', {
            ascending: true,
          }),

        supabase
          .from('booking_live_locations')
          .select(
            'booking_id,customer_id,latitude,longitude,accuracy_meters,heading,speed_mps,altitude_meters,recorded_at,updated_at',
          )
          .eq('booking_id', id)
          .maybeSingle(),

        supabase
          .from('booking_location_shares')
          .select(
            'booking_id,customer_id,enabled,started_at,stopped_at,last_seen_at,created_at,updated_at',
          )
          .eq('booking_id', id)
          .maybeSingle(),
      ]);

      if (bookingError) {
        setError(bookingError.message);
        return;
      }

      if (historyError) {
        console.warn(
          'Booking history failed:',
          historyError,
        );
      }

      if (locationError) {
        console.warn(
          'Booking live location failed:',
          locationError,
        );
      }

      if (shareError) {
        console.warn(
          'Booking location share failed:',
          shareError,
        );
      }

      const bookingRecord =
        bookingData as unknown as Booking;

      const locationRecord =
        (locationData as TrackingRow | null) ??
        null;

      const shareRecord =
        (shareData as LocationShare | null) ??
        null;

      setBooking(bookingRecord);
      setEvents(historyData ?? []);
      setTracking(locationRecord);
      setLocationShare(shareRecord);
      setSharingLocation(
        Boolean(shareRecord?.enabled),
      );
    } catch (loadError) {
      console.warn(
        'Booking details failed:',
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this appointment.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const startTracking = useCallback(async () => {
    if (!booking || !isTrackingAllowed) {
      return;
    }

    if (sharingLocation) {
      return;
    }

    try {
      setLocationBusy(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in again before sharing your location.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign in',
              onPress: () => router.push('/login'),
            },
          ],
        );

        return;
      }

      if (user.id !== booking.customer_id) {
        Alert.alert(
          'Location unavailable',
          'This appointment does not belong to your account.',
        );

        return;
      }

      await startLocationSharing(booking.id);

      const share =
        await getLocationShare(
          booking.id,
        );

      setLocationShare(
        share as LocationShare | null,
      );

      setSharingLocation(
        Boolean(share?.enabled),
      );

      const {
        data: latestLocation,
        error: latestLocationError,
      } = await supabase
        .from('booking_live_locations')
        .select(
          'booking_id,customer_id,latitude,longitude,accuracy_meters,heading,speed_mps,altitude_meters,recorded_at,updated_at',
        )
        .eq('booking_id', booking.id)
        .maybeSingle();

      if (latestLocationError) {
        console.warn(
          'Latest live location read failed:',
          latestLocationError,
        );
      }

      setTracking(
        (latestLocation as TrackingRow | null) ??
          null,
      );

      Alert.alert(
        'Live location enabled',
        'SARJ can now see your live location for this appointment.',
      );
    } catch (trackingError) {
      console.warn(
        'Starting location tracking failed:',
        trackingError,
      );

      Alert.alert(
        'Unable to share location',
        trackingError instanceof Error
          ? trackingError.message
          : 'Something went wrong while starting location sharing.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
    } finally {
      setLocationBusy(false);
    }
  }, [
    booking,
    isTrackingAllowed,
    sharingLocation,
  ]);

  const stopTracking = useCallback(
    async (showAlert = true) => {
      if (!booking) {
        return;
      }

      try {
        setLocationBusy(true);

        await stopLocationSharing(
          booking.id,
        );

        setSharingLocation(false);
        setLocationShare(current => {
          if (!current) {
            return null;
          }

          return {
            ...current,
            enabled: false,
            stopped_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          };
        });

        setTracking(null);

        if (showAlert) {
          Alert.alert(
            'Location sharing stopped',
            'SARJ can no longer see your live location for this appointment.',
          );
        }
      } catch (trackingError) {
        console.warn(
          'Stopping location tracking failed:',
          trackingError,
        );

        if (showAlert) {
          Alert.alert(
            'Unable to stop sharing',
            trackingError instanceof Error
              ? trackingError.message
              : 'We could not stop location sharing.',
          );
        }
      } finally {
        setLocationBusy(false);
      }
    },
    [booking],
  );

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  /*
   * Automatically stop sharing when the appointment
   * reaches a finished state.
   */
  useEffect(() => {
    if (!booking) {
      return;
    }

    if (
      FINISHED_STATUSES.includes(
        booking.status,
      ) &&
      sharingActive
    ) {
      void stopTracking(false);
    }
  }, [
    booking,
    sharingActive,
    stopTracking,
  ]);

  /*
   * Realtime booking + live-location updates.
   */
  useEffect(() => {
    if (!id) {
      return;
    }

    const channel = supabase
      .channel(`booking-details-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${id}`,
        },
        payload => {
          setBooking(current =>
            current
              ? {
                  ...current,
                  ...(payload.new as Partial<Booking>),
                }
              : current,
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_live_locations',
          filter: `booking_id=eq.${id}`,
        },
        payload => {
          if (payload.eventType === 'DELETE') {
            setTracking(null);
            return;
          }

          const nextLocation =
            payload.new as TrackingRow;

          setTracking(nextLocation);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_location_shares',
          filter: `booking_id=eq.${id}`,
        },
        payload => {
          if (payload.eventType === 'DELETE') {
            setLocationShare(null);
            setSharingLocation(false);
            return;
          }

          const nextShare =
            payload.new as LocationShare;

          setLocationShare(nextShare);
          setSharingLocation(
            Boolean(nextShare.enabled),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [id]);

  /*
   * Keep the location-share state synchronized
   * with the database record.
   */
  useEffect(() => {
    if (!booking?.id) {
      return;
    }

    let cancelled = false;

    const refreshLocationShare =
      async () => {
        try {
          const share =
            await getLocationShare(
              booking.id,
            );

          if (cancelled) {
            return;
          }

          setLocationShare(
            share as LocationShare | null,
          );

          setSharingLocation(
            Boolean(share?.enabled),
          );
        } catch (shareError) {
          console.warn(
            'Location share state failed:',
            shareError,
          );
        }
      };

    void refreshLocationShare();

    return () => {
      cancelled = true;
    };
  }, [booking?.id]);

  if (loading && !booking) {
    return (
      <LoadingScreen label="Loading appointment…" />
    );
  }

  if (!booking) {
    return (
      <SafeAreaView
        style={s.page}
        edges={[
          'top',
          'left',
          'right',
          'bottom',
        ]}
      >
        <View style={s.error}>
          <Text style={s.errorTitle}>
            We couldn’t load this appointment.
          </Text>

          <Text style={s.errorCopy}>
            {error ||
              'Unable to find this appointment.'}
          </Text>

          <Pressable
            onPress={() => router.back()}
          >
            <Text style={s.back}>
              ‹ GO BACK
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const position = stages.indexOf(
    booking.status,
  );

  const lastUpdated =
    tracking?.recorded_at
      ? new Date(
          tracking.recorded_at,
        ).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : locationShare?.last_seen_at
        ? new Date(
            locationShare.last_seen_at,
          ).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null;

  return (
    <SafeAreaView
      style={s.page}
      edges={[
        'top',
        'left',
        'right',
        'bottom',
      ]}
    >
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
        >
          <BackButton title="Account" />
        </Pressable>

        <Text style={s.kicker}>
          APPOINTMENT STATUS
        </Text>

        <Text style={s.title}>
          {booking.services?.name ??
            'Grooming appointment'}
        </Text>

        <Card style={s.statusCard}>
          <View style={s.statusTop}>
            <View style={s.statusPill}>
              <Text style={s.status}>
                {booking.status.replaceAll(
                  '_',
                  ' ',
                )}
              </Text>
            </View>

            {sharingActive ? (
              <View style={s.livePill}>
                <View style={s.liveDot} />

                <Text style={s.liveText}>
                  LIVE
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={s.date}>
            {new Date(
              booking.scheduled_at,
            ).toLocaleString()}
          </Text>

          <Text style={s.address}>
            {booking.address}
          </Text>
        </Card>

        {isTrackingAllowed ? (
          <Card
            style={[
              s.locationCard,
              sharingActive &&
                s.locationCardActive,
            ]}
          >
            <View style={s.locationHeader}>
              <View style={s.locationIcon}>
                <Text
                  style={s.locationIconText}
                >
                  {sharingActive
                    ? '●'
                    : '⌖'}
                </Text>
              </View>

              <View
                style={s.locationHeaderCopy}
              >
                <Text style={s.locationTitle}>
                  {sharingActive
                    ? 'Location sharing is active'
                    : 'Share your location'}
                </Text>

                <Text style={s.locationCopy}>
                  {sharingActive
                    ? 'SARJ can see your current position for this appointment.'
                    : 'Help the SARJ team find you when they are on the way.'}
                </Text>
              </View>
            </View>

            {sharingActive ? (
              <View
                style={s.locationStatus}
              >
                <View
                  style={s.locationStatusRow}
                >
                  <View
                    style={s.onlineDot}
                  />

                  <Text
                    style={
                      s.locationStatusText
                    }
                  >
                    LOCATION SHARING ACTIVE
                  </Text>
                </View>

                {lastUpdated ? (
                  <Text
                    style={s.updatedText}
                  >
                    Last updated{' '}
                    {lastUpdated}
                  </Text>
                ) : (
                  <Text
                    style={s.updatedText}
                  >
                    Waiting for your current
                    location…
                  </Text>
                )}

                {tracking ? (
                  <View
                    style={s.coordinates}
                  >
                    <Text
                      style={s.coordinateText}
                    >
                      {tracking.latitude.toFixed(
                        6,
                      )}
                      ,{' '}
                      {tracking.longitude.toFixed(
                        6,
                      )}
                    </Text>

                    {tracking.accuracy_meters !==
                    null ? (
                      <Text
                        style={s.accuracyText}
                      >
                        Accuracy ±
                        {Math.round(
                          tracking.accuracy_meters,
                        )}
                        m
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {sharingActive ? (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Stop location sharing?',
                    'SARJ will no longer receive your live location for this appointment.',
                    [
                      {
                        text: 'Keep Sharing',
                        style: 'cancel',
                      },
                      {
                        text: 'Stop Sharing',
                        style: 'destructive',
                        onPress: () => {
                          void stopTracking();
                        },
                      },
                    ],
                  );
                }}
                disabled={locationBusy}
                style={({ pressed }) => [
                  s.stopButton,
                  pressed && s.pressed,
                ]}
              >
                <Text
                  style={s.stopButtonText}
                >
                  {locationBusy
                    ? 'STOPPING…'
                    : 'STOP SHARING'}
                </Text>
              </Pressable>
            ) : (
              <>
                <PrimaryButton
                  title={
                    locationBusy
                      ? 'STARTING LOCATION…'
                      : 'SHARE MY LOCATION  →'
                  }
                  onPress={() => {
                    void startTracking();
                  }}
                  disabled={locationBusy}
                  loading={locationBusy}
                />

                <Text
                  style={s.locationPrivacy}
                >
                  Your location is only shared
                  for this appointment and you
                  can stop sharing at any time.
                </Text>
              </>
            )}
          </Card>
        ) : booking.status ===
          'completed' ? (
          <Card
            style={s.completedLocation}
          >
            <View style={s.completedIcon}>
              <Text
                style={s.completedIconText}
              >
                ✓
              </Text>
            </View>

            <View style={s.completedCopy}>
              <Text
                style={s.completedTitle}
              >
                Appointment completed
              </Text>

              <Text
                style={s.completedText}
              >
                Location sharing is no longer
                active for this appointment.
              </Text>
            </View>
          </Card>
        ) : null}

        <Text style={s.label}>
          YOUR BOOKING JOURNEY
        </Text>

        <View style={s.timeline}>
          {stages.map((stage, i) => {
            const event = events.find(
              e => e.status === stage,
            );

            return (
              <View
                style={s.stage}
                key={stage}
              >
                <View style={s.track}>
                  <View
                    style={[
                      s.point,
                      i <= position &&
                        s.pointOn,
                    ]}
                  />
                </View>

                <View style={s.stageCopy}>
                  <Text
                    style={[
                      s.stageName,
                      i <= position &&
                        s.stageNameOn,
                    ]}
                  >
                    {stage.replaceAll(
                      '_',
                      ' ',
                    )}
                  </Text>

                  {event ? (
                    <Text
                      style={s.eventTime}
                    >
                      {new Date(
                        event.created_at,
                      ).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={s.label}>
          BOOKING DETAILS
        </Text>

        <Card style={s.details}>
          <Detail
            label="Payment"
            value={`${booking.payment_method.replaceAll(
              '_',
              ' ',
            )} · ${booking.payment_status}`}
          />

          <Detail
            label="Quoted price"
            value={
              booking.quoted_price !==
              null
                ? `K${booking.quoted_price}`
                : 'To be confirmed'
            }
          />

          {booking.notes ? (
            <Detail
              label="Your note"
              value={booking.notes}
            />
          ) : null}
        </Card>

        <View style={s.helpBox}>
          <View style={s.helpIcon}>
            <Text
              style={s.helpIconText}
            >
              i
            </Text>
          </View>

          <Text style={s.help}>
            You will receive updates as your
            booking progresses.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.detail}>
      <Text style={s.detailLabel}>
        {label}
      </Text>

      <Text style={s.value}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    padding: 20,
    paddingBottom: 80,
  },

  back: {
    color: theme.goldSoft,
    fontSize: 10,
    fontWeight: '900',
  },

  kicker: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 28,
  },

  title: {
    color: theme.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    marginTop: 7,
  },

  statusCard: {
    marginTop: 18,
    padding: 19,
    backgroundColor: '#18150C',
    borderColor: '#4A3B18',
  },

  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#2D250F',
  },

  status: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#182217',
    borderWidth: 1,
    borderColor: '#30452B',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#76B85C',
    marginRight: 5,
  },

  liveText: {
    color: '#8BCF70',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  date: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 13,
  },

  address: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  locationCard: {
    marginTop: 14,
    padding: 17,
    backgroundColor: theme.surface2,
    borderColor: theme.line,
  },

  locationCardActive: {
    backgroundColor: '#111A10',
    borderColor: '#31472B',
  },

  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  locationIconText: {
    color: theme.goldSoft,
    fontSize: 17,
    fontWeight: '900',
  },

  locationHeaderCopy: {
    flex: 1,
    paddingTop: 1,
  },

  locationTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  locationCopy: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  locationStatus: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },

  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#78C35D',
    marginRight: 7,
  },

  locationStatusText: {
    color: '#8BCF70',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  updatedText: {
    color: theme.mutedDark,
    fontSize: 9,
    marginTop: 6,
  },

  coordinates: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },

  coordinateText: {
    color: theme.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  accuracyText: {
    color: theme.mutedDark,
    fontSize: 9,
    marginTop: 3,
  },

  stopButton: {
    height: 46,
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#49302D',
    backgroundColor: '#211615',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopButtonText: {
    color: '#C98F88',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  locationPrivacy: {
    color: theme.mutedDark,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 10,
  },

  completedLocation: {
    marginTop: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface2,
    borderColor: theme.line,
  },

  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.goldSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  completedIconText: {
    color: theme.goldSoft,
    fontSize: 15,
    fontWeight: '900',
  },

  completedCopy: {
    flex: 1,
  },

  completedTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '900',
  },

  completedText: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  label: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 28,
    marginBottom: 11,
  },

  timeline: {
    paddingLeft: 2,
  },

  stage: {
    flexDirection: 'row',
    minHeight: 55,
  },

  track: {
    width: 22,
    alignItems: 'center',
  },

  point: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#3C3C3C',
    marginTop: 2,
  },

  pointOn: {
    backgroundColor: theme.gold,
    shadowColor: theme.gold,
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },

  stageCopy: {
    flex: 1,
    paddingLeft: 9,
  },

  stageName: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  stageNameOn: {
    color: theme.text,
  },

  eventTime: {
    color: '#777',
    fontSize: 9,
    marginTop: 4,
  },

  details: {
    paddingHorizontal: 16,
  },

  detail: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: theme.line,
  },

  detailLabel: {
    color: '#777',
    fontSize: 10,
  },

  value: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'capitalize',
  },

  helpBox: {
    minHeight: 40,
    paddingHorizontal: 8,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  helpIcon: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: theme.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  helpIconText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
  },

  help: {
    color: theme.mutedDark,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  error: {
    padding: 25,
    justifyContent: 'center',
    flex: 1,
  },

  errorTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
  },

  errorCopy: {
    color: theme.muted,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },

  pressed: {
    opacity: 0.7,
  },
});