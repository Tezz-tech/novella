import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';
import { keys, useDeliveryZones } from '../lib/queries.js';
import { formatPrice } from '../lib/format.js';
import { openPaystack } from '../lib/paystack.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import Seo from '../components/seo/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { Input, Select, Textarea } from '../components/ui/Field.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { EmptyState, Skeleton } from '../components/ui/display.jsx';

const STEPS = ['Contact', 'Delivery', 'Review & pay'];
const PHONE = /^\+?[0-9\s-]{7,20}$/;

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: z.string().trim().regex(PHONE, 'Enter a valid phone number'),
    method: z.enum(['delivery', 'pickup']),
    line1: z.string().trim().optional(),
    line2: z.string().trim().optional(),
    landmark: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().optional(),
    notes: z.string().trim().max(300).optional(),
    createAccount: z.boolean().optional(),
    password: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === 'delivery') {
      if (!v.line1 || v.line1.length < 3)
        ctx.addIssue({ code: 'custom', path: ['line1'], message: 'Enter the street address' });
      if (!v.city || v.city.length < 2)
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Enter the city or LGA' });
      if (!v.state) ctx.addIssue({ code: 'custom', path: ['state'], message: 'Choose a state' });
    }
    if (
      v.createAccount &&
      (!v.password ||
        v.password.length < 8 ||
        !/[A-Za-z]/.test(v.password) ||
        !/\d/.test(v.password))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'At least 8 characters, with a letter and a number',
      });
    }
  });

const STEP_FIELDS = [['name', 'email', 'phone'], ['method', 'line1', 'city', 'state'], []];

