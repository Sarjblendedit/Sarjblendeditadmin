'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import { createClient } from '@supabase/supabase-js';

import { LogoUpload } from './components/LogoUpload';
import { WalkInsPanel } from './components/WalkInsPanel';
import { ManualSalesPanel } from './components/ManualSalesPanel';
import { AppointmentsPanel } from './components/AppointmentsPanel';
import { ProfileUpload } from './components/ProfileUpload';
import ReportsPanel from './components/ReportsPanel';
import { AdminChat } from './components/AdminChat';

const LiveOperationsMap = dynamic(
  () => import('./components/LiveOperationsMap'),
  {
    ssr: false,
    loading: () => (
      <div className="liveMapLoading">
        Loading live map…
      </div>
    ),
  }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

type Status =
  | 'received'
  | 'confirmed'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

type Booking = {
  id: string;
  customer_id: string;
  created_at: string;
  scheduled_at: string;
  status: Status;
  address: string;
  notes: string | null;
  quoted_price: number | null;
  amount_paid: number;
  payment_method: string;
  payment_status: string;
  services: {
    name: string;
    base_price: number;
  } | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
  } | null;
};

type BookingLocation = {
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

type BookingLocationShare = {
  booking_id: string;
  customer_id: string;
  enabled: boolean;
  started_at: string | null;
  stopped_at: string | null;
  last_seen_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
};

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_blocked: boolean;
  created_at: string;
};

type ManualCustomer = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  residence: string | null;
  customer_type: 'app' | 'walk_in';
  is_blocked: boolean;
  created_at: string;
  updated_at?: string;
};

type ManualCustomerForm = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  residence: string;
  customer_type: 'app' | 'walk_in';
};

const blankManualCustomer: ManualCustomerForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  residence: '',
  customer_type: 'walk_in',
};

type GalleryItem = {
  id: string;
  title: string | null;
  media_url: string;
  media_type: string;
  category: string | null;
  is_published: boolean;
};

type Promotion = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  discount_percent: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

type BusinessSettings = {
  id: boolean;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

type WeatherSnapshot = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

const statusLabels: Record<Status, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const statusOptions = Object.keys(statusLabels) as Status[];

const money = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—';
  }

  return 'K' + Number(value).toFixed(0);
};

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatOverviewDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const weatherDetails = (code: number, isDay = true) => {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: 'Clear' };
  if (code <= 2) return { icon: isDay ? '🌤️' : '☁️', label: 'Partly cloudy' };
  if (code === 3) return { icon: '☁️', label: 'Overcast' };
  if (code <= 48) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 57) return { icon: '🌦️', label: 'Drizzle' };
  if (code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code <= 77) return { icon: '🌨️', label: 'Snow' };
  if (code <= 82) return { icon: '🌧️', label: 'Showers' };
  return { icon: '⛈️', label: 'Thunderstorms' };
};

const formatForecastDay = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString([], {
    weekday: 'short',
  });

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [tab, setTab] = useState<
  | 'overview'
  | 'live-operations'
  | 'bookings'
  | 'services'
  | 'customers'
  | 'gallery'
  | 'promotions'
  | 'appointments'
  | 'reports'
  | 'walkins'
  | 'manual-sales'
  | 'settings'
