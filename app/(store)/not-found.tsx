import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container section">
      <EmptyState art="search" title="We couldn't find that page" description="The product may have sold out, been removed, or the link is incorrect.">
        <ButtonLink href="/shop" icon="grid">Browse the shop</ButtonLink>
        <ButtonLink href="/" variant="outline">Home</ButtonLink>
      </EmptyState>
    </div>
  );
}
