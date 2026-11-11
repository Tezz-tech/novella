import { useLocation } from 'react-router-dom';
import { EmptyState } from '../components/ui/display.jsx';
import Button from '../components/ui/Button.jsx';

/** Temporary page for routes built in later phases. */
export default function ComingSoon({ title = 'Coming soon' }) {
  const { pathname } = useLocation();
  return (
    <EmptyState
      title={title}
      body={`This page (${pathname}) is part of a later build phase.`}
      action={
        <Button to="/" variant="secondary" size="sm">
          Back to home
        </Button>
      }
    />
  );
}
