import { lazy } from 'react';

/**
 * Lazy-loads one admin page. Uses the named export when a page has one, otherwise the default
 * export, so every page works however it is exported.
 */
export const lazyPage = (importFn, name) =>
  lazy(() =>
    importFn().then((m) => {
      const component = m[name] ?? m.default;
      if (!component) throw new Error(`Admin page "${name}" has no component export`);
      return { default: component };
    })
  );
