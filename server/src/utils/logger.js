/* Minimal logger. Swap for pino later if log volume grows. */
const stamp = () => new Date().toISOString();

export const logger = {
  info: (msg) => console.log(`[${stamp()}] INFO  ${msg}`),
  warn: (msg) => console.warn(`[${stamp()}] WARN  ${msg}`),
  error: (msg, err) => {
    console.error(`[${stamp()}] ERROR ${msg}`);
    if (err?.stack && process.env.NODE_ENV !== 'production') console.error(err.stack);
  },
};
