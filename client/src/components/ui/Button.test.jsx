import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Button from './Button.jsx';

describe('Button', () => {
  it('renders a router link when given a destination', () => {
    render(
      <MemoryRouter>
        <Button to="/shop">Shop</Button>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop');
  });

  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Pay now</Button>);
    const btn = screen.getByRole('button', { name: 'Pay now' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});
