import { create } from 'zustand';

/** Transient UI state (not persisted). */
export const useUi = create((set) => ({
  cartOpen: false,
  menuOpen: false,
  introDone: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setIntroDone: (introDone) => set({ introDone }),
}));
