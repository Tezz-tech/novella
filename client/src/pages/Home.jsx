import { useProducts } from '../lib/queries.js';
import Seo from '../components/seo/Seo.jsx';
import Hero from '../components/home/Hero.jsx';
import HotDeals from '../components/home/HotDeals.jsx';
import {
  PillarStrip,
  FeaturedCategories,
  ComboRail,
  NewArrivals,
  BrandMarquee,
  WhyBuy,
  SocialCta,
} from '../components/home/Sections.jsx';

/** Home: hero, pillars, categories, hot deals, combos, new arrivals, brands, why buy, CTA and newsletter. */
export default function Home() {
  const { data } = useProducts({ tag: 'featured', limit: 1 });
  const featured = data?.items?.[0];
  // Show the placeholder at once (fast first paint), then swap in the featured product when it arrives.
  const visual = featured
    ? { name: featured.name, image: featured.coverImage?.url }
    : { name: 'Novelle Tech', image: '/placeholders/product.svg' };

  return (
    <>
      <Seo
        path="/"
        title="Smart Deals. Pretty Prices."
        description="Affordable phone combos, the latest smartphones, laptops and accessories in Nigeria, with reliable support."
      />
      <Hero visual={visual} />
      <PillarStrip />
      <FeaturedCategories />
      <HotDeals />
      <ComboRail />
      <NewArrivals />
      <BrandMarquee />
      <WhyBuy />
      <SocialCta />
    </>
  );
}
