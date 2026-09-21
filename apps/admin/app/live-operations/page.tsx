'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ProfileRecord = {
  full_name?: string | null;
  phone?: string | null;
};

type ServiceRecord = {
  name?: string | null;
  base_price?: number | string | null;
};

type BookingRecord = {
  id?: string | number | null;
  customer_id?: string | null;

  customer_name?: string | null;
  customer_phone?: string | null;
  service_name?: string | null;

  status?: string | null;
  scheduled_at?: string | null;

  quoted_price?: number | string | null;

  address?: string | null;
  notes?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  profiles?: ProfileRecord | ProfileRecord[] | null;
  services?: ServiceRecord | ServiceRecord[] | null;

  [key: string]: unknown;
};

type LocationRecord = {
  id?: string | number | null;
  booking_id?: string | number | null;
  customer_id?: string | null;

  latitude?: number | string | null;
  longitude?: number | string | null;

  accuracy_meters?: number | string | null;
  heading?: number | string | null;
  speed_mps?: number | string | null;
  altitude_meters?: number | string | null;

  recorded_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;

  [key: string]: unknown;
};

type LocationShareRecord = {
  booking_id?: string | number | null;
  customer_id?: string | null;

  enabled?: boolean | null;

  started_at?: string | null;
  stopped_at?: string | null;
  last_seen_at?: string | null;

  updated_at?: string | null;
  created_at?: string | null;

  [key: string]: unknown;
};

type LiveAppointment = {
  booking: BookingRecord;

  location: LocationRecord | null;
  share: LocationShareRecord | null;

  latitude: number | null;
  longitude: number | null;

  accuracy: number | null;
  heading: number | null;
  speed: number | null;

  locationUpdatedAt: string | null;

  trackingEnabled: boolean;
};

/* -------------------------------------------------------------------------- */
/* Leaflet                                                                    */
/* -------------------------------------------------------------------------- */

const LiveOperationsMap = dynamic(
  () => import('./LiveOperationsMap'),
  {
    ssr: false,
    loading: () => (
      <div className="liveMapLoading">
        <div className="liveSpinner" />
        <span>Loading live map...</span>
      </div>
    ),
  }
);

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ACTIVE_STATUSES = [
  'received',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
];

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function stringValue(
  value: unknown
): string | null {
  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value.trim();
  }

  return null;
}

