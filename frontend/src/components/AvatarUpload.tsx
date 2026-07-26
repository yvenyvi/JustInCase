import React from 'react';
import { Camera, Loader2, User, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import styles from './AvatarUpload.module.css';

interface AvatarUploadProps {
  /** Visual style — matches the existing avatarWrapper in each profile */
  variant: 'public' | 'legal';
  /** Diameter in px */
  size: number;
  /** Icon size for the placeholder User icon */
  iconSize: number;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const AvatarUpload: React.FC<AvatarUploadProps> = ({ variant, size, iconSize }) => {
  const { profile, updateProfile } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = () => {
    if (uploading) return;
    setError(null);
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected after an error
    e.target.value = '';
    if (!file || !profile?.id) return;

    if (!ACCEPTED.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or GIF images are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large. Max size is 5 MB.');
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop() ?? 'jpg';
    // Include timestamp in the path so every upload produces a unique URL
    // (avoids stale browser caching without needing a query-string hack in the DB)
    const path = `${profile.id}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const { error: updateError } = await updateProfile({ avatar_url: publicUrl });

    if (updateError) {
      setError('Saved photo but failed to update profile. Refresh and try again.');
    }

    setUploading(false);
  };

  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.circle} ${styles[variant]}`}
        style={{ width: size, height: size, minWidth: size }}
        onClick={handleClick}
        aria-label="Upload profile picture"
        disabled={uploading}
      >
        {/* Avatar image or placeholder */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className={styles.photo}
            draggable={false}
          />
        ) : (
          <span className={styles.placeholder}>
            <User size={iconSize} />
          </span>
        )}

        {/* Hover / uploading overlay */}
        <span className={`${styles.overlay} ${uploading ? styles.overlayActive : ''}`}>
          {uploading
            ? <Loader2 size={20} className={styles.spin} />
            : <Camera size={20} />}
        </span>
      </button>

      {/* Error message */}
      {error && (
        <p className={styles.error}>
          <AlertCircle size={13} />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AvatarUpload;
