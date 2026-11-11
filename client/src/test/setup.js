import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals are off, so unmount rendered trees between tests ourselves.
afterEach(() => cleanup());

// jsdom lacks these browser APIs, which framer-motion and the scroll reveals rely on.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver ??= ObserverStub;
window.ResizeObserver ??= ObserverStub;
