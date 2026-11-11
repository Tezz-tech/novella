import Button from '../components/ui/Button.jsx';
import { Divider } from '../components/ui/display.jsx';
import MetalText from '../components/motion/MetalText.jsx';

/** Branded 404. */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-label text-rose-300">Page not found</p>
      <h1 className="text-7xl md:text-8xl">
        <MetalText>404</MetalText>
      </h1>
      <Divider className="max-w-xs" />
      <p className="max-w-md text-rose-50/70">
        This page has slipped out of the crown. Try the shop, or head back home.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button to="/">Back to home</Button>
        <Button to="/shop" variant="secondary">
          Browse gadgets
        </Button>
      </div>
    </div>
  );
}
