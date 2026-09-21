'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Service = {
  id: string;
  name: string;
  base_price: number;
  is_active: boolean;
  duration_minutes: number | null;
};

export function WalkInsPanel() {
  const [services, setServices] = useState<Service[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id,name,base_price,is_active,duration_minutes')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        setMessage(error.message);
        return;
      }

      setServices((data as Service[]) ?? []);
    };

    void loadServices();
  }, []);

  const handleServiceChange = (id: string) => {
    setServiceId(id);

    const service = services.find((item) => item.id === id);

    if (service) {
      setAmount(String(service.base_price));
    } else {
      setAmount('');
    }
  };

  const saveWalkIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!customerName.trim()) {
      setMessage('Enter the customer name.');
      return;
    }

    if (!serviceId) {
      setMessage('Select a service.');
      return;
    }

    const selectedService = services.find(
      (service) => service.id === serviceId
    );

    if (!selectedService) {
      setMessage('Please select a valid service.');
      return;
    }

    const finalAmount = Number(amount);

    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
      setMessage('Enter a valid amount.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { data: existingCustomer, error: customerLookupError } =
        await supabase
          .from('profiles')
          .select('id')
          .eq('phone', phone.trim())
          .maybeSingle();

      if (customerLookupError) {
        setMessage(customerLookupError.message);
        return;
      }

      let customerId = existingCustomer?.id ?? null;

      if (!customerId) {
        const { data: createdCustomer, error: customerError } =
          await supabase
            .from('profiles')
            .insert({
              full_name: customerName.trim(),
              phone: phone.trim() || null,
              role: 'customer',
            })
            .select('id')
            .single();

        if (customerError) {
          setMessage(customerError.message);
          return;
        }

        customerId = createdCustomer.id;
      } else {
        const { error: updateCustomerError } = await supabase
          .from('profiles')
          .update({
            full_name: customerName.trim(),
          })
          .eq('id', customerId);

        if (updateCustomerError) {
          setMessage(updateCustomerError.message);
          return;
        }
      }

      const now = new Date().toISOString();

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          scheduled_at: now,
          status: 'completed',
          address: 'Walk-in',
          notes: `Walk-in service: ${selectedService.name}`,
          quoted_price: finalAmount,
          amount_paid: finalAmount,
          payment_status: 'paid',
        });

      if (bookingError) {
        setMessage(bookingError.message);
        return;
      }

      setCustomerName('');
      setPhone('');
      setServiceId('');
      setAmount('');
      setMessage('Walk-in customer recorded successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="walkInsPage">
      <header className="walkInsHero">
        <div>
          <p className="overline">LIVE OPERATIONS</p>
          <h1>Walk-ins</h1>
          <p>Record a customer who arrived without an appointment.</p>
        </div>
      </header>

      {message && (
        <p
          className={
            message.includes('successfully') ? 'success' : 'error'
          }
        >
          {message}
        </p>
      )}

      <section className="panel walkInPanel">
        <div className="panelHead">
          <div>
            <p className="overline">NEW WALK-IN</p>
            <h2>Customer details</h2>
          </div>
        </div>

        <form className="walkForm" onSubmit={saveWalkIn}>
          <label>
            Customer name
            <input
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
              required
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
            />
          </label>

          <label>
            Service
            <select
              value={serviceId}
              onChange={(event) => handleServiceChange(event.target.value)}
              required
            >
              <option value="">Select service</option>

              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — K{Number(service.base_price).toFixed(0)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              required
            />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Record walk-in'}
          </button>
        </form>
      </section>
    </section>
  );
}
