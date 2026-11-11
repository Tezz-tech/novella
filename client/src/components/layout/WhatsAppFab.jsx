import { useReducedMotion } from 'framer-motion';
import { useSettings } from '../../lib/queries.js';

/** Floating WhatsApp button. Hidden if no number is configured. */
export default function WhatsAppFab() {
  const reduce = useReducedMotion();
  const { data } = useSettings();
  const number = (import.meta.env.VITE_WHATSAPP_NUMBER || data?.contact?.whatsapp || '').replace(
    /\D/g,
    ''
  );
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent('Hi Novelle Tech, I have a question.')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-metal text-ink-950 shadow-glow transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
    >
      {!reduce && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-rose-400/30"
        />
      )}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="relative"
      >
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4.3-.4c.1-.1.1-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.4 3.9 3.4 2.3.9 2.3.6 2.7.6.4 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
      </svg>
    </a>
  );
}
