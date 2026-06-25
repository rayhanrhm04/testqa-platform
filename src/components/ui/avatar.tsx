import * as React from 'react';
import { User } from '@/lib/validators';

interface AvatarProps {
  user?: User | null;
  name?: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackChar?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ user, name, avatarUrl, className = 'h-8 w-8', fallbackChar = 'U' }) => {
  const finalName = user ? user.name : (name || '');
  const finalAvatarUrl = user ? (user as any).avatar_url : avatarUrl;
  const initial = finalName ? finalName.charAt(0).toUpperCase() : fallbackChar;

  const isImageUrl = (str: string) => {
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:');
  };

  if (finalAvatarUrl) {
    if (isImageUrl(finalAvatarUrl)) {
      return (
        <img 
          src={finalAvatarUrl} 
          alt={finalName} 
          className={`object-cover rounded-full ${className}`}
        />
      );
    } else {
      // It's an emoji or custom short text
      return (
        <div className={`flex items-center justify-center select-none rounded-full bg-zinc-100 dark:bg-zinc-800 text-foreground text-sm font-bold ${className}`}>
          {finalAvatarUrl}
        </div>
      );
    }
  }

  // Fallback to initial
  return (
    <div className={`flex items-center justify-center font-bold text-xs uppercase rounded-full ${className}`}>
      {initial}
    </div>
  );
};
