import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { ME_KEY, useAuth, useSetUser } from '../../hooks/useAuth.js';
import Seo from '../../components/seo/Seo.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { Divider } from '../../components/ui/display.jsx';
import { Reveal } from '../../components/motion/Reveal.jsx';
import { toast } from '../../store/toast.js';

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use at least one letter and one number');

const emailField = z.string().trim().toLowerCase().email('Enter a valid email address');

/** Shared frame for the auth pages: centred, glass card, brand divider. */
function AuthShell({ title, eyebrow, children, footer }) {
  return (
    <div className="bg-glow-radial px-4 py-14 md:py-24">
      <Reveal className="mx-auto w-full max-w-md rounded-card border border-ink-700 bg-ink-900/90 p-7 shadow-glow-sm md:p-9">
        <p className="text-xs uppercase tracking-label text-rose-300">{eyebrow}</p>
        <h1 className="mt-2 text-3xl">{title}</h1>
        <Divider className="my-6" />
        {children}
        {footer && <div className="mt-6 text-center text-sm text-rose-50/70">{footer}</div>}
      </Reveal>
    </div>
  );
}

const schema = z.object({ email: emailField, password: z.string().min(1, 'Enter your password') });

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useSetUser();
  const next = params.get('next');
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate(next || '/account', { replace: true });
  }, [user, next, navigate]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (values) => api('/auth/login', { method: 'POST', body: values }),
    onSuccess: (u) => {
      setUser(u);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      navigate(next && next.startsWith('/') ? next : '/account', { replace: true });
    },
    onError: (err) => setError('root', { message: err.message }),
  });

  return (
    <>
      <Seo title="Log in" path="/login" />
      <AuthShell
        eyebrow="Your account"
        title="Log in"
        footer={
          <>
            New here?{' '}
            <Link to="/register" className="text-rose-200 underline underline-offset-4">
              Create an account
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-5">
          {errors.root && (
            <p
              role="alert"
              className="rounded-xl border border-danger/50 px-4 py-3 text-sm text-danger"
            >
              {errors.root.message}
            </p>
          )}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-rose-200 underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            Log in
          </Button>
        </form>
      </AuthShell>
    </>
  );
}

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: emailField,
  phone: z.string().trim().max(20).optional(),
  password,
});

export function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useSetUser();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });
  const mutation = useMutation({
    mutationFn: (values) => api('/auth/register', { method: 'POST', body: values }),
    onSuccess: (u) => {
      setUser(u);
      toast.success('Your account is ready');
      navigate('/account', { replace: true });
    },
    onError: (err) => setError('root', { message: err.message }),
  });

  return (
    <>
      <Seo title="Create account" path="/register" />
      <AuthShell
        eyebrow="Join Novelle Tech"
        title="Create account"
        footer={
          <>
            Already a member?{' '}
            <Link to="/login" className="text-rose-200 underline underline-offset-4">
              Log in
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-5">
          {errors.root && (
            <p
              role="alert"
              className="rounded-xl border border-danger/50 px-4 py-3 text-sm text-danger"
            >
              {errors.root.message}
            </p>
          )}
          <Input
            label="Full name"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            Create account
          </Button>
        </form>
      </AuthShell>
    </>
  );
}

const forgotSchema = z.object({ email: emailField });

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: zodResolver(forgotSchema) });
  const mutation = useMutation({
    mutationFn: (values) => api('/auth/forgot-password', { method: 'POST', body: values }),
    onSuccess: (data) => {
      toast.info(data.message);
      reset();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <Seo title="Forgot password" path="/forgot-password" />
      <AuthShell
        eyebrow="Account help"
        title="Reset your password"
        footer={
          <Link to="/login" className="text-rose-200 underline underline-offset-4">
            Back to log in
          </Link>
        }
      >
        <p className="mb-6 text-sm text-rose-50/70">
          Enter your email and we will send a reset link, valid for 30 minutes.
        </p>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            Send reset link
          </Button>
        </form>
      </AuthShell>
    </>
  );
}

const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetSchema) });
  const mutation = useMutation({
    mutationFn: (values) =>
      api('/auth/reset-password', { method: 'POST', body: { token, password: values.password } }),
    onSuccess: (data) => {
      toast.success(data.message);
      navigate('/login', { replace: true });
    },
    onError: (err) => setError('root', { message: err.message }),
  });

  return (
    <>
      <Seo title="Reset password" path={`/reset-password/${token}`} />
      <AuthShell eyebrow="Account help" title="Choose a new password">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-5">
          {errors.root && (
            <p
              role="alert"
              className="rounded-xl border border-danger/50 px-4 py-3 text-sm text-danger"
            >
              {errors.root.message}
            </p>
          )}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            Save new password
          </Button>
        </form>
      </AuthShell>
    </>
  );
}

/** Log out: clears the server cookie, then the cached user and any account data. */
export function useLogout() {
  const qc = useQueryClient();
  const setUser = useSetUser();
  return async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      qc.removeQueries({ queryKey: ['account'] });
      qc.invalidateQueries({ queryKey: ME_KEY });
    }
  };
}
