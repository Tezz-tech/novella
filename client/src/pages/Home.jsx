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
  return (
    <>
      <Seo
        path="/"
        title="Smart Deals. Pretty Prices."
        description="Affordable phone combos, the latest smartphones, laptops and accessories in Nigeria, with reliable support."
      />
      <Hero />
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
