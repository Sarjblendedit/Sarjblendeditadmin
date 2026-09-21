'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

import { AdminChrome } from '../components/AdminChrome';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  residence: string | null;
  customer_type: 'app' | 'walk_in';
  is_blocked: boolean;
  created_at: string;
};

type CustomerForm = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  residence: string;
  customer_type: 'app' | 'walk_in';
};

const blank: CustomerForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  residence: '',
  customer_type: 'walk_in'
};

export default function Customers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(blank);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [view, setView] = useState<Customer | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();

    const payload = {
      ...form,
      last_name: form.last_name || null,
      phone: form.phone || null,
      email: form.email || null,
      residence: form.residence || null
    };

    const result = editing
      ? await supabase
          .from('customers')
          .update(payload)
          .eq('id', editing.id)
      : await supabase
          .from('customers')
          .insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    const wasEditing = Boolean(editing);

    setForm(blank);
    setEditing(null);
    setMessage(wasEditing ? 'Customer updated.' : 'Customer added.');

    await load();
  };

  const edit = (x: Customer) => {
    setEditing(x);

    setForm({
      first_name: x.first_name,
      last_name: x.last_name ?? '',
      phone: x.phone ?? '',
      email: x.email ?? '',
      residence: x.residence ?? '',
      customer_type: x.customer_type
    });
  };

  const remove = async (x: Customer) => {
    if (!confirm('Delete ' + x.first_name + '?')) {
      return;
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', x.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Customer deleted.');
    await load();
  };

  const block = async (x: Customer) => {
    const { error } = await supabase
      .from('customers')
      .update({
        is_blocked: !x.is_blocked
      })
      .eq('id', x.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  };

  return (
    <AdminChrome>
      <main className="reportPage">
        <section className="reportShell">
          <p className="overline">CUSTOMER MANAGEMENT</p>

          <h1>Customers</h1>

          <p className="reportCopy">
            Create and manage app and walk-in customer records.
          </p>

          <form
            className="walkForm customerForm"
            onSubmit={save}
          >
            <label>
              Name
              <input
                value={form.first_name}
                onChange={e =>
                  setForm({
                    ...form,
                    first_name: e.target.value
                  })
                }
                required
              />
            </label>

            <label>
              Last name
              <input
                value={form.last_name}
                onChange={e =>
                  setForm({
                    ...form,
                    last_name: e.target.value
                  })
                }
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={e =>
                  setForm({
                    ...form,
                    phone: e.target.value
                  })
                }
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={e =>
                  setForm({
                    ...form,
                    email: e.target.value
                  })
                }
              />
            </label>

            <label>
              Residence
              <input
                value={form.residence}
                onChange={e =>
                  setForm({
                    ...form,
                    residence: e.target.value
                  })
                }
              />
            </label>

            <label>
              Type
              <select
                value={form.customer_type}
                onChange={e =>
                  setForm({
                    ...form,
                    customer_type: e.target.value as
                      | 'app'
                      | 'walk_in'
                  })
                }
              >
                <option value="app">App</option>
                <option value="walk_in">Walk in</option>
              </select>
            </label>

            <button type="submit">
              {editing ? 'Save changes' : 'Add new customer'}
            </button>

            {editing && (
              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                Cancel
              </button>
            )}
          </form>

          {message && (
            <p className="success">
              {message}
            </p>
          )}

          <section className="panel">
            <div className="panelHead">
              <h2>Customer directory</h2>
              <span>{items.length} customers</span>
            </div>

            <div className="table">
              {items.map(x => (
                <div
                  className="customerTableRow"
                  key={x.id}
                >
                  <div>
                    <b>
                      {x.first_name} {x.last_name}
                    </b>

                    <p>
                      {x.phone || '—'} · {x.email || '—'} ·{' '}
                      {x.residence || '—'}
                    </p>
                  </div>

                  <span
                    className={
                      x.is_blocked
                        ? 'offline'
                        : 'live'
                    }
                  >
                    {x.is_blocked
                      ? 'Blocked'
                      : x.customer_type}
                  </span>

                  <button
                    type="button"
                    className="textButton"
                    onClick={() => setView(x)}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    className="textButton"
                    onClick={() => edit(x)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="textButton"
                    onClick={() => block(x)}
                  >
                    {x.is_blocked
                      ? 'Unblock'
                      : 'Block'}
                  </button>

                  <button
                    type="button"
                    className="textButton dangerButton"
                    onClick={() => remove(x)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          {view && (
            <div className="customerModal">
              <div className="customerEditor">
                <button
                  type="button"
                  className="modalClose"
                  onClick={() => setView(null)}
                >
                  ×
                </button>

                <p className="overline">
                  CUSTOMER DETAILS
                </p>

                <h2>
                  {view.first_name} {view.last_name}
                </h2>

                <p>
                  Phone: {view.phone || 'Not supplied'}
                </p>

                <p>
                  Email: {view.email || 'Not supplied'}
                </p>

                <p>
                  Residence:{' '}
                  {view.residence || 'Not supplied'}
                </p>

                <p>
                  Type: {view.customer_type}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </AdminChrome>
  );
}