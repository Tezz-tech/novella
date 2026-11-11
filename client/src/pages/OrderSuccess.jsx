import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import Seo from '../components/seo/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Divider, Skeleton } from '../components/ui/display.jsx';
import SparkleField from '../components/motion/SparkleField.jsx';
import MetalText from '../components/motion/MetalText.jsx';

const CONFETTI_COLORS = ['#E88FBF', '#F5A8CC', '#FCD3E6', '#D884A8', '#F5C451'];

/** Crown with a check drawn through it, then a burst of pink confetti. Off for reduced motion. */
function CheckBurst() {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: -(80 + Math.random() * 160),
        r: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    []
  );
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      {!reduce &&
        pieces.map((p) => (
          <motion.span
            key={p.id}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm"
            style={{ background: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: p.y + 120, opacity: 0, rotate: p.r }}
            transition={{ duration: 1.4, delay: 0.25 + p.delay, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      <svg
        width="112"
        height="96"
        viewBox="0 0 112 96"
        fill="none"
        aria-hidden="true"
        className="relative"
      >
        <motion.path
          d="M16 72h80M20 30l18 18 18-30 18 30 18-18-6 42H26L20 30z"
          stroke="#E88FBF"
          strokeWidth="3"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d="M40 52l12 12 22-24"
          stroke="#F5C451"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.9, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}

function RetryForm({ orderNumber, reference }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().trim().toLowerCase().email('Enter the email used on the order'),
      })
    ),
  });
  const mutation = useMutation({
    mutationFn: ({ email }) =>
      api(`/orders/${orderNumber}/retry-payment`, { method: 'POST', body: { email } }),
    onSuccess: (data) => {
      import('../lib/paystack.js').then(({ openPaystack }) =>
        openPaystack({
          accessCode: data.accessCode,
          authorizationUrl: data.authorizationUrl,
          onSuccess: (t) =>
            (window.location.href = `/order/success?reference=${encodeURIComponent(t.reference ?? data.reference)}`),
          onCancel: () => toast.info('Payment was not completed. You can try again.'),
        })
      );
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <Input
          label="Email used on the order"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>
      <Button type="submit" loading={mutation.isPending} className="sm:mt-6">
        Retry payment
      </Button>
      <span className="hidden" data-reference={reference} />
    </form>
  );
}

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const reference = params.get('reference');
  const cleared = useRef(false);
  const reduce = useReducedMotion();

  const { data, error, isLoading } = useQuery({
    queryKey: ['verify', reference],
    queryFn: () => api(`/payments/verify/${encodeURIComponent(reference)}`),
    enabled: Boolean(reference),
    retry: 1,
    // A payment may still be confirming: poll briefly while the server says "pending".
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 3000 : false),
  });

  const paid = data?.status === 'paid';
  useEffect(() => {
    if (paid && !cleared.current) {
      cleared.current = true;
      useCart.getState().clear();
    }
  }, [paid]);

  if (!reference) {
    return (
      <>
        <Seo title="Order" path="/order/success" />
        <div className="px-4 py-20 text-center">
          <p className="text-rose-50/70">
            We could not find a payment reference. Track your order instead.
          </p>
          <Button to="/track" className="mt-6">
            Track an order
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Order confirmed" path="/order/success" />
      <div className="bg-glow-radial relative isolate overflow-hidden px-4 pb-20 pt-14">
        <SparkleField className="opacity-70" />
        <div className="relative mx-auto max-w-xl text-center">
          {isLoading && (
            <div className="space-y-4" aria-live="polite">
              <Skeleton className="mx-auto h-36 w-36 rounded-full" />
              <p className="text-rose-50/70">Confirming your payment with Paystack…</p>
            </div>
          )}

          {error && (
            <Card className="p-6 text-left">
              <p role="alert" className="text-danger">
                {error.message}
              </p>
              <p className="mt-2 text-sm text-rose-50/65">
                If money left your account, do not pay again. Contact us and we will confirm it.
              </p>
            </Card>
          )}

          {data && paid && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-5"
            >
              <CheckBurst />
              <h1 className="text-4xl md:text-5xl">
                <MetalText>Thank you!</MetalText>
              </h1>
              <p className="text-rose-50/75">
                Order <strong className="text-rose-100">{data.order.orderNumber}</strong> is paid.
                We have emailed you the details.
              </p>
              <Card className="mt-6 space-y-3 p-5 text-left">
                {data.order.items.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <img
                      src={i.image || '/placeholders/product.svg'}
                      alt=""
                      className="h-12 w-12 rounded-lg object-contain bg-ink-900 p-1"
                    />
                    <span className="flex-1 text-rose-50/85">
                      {i.name}
                      {i.variantLabel ? ` · ${i.variantLabel}` : ''} × {i.qty}
                    </span>
                    <span className="tabular-nums">{formatPrice(i.lineTotal)}</span>
                  </div>
                ))}
                <Divider className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total paid</span>
                  <span className="tabular-nums">{formatPrice(data.order.total)}</span>
                </div>
              </Card>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button to={`/track`} variant="secondary">
                  Track this order
                </Button>
                <Button to="/shop">Keep shopping</Button>
              </div>
            </motion.div>
          )}

          {data && data.status === 'pending' && (
            <div className="space-y-4" aria-live="polite">
              <Skeleton className="mx-auto h-36 w-36 rounded-full" />
              <p className="text-rose-50/75">
                Almost there. Paystack is still confirming your payment.
              </p>
            </div>
          )}

          {data && (data.status === 'failed' || data.status === 'mismatch') && (
            <Card className="p-6 text-left">
              <h1 className="text-2xl">Payment not completed</h1>
              <p className="mt-2 text-sm text-rose-50/70">
                {data.status === 'mismatch'
                  ? 'The amount paid did not match the order, so it has been held for review. We will be in touch.'
                  : `No money was taken for ${data.order.orderNumber}. You can try again with the same order.`}
              </p>
              {data.status === 'failed' && (
                <RetryForm orderNumber={data.order.orderNumber} reference={reference} />
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
