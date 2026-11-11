import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate, STATUS_LABELS } from '../lib/format.js';
import Seo from '../components/seo/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/display.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';

const schema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^NVT-\d{4}-\d{5}$/, 'Enter the order number, for example NVT-2611-00042'),
  emailOrPhone: z.string().trim().min(3, 'Enter the email or phone used on the order'),
});

/** Track an order by number plus email or phone. Shows status and progress only, never the address. */
export default function Track() {
  const [result, setResult] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values) => api('/orders/track', { method: 'POST', body: values }),
    onSuccess: (data) => setResult(data),
    onError: (err) => {
      setResult(null);
      setError('root', { message: err.message });
    },
  });

  return (
    <>
      <Seo
        title="Track order"
        path="/track"
        description="Track your Novelle Tech order with its number and your email or phone."
      />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 md:px-8">
        <Reveal className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-label text-rose-300">Order status</p>
          <h1 className="text-4xl md:text-5xl">Track your order</h1>
        </Reveal>

        <Card className="p-6">
          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            noValidate
            className="grid gap-5 sm:grid-cols-2"
          >
            <Input
              label="Order number"
              placeholder="NVT-2611-00042"
              error={errors.orderNumber?.message}
              {...register('orderNumber')}
            />
            <Input
              label="Email or phone"
              autoComplete="email"
              error={errors.emailOrPhone?.message}
              {...register('emailOrPhone')}
            />
            <div className="sm:col-span-2">
              <Button type="submit" loading={mutation.isPending}>
                Find my order
              </Button>
            </div>
            {errors.root && (
              <p role="alert" className="text-sm text-danger sm:col-span-2">
                {errors.root.message}
              </p>
            )}
          </form>
        </Card>

        {result && (
          <Card className="mt-8">
            <CardHeader
              title={result.orderNumber}
              action={
                <Badge tone={result.status === 'cancelled' ? 'danger' : 'pink'}>
                  {STATUS_LABELS[result.status]}
                </Badge>
              }
            />
            <div className="space-y-6 p-5">
              <p className="text-sm text-rose-50/70">
                Placed {formatDate(result.createdAt)} ·{' '}
                {result.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}
              </p>
              <ol className="space-y-4 border-l border-ink-700 pl-5">
                {result.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-rose-400 shadow-glow-sm"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-rose-50">{STATUS_LABELS[t.status] ?? t.status}</p>
                    {t.note && <p className="text-xs text-rose-50/60">{t.note}</p>}
                    <p className="text-xs text-rose-50/45">{formatDate(t.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