function StepIndicator({ step }) {
  const reduce = useReducedMotion();
  return (
    <ol className="mb-8 flex items-center gap-3" aria-label="Checkout progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
              i <= step
                ? 'border-rose-400 bg-rose-400/20 text-rose-50'
                : 'border-ink-700 text-rose-50/50'
            }`}
            aria-current={i === step ? 'step' : undefined}
          >
            {i + 1}
          </span>
          <span
            className={`hidden text-xs uppercase tracking-label sm:inline ${i <= step ? 'text-rose-100' : 'text-rose-50/50'}`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="relative h-px flex-1 overflow-hidden bg-ink-700">
              <motion.span
                className="absolute inset-0 origin-left bg-gradient-to-r from-rose-300 to-rose-400"
                initial={false}
                animate={{ scaleX: i < step ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function ContactStep({ form, user }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
      </div>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Phone"
        type="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />
      {!user && (
        <label className="flex items-start gap-3 text-sm text-rose-50/85 md:col-span-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-rose-400"
            {...register('createAccount')}
          />
          <span>
            Create an account with these details, so you can track orders and save addresses.
          </span>
        </label>
      )}
      {!user && form.watch('createAccount') && (
        <div className="md:col-span-2">
          <Input
            label="Choose a password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>
      )}
    </div>
  );
}

function DeliveryStep({ form, addresses, zones }) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const method = watch('method');
  const states = useMemo(() => [...new Set((zones ?? []).map((z) => z.state))].sort(), [zones]);

  const applySaved = (a) => {
    setValue('line1', a.line1);
    setValue('line2', a.line2 ?? '');
    setValue('landmark', a.landmark ?? '');
    setValue('city', a.city);
    setValue('state', a.state);
  };

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Delivery method</legend>
        {[
          ['delivery', 'Deliver to me', 'Fee is calculated for your state'],
          ['pickup', 'Pick up', 'Collect from our store. No fee.'],
        ].map(([value, title, body]) => (
          <label
            key={value}
            className={`flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors ${
              method === value
                ? 'border-rose-400 bg-rose-400/10 shadow-glow-sm'
                : 'border-ink-700 hover:border-rose-400/50'
            }`}
          >
            <span className="flex items-center gap-2 text-rose-50">
              <input
                type="radio"
                value={value}
                className="accent-rose-400"
                {...register('method')}
              />
              {title}
            </span>
            <span className="text-xs text-rose-50/60">{body}</span>
          </label>
        ))}
      </fieldset>

      <AnimatePresence initial={false}>
        {method === 'delivery' && (
          <motion.div
            key="address"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            {addresses?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => applySaved(a)}
                    className="rounded-pill border border-ink-700 px-3 py-1.5 text-xs text-rose-50/80 hover:border-rose-400/60"
                  >
                    Use {a.label}
                    {a.isDefault ? ' (default)' : ''}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Street address"
                  autoComplete="street-address"
                  error={errors.line1?.message}
                  {...register('line1')}
                />
              </div>
              <Input label="Address line 2 (optional)" {...register('line2')} />
              <Input
                label="Landmark (optional)"
                hint="Nearest bus stop, gate colour or building"
                {...register('landmark')}
              />
              <Input label="City or LGA" error={errors.city?.message} {...register('city')} />
              <Select label="State" error={errors.state?.message} {...register('state')}>
                <option value="">Choose a state</option>
                {states.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              <div className="md:col-span-2">
                <Textarea
                  label="Delivery notes (optional)"
                  error={errors.notes?.message}
                  {...register('notes')}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useCart((s) => s.items);
  const { data: zones } = useDeliveryZones();
  const [step, setStep] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [pending, setPending] = useState(null); // { orderNumber, reference, accessCode, authorizationUrl }
  const reduce = useReducedMotion();

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      method: 'delivery',
      line1: '',
      line2: '',
      landmark: '',
      city: '',
      state: '',
      notes: '',
      createAccount: false,
      password: '',
    },
  });
  const { watch, reset, trigger, getValues } = form;
  const method = watch('method');
  const state = watch('state');
  const city = watch('city');

  // Prefill from the account once it loads.
  useEffect(() => {
    if (user) {
      reset({ ...getValues(), name: user.name, email: user.email, phone: user.phone ?? '' });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: addresses } = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => api('/me/addresses'),
    enabled: Boolean(user),
  });

  useEffect(() => {
    const def = addresses?.find((a) => a.isDefault);
    if (def && !getValues('line1')) {
      form.setValue('line1', def.line1);
      form.setValue('line2', def.line2 ?? '');
      form.setValue('landmark', def.landmark ?? '');
      form.setValue('city', def.city);
      form.setValue('state', def.state);
    }
  }, [addresses]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
  const quoteArgs = {
    items: lines,
    state: method === 'delivery' ? state || undefined : undefined,
    city: method === 'delivery' ? city || undefined : undefined,
    method,
    coupon: coupon || undefined,
  };
  const {
    data: quote,
    isFetching,
    error: quoteError,
  } = useQuery({
    queryKey: keys.quote(lines, {
      state: quoteArgs.state,
      city: quoteArgs.city,
      method,
      coupon: quoteArgs.coupon,
    }),
    queryFn: ({ signal }) => api('/cart/quote', { method: 'POST', body: quoteArgs, signal }),
    enabled: lines.length > 0,
    staleTime: 10_000,
  });

  const couponMessage = quote?.coupon ? quote.coupon.message : null;
  const blocked =
    !quote || quote.hasIssues || (method === 'delivery' && quote.delivery?.needsAddress);

  const placeOrder = useMutation({
    mutationFn: (values) => {
      const body = {
        items: lines,
        customer: { name: values.name, email: values.email, phone: values.phone },
        method: values.method,
        ...(values.method === 'delivery'
          ? {
              address: {
                line1: values.line1,
                line2: values.line2 || undefined,
                landmark: values.landmark || undefined,
                city: values.city,
                state: values.state,
              },
            }
          : {}),
        notes: values.notes || undefined,
        coupon: coupon || undefined,
        ...(values.createAccount && !user
          ? { createAccount: true, password: values.password }
          : {}),
      };
      return api('/orders', { method: 'POST', body });
    },
    onSuccess: (data) => {
      if (data.accountCreated)
        toast.success('Your account is ready. We have saved your order to it.');
      startPayment(data);
    },
    onError: (err) => {
      const orderNumber =
        err instanceof ApiError ? err.errors?.find((e) => e.path === 'orderNumber')?.message : null;
      if (orderNumber)
        setPending({
          orderNumber,
          reference: null,
          accessCode: null,
          authorizationUrl: null,
          failed: true,
        });
      toast.error(err.message);
    },
  });

  const startPayment = (data) => {
    setPending(data);
    openPaystack({
      accessCode: data.accessCode,
      authorizationUrl: data.authorizationUrl,
      onSuccess: (t) =>
        navigate(`/order/success?reference=${encodeURIComponent(t.reference ?? data.reference)}`),
      onCancel: () => toast.info('Payment was not completed. You can retry below.'),
    });
  };

  const retry = useMutation({
    mutationFn: (email) =>
      api(`/orders/${pending.orderNumber}/retry-payment`, { method: 'POST', body: { email } }),
    onSuccess: (data) => startPayment(data),
    onError: (err) => toast.error(err.message),
  });

  const next = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  if (items.length === 0 && !pending) {
    return (
      <>
        <Seo title="Checkout" path="/checkout" />
        <EmptyState
          title="Your cart is empty"
          body="Add something pretty first."
          action={
            <Button to="/shop" variant="secondary">
              Shop gadgets
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <Seo title="Checkout" path="/checkout" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <h1 className="mb-6 text-4xl md:text-5xl">Checkout</h1>
        <StepIndicator step={step} />

        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <form noValidate onSubmit={(e) => e.preventDefault()} className="min-h-[24rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={step}
                aria-label={STEPS[step]}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                {step === 0 && <ContactStep form={form} user={user} />}
                {step === 1 && <DeliveryStep form={form} addresses={addresses} zones={zones} />}
                {step === 2 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader
                        title="Your details"
                        action={
                          <button
                            type="button"
                            className="text-xs text-rose-200 underline underline-offset-4"
                            onClick={() => setStep(0)}
                          >
                            Edit
                          </button>
                        }
                      />
                      <div className="space-y-1 p-5 text-sm text-rose-50/80">
                        <p>
                          {watch('name')} · {watch('phone')}
                        </p>
                        <p>{watch('email')}</p>
                        <p>
                          {method === 'pickup'
                            ? 'Pickup from our store'
                            : `${watch('line1')}, ${watch('city')}, ${watch('state')}`}
                        </p>
                      </div>
                    </Card>
                    <div className="flex gap-3">
                      <Input
                        label="Coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Have a code?"
                      />
                      <Button
                        variant="secondary"
                        className="mt-6 shrink-0"
                        onClick={() => setCoupon(couponInput.trim())}
                        disabled={!couponInput.trim()}
                      >
                        Apply
                      </Button>
                    </div>
                    {couponMessage && (
                      <p
                        className={`text-sm ${quote.coupon.valid ? 'text-success' : 'text-spark-400'}`}
                      >
                        {couponMessage}
                      </p>
                    )}
                    {quote?.lines?.some((l) => l.warning) && (
                      <ul
                        className="space-y-2 rounded-2xl border border-spark-400/50 p-4 text-sm text-spark-400"
                        role="alert"
                      >
                        {quote.lines
                          .filter((l) => l.warning)
                          .map((l) => (
                            <li key={l.variantId}>
                              {l.name}: {l.warning}
                            </li>
                          ))}
                      </ul>
                    )}
                    {pending?.failed && (
                      <p role="alert" className="text-sm text-danger">
                        We could not start the payment. Your order {pending.orderNumber} is saved;
                        try again in a moment.
                      </p>
                    )}
                    {pending && !pending.failed && (
                      <Card className="border-rose-400/50 p-5">
                        <p className="text-sm text-rose-50">
                          Payment for <strong>{pending.orderNumber}</strong> was not completed.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            loading={retry.isPending}
                            onClick={() => retry.mutate(getValues('email'))}
                          >
                            Retry payment
                          </Button>
                          <Link
                            to="/track"
                            className="self-center text-sm text-rose-200 underline underline-offset-4"
                          >
                            Track this order
                          </Link>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </motion.section>
            </AnimatePresence>

            <div className="mt-10 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                  ← Back
                </Button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <Button
                  size="lg"
                  disabled={blocked || isFetching || Boolean(pending && !pending.failed)}
                  loading={placeOrder.isPending}
                  onClick={form.handleSubmit(
                    (values) => placeOrder.mutate(values),
                    () => setStep(0)
                  )}
                >
                  Pay {quote ? formatPrice(quote.total) : ''}
                </Button>
              )}
            </div>
          </form>

          <aside
            aria-label="Order summary"
            className="h-fit space-y-4 rounded-card border border-ink-700 bg-ink-800 p-6 lg:sticky lg:top-28"
          >
            <h2 className="text-lg text-rose-50">Summary</h2>
            {quoteError && (
              <p role="alert" className="text-sm text-danger">
                {quoteError.message}
              </p>
            )}
            {!quote && !quoteError && <Skeleton className="h-40 w-full" />}
            {quote && (
              <>
                <ul className="space-y-3 text-sm">
                  {quote.lines.map((l) => (
                    <li key={l.variantId} className="flex justify-between gap-3">
                      <span className="text-rose-50/85">
                        {l.name}
                        {l.label ? ` · ${l.label}` : ''} × {l.qty}
                      </span>
                      <span className="tabular-nums">{formatPrice(l.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="space-y-2 border-t border-ink-700 pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(quote.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Delivery</dt>
                    <dd className="tabular-nums">
                      {method === 'pickup'
                        ? 'Pickup'
                        : quote.delivery.needsAddress
                          ? 'Add address'
                          : quote.delivery.freeDelivery
                            ? 'Free'
                            : formatPrice(quote.deliveryFee)}
                    </dd>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>Discount</dt>
                      <dd className="tabular-nums">−{formatPrice(quote.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-ink-700 pt-3 text-base">
                    <dt className="text-rose-50">Total</dt>
                    <dd className="font-semibold tabular-nums text-rose-50">
                      {formatPrice(quote.total)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
            <p className="text-xs text-rose-50/55">
              Prices are checked by our server. Paid securely with Paystack.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
