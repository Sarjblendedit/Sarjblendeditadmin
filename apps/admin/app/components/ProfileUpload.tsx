'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function ProfileUpload({
  currentUrl,
  onUploaded,
}: {
  currentUrl: string;
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

    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'png';

    const path = `profiles/avatar-${Date.now()}.${extension}`;

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

    const url = data.publicUrl;

    const { error: userError } = await supabase.auth.updateUser({
      data: {
        avatar_url: url,
      },
    });

    if (userError) {
      setMessage(userError.message);
      return;
    }

    onUploaded(url);
    setMessage('Profile picture uploaded.');
  };

  return (
    <div className="profileUpload">
      {currentUrl ? (
        <img
          className="profileUploadPreview"
          src={currentUrl}
          alt="Administrator profile"
        />
      ) : (
        <div className="profileUploadFallback">
          Admin
        </div>
      )}

      <label className="uploadControl">
        Upload profile picture

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={upload}
        />

        <span>Choose image</span>

        {message && <em>{message}</em>}
      </label>
    </div>
  );
}