import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('Phase 0 placeholder', () => {
  it('shows the brand logo with alt text and the tagline', () => {
    render(<App />);
    expect(screen.getByText('NOVELLE')).toBeInTheDocument();
    expect(screen.getByText(/Smart Deals\. Pretty Prices\./)).toBeInTheDocument();
  });

  it('exposes a skip link to the content', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#content'
    );
  });
});
