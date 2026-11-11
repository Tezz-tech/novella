import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate, formatPrice, STATUS_LABELS } from '../lib/format.js';
import { useAuth, useSetUser } from '../hooks/useAuth.js';
import { useWishlist } from '../store/wishlist.js';
import { toast } from '../store/toast.js';
import { useLogout } from './auth/AuthPages.jsx';
import Seo from '../components/seo/Seo.jsx';
import RequireAuth from '../components/auth/RequireAuth.jsx';
import Button from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import { Badge, EmptyState, Skeleton } from '../components/ui/display.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Modal } from '../components/ui/Overlay.jsx';

const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  phone: z.string().trim().max(20),
});

const addressSchema = z.object({
  label: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(2, 'Enter the recipient name'),
  phone: z.string().trim().min(7, 'Enter a phone number'),
  line1: z.string().trim().min(3, 'Enter the street address'),
  line2: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter the city or LGA'),
  state: z.string().min(2, 'Choose a state'),
  isDefault: z.boolean().optional(),
});

function ProfileTab({ user }) {
  const setUser = useSetUser();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? '' },
  });
  const mutation = useMutation({
    mutationFn: (values) => api('/me/profile', { method: 'PUT', body: values }),
    onSuccess: (u) => {
      setUser(u);
      toast.success('Profile saved');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className="max-w-xl">
      <CardHeader title="Your details" />
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-5 p-5">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email"
          value={user.email}
          readOnly
          disabled
          hint="Email cannot be changed here. Contact the store."
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Button type="submit" disabled={!isDirty} loading={mutation.isPending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function AddressForm({ initial, onDone }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initial?.label ?? 'Home',
      fullName: initial?.fullName ?? '',
      phone: initial?.phone ?? '',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? '',
      landmark: initial?.landmark ?? '',
      city: initial?.city ?? '',
      state: initial?.state ?? 'Lagos',
      isDefault: initial?.isDefault ?? false,
    },
  });
  const mutation = useMutation({
    mutationFn: (values) =>
      initial
        ? api(`/me/addresses/${initial._id}`, { method: 'PUT', body: values })
        : api('/me/addresses', { method: 'POST', body: values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', 'addresses'] });
      toast.success('Address saved');
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="grid gap-5 sm:grid-cols-2"
    >
      <Input
        label="Label"
        placeholder="Home, Office…"
        error={errors.label?.message}
        {...register('label')}
      />
      <Input
        label="Recipient name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <Input
        label="Phone"
        type="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Select label="State" error={errors.state?.message} {...register('state')}>
        {NIGERIAN_STATES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
      <div className="sm:col-span-2">
        <Input
          label="Street address"
          autoComplete="street-address"
          error={errors.line1?.message}
          {...register('line1')}
        />
      </div>
      <Input
        label="Address line 2 (optional)"
        error={errors.line2?.message}
        {...register('line2')}
      />
      <Input
        label="Landmark (optional)"
        error={errors.landmark?.message}
        {...register('landmark')}
      />
      <Input label="City or LGA" error={errors.city?.message} {...register('city')} />
      <label className="flex items-center gap-2.5 self-end pb-3 text-sm text-rose-50/85">
        <input type="checkbox" className="h-4 w-4 accent-rose-400" {...register('isDefault')} />
        Use as my default address
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" loading={mutation.isPending}>
          Save address
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressesTab() {
  const qc = useQueryClient();
  const { data: addresses, isLoading } = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => api('/me/addresses'),
  });
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const remove = useMutation({
    mutationFn: (id) => api(`/me/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', 'addresses'] });
      toast.info('Address removed');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-40 max-w-2xl" />;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-rose-50/70">{addresses?.length ?? 0} saved</p>
        <Button size="sm" onClick={() => setEditing('new')}>
          Add address
        </Button>
      </div>

      {addresses?.length === 0 && (
        <EmptyState title="No saved addresses" body="Add one now to check out faster." />
      )}

      <ul className="space-y-4">
        {addresses?.map((a) => (
          <li key={a._id}>
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-rose-50">
                  {a.label}
                  {a.isDefault && <Badge tone="gold">Default</Badge>}
                </p>
                <p className="text-rose-50/80">
                  {a.fullName} · {a.phone}
                </p>
                <p className="text-rose-50/70">
                  {[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}
                  <br />
                  {a.city}, {a.state}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="text-rose-200 underline underline-offset-4"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(a._id)}
                  className="text-rose-50/60 underline underline-offset-4 hover:text-danger"
                >
                  Delete
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        label={editing === 'new' ? 'Add address' : 'Edit address'}
      >
        <div className="max-h-[80vh] overflow-y-auto p-6">
          <h2 className="mb-5 text-xl">{editing === 'new' ? 'Add address' : 'Edit address'}</h2>
          {editing !== null && (
            <AddressForm
              key={editing === 'new' ? 'new' : editing._id}
              initial={editing === 'new' ? null : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

function OrdersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['account', 'orders'],
    queryFn: () => api('/me/orders'),
  });
  if (isLoading) return <Skeleton className="h-40 max-w-2xl" />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No orders yet"
        body="When you buy something, it will show up here with its status."
        action={
          <Button to="/shop" variant="secondary" size="sm">
            Start shopping
          </Button>
        }
      />
    );
  }
  return (
    <ul className="max-w-3xl divide-y divide-ink-700 rounded-card border border-ink-700 bg-ink-800">
      {data.map((o) => (
        <li key={o.orderNumber}>
          <Link
            to={`/account/orders/${o.orderNumber}`}
            className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-rose-400/5"
          >
            <div>
              <p className="text-sm text-rose-50">{o.orderNumber}</p>
              <p className="text-xs text-rose-50/60">
                {formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm tabular-nums text-rose-50">{formatPrice(o.total)}</p>
              <Badge tone={o.status === 'cancelled' ? 'danger' : 'pink'}>
                {STATUS_LABELS[o.status] ?? o.status}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function WishlistTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['account', 'wishlist'],
    queryFn: () => api('/me/wishlist'),
  });
  const remove = useWishlist((s) => s.remove);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (productIds) => api('/me/wishlist', { method: 'PUT', body: { productIds } }),
    onSuccess: (items) => {
      qc.setQueryData(['account', 'wishlist'], items);
      toast.info('Removed from wishlist');
    },
  });

  if (isLoading) return <Skeleton className="h-40 max-w-2xl" />;
  if (!data?.length) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        body="Tap the heart on anything you like."
        action={
          <Button to="/shop" variant="secondary" size="sm">
            Browse
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-3">
      {data.map((i) => (
        <li
          key={i.productId}
          className="flex flex-col rounded-card border border-ink-700 bg-ink-800 p-3"
        >
          <Link to={`/product/${i.slug}`}>
            <img
              src={i.image || '/placeholders/product.svg'}
              alt=""
              className="aspect-square w-full rounded-xl object-contain bg-ink-900 p-3"
              loading="lazy"
            />
            <span className="mt-2 line-clamp-2 block text-sm text-rose-50">{i.name}</span>
          </Link>
          <button
            type="button"
            className="mt-auto pt-3 text-left text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
            onClick={() => {
              remove(i.productId);
              save.mutate(data.filter((x) => x.productId !== i.productId).map((x) => x.productId));
            }}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function AccountHome() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const logout = useLogout();
  const navigate = useNavigate();
  const tab = params.get('tab') ?? 'orders';

  return (
    <>
      <Seo title="My account" path="/account" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-label text-rose-300">My account</p>
            <h1 className="mt-2 text-3xl md:text-4xl">Hi, {user.name.split(' ')[0]}</h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await logout();
              toast.info('You have logged out');
              navigate('/', { replace: true });
            }}
          >
            Log out
          </Button>
        </div>

        <Tabs
          label="Account sections"
          value={tab}
          onChange={(t) => setParams({ tab: t })}
          items={[
            { value: 'orders', label: 'Orders' },
            { value: 'addresses', label: 'Addresses' },
            { value: 'wishlist', label: 'Wishlist' },
            { value: 'profile', label: 'Profile' },
          ]}
        />
        <div role="tabpanel" className="pt-8">
          {tab === 'orders' && <OrdersTab />}
          {tab === 'addresses' && <AddressesTab />}
          {tab === 'wishlist' && <WishlistTab />}
          {tab === 'profile' && <ProfileTab user={user} />}
        </div>
      </div>
    </>
  );
}

export function AccountPage() {
  return (
    <RequireAuth>
      <AccountHome />
    </RequireAuth>
  );
}

/** One order, owned by the signed-in customer. Phase 5 fills it with real data; this shows the full shape. */
export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['account', 'order', orderNumber],
    queryFn: () => api(`/me/orders/${orderNumber}`),
  });

  return (
    <RequireAuth>
      <Seo title={`Order ${orderNumber}`} path={`/account/orders/${orderNumber}`} />
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-10 md:px-8">
        <Link to="/account" className="text-sm text-rose-200 underline underline-offset-4">
          ← Back to my account
        </Link>
        {isLoading && <Skeleton className="mt-6 h-64" />}
        {error && (
          <p role="alert" className="mt-6 text-danger">
            {error.message}
          </p>
        )}
        {order && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl">{order.orderNumber}</h1>
              <Badge tone={order.status === 'cancelled' ? 'danger' : 'pink'}>
                {STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <Card>
              <ul className="divide-y divide-ink-700">
                {order.items.map((i) => (
                  <li key={i._id} className="flex items-center justify-between gap-4 p-4 text-sm">
                    <span>
                      {i.name}
                      {i.variantLabel ? ` · ${i.variantLabel}` : ''} × {i.qty}
                    </span>
                    <span className="tabular-nums">{formatPrice(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-2 border-t border-ink-700 p-4 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Delivery</dt>
                  <dd className="tabular-nums">{formatPrice(order.deliveryFee)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Discount</dt>
                    <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPrice(order.total)}</dd>
                </div>
              </dl>
            </Card>
            {order.timeline?.length > 0 && (
              <Card>
                <CardHeader title="Progress" />
                <ol className="space-y-3 p-5 text-sm">
                  {order.timeline.map((t, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>
                        {STATUS_LABELS[t.status] ?? t.status}
                        {t.note ? ` — ${t.note}` : ''}
                      </span>
                      <span className="text-rose-50/55">{formatDate(t.at)}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
