'use client';

import { useWishlist } from '@/components/providers/WishlistProvider';
import { useToast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';

export function WishlistButton({ productId, name, className = 'pcard-fab' }: { productId: string; name: string; className?: string }) {
  const wishlist = useWishlist();
  const toast = useToast();
  const saved = wishlist.has(productId);
  return (
    <button
      type="button"
      className={`${className}${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved items` : `Save ${name}`}
      onClick={() => { const added = wishlist.toggle(productId); toast.show(added ? 'Saved on this device' : 'Removed from saved', { tone: 'info' }); }}
    >
      <Icon name="heart" size={18} filled={saved} />
    </button>
  );
}
