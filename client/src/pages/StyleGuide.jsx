import { useState } from 'react';
import Logo from '../components/brand/Logo.jsx';
import Button from '../components/ui/Button.jsx';
import { Badge, Divider, Price, Rating, Skeleton, EmptyState } from '../components/ui/display.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import { Input, Select, Textarea } from '../components/ui/Field.jsx';
import { Drawer, Modal, Sheet } from '../components/ui/Overlay.jsx';
import { toast } from '../store/toast.js';
import { Reveal } from '../components/motion/Reveal.jsx';
import TiltCard from '../components/motion/TiltCard.jsx';
import MagneticButton from '../components/motion/MagneticButton.jsx';
import ShineSweep from '../components/motion/ShineSweep.jsx';
import SparkleField from '../components/motion/SparkleField.jsx';
import SatinWave from '../components/motion/SatinWave.jsx';
import CountUp from '../components/motion/CountUp.jsx';
import MetalText from '../components/motion/MetalText.jsx';

const SWATCHES = [
  ['ink-950', '#07040A'],
  ['ink-900', '#0E0910'],
  ['ink-800', '#171018'],
  ['ink-700', '#241A24'],
  ['rose-50', '#FFF0F6'],
  ['rose-200', '#FCD3E6'],
  ['rose-300', '#F5A8CC'],
  ['rose-400', '#E88FBF'],
  ['rose-500', '#D884A8'],
  ['rose-700', '#902F54'],
  ['rose-800', '#601830'],
  ['rose-900', '#3A0C1F'],
  ['spark-400', '#F5C451'],
];

function Section({ title, children }) {
  return (
    <section aria-labelledby={`sg-${title.replace(/\W+/g, '-')}`} className="space-y-5">
      <h2 id={`sg-${title.replace(/\W+/g, '-')}`} className="text-2xl md:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Dev-only page listing every shared component (Phase 2 checklist). Not linked from the site. */
export default function StyleGuide() {
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState('specs');

  return (
    <div className="mx-auto max-w-6xl space-y-20 px-4 py-14 md:px-8">
      <header className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-label text-rose-300">Dev only</p>
        <h1 className="text-4xl md:text-6xl">
          <MetalText>Style guide</MetalText>
        </h1>
        <Divider className="mx-auto max-w-xs" />
      </header>

      <Section title="Logo">
        <div className="flex flex-wrap items-end gap-12 rounded-card border border-ink-700 bg-ink-900 p-10">
          <Logo />
          <Logo variant="mark" />
        </div>
      </Section>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {SWATCHES.map(([name, hex]) => (
            <li key={name} className="overflow-hidden rounded-xl border border-ink-700">
              <div className="h-16" style={{ background: hex }} />
              <p className="px-2 py-1.5 text-xs text-rose-50/80">{name}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <MagneticButton>
            <Button>Magnetic</Button>
          </MagneticButton>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Full name" placeholder="Amaka Okafor" hint="As it appears on your ID" />
          <Input label="Email" type="email" error="Enter a valid email address" />
          <Select label="State" defaultValue="Lagos">
            <option>Lagos</option>
            <option>Abuja (FCT)</option>
          </Select>
          <Textarea label="Notes" placeholder="Landmark, gate colour…" />
        </div>
      </Section>

      <Section title="Badges, prices and ratings">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Hot Deal</Badge>
          <Badge tone="gold">Featured</Badge>
          <Badge tone="success">In stock</Badge>
          <Badge tone="danger">Sold out</Badge>
          <Badge tone="neutral">UK Used</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-8">
          <Price amount={102000000} compareAt={112000000} size="lg" />
          <Rating value={4.6} count={38} />
          <span className="text-3xl tabular-nums text-rose-50">
            <CountUp value={1280} />
          </span>
        </div>
      </Section>

      <Section title="Cards with motion">
        <div className="grid gap-6 md:grid-cols-3">
          <TiltCard className="group relative overflow-hidden rounded-card border border-ink-700 bg-ink-800 p-6 transition-colors hover:border-rose-400/60">
            <ShineSweep />
            <h3 className="text-lg">Tilt + shine</h3>
            <p className="mt-2 text-sm text-rose-50/65">Hover on desktop to tilt and sweep.</p>
          </TiltCard>
          <Reveal className="rounded-card border border-ink-700 bg-ink-800 p-6">
            <h3 className="text-lg">Reveal</h3>
            <p className="mt-2 text-sm text-rose-50/65">Fades up once when scrolled into view.</p>
          </Reveal>
          <div className="space-y-3 rounded-card border border-ink-700 bg-ink-800 p-6">
            <h3 className="text-lg">Loading</h3>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Section>

      <Section title="Overlays and toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Open drawer
          </Button>
          <Button variant="secondary" onClick={() => setModal(true)}>
            Open modal
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open sheet
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Added to your cart')}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Payment was not completed')}>
            Error toast
          </Button>
        </div>
        <Drawer open={drawer} onClose={() => setDrawer(false)} label="Example drawer">
          <div className="p-6">
            <h2 className="text-xl">Drawer</h2>
            <p className="mt-2 text-sm text-rose-50/70">Press Escape or click outside to close.</p>
            <Button className="mt-6" onClick={() => setDrawer(false)}>
              Close
            </Button>
          </div>
        </Drawer>
        <Modal open={modal} onClose={() => setModal(false)} label="Example modal">
          <div className="p-6">
            <h2 className="text-xl">Modal</h2>
            <Button className="mt-6" onClick={() => setModal(false)}>
              Done
            </Button>
          </div>
        </Modal>
        <Sheet open={sheet} onClose={() => setSheet(false)} label="Example sheet">
          <div className="p-6">
            <h2 className="text-xl">Bottom sheet</h2>
            <Button className="mt-6" onClick={() => setSheet(false)}>
              Done
            </Button>
          </div>
        </Sheet>
      </Section>

      <Section title="Animated surfaces">
        <div className="relative h-56 overflow-hidden rounded-card border border-ink-700 bg-ink-900">
          <SparkleField />
          <div className="relative flex h-full items-center justify-center">
            <p className="font-accent text-2xl italic text-rose-200">Sparkle field</p>
          </div>
        </div>
        <div className="relative h-40 overflow-hidden rounded-card border border-ink-700 bg-ink-900">
          <SatinWave />
        </div>
      </Section>

      <Section title="Cards and tabs">
        <Card>
          <CardHeader title="Card header" action={<Badge tone="gold">New</Badge>} />
          <div className="p-5">
            <Tabs
              label="Product details"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'specs', label: 'Specs' },
                { value: 'reviews', label: 'Reviews', count: 0 },
                { value: 'shipping', label: 'Shipping' },
              ]}
            />
            <p id="sg-tab-panel" role="tabpanel" className="pt-4 text-sm text-rose-50/70">
              Active tab: {tab}
            </p>
          </div>
        </Card>
      </Section>

      <Section title="Empty state">
        <div className="rounded-card border border-ink-700 bg-ink-900">
          <EmptyState
            title="Nothing here yet"
            body="Empty states show the crown and one clear next step."
          />
        </div>
      </Section>
    </div>
  );
}
