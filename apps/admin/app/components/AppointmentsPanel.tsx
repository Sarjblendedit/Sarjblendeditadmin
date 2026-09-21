'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

type Booking = {
  id: string;
  scheduled_at: string;
  status: string;
  address: string;
  services: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export function AppointmentsPanel() {
  const [items, setItems] = useState<Booking[]>([]);

  useEffect(() => {
    supabase
      .from('bookings')
      .select(
        'id,scheduled_at,status,address,services(name),profiles!bookings_customer_id_fkey(full_name)'
      )
      .order('scheduled_at')
      .then(({ data }) => {
        setItems((data as unknown as Booking[]) ?? []);
      });
  }, []);

  return (
    <main className="reportPage">
      <section className="reportShell">
        <p className="overline">APPOINTMENTS</p>

        <h1>Appointment calendar</h1>

        <p className="reportCopy">
          All customer-app appointments scheduled in your live database.
        </p>

        <section className="panel">
          <div className="table">
            {items.map((item) => (
              <div className="row" key={item.id}>
                <div>
                  <b>{item.profiles?.full_name || 'Customer'}</b>

                  <p>
                    {item.services?.name} · {item.address}
                  </p>
                </div>

                <span>
                  {new Date(item.scheduled_at).toLocaleString()}
                </span>

                <span className="status">
                  {item.status.replaceAll('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
