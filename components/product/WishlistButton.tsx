'use client';

import { useState } from 'react';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { useToast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';

export function WishlistButton({ productId, name, className = 'pcard-fab' }: { productId: string; name: string; className?: string }) {
  const wishlist = useWishlist();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const saved = wishlist.has(productId);

  async function onToggle() {
    if (saving) return;
    setSaving(true);
    try {
      const added = await wishlist.toggle(productId);
      toast.show(added ? 'Saved to your wishlist' : 'Removed from your wishlist', { tone: 'info' });
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not update wishlist', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      className={`${className}${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved items` : `Save ${name}`}
      disabled={saving}
      onClick={() => void onToggle()}
    >
      <Icon name="heart" size={18} filled={saved} />
    </button>
  );
}