function numberValue(
  value: unknown
): number | null {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getBookingId(
  booking: BookingRecord
): string | null {
  if (
    booking.id === null ||
    booking.id === undefined
  ) {
    return null;
  }

  return String(booking.id);
}

function getProfile(
  booking: BookingRecord
): ProfileRecord | null {
  if (!booking.profiles) {
    return null;
  }

  if (Array.isArray(booking.profiles)) {
    return booking.profiles[0] ?? null;
  }

  return booking.profiles;
}

function getService(
  booking: BookingRecord
): ServiceRecord | null {
  if (!booking.services) {
    return null;
  }

  if (Array.isArray(booking.services)) {
    return booking.services[0] ?? null;
  }

  return booking.services;
}

function getCustomerName(
  booking: BookingRecord
): string {
  return (
    stringValue(booking.customer_name) ??
    stringValue(getProfile(booking)?.full_name) ??
    'Customer'
  );
}

function getCustomerPhone(
  booking: BookingRecord
): string {
  return (
    stringValue(booking.customer_phone) ??
    stringValue(getProfile(booking)?.phone) ??
    'Not provided'
  );
}

function getServiceName(
  booking: BookingRecord
): string {
  return (
    stringValue(booking.service_name) ??
    stringValue(getService(booking)?.name) ??
    'Service'
  );
}

function getStatus(
  booking: BookingRecord
): string {
  return (
    stringValue(booking.status) ??
    'received'
  );
}

function getPrice(
  booking: BookingRecord
): number {
  return (
    numberValue(booking.quoted_price) ??
    numberValue(getService(booking)?.base_price) ??
    0
  );
}

function getInitials(
  name: string
): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map(
      part =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join('');
}

function getCoordinates(
  location: LocationRecord | null
): {
  latitude: number | null;
  longitude: number | null;
} {
  if (!location) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  return {
    latitude: numberValue(
      location.latitude
    ),
    longitude: numberValue(
      location.longitude
    ),
  };
}

function formatTime(
  value: unknown
): string {
  const text = stringValue(value);

  if (!text) {
    return 'No time';
  }

  const date = new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'No time';
  }

  return date.toLocaleTimeString(
    'en-ZM',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function formatDateTime(
  value: unknown
): string {
  const text = stringValue(value);

  if (!text) {
    return '—';
  }

  const date = new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleString(
    'en-ZM',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  );
}

function formatCurrency(
  value: number
): string {
  return `K${value.toLocaleString(
    'en-ZM',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatAccuracy(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return `${Math.round(value)}m`;
}

function formatSpeed(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return `${(
    value * 3.6
  ).toFixed(1)} km/h`;
}

/* -------------------------------------------------------------------------- */
/* Location matching                                                          */
/* -------------------------------------------------------------------------- */

function findLocation(
  booking: BookingRecord,
  locations: LocationRecord[]
): LocationRecord | null {
  const bookingId =
    getBookingId(booking);

  const customerId =
    stringValue(
      booking.customer_id
    );

  /*
   * Always prefer exact booking match.
   */
  if (bookingId) {
    const bookingLocation =
      locations.find(
        location =>
          location.booking_id !==
            null &&
          location.booking_id !==
            undefined &&
          String(
            location.booking_id
          ) === bookingId
      );

    if (bookingLocation) {
      return bookingLocation;
    }
  }

  /*
   * Customer ID is only a fallback.
   */
  if (customerId) {
    const customerLocation =
      locations.find(
        location =>
          stringValue(
            location.customer_id
          ) === customerId
      );

    if (customerLocation) {
      return customerLocation;
    }
  }

  return null;
}

function findShare(
  booking: BookingRecord,
  shares: LocationShareRecord[]
): LocationShareRecord | null {
  const bookingId =
    getBookingId(booking);

  const customerId =
    stringValue(
      booking.customer_id
    );

  if (bookingId) {
    const bookingShare =
      shares.find(
        share =>
          share.booking_id !==
            null &&
          share.booking_id !==
            undefined &&
          String(
            share.booking_id
          ) === bookingId
      );

    if (bookingShare) {
      return bookingShare;
    }
  }

  if (customerId) {
    const customerShare =
      shares.find(
        share =>
          stringValue(
            share.customer_id
          ) === customerId
      );

    if (customerShare) {
      return customerShare;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LiveOperationsPage() {
  const [bookings, setBookings] =
    useState<BookingRecord[]>([]);

  const [locations, setLocations] =
    useState<LocationRecord[]>([]);

  const [shares, setShares] =
    useState<LocationShareRecord[]>([]);

  const [
    selectedBookingId,
    setSelectedBookingId,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const selectionRef =
    useRef<HTMLElement | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Select customer AND scroll to details                                 */
  /* ---------------------------------------------------------------------- */

  const selectAppointment =
    useCallback(
      (bookingId: string) => {
        setSelectedBookingId(
          bookingId
        );

        /*
         * The old implementation only changed state.
         *
         * This explicitly brings the selected
         * customer's map/details into view.
         */
        window.requestAnimationFrame(
          () => {
            window.setTimeout(() => {
              selectionRef.current?.scrollIntoView(
                {
                  behavior: 'smooth',
                  block: 'start',
                }
              );
            }, 80);
          }
        );
      },
      []
    );

  /* ---------------------------------------------------------------------- */
  /* Load everything                                                        */
  /* ---------------------------------------------------------------------- */

  const loadLiveOperations =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        try {
          const [
            bookingsResult,
            locationsResult,
            sharesResult,
          ] = await Promise.all([
            supabase
              .from('bookings')
              .select(
                `
                *,
                profiles!bookings_customer_id_fkey(
                  full_name,
                  phone
                ),
                services(
                  name,
                  base_price
                )
                `
              )
              .in(
                'status',
                ACTIVE_STATUSES
              )
              .order(
                'scheduled_at',
                {
                  ascending: true,
                }
              ),

            /*
             * NEW LIVE LOCATION TABLE.
             */
            supabase
              .from(
                'booking_live_locations'
              )
              .select('*'),

            /*
             * NEW LOCATION SHARING TABLE.
             */
            supabase
              .from(
                'booking_location_shares'
              )
              .select('*'),
          ]);

          if (
            bookingsResult.error
          ) {
            throw bookingsResult.error;
          }

          if (
            locationsResult.error
          ) {
            throw locationsResult.error;
          }

          if (
            sharesResult.error
          ) {
            throw sharesResult.error;
          }

          const bookingRows =
            (bookingsResult.data ??
              []) as BookingRecord[];

          const locationRows =
            (locationsResult.data ??
              []) as LocationRecord[];

          const shareRows =
            (sharesResult.data ??
              []) as LocationShareRecord[];

          locationRows.sort(
            (a, b) => {
              const aTime =
                a.recorded_at
                  ? new Date(
                      a.recorded_at
                    ).getTime()
                  : 0;

              const bTime =
                b.recorded_at
                  ? new Date(
                      b.recorded_at
                    ).getTime()
                  : 0;

              return (
                bTime - aTime
              );
            }
          );

          setBookings(
            bookingRows
          );

          setLocations(
            locationRows
          );

          setShares(
            shareRows
          );
        } catch (loadError) {
          console.error(
            'Live Operations load error:',
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load live operations.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  /* ---------------------------------------------------------------------- */
  /* Realtime                                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    void loadLiveOperations();

    const bookingsChannel =
      supabase
        .channel(
          'sarj-live-bookings'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
          },
          () => {
            void loadLiveOperations(
              true
            );
          }
        )
        .subscribe();

    const locationsChannel =
      supabase
        .channel(
          'sarj-live-location-updates'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'booking_live_locations',
          },
          payload => {
            const newRow =
              payload.new as LocationRecord;

            const oldRow =
              payload.old as LocationRecord;

            if (
              payload.eventType ===
              'DELETE'
            ) {
              setLocations(
                current =>
                  current.filter(
                    location =>
                      String(
                        location.booking_id
                      ) !==
                      String(
                        oldRow.booking_id
                      )
                  )
              );

              return;
            }

            setLocations(
              current => {
                const bookingId =
                  String(
                    newRow.booking_id
                  );

                const exists =
                  current.some(
                    location =>
                      String(
                        location.booking_id
                      ) ===
                      bookingId
                  );

                if (exists) {
                  return current.map(
                    location =>
                      String(
                        location.booking_id
                      ) ===
                      bookingId
                        ? newRow
                        : location
                  );
                }

                return [
                  newRow,
                  ...current,
                ];
              }
            );
          }
        )
        .subscribe();

    const sharesChannel =
      supabase
        .channel(
          'sarj-location-sharing'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'booking_location_shares',
          },
          payload => {
            const newRow =
              payload.new as LocationShareRecord;

            const oldRow =
              payload.old as LocationShareRecord;

            if (
              payload.eventType ===
              'DELETE'
            ) {
              setShares(
                current =>
                  current.filter(
                    share =>
                      String(
                        share.booking_id
                      ) !==
                      String(
                        oldRow.booking_id
                      )
                  )
              );

              return;
            }

            setShares(
              current => {
                const bookingId =
                  String(
                    newRow.booking_id
                  );

                const exists =
                  current.some(
                    share =>
                      String(
                        share.booking_id
                      ) ===
                      bookingId
                  );

                if (exists) {
                  return current.map(
                    share =>
                      String(
                        share.booking_id
                      ) ===
                      bookingId
                        ? newRow
                        : share
                  );
                }

                return [
                  newRow,
                  ...current,
                ];
              }
            );
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        bookingsChannel
      );

      void supabase.removeChannel(
        locationsChannel
      );

      void supabase.removeChannel(
        sharesChannel
      );
    };
  }, [
    loadLiveOperations,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Build appointment model                                               */
  /* ---------------------------------------------------------------------- */

  const liveAppointments =
    useMemo<LiveAppointment[]>(
      () => {
        return bookings.map(
          booking => {
            const location =
              findLocation(
                booking,
                locations
              );

            const share =
              findShare(
                booking,
                shares
              );

            const coordinates =
              getCoordinates(
                location
              );

            return {
              booking,
              location,
              share,

              latitude:
                coordinates.latitude,

              longitude:
                coordinates.longitude,

              accuracy:
                numberValue(
                  location?.accuracy_meters
                ),

              heading:
                numberValue(
                  location?.heading
                ),

              speed:
                numberValue(
                  location?.speed_mps
                ),

              locationUpdatedAt:
                stringValue(
                  location?.recorded_at
                ) ??
                stringValue(
                  location?.updated_at
                ) ??
                stringValue(
                  share?.last_seen_at
                ),

              trackingEnabled:
                share?.enabled === true,
            };
          }
        );
      },
      [
        bookings,
        locations,
        shares,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* Selected appointment                                                   */
  /* ---------------------------------------------------------------------- */

  const selectedAppointment =
    useMemo(() => {
      if (
        selectedBookingId
      ) {
        const selected =
          liveAppointments.find(
            appointment =>
              getBookingId(
                appointment.booking
              ) ===
              selectedBookingId
          );

        if (selected) {
          return selected;
        }
      }

      return (
        liveAppointments[0] ??
        null
      );
    }, [
      liveAppointments,
      selectedBookingId,
    ]);

  /*
   * Only reset selection if the selected booking
   * disappeared. Do NOT constantly overwrite the
   * customer's choice.
   */
  useEffect(() => {
    if (
      liveAppointments.length ===
      0
    ) {
      setSelectedBookingId(
        null
      );

      return;
    }

    if (
      !selectedBookingId ||
      !liveAppointments.some(
        appointment =>
          getBookingId(
            appointment.booking
          ) ===
          selectedBookingId
      )
    ) {
      setSelectedBookingId(
        getBookingId(
          liveAppointments[0]
            .booking
        )
      );
    }
  }, [
    liveAppointments,
    selectedBookingId,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Stats                                                                  */
  /* ---------------------------------------------------------------------- */

  const trackingCount =
    liveAppointments.filter(
      appointment =>
        appointment.trackingEnabled
    ).length;

  const liveGpsCount =
    liveAppointments.filter(
      appointment =>
        appointment.trackingEnabled &&
        appointment.latitude !==
          null &&
        appointment.longitude !==
          null
    ).length;

  const waitingCount =
    liveAppointments.filter(
      appointment =>
        !appointment.trackingEnabled
    ).length;

  const mapCoordinates =
    selectedAppointment &&
    selectedAppointment.latitude !==
      null &&
    selectedAppointment.longitude !==
      null
      ? {
          latitude:
            selectedAppointment.latitude,
          longitude:
            selectedAppointment.longitude,
        }
      : null;

  /* ---------------------------------------------------------------------- */
  /* Directions                                                             */
  /* ---------------------------------------------------------------------- */

  const directionsUrl =
    mapCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${mapCoordinates.latitude},${mapCoordinates.longitude}`
        )}`
      : null;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="liveOperationsPage">

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}

      <section className="liveOperationsHero">

        <div>
          <div className="liveOperationsEyebrow">
            <span className="livePulse" />
            LIVE OPERATIONS
          </div>

          <h1>
            Customer tracking
          </h1>

          <p>
            Monitor active appointments,
            customer locations and live
            movement from one operational view.
          </p>
        </div>

        <div className="liveOperationsHeroActions">

          <div className="liveOperationsCounter">
            <strong>
              {liveAppointments.length}
            </strong>

            <span>
              ACTIVE
            </span>
          </div>

          <button
            type="button"
            className="liveRefreshButton"
            onClick={() =>
              void loadLiveOperations(
                true
              )
            }
            disabled={refreshing}
          >
            {refreshing
              ? 'Refreshing...'
              : '↻ Refresh'}
          </button>

        </div>

      </section>

      {/* ================================================================ */}
      {/* ERROR                                                            */}
      {/* ================================================================ */}

      {error && (
        <section className="liveOperationsError">

          <div>
            <strong>
              Live Operations error
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadLiveOperations(
                true
              )
            }
          >
            Try again
          </button>

        </section>
      )}

      {/* ================================================================ */}
      {/* STATS                                                            */}
      {/* ================================================================ */}

      <section className="liveOperationsStats">

        <article className="liveStatCard">
          <span>
            ACTIVE APPOINTMENTS
          </span>

          <strong>
            {liveAppointments.length}
          </strong>

          <small>
            Current active bookings
          </small>
        </article>

        <article className="liveStatCard liveStatHighlight">
          <span>
            LIVE GPS
          </span>

          <strong>
            {liveGpsCount}
          </strong>

          <small>
            Customers with coordinates
          </small>
        </article>

        <article className="liveStatCard">
          <span>
            SHARING LOCATION
          </span>

          <strong>
            {trackingCount}
          </strong>

          <small>
            Customers who enabled tracking
          </small>
        </article>

        <article className="liveStatCard">
          <span>
            LOCATION OFF
          </span>

          <strong>
            {waitingCount}
          </strong>

          <small>
            Active bookings not sharing GPS
          </small>
        </article>

      </section>

      {/* ================================================================ */}
      {/* ACTIVE APPOINTMENTS                                               */}
      {/* ================================================================ */}

      <section className="liveOperationsGrid">

        <div className="liveAppointmentsPanel">

          <div className="livePanelHeader">

            <div>
              <span className="livePanelKicker">
                ACTIVE QUEUE
              </span>

              <h2>
                Live appointments
              </h2>
            </div>

            <span className="livePanelCount">
              {liveAppointments.length}
            </span>

          </div>

          {loading ? (
            <div className="liveLoadingState">

              <div className="liveSpinner" />

              <span>
                Loading live appointments...
              </span>

            </div>
          ) : liveAppointments.length ===
            0 ? (
            <div className="liveEmptyState">

              <div className="liveEmptyIcon">
                ✓
              </div>

              <h3>
                No active appointments
              </h3>

              <p>
                Active bookings will appear
                here automatically.
              </p>

            </div>
          ) : (
            <div className="liveAppointmentList">

              {liveAppointments.map(
                appointment => {
                  const booking =
                    appointment.booking;

                  const bookingId =
                    getBookingId(
                      booking
                    );

                  const customerName =
                    getCustomerName(
                      booking
                    );

                  const status =
                    getStatus(
                      booking
                    );

                  const hasLocation =
                    appointment.latitude !==
                      null &&
                    appointment.longitude !==
                      null;

                  const isSelected =
                    bookingId ===
                    selectedBookingId;

                  return (
                    <button
                      type="button"
                      key={
                        bookingId ??
                        customerName
                      }
                      className={
                        `liveAppointmentCard${
                          isSelected
                            ? ' isSelected'
                            : ''
                        }`
                      }
                      onClick={() => {
                        if (
                          bookingId
                        ) {
                          selectAppointment(
                            bookingId
                          );
                        }
                      }}
                    >

                      <div className="liveCustomerAvatar">
                        {getInitials(
                          customerName
                        ) || 'C'}
                      </div>

                      <div className="liveAppointmentMain">

                        <div className="liveAppointmentTop">

                          <strong>
                            {customerName}
                          </strong>

                          <span
                            className={
                              `liveStatus status-${status}`
                            }
                          >
                            <i />

                            {STATUS_LABELS[
                              status
                            ] ??
                              status}
                          </span>

                        </div>

                        <span className="liveServiceName">
                          {getServiceName(
                            booking
                          )}
                        </span>

                        <div className="liveAppointmentMeta">

                          <span>
                            {formatTime(
                              booking.scheduled_at
                            )}
                          </span>

                          <span
                            className={
                              appointment.trackingEnabled
                                ? hasLocation
                                  ? 'trackingLive'
                                  : 'trackingWaiting'
                                : 'trackingOff'
                            }
                          >
                            {appointment.trackingEnabled
                              ? hasLocation
                                ? '● GPS LIVE'
                                : '◌ WAITING FOR GPS'
                              : '○ LOCATION OFF'}
                          </span>

                        </div>

                        <div className="liveAppointmentSub">

                          <span>
                            {stringValue(
                              booking.address
                            ) ??
                              'No address'}
                          </span>

                          {hasLocation && (
                            <span>
                              Updated{' '}
                              {formatDateTime(
                                appointment.locationUpdatedAt
                              )}
                            </span>
                          )}

                        </div>

                      </div>

                      <span className="liveChevron">
                        →
                      </span>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* ============================================================ */}
        {/* MAP                                                           */}
        {/* ============================================================ */}

        <div className="liveMapPanel">

          <div className="livePanelHeader">

            <div>

              <span className="livePanelKicker">
                LIVE MAP
              </span>

              <h2>
                {selectedAppointment
                  ? getCustomerName(
                      selectedAppointment.booking
                    )
                  : 'Customer location'}
              </h2>

            </div>

            {selectedAppointment?.trackingEnabled &&
              selectedAppointment.latitude !==
                null &&
              selectedAppointment.longitude !==
                null && (
                <span className="mapLiveBadge">
                  <i />
                  LIVE GPS
                </span>
              )}

          </div>

          <div className="liveMapContainer">

            {mapCoordinates ? (
              <LiveOperationsMap
                latitude={
                  mapCoordinates.latitude
                }
                longitude={
                  mapCoordinates.longitude
                }
                customerName={
                  selectedAppointment
                    ? getCustomerName(
                        selectedAppointment.booking
                      )
                    : 'Customer'
                }
                accuracy={
                  selectedAppointment?.accuracy ??
                  null
                }
                updatedAt={
                  selectedAppointment?.locationUpdatedAt ??
                  null
                }
              />
            ) : (
              <div className="mapUnavailable">

                <div className="mapUnavailableIcon">
                  ◎
                </div>

                <h3>
                  {selectedAppointment?.trackingEnabled
                    ? 'Waiting for GPS'
                    : 'Location not shared'}
                </h3>

                <p>
                  {selectedAppointment?.trackingEnabled
                    ? 'The customer enabled location sharing, but no GPS coordinate has arrived yet.'
                    : 'This customer has not enabled live location sharing for this booking.'}
                </p>

              </div>
            )}

          </div>

        </div>

      </section>

      {/* ================================================================ */}
      {/* CUSTOMER DETAILS + MAP TARGET                                   */}
      {/* ================================================================ */}

      <section
        ref={selectionRef}
        id="live-customer-details"
        className="liveCustomerDetails"
      >

        {selectedAppointment ? (
          <>
            <div className="liveDetailsHeader">

              <div className="liveDetailsIdentity">

                <div className="liveCustomerAvatar large">
                  {getInitials(
                    getCustomerName(
                      selectedAppointment.booking
                    )
                  ) || 'C'}
                </div>

                <div>

                  <span>
                    SELECTED BOOKING
                  </span>

                  <h2>
                    {getCustomerName(
                      selectedAppointment.booking
                    )}
                  </h2>

                  <p>
                    {getServiceName(
                      selectedAppointment.booking
                    )}
                  </p>

                </div>

              </div>

              <div
                className={
                  selectedAppointment.trackingEnabled &&
                  selectedAppointment.latitude !==
                    null &&
                  selectedAppointment.longitude !==
                    null
                    ? 'liveTrackingState active'
                    : 'liveTrackingState'
                }
              >
                <i />

                {selectedAppointment.trackingEnabled
                  ? selectedAppointment.latitude !==
                      null &&
                    selectedAppointment.longitude !==
                      null
                    ? 'LIVE LOCATION'
                    : 'LOCATION SHARING ON'
                  : 'LOCATION OFF'}
              </div>

            </div>

            <div className="liveDetailsItems">

              <div>
                <span>
                  STATUS
                </span>

                <strong>
                  {STATUS_LABELS[
                    getStatus(
                      selectedAppointment.booking
                    )
                  ] ??
                    getStatus(
                      selectedAppointment.booking
                    )}
                </strong>
              </div>

              <div>
                <span>
                  APPOINTMENT
                </span>

                <strong>
                  {formatDateTime(
                    selectedAppointment.booking
                      .scheduled_at
                  )}
                </strong>
              </div>

              <div>
                <span>
                  VALUE
                </span>

                <strong>
                  {formatCurrency(
                    getPrice(
                      selectedAppointment.booking
                    )
                  )}
                </strong>
              </div>

              <div>
                <span>
                  PHONE
                </span>

                <strong>
                  {getCustomerPhone(
                    selectedAppointment.booking
                  )}
                </strong>
              </div>

              <div>
                <span>
                  GPS ACCURACY
                </span>

                <strong>
                  {formatAccuracy(
                    selectedAppointment.accuracy
                  )}
                </strong>
              </div>

              <div>
                <span>
                  SPEED
                </span>

                <strong>
                  {formatSpeed(
                    selectedAppointment.speed
                  )}
                </strong>
              </div>

              <div>
                <span>
                  LATITUDE
                </span>

                <strong>
                  {selectedAppointment.latitude !==
                    null
                    ? selectedAppointment.latitude.toFixed(
                        6
                      )
                    : '—'}
                </strong>
              </div>

              <div>
                <span>
                  LONGITUDE
                </span>

                <strong>
                  {selectedAppointment.longitude !==
                    null
                    ? selectedAppointment.longitude.toFixed(
                        6
                      )
                    : '—'}
                </strong>
              </div>

            </div>

            <div className="liveDetailsActions">

              {directionsUrl && (
                <a
                  href={
                    directionsUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="liveDirectionsButton"
                >
                  GET DIRECTIONS
                  <span>
                    ↗
                  </span>
                </a>
              )}

              {stringValue(
                selectedAppointment.booking
                  .address
              ) && (
                <div className="liveAddress">

                  <span>
                    BOOKING ADDRESS
                  </span>

                  <strong>
                    {stringValue(
                      selectedAppointment.booking
                        .address
                    )}
                  </strong>

                </div>
              )}

              {selectedAppointment.locationUpdatedAt && (
                <div className="liveAddress">

                  <span>
                    LAST GPS UPDATE
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedAppointment.locationUpdatedAt
                    )}
                  </strong>

                </div>
              )}

            </div>

          </>
        ) : (
          <div className="liveEmptyState">

            <h3>
              Select an appointment
            </h3>

            <p>
              Choose a customer from the
              active queue to view their
              details and live location.
            </p>

          </div>
        )}

      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}

      <section className="liveTrackingFooter">

        <div>
          <span className="livePulse" />

          <strong>
            LIVE LOCATION TRACKING
          </strong>
        </div>

        <span>
          Booking, location-sharing and GPS
          updates are synchronized through
          Supabase realtime.
        </span>

      </section>

    </div>
  );
}