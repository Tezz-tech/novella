import { useEffect } from 'react';
import { toast } from '../../store/toast.js';

/** Tells the shopper when the connection drops and when it returns. */
export default function ConnectionWatch() {
  useEffect(() => {
    let wasOffline = !navigator.onLine;
    const offline = () => {
      wasOffline = true;
      toast.error(
        'You are offline. Your cart is saved on this device, but prices and checkout need a connection.',
        { duration: 0 }
      );
    };
    const online = () => {
      if (wasOffline) toast.success('Back online');
      wasOffline = false;
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);
  return null;
}
