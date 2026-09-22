'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

type Service = { id: string; name: string; base_price: number; is_active: boolean };
type Sale = {
  id: string;
  service_name: string;
  amount: number;
  payment_method: string;
  visited_at: string;
  walk_in_customers: { full_name: string; phone: string | null } | null;
};

export function ManualSalesPanel() {
  const [services, setServices] = useState<Service[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const [serviceResult, salesResult] = await Promise.all([
      supabase.from('services').select('id,name,base_price,is_active').eq('is_active', true).order('sort_order'),
      supabase.from('walk_in_visits').select('id,service_name,amount,payment_method,visited_at,walk_in_customers(full_name,phone)').order('visited_at', { ascending: false }).limit(8),
    ]);
    if (serviceResult.error || salesResult.error) {
      setNotice(serviceResult.error?.message || salesResult.error?.message || 'Could not load the manual sales desk.');
      return;
    }
    setServices((serviceResult.data as Service[]) ?? []);
    setSales((salesResult.data as unknown as Sale[]) ?? []);
  };

  useEffect(() => { void load(); }, []);

  const chooseService = (id: string) => {
    setServiceId(id);
    const service = services.find(item => item.id === id);
    if (service) setPrice(String(service.base_price));
  };

  const clear = () => {
    setName(''); setPhone(''); setServiceId(''); setPrice(''); setPaymentMethod('cash'); setNotice('');
  };

  const recordSale = async (event: FormEvent) => {
    event.preventDefault();
    const selected = services.find(item => item.id === serviceId);
    const amount = Number(price);
    if (!name.trim() || !selected || !Number.isFinite(amount) || amount < 0) {
      setNotice('Enter a customer name, choose a service and provide a valid price.');
      return;
    }
    setSaving(true); setNotice('');
    const { data: customer, error: customerError } = await supabase
      .from('walk_in_customers')
      .insert({ full_name: name.trim(), phone: phone.trim() || null })
      .select('id')
      .single();
    if (customerError || !customer) {
      setSaving(false); setNotice(customerError?.message || 'Could not save the customer.'); return;
    }
    const { error } = await supabase.from('walk_in_visits').insert({
      customer_id: customer.id,
      service_id: selected.id,
      service_name: selected.name,
      amount,
      payment_method: paymentMethod,
      status: 'completed',
    });
    setSaving(false);
    if (error) { setNotice(error.message); return; }
    clear();
    setNotice(`Recorded ${selected.name} for ${name.trim()}.`);
    await load();
  };

  const deleteSale = async (sale: Sale) => {
    if (!window.confirm(`Delete this ${sale.service_name} sale record?`)) return;
    const { error } = await supabase.from('walk_in_visits').delete().eq('id', sale.id);
    if (error) { setNotice(error.message); return; }
    setSales(current => current.filter(item => item.id !== sale.id));
    setNotice('Sale record deleted.');
  };

  return <section className="manualSalesPage">
    <section className="panel manualSalesPanel">
      <div className="panelHead"><div><p className="overline">QUICK COUNTER ENTRY</p><h2>Record a completed service</h2><p>Capture in-person work immediately—no customer app account is required.</p></div><button type="button" className="textButton" onClick={() => void load()}>↻ Refresh</button></div>
      {notice && <p className={notice.includes('Recorded') ? 'success' : 'error'}>{notice}</p>}
      <form className="manualSalesForm" onSubmit={recordSale}>
        <label>Customer name<input value={name} onChange={event => setName(event.target.value)} placeholder="Walk-in customer" required /></label>
        <label>Phone <small>(optional)</small><input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+260…" /></label>
        <label>Service<select value={serviceId} onChange={event => chooseService(event.target.value)} required><option value="">Choose a service</option>{services.map(service => <option key={service.id} value={service.id}>{service.name} · K{Number(service.base_price).toFixed(0)}</option>)}</select></label>
        <label>Price (ZMW)<input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} placeholder="0" required /></label>
        <label>Payment<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="cash">Cash</option><option value="airtel_money">Airtel Money</option><option value="mtn_momo">MTN MoMo</option><option value="zamtel_kwacha">Zamtel Kwacha</option><option value="card">Card</option></select></label>
        <div className="manualSalesActions"><button type="submit" disabled={saving}>{saving ? 'Recording…' : 'Record service'}</button><button type="button" className="cancel" onClick={clear}>Clear form</button></div>
      </form>
    </section>
    <section className="panel manualSalesRecent"><div className="panelHead"><div><p className="overline">LATEST ENTRIES</p><h2>Recent counter sales</h2></div><span>{sales.length} shown</span></div>
      <div className="serviceTable">{sales.map(sale => <div className="serviceRow manualSaleRow" key={sale.id}><div><b>{sale.walk_in_customers?.full_name || 'Walk-in customer'}</b><p>{sale.service_name} · {new Date(sale.visited_at).toLocaleString()} · {sale.payment_method.replaceAll('_', ' ')}</p></div><strong>K{Number(sale.amount).toFixed(0)}</strong><span className="live">Completed</span><button type="button" className="textButton dangerButton" onClick={() => void deleteSale(sale)}>Delete</button></div>)}{!sales.length && <p className="empty">No counter services recorded yet.</p>}</div>
    </section>
  </section>;
}