>('overview');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingLocations, setBookingLocations] =
    useState<BookingLocation[]>([]);
  const [bookingLocationShares, setBookingLocationShares] =
    useState<BookingLocationShare[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [manualCustomers, setManualCustomers] = useState<ManualCustomer[]>(
    []
  );

  const [galleryUploading, setGalleryUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [business, setBusiness] =
    useState<BusinessSettings | null>(null);

  const [adminName, setAdminName] = useState('Admin');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState('');
  const [adminLastLogin, setAdminLastLogin] =
    useState<string | null>(null);
  const [adminId, setAdminId] = useState('');

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [overviewDate, setOverviewDate] = useState(() => localDateKey());
  const [bookingsDate, setBookingsDate] = useState(() => localDateKey());
  const [liveOperationsDate, setLiveOperationsDate] = useState(() => localDateKey());
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState(false);

  const [editing, setEditing] = useState<Service | null>(null);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] =
    useState<Customer | null>(null);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingManualCustomer, setEditingManualCustomer] =
    useState<ManualCustomer | null>(null);
  const [viewingManualCustomer, setViewingManualCustomer] =
    useState<ManualCustomer | null>(null);

  const [manualCustomerForm, setManualCustomerForm] =
    useState<ManualCustomerForm>(blankManualCustomer);

  const [savingManualCustomer, setSavingManualCustomer] =
    useState(false);

    const [paymentModal, setPaymentModal] = useState<{
  booking: Booking;
  amountPaid: string;
  paymentMethod: string;
  paymentStatus: string;
} | null>(null);

  const [newGallery, setNewGallery] = useState({
    title: '',
    media_url: '',
    media_type: 'image',
    category: '',
  });

  const [newPromo, setNewPromo] = useState({
    title: '',
    code: '',
    description: '',
    discount_percent: '',
  });

  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const loadManualCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(
        'id,first_name,last_name,phone,email,residence,customer_type,is_blocked,created_at,updated_at'
      )
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      setNotice(error.message);
      return;
    }

    setManualCustomers(
      (data as ManualCustomer[]) ?? []
    );
  };

  const load = async () => {
    setLoading(true);

    const results = await Promise.all([
      supabase
        .from('bookings')
        .select(
          'id,customer_id,created_at,scheduled_at,status,address,notes,quoted_price,amount_paid,payment_method,payment_status,services(name,base_price),profiles!bookings_customer_id_fkey(full_name,phone)'
        )
        .order('scheduled_at', {
          ascending: true,
        }),

      supabase
        .from('services')
        .select(
          'id,name,description,base_price,duration_minutes,is_active,sort_order'
        )
        .order('sort_order'),

      supabase
        .from('profiles')
        .select(
          'id,full_name,phone,role,is_blocked,created_at'
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('gallery_items')
        .select(
          'id,title,media_url,media_type,category,is_published'
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('promotions')
        .select(
          'id,title,code,description,discount_percent,starts_at,ends_at,is_active'
        )
        .order('title'),

      supabase
        .from('business_settings')
        .select(
          'id,business_name,tagline,logo_url,contact_phone,contact_email'
        )
        .eq('id', true)
        .maybeSingle(),

      supabase
        .from('customers')
        .select(
          'id,first_name,last_name,phone,email,residence,customer_type,is_blocked,created_at,updated_at'
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('booking_live_locations')
        .select(
          'booking_id,customer_id,latitude,longitude,accuracy_meters,heading,speed_mps,altitude_meters,recorded_at,updated_at'
        ),

      supabase
        .from('booking_location_shares')
        .select(
          'booking_id,customer_id,enabled,started_at,stopped_at,last_seen_at,created_at,updated_at'
        ),
    ]);

    const [
      bookingResult,
      serviceResult,
      customerResult,
      galleryResult,
      promotionResult,
      businessResult,
      manualCustomerResult,
      bookingLocationResult,
      bookingLocationShareResult,
    ] = results;

    const firstError = results.find(
      result => result.error
    );

    if (firstError?.error) {
      setNotice(
        firstError.error.message ??
          'Could not load live data.'
      );
    }

    setBookings(
      (bookingResult.data as unknown as Booking[]) ??
        []
    );

    setBookingLocations(
      (bookingLocationResult.data as BookingLocation[]) ??
        []
    );

    setBookingLocationShares(
      (bookingLocationShareResult.data as BookingLocationShare[]) ??
        []
    );

    setServices(
      (serviceResult.data as Service[]) ?? []
    );

    setCustomers(
      (customerResult.data as Customer[]) ?? []
    );

    setGallery(
      (galleryResult.data as GalleryItem[] | null) ?? []
    );

    setPromotions(
      (promotionResult.data as Promotion[]) ?? []
    );

    setBusiness(
      (businessResult.data as BusinessSettings | null) ??
        null
    );

    setManualCustomers(
      (manualCustomerResult.data as ManualCustomer[]) ??
        []
    );

    setLastSynced(new Date());
    setLoading(false);
  };

  const verify = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAuthorized(false);
      setAuthLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role,full_name,phone')
      .eq('id', user.id)
      .single();

    if (error) {
      setAuthorized(false);
      setNotice(error.message);
      setAuthLoading(false);
      return;
    }

    setAuthorized(data?.role === 'admin');
    setAdminId(user.id);

    const fullName =
      data?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.email?.split('@')[0] ||
      'Admin';

    setAdminName(fullName.split(/\s+/)[0]);

    setAdminPhone(data?.phone?.trim() || '');
    setAdminEmail(user.email || '');

    setAdminAvatarUrl(
      user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        ''
    );

    setAdminLastLogin(
      user.last_sign_in_at || null
    );

    setAuthLoading(false);

    if (data?.role === 'admin') {
      load();
    }
  };

  useEffect(() => {
    verify();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      verify();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());

    updateTime();
    const clockTimer = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-15.4167&longitude=28.2833&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Africa%2FLusaka&forecast_days=3'
        );

        if (!response.ok) throw new Error('Weather service unavailable');

        const data = (await response.json()) as WeatherSnapshot;

        if (active) {
          setWeather(data);
          setWeatherError(false);
        }
      } catch {
        if (active) setWeatherError(true);
      }
    };

    void loadWeather();
    const weatherTimer = window.setInterval(loadWeather, 15 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(weatherTimer);
    };
  }, []);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const channel = supabase
      .channel('sarj-admin-live-data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        payload => {
          void load();

          if (payload.eventType === 'INSERT') {
            showAdminLiveNotification(
              'A new customer booking has been received.'
            );
            return;
          }

          if (payload.eventType === 'UPDATE') {
            const next = payload.new as Partial<Booking>;
            const previous = payload.old as Partial<Booking>;

            if (next.status && next.status !== previous.status) {
              showAdminLiveNotification(
                `Booking status changed to ${statusLabels[next.status as Status] ?? next.status}.`
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gallery_items',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promotions',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_live_locations',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_location_shares',
        },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => {
      setNotice('');
    }, 3200);

    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();

    setSigningIn(true);
    setNotice('');

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    setSigningIn(false);

    if (error) {
      setNotice(error.message);
    }
  };

  /*
   * ======================================================
   * BOOKING STATUS / PAYMENT / LIVE NOTIFICATIONS
   * ======================================================
   */

  

  const showAdminLiveNotification = (message: string) => {
    setNotice(message);

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      new window.Notification('SARJ BLENDED IT', {
        body: message,
      });
    }
  };

  const changeStatus = async (
  bookingId: string,
  nextStatus: Status
) => {
  const booking = bookings.find(
    item => item.id === bookingId
  );

  if (!booking) return;

  if (nextStatus === 'completed') {
    setPaymentModal({
      booking,
      amountPaid: String(
        booking.amount_paid ??
          booking.quoted_price ??
          0
      ),
      paymentMethod:
        booking.payment_method || 'cash',
      paymentStatus:
        booking.payment_status === 'paid'
          ? 'paid'
          : 'pending',
    });

    return;
  }

  if (booking.status === nextStatus) {
    setNotice(
      'Booking is already ' +
        statusLabels[nextStatus] +
        '.'
    );
    return;
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: nextStatus,
    })
    .eq('id', bookingId);

  if (error) {
    console.error(error);
    setNotice(error.message);
    return;
  }

  await load();
};
  /*
   * ======================================================
   * SERVICES
   * ======================================================
   */

  const saveService = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!editing) {
      return;
    }

    const payload = {
      name: editing.name.trim(),
      description:
        editing.description?.trim() || null,
      base_price: Number(editing.base_price),
      duration_minutes:
        Number(editing.duration_minutes) || 45,
      is_active: editing.is_active,
      sort_order:
        Number(editing.sort_order) || 0,
    };

    const result = editing.id.startsWith('new-')
      ? await supabase
          .from('services')
          .insert(payload)
      : await supabase
          .from('services')
          .update(payload)
          .eq('id', editing.id);

    if (result.error) {
      setNotice(result.error.message);
      return;
    }

    setEditing(null);
    setNotice('Service saved.');
    await load();
  };

  const toggleService = async (
    service: Service
  ) => {
    const { error } = await supabase
      .from('services')
      .update({
        is_active: !service.is_active,
      })
      .eq('id', service.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setServices(old =>
      old.map(s =>
        s.id === service.id
          ? {
              ...s,
              is_active: !s.is_active,
            }
          : s
      )
    );
  };

  const deleteService = async (service: Service) => {
    const confirmed = window.confirm(
      `Delete “${service.name}”? This cannot be undone. Services already used in bookings must be hidden instead.`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', service.id);

    if (error) {
      setNotice(`Could not delete ${service.name}. ${error.message}`);
      return;
    }

    setServices(old => old.filter(item => item.id !== service.id));
    if (editing?.id === service.id) setEditing(null);
    setNotice('Service deleted.');
  };

  /*
   * ======================================================
   * GALLERY UPLOAD
   * ======================================================
   */

  const uploadGalleryFile = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (
      newGallery.media_type === 'image' &&
      !isImage
    ) {
      setNotice('Please choose an image file.');
      e.target.value = '';
      return;
    }

    if (
      newGallery.media_type === 'video' &&
      !isVideo
    ) {
      setNotice('Please choose a video file.');
      e.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setNotice(
        'Use a media file smaller than 25 MB.'
      );
      e.target.value = '';
      return;
    }

    setGalleryUploading(true);
    setNotice('Uploading media…');

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'bin';

    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    const path = `gallery/${Date.now()}-${safeName}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from('gallery')
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setGalleryUploading(false);
      setNotice(uploadError.message);
      e.target.value = '';
      return;
    }

    const { data } = supabase.storage
      .from('gallery')
      .getPublicUrl(path);

    setNewGallery(old => ({
      ...old,
      media_url: data.publicUrl,
      title:
        old.title ||
        file.name.replace(/\.[^/.]+$/, ''),
    }));

    setGalleryUploading(false);
    setNotice(
      'Media uploaded. Add the gallery item to save it.'
    );
    e.target.value = '';
  };

  /*
   * ======================================================
   * GALLERY
   * ======================================================
   */

  const addGallery = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!newGallery.media_url) {
      setNotice('Choose a media file first.');
      return;
    }

    const { error } = await supabase
      .from('gallery_items')
      .insert({
        title:
          newGallery.title.trim() || null,
        media_url: newGallery.media_url,
        media_type: newGallery.media_type,
        category:
          newGallery.category.trim() || null,
      });

    if (error) {
      setNotice(error.message);
      return;
    }

    setNewGallery({
      title: '',
      media_url: '',
      media_type: 'image',
      category: '',
    });

    setNotice('Gallery item added.');
    await load();
  };

  const toggleGallery = async (
    item: GalleryItem
  ) => {
    const { error } = await supabase
      .from('gallery_items')
      .update({
        is_published: !item.is_published,
      })
      .eq('id', item.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setGallery(old =>
      old.map(g =>
        g.id === item.id
          ? {
              ...g,
              is_published: !g.is_published,
            }
          : g
      )
    );
  };

  /*
   * ======================================================
   * PROMOTIONS
   * ======================================================
   */

  const addPromotion = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    const { error } = await supabase
      .from('promotions')
      .insert({
        title: newPromo.title,
        code: newPromo.code || null,
        description:
          newPromo.description || null,
        discount_percent:
          newPromo.discount_percent
            ? Number(
                newPromo.discount_percent
              )
            : null,
      });

    if (error) {
      setNotice(error.message);
      return;
    }

    setNewPromo({
      title: '',
      code: '',
      description: '',
      discount_percent: '',
    });

    setNotice('Promotion saved.');
    await load();
  };

  const togglePromotion = async (
    item: Promotion
  ) => {
    const { error } = await supabase
      .from('promotions')
      .update({
        is_active: !item.is_active,
      })
      .eq('id', item.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setPromotions(old =>
      old.map(p =>
        p.id === item.id
          ? {
              ...p,
              is_active: !p.is_active,
            }
          : p
      )
    );
  };

  /*
   * ======================================================
   * BUSINESS SETTINGS
   * ======================================================
   */

  const saveBusiness = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!business) {
      return;
    }

    const { error } = await supabase
      .from('business_settings')
      .upsert(business);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice('Business settings saved.');
    await load();
  };

  const saveAdminProfile = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!adminId) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:
          adminName.trim() || null,
        phone:
          adminPhone.trim() || null,
      })
      .eq('id', adminId);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice('Admin profile saved.');
  };

  /*
   * ======================================================
   * APP CUSTOMER MANAGEMENT
   * ======================================================
   */

  const saveCustomer = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!editingCustomer) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:
          editingCustomer.full_name?.trim() ||
          null,
        phone:
          editingCustomer.phone?.trim() ||
          null,
      })
      .eq('id', editingCustomer.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setCustomers(old =>
      old.map(customer =>
        customer.id === editingCustomer.id
          ? editingCustomer
          : customer
      )
    );

    setViewingCustomer(null);
    setEditingCustomer(null);
    setNotice('Customer updated.');
  };

  const deleteCustomer = async (
    customer: Customer
  ) => {
    const confirmed = window.confirm(
      `Delete ${
        customer.full_name ||
        'this customer'
      } permanently?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', customer.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setCustomers(old =>
      old.filter(
        existingCustomer =>
          existingCustomer.id !== customer.id
      )
    );

    setEditingCustomer(null);
    setViewingCustomer(null);
    setNotice('Customer deleted.');
  };

  const blockCustomer = async (
    customer: Customer
  ) => {
    const currentlyBlocked =
      customer.is_blocked;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_blocked: !currentlyBlocked,
      })
      .eq('id', customer.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    const updated = {
      ...customer,
      is_blocked: !currentlyBlocked,
    };

    setCustomers(old =>
      old.map(item =>
        item.id === customer.id
          ? updated
          : item
      )
    );

    setViewingCustomer(updated);

    setNotice(
      currentlyBlocked
        ? 'Customer unblocked.'
        : 'Customer blocked.'
    );
  };

  /*
   * ======================================================
   * MANUAL CUSTOMER MANAGEMENT
   * ======================================================
   */

  const saveManualCustomer = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (
      !manualCustomerForm.first_name.trim()
    ) {
      setNotice(
        'First name is required.'
      );
      return;
    }

    setSavingManualCustomer(true);
    setNotice('');

    const payload = {
      first_name:
        manualCustomerForm.first_name.trim(),
      last_name:
        manualCustomerForm.last_name.trim() ||
        null,
      phone:
        manualCustomerForm.phone.trim() ||
        null,
      email:
        manualCustomerForm.email.trim() ||
        null,
      residence:
        manualCustomerForm.residence.trim() ||
        null,
      customer_type:
        manualCustomerForm.customer_type,
    };

    if (editingManualCustomer) {
      const { data, error } =
        await supabase
          .from('customers')
          .update(payload)
          .eq(
            'id',
            editingManualCustomer.id
          )
          .select()
          .single();

      if (error) {
        setSavingManualCustomer(false);
        setNotice(error.message);
        return;
      }

      setManualCustomers(old =>
        old.map(customer =>
          customer.id ===
          editingManualCustomer.id
            ? (data as ManualCustomer)
            : customer
        )
      );

      setNotice('Customer updated.');
    } else {
      const { data, error } =
        await supabase
          .from('customers')
          .insert({
            ...payload,
            is_blocked: false,
          })
          .select()
          .single();

      if (error) {
        setSavingManualCustomer(false);
        setNotice(error.message);
        return;
      }

      setManualCustomers(old => [
        data as ManualCustomer,
        ...old,
      ]);

      setNotice(
        'New customer added successfully.'
      );
    }

    setSavingManualCustomer(false);
    setShowAddCustomer(false);
    setEditingManualCustomer(null);
    setManualCustomerForm(
      blankManualCustomer
    );

    await loadManualCustomers();
  };

  const deleteManualCustomer = async (
    customer: ManualCustomer
  ) => {
    const fullName =
      `${customer.first_name} ${
        customer.last_name || ''
      }`.trim();

    const confirmed = window.confirm(
      `Delete ${fullName || 'this customer'} permanently?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setManualCustomers(old =>
      old.filter(
        item => item.id !== customer.id
      )
    );

    setViewingManualCustomer(null);
    setEditingManualCustomer(null);
    setShowAddCustomer(false);

    setNotice('Customer deleted.');
  };

  const toggleManualCustomerBlock =
    async (
      customer: ManualCustomer
    ) => {
      const nextBlocked =
        !customer.is_blocked;

      const { error } = await supabase
        .from('customers')
        .update({
          is_blocked: nextBlocked,
        })
        .eq('id', customer.id);

      if (error) {
        setNotice(error.message);
        return;
      }

      const updated = {
        ...customer,
        is_blocked: nextBlocked,
      };

      setManualCustomers(old =>
        old.map(item =>
          item.id === customer.id
            ? updated
            : item
        )
      );

      setViewingManualCustomer(updated);

      setNotice(
        nextBlocked
          ? 'Customer blocked.'
          : 'Customer unblocked.'
      );
    };

  /*
   * ======================================================
   * DASHBOARD CALCULATIONS
   * ======================================================
   */

  const bookingCustomers = useMemo(() => {
    const ids = new Set(
      bookings.map(b => b.customer_id)
    );

    return customers.filter(customer =>
      ids.has(customer.id)
    );
  }, [bookings, customers]);

  const totalCustomers =
    bookingCustomers.length +
    manualCustomers.length;

  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const visibleBookingCustomers = bookingCustomers.filter(customer =>
    !normalizedCustomerSearch ||
    `${customer.full_name || ''} ${customer.phone || ''}`
      .toLowerCase()
      .includes(normalizedCustomerSearch)
  );
  const visibleManualCustomers = manualCustomers.filter(customer =>
    !normalizedCustomerSearch ||
    `${customer.first_name || ''} ${customer.last_name || ''} ${customer.phone || ''} ${customer.email || ''}`
      .toLowerCase()
      .includes(normalizedCustomerSearch)
  );

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const todayAtSchedule = localDateKey(now);
      const nextMidnight = new Date(now);

      nextMidnight.setHours(24, 0, 0, 0);

      midnightTimer = setTimeout(() => {
        const newToday = localDateKey();

        setOverviewDate(current =>
          current === todayAtSchedule ? newToday : current
        );
        setBookingsDate(current => current === todayAtSchedule ? newToday : current);
        setLiveOperationsDate(current => current === todayAtSchedule ? newToday : current);
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 100);
    };

    scheduleMidnightRefresh();

    return () => clearTimeout(midnightTimer);
  }, []);

  const visibleBookings = useMemo(
    () => bookings
      .filter(booking =>
        localDateKey(new Date(booking.scheduled_at)) === bookingsDate &&
        (filter === 'all' || booking.status === filter)
      )
      .sort((a, b) => {
        const aIsNew = a.status === 'received';
        const bIsNew = b.status === 'received';
        if (aIsNew !== bIsNew) return Number(bIsNew) - Number(aIsNew);
        if (aIsNew && bIsNew) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      }),
    [bookings, bookingsDate, filter]
  );

  /*
   * Completed revenue uses amount_paid.
   * quoted_price is used as fallback for
   * old completed bookings.
   */

  const overviewBookings = useMemo(
    () =>
      bookings.filter(
        booking => localDateKey(new Date(booking.scheduled_at)) === overviewDate
      ),
    [bookings, overviewDate]
  );

  const upcomingBookings = useMemo(() => {
    const start = new Date(`${overviewDate}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    return bookings
      .filter(booking => {
        const scheduled = new Date(booking.scheduled_at);
        return (
          scheduled >= start &&
          scheduled < end &&
          !['completed', 'cancelled', 'rejected'].includes(booking.status)
        );
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [bookings, overviewDate]);

  const activeBookingCount = bookings.filter(booking =>
    ['received', 'confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(
      booking.status
    )
  ).length;
  const liveSharingCount = bookingLocationShares.filter(
    share => share.enabled
  ).length;
  const weatherNow = weather
    ? weatherDetails(weather.current.weather_code, weather.current.is_day === 1)
    : null;

  const income = overviewBookings
    .filter(
      b => b.status === 'completed'
    )
    .reduce((sum, b) => {
      const paid = Number(
        b.amount_paid
      );

      const revenue =
        Number.isFinite(paid) &&
        paid > 0
          ? paid
          : Number(
              b.quoted_price
            ) || 0;

      return sum + revenue;
    }, 0);

  const cards = [
    [
       'Appointments',
       overviewBookings.length,
    ],

    [
      'Upcoming',
       overviewBookings.filter(b =>
        [
          'received',
          'confirmed',
          'on_the_way',
          'arrived',
          'in_progress',
        ].includes(b.status)
      ).length,
    ],

    [
      'Completed',
       overviewBookings.filter(
        b =>
          b.status === 'completed'
      ).length,
    ],

    ['Income', money(income)],
  ];

  const pageHero = {
    overview: { eyebrow: 'BUSINESS PULSE', title: 'Business overview', copy: 'Today’s appointments, income and operations at a glance.', icon: '◈', stat: `${overviewBookings.length} today`, tone: 'gold' },
    bookings: { eyebrow: 'APPOINTMENT DESK', title: 'Bookings', copy: 'Review new requests, confirm schedules and keep every client informed.', icon: '▤', stat: `${visibleBookings.length} selected`, tone: 'blue' },
    services: { eyebrow: 'SERVICE MENU', title: 'Services & pricing', copy: 'Maintain your service catalogue, prices and appointment durations.', icon: '✦', stat: `${services.length} services`, tone: 'violet' },
    customers: { eyebrow: 'CLIENT DIRECTORY', title: 'Customers', copy: 'Keep client details, booking history and service relationships organised.', icon: '◎', stat: `${totalCustomers} clients`, tone: 'teal' },
    gallery: { eyebrow: 'BRAND GALLERY', title: 'Gallery', copy: 'Curate the visuals that show clients the SARJ experience.', icon: '▧', stat: `${gallery.length} items`, tone: 'rose' },
    promotions: { eyebrow: 'GROWTH TOOLS', title: 'Promotions', copy: 'Create offers and keep your active campaigns performing.', icon: '✧', stat: `${promotions.filter(promo => promo.is_active).length} active`, tone: 'orange' },
    appointments: { eyebrow: 'CALENDAR CONTROL', title: 'Appointments', copy: 'Manage booking availability and upcoming service time slots.', icon: '◷', stat: `${bookings.length} total`, tone: 'blue' },
    reports: { eyebrow: 'BUSINESS INTELLIGENCE', title: 'Reports', copy: 'Turn your appointments and payments into clear operating insight.', icon: '▥', stat: `${bookings.length} records`, tone: 'violet' },
    walkins: { eyebrow: 'WALK-IN DESK', title: 'Walk-ins', copy: 'Capture in-person clients and turn every visit into a relationship.', icon: '＋', stat: `${manualCustomers.length} records`, tone: 'teal' },
    'manual-sales': { eyebrow: 'COUNTER SALES', title: 'Manual service entry', copy: 'Record a customer, service and price for every in-person sale.', icon: '▣', stat: `${services.filter(service => service.is_active).length} services ready`, tone: 'orange' },
    settings: { eyebrow: 'BUSINESS CONTROL', title: 'Business settings', copy: 'Keep your public business details and operating preferences accurate.', icon: '⚙', stat: business?.business_name || 'SARJ', tone: 'gold' },
  }[tab === 'live-operations' ? 'overview' : tab];

  /*
   * ======================================================
   * AUTH LOADING
   * ======================================================
   */

  if (authLoading) {
    return (
      <main className="gate">
        <p>Checking secure access…</p>
      </main>
    );
  }

  /*
   * ======================================================
   * LOGIN
   * ======================================================
   */

  if (!authorized) {
    return (
      <main className="gate">
        <form
          className="login"
          onSubmit={signIn}
        >
          <p className="overline">
            SARJ BLENDED IT
          </p>

          <h1>Admin access</h1>

          <p>
            Sign in with the owner account to
            manage your mobile barber business.
          </p>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={e =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={e =>
                setPassword(e.target.value)
              }
              placeholder="Your password"
              required
            />
          </label>

          {notice && (
            <p className="error">
              {notice}
            </p>
          )}

          <button disabled={signingIn}>
            {signingIn
              ? 'Signing in…'
              : 'Sign in'}
          </button>

          <a className="forgot" href="/reset-password">
            Forgot your password?
          </a>

          <small>
            Your Supabase profile must have the{' '}
            <b>admin</b> role.
          </small>
        </form>
      </main>
    );
  }

  /*
   * ======================================================
   * ADMIN UI
   * ======================================================
   */

  return (
    <main className="adminFrame">
      <aside>
        <div className="sidebarBrandRow">
          <span className="sidebarBrandMark">✂</span>
          <p className="brand"><strong>SARJ</strong><span>BLENDED IT</span></p>
        </div>

        <p className="tag">
          MOBILE BARBER ADMIN
        </p>

        <nav>
          <button
            className={
              tab === 'overview'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('overview')
            }
          >
            <span className="sidebarIcon">◈</span><span>Overview</span>
          </button>

          <button
  className={
    tab === 'live-operations'
      ? 'active'
      : ''
  }
  onClick={() =>
    setTab('live-operations')
  }
>
  <span className="sidebarIcon">◉</span><span>Live Operations</span>
  <i>
    {
      bookings.filter(
        booking =>
          [
            'received',
            'confirmed',
            'on_the_way',
            'arrived',
            'in_progress',
          ].includes(booking.status)
      ).length
    }
  </i>
</button>

          <button
            className={
              tab === 'bookings'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('bookings')
            }
          >
            <span className="sidebarIcon">▤</span><span>Bookings</span> <i>{bookings.length}</i>
          </button>

          <button
            className={
              tab === 'services'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('services')
            }
          >
            <span className="sidebarIcon">✦</span><span>Services & pricing</span>
          </button>

          <button
            className={
              tab === 'customers'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('customers')
            }
          >
            <span className="sidebarIcon">◎</span><span>Customers</span>{' '}
            <i>{totalCustomers}</i>
          </button>

          <button
            className={
              tab === 'gallery'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('gallery')
            }
          >
            <span className="sidebarIcon">▧</span><span>Gallery</span>
          </button>

          <button
            className={
              tab === 'promotions'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('promotions')
            }
          >
            <span className="sidebarIcon">✧</span><span>Promotions</span>
          </button>

          <button
            className={
              tab === 'appointments'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('appointments')
            }
          >
            <span className="sidebarIcon">◷</span><span>Appointments</span>
          </button>

          <button
            className={
              tab === 'reports'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('reports')
            }
          >
            <span className="sidebarIcon">▥</span><span>Reports</span>
          </button>

          <button
            className={
              tab === 'walkins'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('walkins')
            }
          >
            <span className="sidebarIcon">＋</span><span>Walk-ins</span>
          </button>

          <button
            className={tab === 'manual-sales' ? 'active' : ''}
            onClick={() => setTab('manual-sales')}
          >
            <span className="sidebarIcon">▣</span><span>Manual sales</span>
          </button>

          <button
            className={
              tab === 'settings'
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab('settings')
            }
          >
            <span className="sidebarIcon">⚙</span><span>Settings</span>
          </button>
        </nav>

        <div className="sidebarBottom">
          <div className="sidebarFoot"><span className="sidebarOnlineDot" />LIVE SYSTEMS<br />SARJ ADMIN CONSOLE</div>
          <button className="signout" onClick={() => supabase.auth.signOut()}>
            <span className="sidebarIcon">↪</span> Sign out
          </button>
        </div>
      </aside>

      <section className="content">
        <div className="adminHeader">
          <div className="headerIdentity">
            <div className="headerLogo">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt=""
                />
              ) : (
                'S'
              )}
            </div>

            <div>
              <div className="headerName">
                {business?.business_name ??
                  'SARJ BLENDED IT'}
              </div>

              <div className="headerTagline">
                {business?.tagline ??
                  'Mobile barber operations'}
              </div>
            </div>
          </div>

          <div className="headerActions">
            <button
              className="headerAction"
              onClick={() =>
                setTab('bookings')
              }
            >
              <span className="headerActionIcon">◉</span><span>New requests</span>
              <i className="badge">
                {
                  bookings.filter(
                    b =>
                      b.status ===
                      'received'
                  ).length
                }
              </i>
            </button>

            <button
              className="headerAction"
              onClick={() =>
                setTab('settings')
              }
            >
              <span className="headerActionIcon">⚙</span><span>Settings</span>
            </button>

            <button
              type="button"
              className="adminProfileButton"
              onClick={() =>
                setTab('settings')
              }
              title="Open administrator profile"
              aria-label={`Open ${
                adminName ||
                'Administrator'
              } profile`}
            >
              <span className="adminProfileAvatar">
                {adminAvatarUrl ? (
                  <img
                    src={adminAvatarUrl}
                    alt=""
                  />
                ) : (
                  <span className="adminProfileAvatarFallback">
                    {(
                      adminName ||
                      'A'
                    )
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
              </span>

              <span className="adminProfileInfo">
                <strong>
                  {adminName ||
                    'Administrator'}
                </strong>
              </span>
            </button>
          </div>
        </div>

        <header className={tab === 'live-operations' ? 'liveOperationsPageTitle' : `adminPageHero heroTone-${pageHero.tone}`}>
          <div className="adminPageHeroCopy">
            <span className="adminPageHeroIcon" aria-hidden="true">{pageHero.icon}</span>
            <div>
              <p className="overline">{pageHero.eyebrow}</p>
              <h1>{pageHero.title}</h1>
              <p>{pageHero.copy}</p>
            </div>
          </div>

          <div className="adminPageHeroActions">
            <div className="adminHeroStat"><strong>{pageHero.stat}</strong><span>LIVE SUMMARY</span></div>
            <div className="adminHeroSync"><i />{lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting…'}</div>
            <button onClick={load} className="refresh">↻ <span>Refresh</span></button>
          </div>
        </header>

        {notice && (
          <p className="notice">
            {notice}

            <button
              onClick={() =>
                setNotice('')
              }
            >
              ×
            </button>
          </p>
        )}

        {tab === 'appointments' && (
          <AppointmentsPanel />
        )}

        {tab === 'walkins' && (
          <WalkInsPanel />
        )}

        {tab === 'manual-sales' && (
          <ManualSalesPanel />
        )}

        {tab === 'reports' && (
          <ReportsPanel />
        )}

        {tab === 'live-operations' && (
          <LiveOperations
    bookings={bookings}
    bookingLocations={bookingLocations}
    bookingLocationShares={bookingLocationShares}
    loading={loading}
            onChange={changeStatus}
            onRefresh={load}
            date={liveOperationsDate}
            onDateChange={setLiveOperationsDate}
          />
        )}

        {tab === 'overview' && (
          <>
            <section className="overviewDateFilter" aria-label="Overview date filter">
              <label htmlFor="overview-date">Overview date</label>
              <input
                id="overview-date"
                type="date"
                value={overviewDate}
                onChange={event => setOverviewDate(event.target.value)}
              />
              <span>{formatOverviewDate(overviewDate)}</span>
            </section>

            <section className="overviewLiveGrid" aria-label="Live business information">
              <article className="overviewClockCard">
                <div>
                  <p className="overline">LUSAKA TIME</p>
                  <strong>
                    {currentTime
                      ? currentTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—'}
                  </strong>
                  <span>
                    {currentTime
                      ? currentTime.toLocaleDateString([], {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Loading local time…'}
                  </span>
                </div>
                <span className="liveClockDot" aria-hidden="true" />
              </article>

              <article className="overviewWeatherCard">
                <div className="weatherHeading">
                  <div>
                    <p className="overline">LIVE WEATHER</p>
                    <strong>Lusaka</strong>
                  </div>
                  <span className="weatherIcon" aria-hidden="true">
                    {weatherNow?.icon ?? '⛅'}
                  </span>
                </div>
                {weather && weatherNow ? (
                  <div className="weatherNow">
                    <strong>{Math.round(weather.current.temperature_2m)}°</strong>
                    <div>
                      <span>{weatherNow.label}</span>
                      <small>
                        Feels {Math.round(weather.current.apparent_temperature)}° · Wind{' '}
                        {Math.round(weather.current.wind_speed_10m)} km/h
                      </small>
                    </div>
                  </div>
                ) : (
                  <span className="weatherPending">
                    {weatherError ? 'Weather is temporarily unavailable.' : 'Loading conditions…'}
                  </span>
                )}
              </article>

              <article className="overviewPulseCard">
                <p className="overline">LIVE OPERATIONS</p>
                <div className="pulseStats">
                  <div>
                    <strong>{activeBookingCount}</strong>
                    <span>Active bookings</span>
                  </div>
                  <div>
                    <strong>{liveSharingCount}</strong>
                    <span>Location shares</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="forecastPanel" aria-label="Three day weather forecast">
              <div className="forecastHeading">
                <div>
                  <p className="overline">FORECAST</p>
                  <h2>Plan the days ahead</h2>
                </div>
                <span>Updated every 15 minutes</span>
              </div>
              <div className="forecastDays">
                {weather?.daily.time.map((day, index) => {
                  const details = weatherDetails(weather.daily.weather_code[index]);

                  return (
                    <div className="forecastDay" key={day}>
                      <strong>{index === 0 ? 'Today' : formatForecastDay(day)}</strong>
                      <span className="forecastIcon" aria-hidden="true">{details.icon}</span>
                      <span>{details.label}</span>
                      <small>
                        {Math.round(weather.daily.temperature_2m_max[index])}° /{' '}
                        {Math.round(weather.daily.temperature_2m_min[index])}°
                      </small>
                      <em>{weather.daily.precipitation_probability_max[index]}% rain</em>
                    </div>
                  );
                }) ?? (
                  <span className="forecastPending">
                    {weatherError ? 'Forecast is temporarily unavailable.' : 'Loading forecast…'}
                  </span>
                )}
              </div>
            </section>

            <div className="metrics">
              {cards.map(
                ([label, value], index) => (
                  <article
                    key={String(label)}
                    className={`metricCard metricCard--${index}`}
                  >
                    <small>
                      {label}
                    </small>

                    <strong>
                      {value}
                    </strong>
                  </article>
                )
              )}
            </div>

            <section className="upcomingReminderPanel" aria-label="Upcoming booking reminders">
              <div className="upcomingReminderHeader">
                <div>
                  <p className="overline">UPCOMING REMINDERS</p>
                  <h2>Next 3 days</h2>
                  <span>Appointments that need your attention from {formatOverviewDate(overviewDate)}.</span>
                </div>
                <button className="textButton" onClick={() => setTab('bookings')}>Open bookings</button>
              </div>

              {upcomingBookings.length ? (
                <div className="upcomingReminderList">
                  {upcomingBookings.map(booking => {
                    const scheduled = new Date(booking.scheduled_at);
                    const dayOffset = Math.round((new Date(localDateKey(scheduled) + 'T00:00:00').getTime() - new Date(overviewDate + 'T00:00:00').getTime()) / 86400000);
                    const reminder = dayOffset === 0 ? 'TODAY' : dayOffset === 1 ? 'TOMORROW' : scheduled.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
                    return (
                      <button className="upcomingReminder" key={booking.id} onClick={() => setTab('bookings')}>
                        <span className={'upcomingReminderDay day-' + dayOffset}>{reminder}</span>
                        <span className="upcomingReminderTime">{scheduled.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        <span className="upcomingReminderCustomer"><strong>{booking.profiles?.full_name || 'Customer'}</strong><small>{booking.services?.name || 'Service'}</small></span>
                        <span className={'status ' + booking.status}>{statusLabels[booking.status]}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="upcomingReminderEmpty">No upcoming active bookings in the next 3 days.</div>
              )}
            </section>

            <section className="panel">
              <div className="panelHead">
                <div>
                  <p className="overline">
                    NEXT UP
                  </p>

                  <h2>
                    Appointments for {formatOverviewDate(overviewDate)}
                  </h2>
                </div>

                <button
                  className="textButton"
                  onClick={() =>
                    setTab('bookings')
                  }
                >
                  View all
                </button>
              </div>

              <BookingRows
                bookings={overviewBookings
                  .filter(
                    b =>
                      ![
                        'completed',
                        'cancelled',
                        'rejected',
                      ].includes(
                        b.status
                      )
                  )
                  .slice(0, 5)}
                onChange={changeStatus}
                loading={loading}
              />
            </section>
          </>
        )}

        {tab === 'bookings' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="overline">
                  SCHEDULE
                </p>

                <h2>
                  All appointments
                </h2>
              </div>

              <div className="bookingFilters">
              <label className="inlineDateFilter">
                <span>Bookings date</span>
                <input type="date" value={bookingsDate} onChange={event => setBookingsDate(event.target.value)} />
              </label>
              <select
                value={filter}
                onChange={e =>
                  setFilter(
                    e.target.value as
                      | 'all'
                      | Status
                  )
                }
              >
                <option value="all">
                  All statuses
                </option>

                {statusOptions.map(
                  status => (
                    <option
                      value={status}
                      key={status}
                    >
                      {
                        statusLabels[
                          status
                        ]
                      }
                    </option>
                  )
                )}
              </select>
              </div>
            </div>

            {visibleBookings.filter(booking => booking.status === 'received').length > 0 && (
              <div className="newBookingsNotice">
                <span>NEW</span>
                {visibleBookings.filter(booking => booking.status === 'received').length} new booking{visibleBookings.filter(booking => booking.status === 'received').length === 1 ? '' : 's'} at the top of the list
              </div>
            )}

            <BookingRows
              bookings={visibleBookings}
              onChange={changeStatus}
              loading={loading}
            />
          </section>
        )}

        {tab === 'services' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="overline">
                  CUSTOMER MENU
                </p>

                <h2>Services</h2>
              </div>

              <button
                onClick={() =>
                  setEditing({
                    id:
                      'new-' +
                      Date.now(),
                    name: '',
                    description: '',
                    base_price: 150,
                    duration_minutes: 45,
                    is_active: true,
                    sort_order:
                      services.length + 1,
                  })
                }
              >
                + Add service
              </button>
            </div>

            {editing && (
              <form
                className="serviceForm"
                onSubmit={saveService}
              >
                <label>
                  Service name

                  <input
                    value={editing.name}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Price (ZMW)

                  <input
                    type="number"
                    min="0"
                    value={
                      editing.base_price
                    }
                    onChange={e =>
                      setEditing({
                        ...editing,
                        base_price:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Duration (minutes)

                  <input
                    type="number"
                    min="5"
                    value={
                      editing.duration_minutes ??
                      45
                    }
                    onChange={e =>
                      setEditing({
                        ...editing,
                        duration_minutes:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                  />
                </label>

                <label className="wide">
                  Description

                  <input
                    value={
                      editing.description ??
                      ''
                    }
                    onChange={e =>
                      setEditing({
                        ...editing,
                        description:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={
                      editing.is_active
                    }
                    onChange={e =>
                      setEditing({
                        ...editing,
                        is_active:
                          e.target.checked,
                      })
                    }
                  />

                  Available to customers
                </label>

                <div>
                  <button>
                    Save service
                  </button>

                  <button
                    type="button"
                    className="cancel"
                    onClick={() =>
                      setEditing(null)
                    }
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="serviceTable">
              {services.map(
                service => (
                  <div
                    className="serviceRow"
                    key={service.id}
                  >
                    <div>
                      <b>
                        {service.name}
                      </b>

                      <p>
                        {service.description ||
                          '—'}{' '}
                        ·{' '}
                        {service.duration_minutes ||
                          45}{' '}
                        min
                      </p>
                    </div>

                    <strong>
                      {money(
                        service.base_price
                      )}
                    </strong>

                    <span
                      className={
                        service.is_active
                          ? 'live'
                          : 'offline'
                      }
                    >
                      {service.is_active
                        ? 'Live'
                        : 'Hidden'}
                    </span>

                    <button
                      className="textButton"
                      onClick={() =>
                        setEditing(
                          service
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="textButton"
                      onClick={() =>
                        toggleService(
                          service
                        )
                      }
                    >
                      {service.is_active
                        ? 'Hide'
                        : 'Publish'}
                    </button>

                    <button
                      className="textButton dangerButton"
                      onClick={() => deleteService(service)}
                    >
                      Delete
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {tab === 'customers' && (
          <section className="panel customerManagementPanel">
            <div className="panelHead">
              <div>
                <p className="overline">
                  CLIENT MANAGEMENT
                </p>

                <h2>Customers</h2>
              </div>

              <div
  className="customerHeaderActions"
  style={{ gap: '16px' }}
>
  <span>
    {totalCustomers} customers
  </span>

  <button
                  type="button"
                  onClick={() => {
                    setManualCustomerForm(
                      blankManualCustomer
                    );
                    setEditingManualCustomer(
                      null
                    );
                    setViewingManualCustomer(
                      null
                    );
                    setShowAddCustomer(
                      true
                    );
                  }}
                >
                  + Add New Customer
                </button>
              </div>
            </div>

            <div className="customerManagementTools">
              <input
                type="search"
                placeholder="Search customers by name or phone…"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
            </div>

            <div className="customerTable">
              <div className="customerTableHeader">
                <span>
                  Customer
                </span>
                <span>
                  Bookings
                </span>
                <span>
                  Completed
                </span>
                <span>
                  Status
                </span>
                <span>
                  Actions
                </span>
              </div>

              <div className="serviceTable">
                {visibleBookingCustomers.map(
                  customer => {
                    const history =
                      bookings.filter(
                        booking =>
                          booking.customer_id ===
                          customer.id
                      );

                    const completed =
                      history.filter(
                        booking =>
                          booking.status ===
                          'completed'
                      ).length;

                    const blocked =
                      customer.is_blocked;

                    return (
                      <div
                        className="customerManagementRow"
                        key={`profile-${customer.id}`}
                      >
                        <div className="customerManagementIdentity">
                          <div className="customerManagementAvatar">
                            {(
                              customer.full_name ||
                              'C'
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <b>
                              {customer.full_name ||
                                'Name not supplied'}
                            </b>

                            <p>
                              {customer.phone ||
                                'Phone not supplied'}
                              {' · '}
                              App customer
                              {' · '}
                              Joined{' '}
                              {new Date(
                                customer.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <strong>
                          {history.length}
                        </strong>

                        <strong>
                          {completed}
                        </strong>

                        <span
                          className={
                            blocked
                              ? 'offline'
                              : 'live'
                          }
                        >
                          {blocked
                            ? 'Blocked'
                            : 'Active'}
                        </span>

                        <div className="customerManagementActions">
                          <button
                            type="button"
                            className="textButton"
                            onClick={() =>
                              setViewingCustomer(
                                customer
                              )
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="textButton"
                            onClick={() =>
                              setEditingCustomer(
                                customer
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="textButton"
                            onClick={() =>
                              blockCustomer(
                                customer
                              )
                            }
                          >
                            {blocked
                              ? 'Unblock'
                              : 'Block'}
                          </button>

                          <button
                            type="button"
                            className="textButton dangerButton"
                            onClick={() =>
                              deleteCustomer(
                                customer
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}

                {visibleManualCustomers.map(
                  customer => {
                    const fullName =
                      `${customer.first_name} ${
                        customer.last_name ||
                        ''
                      }`.trim();

                    return (
                      <div
                        className="customerManagementRow"
                        key={`manual-${customer.id}`}
                      >
                        <div className="customerManagementIdentity">
                          <div className="customerManagementAvatar">
                            {(
                              customer.first_name ||
                              'C'
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <b>
                              {fullName ||
                                'Name not supplied'}
                            </b>

                            <p>
                              {customer.phone ||
                                'Phone not supplied'}
                              {' · '}
                              {customer.customer_type ===
                              'walk_in'
                                ? 'Walk-in'
                                : 'App customer'}
                              {' · '}
                              Added{' '}
                              {new Date(
                                customer.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <strong>0</strong>

                        <strong>0</strong>

                        <span
                          className={
                            customer.is_blocked
                              ? 'offline'
                              : 'live'
                          }
                        >
                          {customer.is_blocked
                            ? 'Blocked'
                            : 'Active'}
                        </span>

                        <div className="customerManagementActions">
                          <button
                            type="button"
                            className="textButton"
                            onClick={() =>
                              setViewingManualCustomer(
                                customer
                              )
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="textButton"
                            onClick={() => {
                              setManualCustomerForm(
                                {
                                  first_name:
                                    customer.first_name ||
                                    '',
                                  last_name:
                                    customer.last_name ||
                                    '',
                                  phone:
                                    customer.phone ||
                                    '',
                                  email:
                                    customer.email ||
                                    '',
                                  residence:
                                    customer.residence ||
                                    '',
                                  customer_type:
                                    customer.customer_type,
                                }
                              );

                              setEditingManualCustomer(
                                customer
                              );

                              setShowAddCustomer(
                                true
                              );
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="textButton"
                            onClick={() =>
                              toggleManualCustomerBlock(
                                customer
                              )
                            }
                          >
                            {customer.is_blocked
                              ? 'Unblock'
                              : 'Block'}
                          </button>

                          <button
                            type="button"
                            className="textButton dangerButton"
                            onClick={() =>
                              deleteManualCustomer(
                                customer
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}

                {!visibleBookingCustomers.length &&
                  !visibleManualCustomers.length &&
                  !loading && (
                    <p className="empty">
                      {normalizedCustomerSearch
                        ? 'No customers match that search.'
                        : 'No customers have been added yet.'}
                    </p>
                  )}
              </div>
            </div>
          </section>
        )}

        {showAddCustomer && (
          <div className="customerModal">
            <form
              className="customerEditor customerFullEditor"
              onSubmit={
                saveManualCustomer
              }
            >
              <button
                type="button"
                className="modalClose"
                onClick={() => {
                  setShowAddCustomer(
                    false
                  );
                  setEditingManualCustomer(
                    null
                  );
                  setManualCustomerForm(
                    blankManualCustomer
                  );
                }}
              >
                ×
              </button>

              <p className="overline">
                CLIENT MANAGEMENT
              </p>

              <h2>
                {editingManualCustomer
                  ? 'Edit customer'
                  : 'Add new customer'}
              </h2>

              <p className="customerEditorIntro">
                {editingManualCustomer
                  ? 'Update this customer’s information.'
                  : 'Add a walk-in or manually registered customer to your customer directory.'}
              </p>

              <div className="customerEditorGrid">
                <label>
                  First name
                  <input
                    value={
                      manualCustomerForm.first_name
                    }
                    onChange={e =>
                      setManualCustomerForm(
                        old => ({
                          ...old,
                          first_name:
                            e.target.value,
                        })
                      )
                    }
                    required
                    autoFocus
                  />
                </label>

                <label>
                  Last name
                  <input
                    value={
                      manualCustomerForm.last_name
                    }
                    onChange={e =>
                      setManualCustomerForm(
                        old => ({
                          ...old,
                          last_name:
                            e.target.value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Phone number
                  <input
                    type="tel"
                    value={
                      manualCustomerForm.phone
                    }
                    onChange={e =>
                      setManualCustomerForm(
                        old => ({
                          ...old,
                          phone:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="+260..."
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={
                      manualCustomerForm.email
                    }
                    onChange={e =>
                      setManualCustomerForm(
                        old => ({
                          ...old,
                          email:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="customer@example.com"
                  />
                </label>

                <label>
                  Residence
                  <input
                    value={
                      manualCustomerForm.residence
                    }
                    onChange={e =>
                      setManualCustomerForm(
                        old => ({
                          ...old,
                          residence:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="Area / neighbourhood"
                  />
                </label>

                <label>
                  Customer type
                  <select
                    value={
                      manualCustomerForm.customer_type
                    }
                    onChange={e =>
                      setManualCustomerForm(
                        old => ({
                          ...old,
                          customer_type:
                            e.target.value as
                              | 'app'
                              | 'walk_in',
                        })
                      )
                    }
                  >
                    <option value="walk_in">
                      Walk-in
                    </option>
                    <option value="app">
                      App customer
                    </option>
                  </select>
                </label>
              </div>

              <div className="customerEditorActions">
                <button
                  type="submit"
                  disabled={
                    savingManualCustomer
                  }
                >
                  {savingManualCustomer
                    ? 'Saving…'
                    : editingManualCustomer
                    ? 'Save customer'
                    : 'Add customer'}
                </button>

                <button
                  type="button"
                  className="cancel"
                  onClick={() => {
                    setShowAddCustomer(
                      false
                    );
                    setEditingManualCustomer(
                      null
                    );
                    setManualCustomerForm(
                      blankManualCustomer
                    );
                  }}
                >
                  Cancel
                </button>

                {editingManualCustomer && (
                  <button
                    type="button"
                    className="dangerButton customerDeleteButton"
                    onClick={() =>
                      deleteManualCustomer(
                        editingManualCustomer
                      )
                    }
                  >
                    Delete customer
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {viewingManualCustomer && (
          <div className="customerModal">
            <section className="customerEditor customerDetailsEditor">
              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setViewingManualCustomer(
                    null
                  )
                }
              >
                ×
              </button>

              <p className="overline">
                CUSTOMER PROFILE
              </p>

              <div className="customerDetailsTitle">
                <div className="customerDetailsAvatar">
                  {(
                    viewingManualCustomer.first_name ||
                    'C'
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>
                    {`${viewingManualCustomer.first_name} ${
                      viewingManualCustomer.last_name ||
                      ''
                    }`.trim() ||
                      'Name not supplied'}
                  </h2>

                  <span
                    className={
                      viewingManualCustomer.is_blocked
                        ? 'offline'
                        : 'live'
                    }
                  >
                    {viewingManualCustomer.is_blocked
                      ? 'Blocked'
                      : 'Active'}
                  </span>
                </div>
              </div>

              <div className="customerDetailsGrid">
                <div>
                  <small>
                    PHONE
                  </small>

                  <strong>
                    {viewingManualCustomer.phone ||
                      'Not supplied'}
                  </strong>
                </div>

                <div>
                  <small>
                    EMAIL
                  </small>

                  <strong>
                    {viewingManualCustomer.email ||
                      'Not supplied'}
                  </strong>
                </div>

                <div>
                  <small>
                    RESIDENCE
                  </small>

                  <strong>
                    {viewingManualCustomer.residence ||
                      'Not supplied'}
                  </strong>
                </div>

                <div>
                  <small>
                    CUSTOMER TYPE
                  </small>

                  <strong>
                    {viewingManualCustomer.customer_type ===
                    'walk_in'
                      ? 'Walk-in'
                      : 'App customer'}
                  </strong>
                </div>

                <div>
                  <small>
                    ADDED
                  </small>

                  <strong>
                    {new Date(
                      viewingManualCustomer.created_at
                    ).toLocaleDateString()}
                  </strong>
                </div>

                <div>
                  <small>
                    TOTAL BOOKINGS
                  </small>

                  <strong>0</strong>
                </div>
              </div>

              <div className="customerHistory">
                <p className="overline">
                  BOOKING HISTORY
                </p>

                <p className="empty">
                  No booking history for this
                  manually added customer yet.
                </p>
              </div>

              <div className="customerEditorActions">
                <button
                  type="button"
                  onClick={() => {
                    setManualCustomerForm({
                      first_name:
                        viewingManualCustomer.first_name ||
                        '',
                      last_name:
                        viewingManualCustomer.last_name ||
                        '',
                      phone:
                        viewingManualCustomer.phone ||
                        '',
                      email:
                        viewingManualCustomer.email ||
                        '',
                      residence:
                        viewingManualCustomer.residence ||
                        '',
                      customer_type:
                        viewingManualCustomer.customer_type,
                    });

                    setEditingManualCustomer(
                      viewingManualCustomer
                    );

                    setViewingManualCustomer(
                      null
                    );

                    setShowAddCustomer(
                      true
                    );
                  }}
                >
                  Edit customer
                </button>

                <button
                  type="button"
                  className="cancel"
                  onClick={() =>
                    toggleManualCustomerBlock(
                      viewingManualCustomer
                    )
                  }
                >
                  {viewingManualCustomer.is_blocked
                    ? 'Unblock customer'
                    : 'Block customer'}
                </button>

                <button
                  type="button"
                  className="dangerButton customerDeleteButton"
                  onClick={() =>
                    deleteManualCustomer(
                      viewingManualCustomer
                    )
                  }
                >
                  Delete customer
                </button>
              </div>
            </section>
          </div>
        )}

        {editingCustomer && (
          <div className="customerModal">
            <form
              className="customerEditor customerFullEditor"
              onSubmit={saveCustomer}
            >
              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setEditingCustomer(
                    null
                  )
                }
              >
                ×
              </button>

              <p className="overline">
                CUSTOMER MANAGEMENT
              </p>

              <h2>
                Edit customer
              </h2>

              <p className="customerEditorIntro">
                Update the customer's profile
                information.
              </p>

              <div className="customerEditorGrid">
                <label>
                  Full name

                  <input
                    value={
                      editingCustomer.full_name ??
                      ''
                    }
                    onChange={e =>
                      setEditingCustomer({
                        ...editingCustomer,
                        full_name:
                          e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Phone number

                  <input
                    type="tel"
                    value={
                      editingCustomer.phone ??
                      ''
                    }
                    onChange={e =>
                      setEditingCustomer({
                        ...editingCustomer,
                        phone:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Customer status

                  <select
                    value={
                      editingCustomer.is_blocked
                        ? 'blocked'
                        : 'customer'
                    }
                    onChange={e =>
                      setEditingCustomer({
                        ...editingCustomer,
                        is_blocked:
                          e.target.value ===
                          'blocked',
                      })
                    }
                  >
                    <option value="customer">
                      Active
                    </option>

                    <option value="blocked">
                      Blocked
                    </option>
                  </select>
                </label>

                <label>
                  Customer ID

                  <input
                    value={
                      editingCustomer.id
                    }
                    readOnly
                  />
                </label>

                <label className="customerEditorWide">
                  Joined

                  <input
                    value={new Date(
                      editingCustomer.created_at
                    ).toLocaleString()}
                    readOnly
                  />
                </label>
              </div>

              <div className="customerEditorActions">
                <button type="submit">
                  Save customer
                </button>

                <button
                  type="button"
                  className="cancel"
                  onClick={() =>
                    setEditingCustomer(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="dangerButton customerDeleteButton"
                  onClick={() =>
                    deleteCustomer(
                      editingCustomer
                    )
                  }
                >
                  Delete customer
                </button>
              </div>
            </form>
          </div>
        )}

        {viewingCustomer && (
          <div className="customerModal">
            <section className="customerEditor customerDetailsEditor">
              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setViewingCustomer(
                    null
                  )
                }
              >
                ×
              </button>

              <p className="overline">
                CUSTOMER PROFILE
              </p>

              <div className="customerDetailsTitle">
                <div className="customerDetailsAvatar">
                  {(
                    viewingCustomer.full_name ||
                    'C'
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>
                    {viewingCustomer.full_name ||
                      'Name not supplied'}
                  </h2>

                  <span
                    className={
                      viewingCustomer.is_blocked
                        ? 'offline'
                        : 'live'
                    }
                  >
                    {viewingCustomer.is_blocked
                      ? 'Blocked'
                      : 'Active'}
                  </span>
                </div>
              </div>

              <div className="customerDetailsGrid">
                <div>
                  <small>
                    PHONE
                  </small>

                  <strong>
                    {viewingCustomer.phone ||
                      'Not supplied'}
                  </strong>
                </div>

                <div>
                  <small>
                    JOINED
                  </small>

                  <strong>
                    {new Date(
                      viewingCustomer.created_at
                    ).toLocaleDateString()}
                  </strong>
                </div>

                <div>
                  <small>
                    TOTAL BOOKINGS
                  </small>

                  <strong>
                    {
                      bookings.filter(
                        booking =>
                          booking.customer_id ===
                          viewingCustomer.id
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <small>
                    COMPLETED
                  </small>

                  <strong>
                    {
                      bookings.filter(
                        booking =>
                          booking.customer_id ===
                            viewingCustomer.id &&
                          booking.status ===
                            'completed'
                      ).length
                    }
                  </strong>
                </div>
              </div>

              <div className="customerHistory">
                <p className="overline">
                  BOOKING HISTORY
                </p>

                {bookings
                  .filter(
                    booking =>
                      booking.customer_id ===
                      viewingCustomer.id
                  )
                  .map(booking => (
                    <div
                      className="customerHistoryRow"
                      key={booking.id}
                    >
                      <div>
                        <b>
                          {booking.services
                            ?.name ||
                            'Service'}
                        </b>

                        <p>
                          {new Date(
                            booking.scheduled_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <strong>
                        {money(
                          booking.quoted_price
                        )}
                      </strong>

                      <span
                        className={
                          booking.status ===
                          'completed'
                            ? 'live'
                            : booking.status ===
                                'cancelled' ||
                              booking.status ===
                                'rejected'
                            ? 'offline'
                            : 'status'
                        }
                      >
                        {booking.status.replaceAll(
                          '_',
                          ' '
                        )}
                      </span>
                    </div>
                  ))}

                {!bookings.some(
                  booking =>
                    booking.customer_id ===
                    viewingCustomer.id
                ) && (
                  <p className="empty">
                    No booking history.
                  </p>
                )}
              </div>

              <div className="customerEditorActions">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomer(
                      viewingCustomer
                    );
                    setViewingCustomer(
                      null
                    );
                  }}
                >
                  Edit customer
                </button>

                <button
                  type="button"
                  className="cancel"
                  onClick={() =>
                    blockCustomer(
                      viewingCustomer
                    )
                  }
                >
                  {viewingCustomer.is_blocked
                    ? 'Unblock customer'
                    : 'Block customer'}
                </button>

                <button
                  type="button"
                  className="dangerButton customerDeleteButton"
                  onClick={() =>
                    deleteCustomer(
                      viewingCustomer
                    )
                  }
                >
                  Delete customer
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === 'gallery' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="overline">
                  SHOWCASE
                </p>

                <h2>Gallery</h2>
              </div>
            </div>

            <form
              className="serviceForm galleryForm"
              onSubmit={addGallery}
            >
              <div className="galleryFormIntro wide">
                <span className="galleryFormIcon">↑</span>
                <div><p className="overline">ADD TO GALLERY</p><h3>Upload a new showcase item</h3><small>Choose a photo or video, give it a clear title, then publish it to the customer app.</small></div>
              </div>
              <label>
                Title

                <input
                  value={
                    newGallery.title
                  }
                  onChange={e =>
                    setNewGallery({
                      ...newGallery,
                      title:
                        e.target.value,
                    })
                  }
                  placeholder="Skin fade transformation"
                />
              </label>

              <label>
                Media type

                <select
                  value={
                    newGallery.media_type
                  }
                  onChange={e =>
                    setNewGallery({
                      ...newGallery,
                      media_type:
                        e.target.value,
                      media_url: '',
                    })
                  }
                >
                  <option value="image">
                    Image
                  </option>

                  <option value="video">
                    Video
                  </option>
                </select>
              </label>

              <label>
                Category

                <input
                  value={
                    newGallery.category
                  }
                  onChange={e =>
                    setNewGallery({
                      ...newGallery,
                      category:
                        e.target.value,
                    })
                  }
                  placeholder="Before & after"
                />
              </label>

              <label className="wide">
                Media file

                <div className="galleryFilePicker">
                  <input
                    className="galleryFileInput"
                    type="file"
                    accept={
                      newGallery.media_type ===
                      'image'
                        ? 'image/png,image/jpeg,image/webp,image/gif'
                        : 'video/mp4,video/webm,video/quicktime'
                    }
                    onChange={
                      uploadGalleryFile
                    }
                    disabled={
                      galleryUploading
                    }
                  />

                  <span className="galleryFileButton">
                    {galleryUploading
                      ? 'Uploading…'
                      : newGallery.media_url
                      ? 'Choose another file'
                      : 'Choose file'}
                  </span>

                  <span className="galleryFileName">
                    {newGallery.media_url
                      ? 'File ready to publish'
                      : 'No file selected'}
                  </span>
                </div>
              </label>

              <div className="wide gallerySubmit">
                <button
                  type="submit"
                  disabled={
                    galleryUploading ||
                    !newGallery.media_url
                  }
                >
                  Add gallery item
                </button>
              </div>
            </form>

            <div className="gallerySectionHeading">
              <div><p className="overline">PUBLISHED LIBRARY</p><h3>Your gallery items</h3></div>
              <span>{gallery.length} total items</span>
            </div>

            <div className="galleryFolder" aria-label="Posted gallery media">
              {gallery.length ? gallery.map(item => (
                <article
                  className="galleryFolderItem"
                  key={item.id}
                >
                  <a
                    className="galleryThumb"
                    href={item.media_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Preview ${item.title || 'gallery item'}`}
                  >
                    {item.media_type === 'image' ? (
                      <img src={item.media_url} alt={item.title || 'Gallery image'} />
                    ) : (
                      <video src={item.media_url} muted preload="metadata" />
                    )}
                    <span>{item.media_type === 'image' ? 'PHOTO' : 'VIDEO'}</span>
                  </a>

                  <div className="galleryFolderCopy">
                    <b>{item.title || 'Untitled item'}</b>
                    <p>{item.category || 'Uncategorised'}</p>
                  </div>

                  <span
                    className={
                      item.is_published
                        ? 'live'
                        : 'offline'
                    }
                  >
                    {item.is_published
                      ? 'Published'
                      : 'Hidden'}
                  </span>

                  <button className="textButton" onClick={() => toggleGallery(item)}>
                    {item.is_published ? 'Hide' : 'Publish'}
                  </button>
                </article>
              )) : <div className="galleryEmpty">Your published gallery is empty. Add a photo or video above to start showcasing your work.</div>}
            </div>
          </section>
        )}

        {tab === 'promotions' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="overline">
                  OFFERS
                </p>

                <h2>
                  Promotions
                </h2>
              </div>
            </div>

            <form
              className="serviceForm"
              onSubmit={addPromotion}
            >
              <label>
                Offer title

                <input
                  value={
                    newPromo.title
                  }
                  onChange={e =>
                    setNewPromo({
                      ...newPromo,
                      title:
                        e.target.value,
                    })
                  }
                  required
                  placeholder="Weekend fresh-cut offer"
                />
              </label>

              <label>
                Coupon code

                <input
                  value={
                    newPromo.code
                  }
                  onChange={e =>
                    setNewPromo({
                      ...newPromo,
                      code:
                        e.target.value,
                    })
                  }
                  placeholder="SARJ10"
                />
              </label>

              <label>
                Discount %

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    newPromo.discount_percent
                  }
                  onChange={e =>
                    setNewPromo({
                      ...newPromo,
                      discount_percent:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label className="wide">
                Description

                <input
                  value={
                    newPromo.description
                  }
                  onChange={e =>
                    setNewPromo({
                      ...newPromo,
                      description:
                        e.target.value,
                    })
                  }
                />
              </label>

              <div>
                <button>
                  Create promotion
                </button>
              </div>
            </form>

            <div className="serviceTable">
              {promotions.map(item => (
                <div
                  className="serviceRow"
                  key={item.id}
                >
                  <div>
                    <b>
                      {item.title}
                    </b>

                    <p>
                      {item.description ||
                        '—'}{' '}
                      {item.code
                        ? '· ' +
                          item.code
                        : ''}
                    </p>
                  </div>

                  <strong>
                    {item.discount_percent
                      ? item.discount_percent +
                        '%'
                      : '—'}
                  </strong>

                  <span
                    className={
                      item.is_active
                        ? 'live'
                        : 'offline'
                    }
                  >
                    {item.is_active
                      ? 'Active'
                      : 'Paused'}
                  </span>

                  <button
                    className="textButton"
                    onClick={() =>
                      togglePromotion(
                        item
                      )
                    }
                  >
                    {item.is_active
                      ? 'Pause'
                      : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'settings' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="overline">
                  BRAND & ADMIN SETTINGS
                </p>

                <h2>
                  Business profile
                </h2>
              </div>
            </div>

            {business ? (
              <>
                <div className="settingsSectionHeading">
                  <span className="settingsSectionIcon">▣</span>
                  <div><p className="overline">PUBLIC BUSINESS PROFILE</p><h3>What customers see</h3><small>Business name, contact details and your brand logo.</small></div>
                </div>
                <form
                  className="settingsGrid"
                  onSubmit={saveBusiness}
                >
                  <label>
                    Business name

                    <input
                      value={
                        business.business_name ??
                        ''
                      }
                      onChange={e =>
                        setBusiness({
                          ...business,
                          business_name:
                            e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Business tagline

                    <input
                      value={
                        business.tagline ??
                        ''
                      }
                      onChange={e =>
                        setBusiness({
                          ...business,
                          tagline:
                            e.target.value,
                        })
                      }
                      placeholder="Mobile barber operations"
                    />
                  </label>

                  <label>
                    Contact phone

                    <input
                      type="tel"
                      value={
                        business.contact_phone ??
                        ''
                      }
                      onChange={e =>
                        setBusiness({
                          ...business,
                          contact_phone:
                            e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Contact email

                    <input
                      type="email"
                      value={
                        business.contact_email ??
                        ''
                      }
                      onChange={e =>
                        setBusiness({
                          ...business,
                          contact_email:
                            e.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="settingsWide">
                    <LogoUpload
                      onUploaded={url =>
                        setBusiness(
                          prev =>
                            prev
                              ? {
                                  ...prev,
                                  logo_url:
                                    url,
                                }
                              : prev
                        )
                      }
                    />
                  </div>

                  {business.logo_url && (
                    <div className="settingsPreview">
                      <img
                        src={
                          business.logo_url
                        }
                        alt="Business logo"
                        className="businessLogoPreview"
                      />
                    </div>
                  )}

                  <div className="settingsWide">
                    <button type="submit">
                      Save business settings
                    </button>
                  </div>
                </form>

                <div className="settingsSectionHeading settingsAdminHeading">
                  <span className="settingsSectionIcon">◎</span>
                  <div><p className="overline">ADMINISTRATOR PROFILE</p><h3>Your account identity</h3><small>Update the profile shown in the admin header.</small></div>
                </div>
                <form
                  className="settingsGrid"
                  onSubmit={
                    saveAdminProfile
                  }
                >
                  <label>
                    Admin display name

                    <input
                      value={
                        adminName
                      }
                      onChange={e =>
                        setAdminName(
                          e.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Phone number

                    <input
                      type="tel"
                      value={
                        adminPhone
                      }
                      onChange={e =>
                        setAdminPhone(
                          e.target.value
                        )
                      }
                      placeholder="+260..."
                    />
                  </label>

                  <label>
                    Email

                    <input
                      type="email"
                      value={
                        adminEmail
                      }
                      readOnly
                    />
                  </label>

                  <div className="settingsWide">
                    <ProfileUpload
                      currentUrl={
                        adminAvatarUrl
                      }
                      onUploaded={url =>
                        setAdminAvatarUrl(
                          url
                        )
                      }
                    />
                  </div>

                  <div className="settingsPreview adminProfilePreview">
                    <div className="adminAvatarLarge">
                      {adminAvatarUrl ? (
                        <img
                          src={
                            adminAvatarUrl
                          }
                          alt={
                            adminName ||
                            'Administrator'
                          }
                        />
                      ) : (
                        adminName
                          .slice(
                            0,
                            1
                          )
                          .toUpperCase()
                      )}
                    </div>

                    <div>
                      <strong>
                        {adminName}
                      </strong>

                      <span>
                        {adminPhone ||
                          'Phone not supplied'}
                      </span>

                      <span>
                        {adminLastLogin
                          ? `Last login ${new Date(
                              adminLastLogin
                            ).toLocaleString()}`
                          : 'Login time unavailable'}
                      </span>
                    </div>
                  </div>

                  <div className="settingsWide">
                    <button type="submit">
                      Save admin profile
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <p className="empty">
                Run the business settings
                migration, then refresh.
              </p>
            )}
          </section>
        )}

        {paymentModal && (
  <div
    className="paymentModalOverlay"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setPaymentModal(null);
      }
    }}
  >
    <div
      className="paymentModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="paymentModalTop">
        <div className="paymentModalEyebrow">
          <span className="paymentCardIcon">▣</span>
          <span>PAYMENT REQUIRED</span>
        </div>

        <button
          type="button"
          className="paymentModalClose"
          onClick={() => setPaymentModal(null)}
          aria-label="Close payment modal"
        >
          ×
        </button>
      </div>

      <h2 id="payment-modal-title">
        Complete this appointment?
      </h2>

      <p className="paymentModalDescription">
        Confirm that the customer has paid before marking this appointment
        as completed.
      </p>

      <div className="paymentSummary">
        <div className="paymentSummaryRow">
          <div className="paymentCustomerBlock">
            <div className="paymentCustomerAvatar">
              {(
                paymentModal.booking.profiles?.full_name ||
                'Customer'
              )
                .split(' ')
                .map(part => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <span className="paymentSummaryLabel">
                CUSTOMER
              </span>

              <strong>
                {paymentModal.booking.profiles?.full_name ||
                  'Customer'}
              </strong>
            </div>
          </div>

          <div className="paymentSummaryItem">
            <span className="paymentSummaryLabel">
              SERVICE
            </span>

            <strong>
              {paymentModal.booking.services?.name ||
                'Service'}
            </strong>
          </div>
        </div>

        <div className="paymentSummaryDivider" />

        <div className="paymentSummaryRow">
          <div className="paymentSummaryItem paymentAmountBlock">
            <span className="paymentSummaryIcon">
              ◉
            </span>

            <div>
              <span className="paymentSummaryLabel">
                AMOUNT DUE
              </span>

              <strong className="paymentDueAmount">
                K
                {Number(
                  paymentModal.booking.quoted_price ?? 0
                ).toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="paymentSummaryItem paymentStatusBlock">
            <span className="paymentSummaryIcon">
              ◷
            </span>

            <div>
              <span className="paymentSummaryLabel">
                CURRENT STATUS
              </span>

              <span className="paymentPendingBadge">
                {paymentModal.booking.payment_status ||
                  'pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="paymentDetailsTitle">
        PAYMENT DETAILS
      </div>

         <div className="paymentFields">
  <div className="paymentField">
    <label>Amount required</label>

    <div className="paymentInput locked">
      <input
        type="text"
        value={`K${Number(
          paymentModal.booking.quoted_price ?? 0
        ).toLocaleString()}`}
        readOnly
      />

      <span className="paymentInputIcon">
        🔒
      </span>
    </div>
  </div>

  <div className="paymentField">
    <label>Amount paid</label>

    <div className="paymentInput">
      <input
        type="number"
        min="0"
        value={paymentModal.amountPaid}
        onChange={event =>
          setPaymentModal(current =>
            current
              ? {
                  ...current,
                  amountPaid: event.target.value,
                }
              : current
          )
        }
      />

      <span className="paymentSpinner">
        <span>⌃</span>
        <span>⌄</span>
      </span>
    </div>
  </div>

  <div className="paymentField">
    <label>Payment method</label>

    <div className="paymentSelect">
      <select
        value={paymentModal.paymentMethod}
        onChange={event =>
          setPaymentModal(current =>
            current
              ? {
                  ...current,
                  paymentMethod: event.target.value,
                }
              : current
          )
        }
      >
        <option value="cash">Cash</option>
        <option value="mobile_money">Mobile Money</option>
        <option value="card">Card</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="other">Other</option>
      </select>
    </div>
  </div>

  <div className="paymentField paymentStatusField">
    <label>Payment status</label>

    <div className="paymentSelect">
      <select
        value={paymentModal.paymentStatus}
        onChange={event =>
          setPaymentModal(current =>
            current
              ? {
                  ...current,
                  paymentStatus: event.target.value,
                }
              : current
          )
        }
      >
        <option value="paid">Paid</option>
        <option value="pending">Pending</option>
      </select>
    </div>
  </div>
</div>

      <div className="paymentModalActions">
        <button
          type="button"
          className="paymentCancelButton"
          onClick={() => setPaymentModal(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="paymentCompleteButton"
          onClick={async () => {
            const requiredAmount = Number(
              paymentModal.booking.quoted_price ?? 0
            );

            const amountPaid = Number(
              paymentModal.amountPaid || 0
            );

            if (amountPaid < requiredAmount) {
              alert(
                `The amount paid must be at least K${requiredAmount.toLocaleString()}.`
              );
              return;
            }

            const { error } = await supabase
              .from('bookings')
              .update({
                status: 'completed',
                amount_paid: amountPaid,
                payment_method:
                  paymentModal.paymentMethod,
                payment_status:
                  paymentModal.paymentStatus || 'paid',
              })
              .eq(
                'id',
                paymentModal.booking.id
              );

            if (error) {
              console.error(error);
              alert(error.message);
              return;
            }

            setPaymentModal(null);
            await load();
          }}
        >
          <span>✓</span>
          Mark as completed
        </button>
      </div>
    </div>
  </div>
)}
      

        <footer className="adminFooter">
          <span className="footerBrand">
            <i>✂</i>
            {business?.business_name ??
              'SARJ BLENDED IT'}{' '}
            <small>ADMIN OPERATIONS</small>
          </span>

          <span className="footerSync">
            <i />
            {lastSynced
              ? 'Last synced ' +
                lastSynced.toLocaleTimeString()
              : 'Not connected'}
          </span>
        </footer>
        <AdminChat />
      </section>
    </main>
  );
}

/*
 * ========================================================
 * BOOKING ROWS
 * ========================================================
 */

function BookingRows({
  bookings,
  onChange,
  loading,
}: {
  bookings: Booking[];
  onChange: (
    id: string,
    status: Status
  ) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="empty">
        Loading live data…
      </p>
    );
  }

  if (!bookings.length) {
    return (
      <p className="empty">
        No appointments in this view yet.
      </p>
    );
  }

  return (
    <div className="table">
      {bookings.map(b => {
        const paid =
          Number(b.amount_paid);

        const displayAmount =
          b.status === 'completed'
            ? Number.isFinite(paid) &&
              paid > 0
              ? paid
              : Number(
                  b.quoted_price
                ) || 0
            : Number(
                b.quoted_price
              ) || 0;

        return (
          <div
            className="row"
            key={b.id}
          >
            <div>
              <b>
                {b.profiles?.full_name ||
                  'Customer'}
                {b.status === 'received' && (
                  <span className="newBookingBadge">NEW</span>
                )}
              </b>

              <p>
                {new Date(
                  b.scheduled_at
                ).toLocaleString()}{' '}
                ·{' '}
                {b.services?.name ||
                  'Service'}
              </p>

              <p>
                {b.address}

                {b.profiles?.phone
                  ? ' · ' +
                    b.profiles.phone
                  : ''}
              </p>

              {b.notes && (
                <p className="note">
                  Note: {b.notes}
                </p>
              )}
            </div>

            <strong>
              {money(displayAmount)}
            </strong>

            <span
              className={
                'status ' + b.status
              }
            >
              {statusLabels[b.status]}
            </span>

            {b.status ===
              'completed' && (
              <small className="paymentStatus">
                Paid:{' '}
                {money(
                  b.amount_paid
                )}
              </small>
            )}

            <select
              value={b.status}
              onChange={e =>
                onChange(
                  b.id,
                  e.target.value as Status
                )
              }
            >
              {statusOptions.map(
                status => (
                  <option
                    value={status}
                    key={status}
                  >
                    {
                      statusLabels[
                        status
                      ]
                    }
                    
                  </option>
                )
              )}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function LiveOperations({
  bookings,
  bookingLocations,
  bookingLocationShares,
  loading,
  onChange,
  onRefresh,
  date,
  onDateChange,
}: {
  bookings: Booking[];
  bookingLocations: BookingLocation[];
  bookingLocationShares: BookingLocationShare[];
  loading: boolean;
  onChange: (id: string, status: Status) => void;
  onRefresh: () => void;
  date: string;
  onDateChange: (value: string) => void;
}) {
  const activeStatuses: Status[] = [
    'received',
    'confirmed',
    'on_the_way',
    'arrived',
    'in_progress',
  ];

  const selectedDateBookings = bookings.filter(
    booking => localDateKey(new Date(booking.scheduled_at)) === date
  );

  const activeBookings = selectedDateBookings
    .filter((booking) =>
      activeStatuses.includes(booking.status)
    )
    .sort(
      (a, b) => {
        const aIsNew = a.status === 'received';
        const bIsNew = b.status === 'received';
        if (aIsNew !== bIsNew) return Number(bIsNew) - Number(aIsNew);
        if (aIsNew && bIsNew) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      }
    );

  const selectedDateLabel = formatOverviewDate(date);

  const received = selectedDateBookings.filter(
    (booking) => booking.status === 'received'
  ).length;

  const travelling = selectedDateBookings.filter(
    (booking) => booking.status === 'on_the_way'
  ).length;

  const confirmed = selectedDateBookings.filter(
    (booking) => booking.status === 'confirmed'
  ).length;

  const [selectedBookingId, setSelectedBookingId] =
    useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] =
    useState<BookingLocation | null>(null);

  const [selectedShare, setSelectedShare] =
    useState<BookingLocationShare | null>(null);

  const getInitial = (
    name: string | null | undefined
  ) =>
    (name || 'C')
      .trim()
      .charAt(0)
      .toUpperCase();

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatDate = (value: string) => {
    const bookingDate = new Date(value);

    if (localDateKey(bookingDate) === date) {
      return 'Today';
    }

    return bookingDate.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
    });
  };

  const getLocationForBooking = (
    booking: Booking
  ) =>
    bookingLocations.find(
      (location) =>
        location.booking_id === booking.id
    ) ?? null;

  const getShareForBooking = (
    booking: Booking
  ) =>
    bookingLocationShares.find(
      (share) =>
        share.booking_id === booking.id
    ) ?? null;

  const selectBooking = (booking: Booking) => {
    setSelectedBookingId(booking.id);

    setSelectedLocation(
      getLocationForBooking(booking)
    );

    setSelectedShare(
      getShareForBooking(booking)
    );

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document
          .getElementById(
            'live-customer-details'
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      }, 80);
    });
  };

  useEffect(() => {
    if (!activeBookings.length) {
      setSelectedBookingId(null);
      setSelectedLocation(null);
      setSelectedShare(null);
      return;
    }

    const current =
      activeBookings.find(
        (booking) =>
          booking.id === selectedBookingId
      ) ?? activeBookings[0];

    setSelectedBookingId(current.id);

    setSelectedLocation(
      getLocationForBooking(current)
    );

    setSelectedShare(
      getShareForBooking(current)
    );
  }, [
    bookings,
    bookingLocations,
    bookingLocationShares,
  ]);

  const selectedBooking =
    activeBookings.find(
      (booking) =>
        booking.id === selectedBookingId
    ) ??
    activeBookings[0] ??
    null;

  const selectedLocationForBooking =
    selectedBooking
      ? getLocationForBooking(selectedBooking)
      : null;

  const selectedShareForBooking =
    selectedBooking
      ? getShareForBooking(selectedBooking)
      : null;

  const effectiveLocation =
    selectedLocation ??
    selectedLocationForBooking;

  const effectiveShare =
    selectedShare ??
    selectedShareForBooking;

  const hasLiveLocation =
    effectiveLocation !== null &&
    Number.isFinite(
      Number(effectiveLocation.latitude)
    ) &&
    Number.isFinite(
      Number(effectiveLocation.longitude)
    );

  const activeWithGps =
    activeBookings.filter((booking) => {
      const location =
        getLocationForBooking(booking);

      return (
        location !== null &&
        Number.isFinite(
          Number(location.latitude)
        ) &&
        Number.isFinite(
          Number(location.longitude)
        )
      );
    }).length;

  const sharingCount =
    activeBookings.filter((booking) => {
      const share =
        getShareForBooking(booking);

      return share?.enabled === true;
    }).length;

  const locationOffCount =
    activeBookings.length -
    sharingCount;

  const selectedCustomerName =
    selectedBooking?.profiles?.full_name ||
    'Customer';

  const selectedPhone =
    selectedBooking?.profiles?.phone ||
    'Phone not supplied';

  const selectedPrice =
    selectedBooking
      ? Number(
          selectedBooking.quoted_price ??
            selectedBooking.services?.base_price ??
            0
        ) || 0
      : 0;

  if (loading) {
    return (
      <section className="liveOperationsPage">
        <div className="liveOperationsLoading">
          <span className="liveLoadingSpinner" />

          <div>
            <strong>
              Connecting to live operations
            </strong>

            <p>
              Loading the latest appointments and
              customer activity.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="liveOperationsPage">
      {/* ================================================================
          HEADER
          ================================================================ */}

      <div className="liveOpsHeader">
        <div className="liveOpsHeaderCopy">
          <div className="liveOpsEyebrow">
            <span className="livePulseDot" />
            OPERATIONS CENTER
          </div>

          <h2>Live operations</h2>

          <p>
            {selectedDateLabel} · appointment tracking, customer locations and service progress.
          </p>
        </div>

        <div className="liveOpsHeaderActions">
          <label className="liveDateFilter">
            <span>Operations date</span>
            <input type="date" value={date} onChange={event => onDateChange(event.target.value)} />
          </label>
          <div className="liveHeroStat heroNew">
            <strong>{received}</strong>
            <span>NEW REQUESTS</span>
          </div>
          <div className="liveActiveBadge">
            <span className="livePulseDot" />
            <strong>
              {activeBookings.length}
            </strong>
            <span>ACTIVE</span>
          </div>

          <button
            type="button"
            className="liveOpsRefresh"
            onClick={onRefresh}
          >
            <span>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ================================================================
          METRICS
          ================================================================ */}

      <div className="liveOpsMetrics">
        <article className="liveOpsMetric liveOpsMetricAccent">
          <span>ACTIVE NOW</span>
          <strong>
            {activeBookings.length}
          </strong>
          <small>
            appointments requiring attention
          </small>
        </article>

        <article className="liveOpsMetric liveOpsMetricNew">
          <span>NEW REQUESTS</span>
          <strong>{received}</strong>
          <small>waiting for confirmation</small>
        </article>

        <article className="liveOpsMetric liveOpsMetricConfirmed">
          <span>CONFIRMED</span>
          <strong>{confirmed}</strong>
          <small>appointments ready to serve</small>
        </article>

        <article className="liveOpsMetric liveOpsMetricGps">
          <span>LIVE GPS</span>
          <strong>{activeWithGps}</strong>
          <small>
            customers transmitting location
          </small>
        </article>

        <article className="liveOpsMetric liveOpsMetricSharing">
          <span>LOCATION SHARING</span>
          <strong>{sharingCount}</strong>
          <small>
            customers sharing location
          </small>
        </article>

        <article className="liveOpsMetric liveOpsMetricOffline">
          <span>LOCATION OFF</span>
          <strong>{locationOffCount}</strong>
          <small>
            active customers offline
          </small>
        </article>
      </div>

      {/* ================================================================
          QUEUE + SIDE PANEL
          ================================================================ */}

      <div className="liveOpsMainGrid">
        <section className="liveOpsQueue">
          <div className="liveOpsSectionHeader">
            <div>
              <span className="liveOpsSectionKicker">
                ACTIVE QUEUE
              </span>

              <h3>Live appointments</h3>
            </div>

            <span className="liveOpsLiveLabel">
              <span className="livePulseDot" />
              LIVE
            </span>
          </div>

          {!activeBookings.length ? (
            <div className="liveOpsEmpty">
              <div className="liveOpsEmptyIcon">
                ✓
              </div>

              <strong>
                No active appointments
              </strong>

              <p>
                New bookings will appear here
                automatically.
              </p>
            </div>
          ) : (
            <div className="liveOpsAppointmentList">
              {activeBookings.map((booking) => {
                const customerName =
                  booking.profiles?.full_name ||
                  'Customer';

                const phone =
                  booking.profiles?.phone ||
                  'Phone not supplied';

                const price =
                  Number(
                    booking.quoted_price ??
                      booking.services?.base_price ??
                      0
                  ) || 0;

                const location =
                  getLocationForBooking(
                    booking
                  );

                const share =
                  getShareForBooking(
                    booking
                  );

                const gpsAvailable =
                  location !== null &&
                  Number.isFinite(
                    Number(location.latitude)
                  ) &&
                  Number.isFinite(
                    Number(location.longitude)
                  );

                const isSelected =
                  booking.id ===
                  selectedBookingId;

                const locationState = gpsAvailable
                  ? 'GPS LIVE'
                  : share?.enabled
                  ? 'WAITING FOR GPS'
                  : 'LOCATION OFF';

                return (
                  <article
                    className={
                      'liveOpsAppointment' +
                      (isSelected
                        ? ' isSelected'
                        : '')
                    }
                    key={booking.id}
                  >
                    {/* TIME */}

                    <div className="liveOpsTime">
                      <strong>
                        {formatTime(
                          booking.scheduled_at
                        )}
                      </strong>

                      <span>
                        {formatDate(
                          booking.scheduled_at
                        )}
                      </span>
                    </div>

                    {/* CUSTOMER */}

                    <div className="liveOpsCustomer">
                      <div className="liveOpsAvatar">
                        {getInitial(
                          customerName
                        )}
                      </div>

                      <div className="liveOpsCustomerText">
                        <strong>
                          {customerName}
                        </strong>

                        {booking.status === 'received' && (
                          <span className="liveNewBookingBadge">NEW BOOKING</span>
                        )}

                        <span>
                          {booking.services?.name ||
                            'Service'}
                        </span>

                        <small>
                          ☎ {phone}
                        </small>
                      </div>
                    </div>

                    {/* LOCATION */}

                    <div className="liveOpsLocation">
                      <span className="liveOpsColumnLabel">
                        LOCATION
                      </span>

                      <strong>
                        {booking.address ||
                          'Address not supplied'}
                      </strong>

                      {booking.notes && (
                        <small>
                          {booking.notes}
                        </small>
                      )}

                      <span
                        className={
                          'liveOpsGps ' +
                          (gpsAvailable
                            ? 'gpsActive'
                            : share?.enabled
                            ? 'gpsWaiting'
                            : 'gpsOff')
                        }
                      >
                        <i />
                        {locationState}
                      </span>
                    </div>

                    {/* STATUS */}

                    <div className="liveOpsStatusArea">
                      <span
                        className={
                          'liveOpsStatus ' +
                          booking.status
                        }
                      >
                        <i />

                        {
                          statusLabels[
                            booking.status
                          ]
                        }
                      </span>

                      <strong>
                        {money(price)}
                      </strong>
                    </div>

                    {/* CONTROLS */}

                    <div className="liveOpsControls">
                      <select
                        value={booking.status}
                        onChange={(event) =>
                          onChange(
                            booking.id,
                            event.target
                              .value as Status
                          )
                        }
                        aria-label={`Change status for ${customerName}`}
                      >
                        {statusOptions.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {
                                statusLabels[
                                  status
                                ]
                              }
                            </option>
                          )
                        )}
                      </select>

                      <button
                        type="button"
                        className="liveOpsViewButton"
                        onClick={() =>
                          selectBooking(
                            booking
                          )
                        }
                      >
                        <span>
                          View details
                        </span>

                        <b>›</b>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ================================================================
            RIGHT SIDE
            ================================================================ */}

        <aside className="liveOpsSidebar">
          <section className="liveOpsSideCard">
            <div className="liveOpsSideHeader">
              <div>
                <span>{selectedDateLabel}</span>

                <h3>
                  Schedule
                </h3>
              </div>

              <strong className="liveOpsTodayNumber">
                {selectedDateBookings.length}
              </strong>
            </div>

            <div className="liveOpsTodayStats">
              <div>
                <span>BOOKINGS</span>
                <strong>
                  {selectedDateBookings.length}
                </strong>
              </div>

              <div>
                <span>ACTIVE</span>
                <strong>
                  {
                    selectedDateBookings.filter(
                      (booking) =>
                        activeStatuses.includes(
                          booking.status
                        )
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span>COMPLETED</span>
                <strong>
                  {
                    selectedDateBookings.filter(
                      (booking) =>
                        booking.status ===
                        'completed'
                    ).length
                  }
                </strong>
              </div>
            </div>

            <div className="liveOpsSideLink">
              {received} new requests
            </div>
          </section>

          <section className="liveOpsSideCard">
            <div className="liveOpsSideHeader">
              <div>
                <span>
                  WORKFLOW
                </span>

                <h3>
                  Service flow
                </h3>
              </div>
            </div>

            <div className="liveOpsFlow">
              {(
                [
                  ['received', 'New request'],
                  ['confirmed', 'Confirmed'],
                  ['on_the_way', 'On the way'],
                  ['arrived', 'Arrived'],
                  ['in_progress', 'In progress'],
                ] as [Status, string][]
              ).map(
                ([status, label]) => {
                  const count =
                    selectedDateBookings.filter(
                      (booking) =>
                        booking.status ===
                        status
                    ).length;

                  return (
                    <div
                      className="liveOpsFlowRow"
                      key={status}
                    >
                      <span
                        className={
                          'liveOpsFlowDot flow-' +
                          status
                        }
                      />

                      <span>
                        {label}
                      </span>

                      <strong>
                        {count}
                      </strong>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ================================================================
          CUSTOMER DETAILS
          ================================================================ */}

      <section
        id="live-customer-details"
        className="liveOpsDetails"
      >
        {!selectedBooking ? (
          <div className="liveOpsEmpty">
            <div className="liveOpsEmptyIcon">
              ◎
            </div>

            <strong>
              Select an appointment
            </strong>

            <p>
              Choose an appointment above to view
              the customer and live location.
            </p>
          </div>
        ) : (
          <>
            <div className="liveOpsDetailsHeader">
              <div className="liveOpsDetailsIdentity">
                <div className="liveOpsAvatar large">
                  {getInitial(
                    selectedCustomerName
                  )}
                </div>

                <div>
                  <span>
                    CUSTOMER DETAILS
                  </span>

                  <h3>
                    {selectedCustomerName}
                  </h3>

                  <p>
                    {selectedBooking.services?.name ||
                      'Service'}
                    {' · '}
                    {formatTime(
                      selectedBooking.scheduled_at
                    )}
                  </p>
                </div>
              </div>

              <span
                className={
                  'liveOpsTrackingBadge' +
                  (hasLiveLocation
                    ? ' active'
                    : '')
                }
              >
                <i />

                {hasLiveLocation
                  ? 'GPS LIVE'
                  : effectiveShare?.enabled
                  ? 'WAITING FOR GPS'
                  : 'LOCATION OFF'}
              </span>
            </div>

            <div className="liveOpsDetailsGrid">
              <div>
                <span>PHONE</span>
                <strong>
                  {selectedPhone}
                </strong>
              </div>

              <div>
                <span>ADDRESS</span>
                <strong>
                  {selectedBooking.address ||
                    'Address not supplied'}
                </strong>
              </div>

              <div>
                <span>SERVICE</span>
                <strong>
                  {selectedBooking.services?.name ||
                    'Service'}
                </strong>
              </div>

              <div>
                <span>STATUS</span>
                <strong>
                  {
                    statusLabels[
                      selectedBooking.status
                    ]
                  }
                </strong>
              </div>

              <div>
                <span>VALUE</span>
                <strong>
                  {money(selectedPrice)}
                </strong>
              </div>

              <div>
                <span>GPS ACCURACY</span>
                <strong>
                  {effectiveLocation?.accuracy_meters !=
                    null
                    ? `${Math.round(
                        Number(
                          effectiveLocation.accuracy_meters
                        )
                      )} m`
                    : '—'}
                </strong>
              </div>

              <div>
                <span>LAST UPDATE</span>
                <strong>
                  {effectiveLocation?.recorded_at
                    ? new Date(
                        effectiveLocation.recorded_at
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }
                      )
                    : effectiveShare?.last_seen_at
                    ? new Date(
                        effectiveShare.last_seen_at
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }
                      )
                    : 'No GPS update'}
                </strong>
              </div>

              <div>
                <span>COORDINATES</span>
                <strong>
                  {hasLiveLocation
                    ? `${Number(
                        effectiveLocation!.latitude
                      ).toFixed(5)}, ${Number(
                        effectiveLocation!.longitude
                      ).toFixed(5)}`
                    : '—'}
                </strong>
              </div>
            </div>

            <div className="liveOpsMapSection">
              <div className="liveOpsMapHeader">
                <div>
                  <span>
                    LIVE CUSTOMER LOCATION
                  </span>

                  <strong>
                    {hasLiveLocation
                      ? 'Customer position'
                      : effectiveShare?.enabled
                      ? 'Waiting for GPS'
                      : 'Location unavailable'}
                  </strong>
                </div>

                {hasLiveLocation && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      `${effectiveLocation!.latitude},${effectiveLocation!.longitude}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="liveOpsDirections"
                  >
                    Open directions ↗
                  </a>
                )}
              </div>

              <div className="liveOpsMap">
                {hasLiveLocation ? (
                  <LiveOperationsMap
                    latitude={Number(
                      effectiveLocation!.latitude
                    )}
                    longitude={Number(
                      effectiveLocation!.longitude
                    )}
                    customerName={
                      selectedCustomerName
                    }
                    accuracy={
                      effectiveLocation
                        ?.accuracy_meters ?? null
                    }
                    updatedAt={
                      effectiveLocation
                        ?.recorded_at ??
                      effectiveLocation
                        ?.updated_at ??
                      null
                    }
                  />
                ) : (
                  <div className="liveOpsMapUnavailable">
                    <div>
                      ◎
                    </div>

                    <strong>
                      {effectiveShare?.enabled
                        ? 'Waiting for customer GPS'
                        : 'Customer location is off'}
                    </strong>

                    <p>
                      {effectiveShare?.enabled
                        ? 'Location sharing is enabled. The map will appear as soon as the customer sends a GPS coordinate.'
                        : 'The customer has not enabled live location sharing for this booking.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <div className="liveOpsSyncBar">
        <span className="livePulseDot" />

        <div>
          <strong>
            Live sync active
          </strong>

          <span>
            Booking, location-sharing and GPS
            updates synchronize automatically.
          </span>
        </div>
      </div>
    </section>
  );
  
}
