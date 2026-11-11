import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, useSetUser } from '../hooks/useAuth.js';
import Logo from '../components/brand/Logo.jsx';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import Seo from '../components/seo/Seo.jsx';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter your work email'),
  password: z.string().min(1, 'Enter your password'),
});
const RANK = { customer: 0, staff: 1, admin: 2, owner: 3 };

/** Admin sign-in. Customers are told plainly that the admin is staff-only. */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const setUser = useSetUser();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && RANK[user.role] >= RANK.staff) navigate('/admin', { replace: true });
  }, [user, navigate]);

  const mutation = useMutation({
    mutationFn: (v) => api('/auth/login', { method: 'POST', body: v }),
    onSuccess: (u) => {
      if (RANK[u.role] < RANK.staff) {
        setError('root', { message: 'This account does not have admin access.' });
        return;
      }
      setUser(u);
      navigate(location.state?.from?.startsWith('/admin') ? location.state.from : '/admin', {
        replace: true,
      });
    },
    onError: (err) => setError('root', { message: err.message }),
  });

  return (
    <>
      <Seo title="Admin log in" path="/admin/login" />
      <div className="bg-glow-radial relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-4 py-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-900/95 p-8 shadow-glow-sm"
        >
          <div className="relative mx-auto mb-6 w-fit overflow-hidden">
            <Logo variant="mark" className="h-20 w-auto" />
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-10 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                initial={{ left: '-30%' }}
                animate={{ left: '130%' }}
                transition={{
                  delay: 0.4,
                  duration: 1.1,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 4,
                }}
              />
            )}
          </div>
          <h1 className="text-center text-xl text-rose-50">Store admin</h1>
          <p className="mb-6 text-center text-xs text-rose-50/55">For the Novelle Tech team only</p>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
            {errors.root && (
              <p
                role="alert"
                className="rounded-xl border border-danger/50 px-3 py-2 text-sm text-danger"
              >
                {errors.root.message}
              </p>
            )}
            <Input
              label="Work email"
              type="email"
              autoComplete="username"
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
            <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
              Log in
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
}
