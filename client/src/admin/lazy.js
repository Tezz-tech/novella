import { lazy } from 'react';

/** Lazy-loads one named export of an admin page, so the admin code ships only when opened. */
export const lazyPage = (importFn, name) =>
  lazy(() => importFn().then((m) => ({ default: m[name] })));
