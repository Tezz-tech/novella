import { Component } from 'react';
import Button from './ui/Button.jsx';
import Logo from './brand/Logo.jsx';

/**
 * Catches render errors so one broken component cannot blank the whole site. Shows a branded
 * fallback with a retry, and reports the error to the console (never to the page).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-20 text-center"
      >
        <Logo variant="mark" className="h-16 w-auto opacity-80" />
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="max-w-md text-rose-50/70">
          This part of the page could not load. Try again, or go back to the home page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={this.reset}>Try again</Button>
          <Button to="/" variant="secondary">
            Home
          </Button>
        </div>
      </div>
    );
  }
}
