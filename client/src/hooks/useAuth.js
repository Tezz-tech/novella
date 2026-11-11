import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';

export const ME_KEY = ['me'];

/** The signed-in customer, or null. A 401 simply means "logged out", not an error. */
export function useAuth() {
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api('/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { user: query.data ?? null, loading: query.isLoading, refetch: query.refetch };
}

export function useSetUser() {
  const qc = useQueryClient();
  return (user) => qc.setQueryData(ME_KEY, user);
}
