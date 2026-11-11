import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import App from './App.jsx';
import { useUi } from './store/ui.js';

function renderAt(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('app shell', () => {
  beforeEach(() => {
    sessionStorage.setItem('novelle-intro-seen', '1');
    useUi.setState({ introDone: true, cartOpen: false });
  });

  it('shows the header with the logo and main navigation', async () => {
    renderAt('/about');
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novelle Tech home' })).toBeInTheDocument();
  });

  it('renders the branded 404 for unknown routes', async () => {
    renderAt('/this-does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('offers a skip link to the main content', async () => {
    renderAt('/about');
    expect(await screen.findByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#content'
    );
  });
});
