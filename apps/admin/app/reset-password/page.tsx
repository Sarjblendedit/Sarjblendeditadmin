'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '');

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoverySession, setRecoverySession] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const checkSession = async () => { const { data } = await supabase.auth.getSession(); setRecoverySession(Boolean(data.session)); };
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) setRecoverySession(Boolean(session)); });
    return () => listener.subscription.unsubscribe();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!recoverySession) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/reset-password' });
      if (error) return setError(error.message);
      setMessage('If that address has an account, a reset email has been sent. Check spam too.'); return;
    }
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(error.message);
    setMessage('Password updated. Return to the admin sign-in page.');
  };
  return <main className="gate"><form className="login" onSubmit={submit}>
    <p className="overline">SARJ BLENDED IT</p><h1>{recoverySession ? 'Set a new password' : 'Reset your password'}</h1>
    <p>{recoverySession ? 'Choose a new password for the owner account.' : 'Enter your admin email to receive a secure reset link.'}</p>
    {recoverySession ? <label>New password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></label> : <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
    {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
    <button>{recoverySession ? 'Save new password' : 'Send reset link'}</button><p><a className="forgot" href="/">Back to sign in</a></p>
  </form></main>;
}
