import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// Self-hosted fonts (no runtime requests to Google).
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';

// Brand tokens (single source of truth) and app styles.
import '../../brand/tokens.css';
import './index.css';

import App from './App.jsx';

// Open the connection to the API early (saves a round trip on the first data request).
try {
  const apiOrigin = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').origin;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = apiOrigin;
  document.head.appendChild(link);
} catch {
  /* invalid URL in env: skip the hint */
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
