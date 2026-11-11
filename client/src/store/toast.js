import { create } from 'zustand';

let nextId = 1;

/** Toast queue. Use toast.success(...) etc. from anywhere, including outside React. */
export const useToasts = create((set, get) => ({
  items: [],
  push: (toast) => {
    const id = nextId++;
    set({ items: [...get().items, { id, tone: 'info', duration: 3800, ...toast }] });
    return id;
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message, opts) => useToasts.getState().push({ tone: 'success', message, ...opts }),
  error: (message, opts) => useToasts.getState().push({ tone: 'danger', message, ...opts }),
  info: (message, opts) => useToasts.getState().push({ tone: 'info', message, ...opts }),
};
