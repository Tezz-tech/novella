import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { Input } from '../ui/Field.jsx';
import Button from '../ui/Button.jsx';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

/** Newsletter signup (React Hook Form + Zod). The server stores the email idempotently. */
export default function Newsletter({ source = 'footer' }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const mutation = useMutation({
    mutationFn: (values) => api('/newsletter', { method: 'POST', body: { ...values, source } }),
    onSuccess: () => {
      toast.success('You are on the list. Expect pretty deals.');
      reset();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="text-center">
      <h2 className="text-2xl md:text-3xl">Get first access to deals</h2>
      <p className="mt-2 text-sm text-rose-50/65">
        One email when new combos and restocks land. No spam.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <Button type="submit" loading={mutation.isPending} className="sm:mt-6">
          Subscribe
        </Button>
      </div>
    </form>
  );
}
