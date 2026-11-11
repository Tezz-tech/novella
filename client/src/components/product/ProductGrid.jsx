import ProductCard from './ProductCard.jsx';
import { Skeleton, EmptyState } from '../ui/display.jsx';
import { Stagger, StaggerItem } from '../motion/Reveal.jsx';

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-card border border-ink-700 bg-ink-800 p-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Responsive grid of product cards with a staggered reveal. */
export default function ProductGrid({
  products,
  loading = false,
  emptyTitle = 'Nothing matches yet',
  emptyBody,
}) {
  if (loading && !products) return <ProductGridSkeleton />;
  if (!products?.length) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody ?? 'Try clearing a filter or searching for something else.'}
      />
    );
  }
  return (
    <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4" delay={0.05}>
      {products.map((p) => (
        <StaggerItem key={p.id} className="h-full">
          <ProductCard product={p} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
