'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

type BusinessSettings = {
  business_name: string | null;
  tagline: string | null;
  logo_url: string | null;
};

export function AdminChrome({ children }: { children: ReactNode }) {
  const [business, setBusiness] =
    useState<BusinessSettings | null>(null);

  const [adminName, setAdminName] =
    useState('Administrator');

  const [adminAvatarUrl, setAdminAvatarUrl] =
    useState('');

  const [pendingBookings, setPendingBookings] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadHeader = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          setAdminName(
            profile?.full_name?.trim() ||
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'Administrator'
          );

          setAdminAvatarUrl(
            user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              ''
          );
        }

        const [businessResult, bookingsResult] =
          await Promise.all([
            supabase
              .from('business_settings')
              .select(
                'business_name,tagline,logo_url'
              )
              .limit(1)
              .maybeSingle(),

            supabase
              .from('bookings')
              .select('status')
              .eq('status', 'received'),
          ]);

        if (!businessResult.error) {
          setBusiness(
            businessResult.data as
              | BusinessSettings
              | null
          );
        }

        if (!bookingsResult.error) {
          setPendingBookings(
            bookingsResult.data?.length ?? 0
          );
        }
      } catch (error) {
        console.error(
          'Could not load admin header:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadHeader();
  }, []);

  return (
    <main className="adminFrame">
      <aside>
        <p className="brand">
          SARJ
          <br />
          <span>BLENDED IT</span>
        </p>

        <p className="tag">
          MOBILE BARBER ADMIN
        </p>

        <nav>
          <a href="/">
            Overview
          </a>

          <a href="/#bookings">
            Bookings
            <i>1</i>
          </a>

          <a href="/#services">
            Services &amp; pricing
          </a>

          <a href="/#customers">
            Customers
            <i>1</i>
          </a>

          <a href="/#gallery">
            Gallery
          </a>

          <a href="/#promotions">
            Promotions
          </a>

          <a
            className="sidebarLink"
            href="/appointments"
          >
            Appointments
          </a>

          <a
            className="sidebarLink"
            href="/customers"
          >
            Customers
          </a>

          <a
            className="sidebarLink"
            href="/reports"
          >
            Reports
          </a>

          <a
            className="sidebarLink"
            href="/walk-ins"
          >
            Walk-ins
          </a>

          <a
            className="sidebarLink"
            href="/#settings"
          >
            Settings
          </a>
        </nav>

        <div className="sidebarBottom">
          <div className="sidebarFoot">
            SARJ BLENDED IT
            <br />
            OPERATIONS DASHBOARD
          </div>

          <button
            type="button"
            className="sidebarSignOut"
          >
            Sign out
          </button>
        </div>
      </aside>

      <section className="content">
        {/* MAIN ADMIN HEADER */}
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
            <a
              className="headerAction"
              href="/#bookings"
            >
              Notifications
              <i className="badge">
                {pendingBookings}
              </i>
            </a>

            <a
              className="headerAction"
              href="/#settings"
            >
              Settings
            </a>

            <a
              className="adminProfileButton"
              href="/#settings"
              title="Open administrator profile"
              aria-label={`Open ${
                adminName || 'Administrator'
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
                    {(adminName || 'A')
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
              </span>

              <span className="adminProfileInfo">
                <strong>
                  {adminName || 'Administrator'}
                </strong>
              </span>
            </a>
          </div>
        </div>

        <main className="pageContent">
          {children}
        </main>

        <footer className="adminFooter">
          <span>
            SARJ BLENDED IT · Admin operations
          </span>

          <span>
            Live Supabase workspace
          </span>
        </footer>
      </section>
    </main>
  );
}