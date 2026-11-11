import { useParams } from 'react-router-dom';
import { useCategories } from '../lib/queries.js';
import Shop from './Shop.jsx';
import NotFound from './NotFound.jsx';
import { Skeleton } from '../components/ui/display.jsx';

/** Route wrappers around the shared Shop page. Each pins its own scope. */
export function ShopPage() {
  return (
    <Shop
      title="Shop"
      path="/shop"
      description="Phones, laptops, accessories and gadgets. Filter by brand, condition and price."
    />
  );
}

export function CombosPage() {
  return (
    <Shop
      title="Phone combos"
      eyebrow="Affordable phone combos"
      description="A phone plus the accessories it needs, bundled for less. Each combo shows exactly what is included and what you save."
      path="/combos"
      fixed={COMBOS_SCOPE}
    />
  );
}

export function DealsPage() {
  return (
    <Shop
      title="Deals"
      eyebrow="Hot deals"
      description="Products with a lower price than before. Prices here are checked at checkout."
      path="/deals"
      fixed={DEALS_SCOPE}
    />
  );
}

export function CategoryPage() {
  const { slug } = useParams();
  const { data: categories, isLoading } = useCategories();
  if (isLoading) return <Skeleton className="m-8 h-40" />;
  const cat = categories?.find((c) => c.slug === slug);
  if (!cat) return <NotFound />;
  return (
    <Shop
      title={cat.name}
      eyebrow="Category"
      description={cat.description || `Shop ${cat.name.toLowerCase()} at Novelle Tech.`}
      path={`/category/${slug}`}
      fixed={{ category: slug }}
    />
  );
}

// Stable objects so the Shop memo does not re-run on every render.
const COMBOS_SCOPE = { type: 'combo' };
const DEALS_SCOPE = { deal: true };
