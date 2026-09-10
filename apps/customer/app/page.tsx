'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
};

type Booking = {
  id: string;
  scheduled_at: string;
  status: string;
  service_id: string;
  services: { name: string; price: number } | null;
};

export default function CustomerDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, scheduled_at, status, service_id, services(name, price)')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      
      // Fix type casting: normalize services from array to object
      const normalizedData = (data || []).map((booking: any) => ({
        ...booking,
        services: Array.isArray(booking.services) 
          ? booking.services[0] || null 
          : booking.services,
      }));
      
      setBookings(normalizedData as Booking[]);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedService || !bookingDate) {
      alert('Please select a service and date');
      return;
    }

    try {
      const { error } = await supabase.from('bookings').insert([
        {
          service_id: selectedService,
          scheduled_at: bookingDate,
          status: 'pending',
        },
      ]);

      if (error) throw error;
      alert('Booking created successfully!');
      setSelectedService(null);
      setBookingDate('');
      await loadBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking');
    }
  };

  useEffect(() => {
    loadServices();
    loadBookings();
  }, []);

  return (
    <div className="customer-dashboard">
      <header className="customer-header">
        <h1>SARJ BLENDED IT</h1>
        <p>Premium Mobile Barber Services</p>
      </header>

      <main className="customer-main">
        <section className="booking-section">
          <h2>Book a Service</h2>
          <div className="booking-form">
            <div className="form-group">
              <label htmlFor="service">Select Service:</label>
              <select
                id="service"
                value={selectedService || ''}
                onChange={(e) => setSelectedService(e.target.value)}
              >
                <option value="">-- Choose a service --</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ${service.price} ({service.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Select Date & Time:</label>
              <input
                id="date"
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>

            <button onClick={handleBooking} className="btn-primary">
              Book Now
            </button>
          </div>
        </section>

        <section className="bookings-section">
          <h2>Your Bookings</h2>
          {loading ? (
            <p>Loading...</p>
          ) : bookings.length === 0 ? (
            <p>No bookings yet</p>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <h3>{booking.services?.name}</h3>
                  <p>
                    <strong>Date:</strong>{' '}
                    {new Date(booking.scheduled_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Price:</strong> ${booking.services?.price}
                  </p>
                  <p className={`status status-${booking.status}`}>
                    <strong>Status:</strong> {booking.status.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
