'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function LogoUpload({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  const [message, setMessage] = useState('');

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Use an image smaller than 5 MB.');
      return;
    }

    setMessage('Uploading…');

    const extension = file.name.split('.').pop() || 'png';
    const path = `branding/logo-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('gallery')
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    const { data } = supabase.storage
      .from('gallery')
      .getPublicUrl(path);

    onUploaded(data.publicUrl);
    setMessage('Uploaded. Save business settings to publish it.');
  };

  return (
    <label className="uploadControl">
      Upload logo image

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={upload}
      />

      <span>Choose image</span>

      {message && <em>{message}</em>}
    </label>
  );
}