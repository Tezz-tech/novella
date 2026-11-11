import PaystackPop from '@paystack/inline-js';

/**
 * Opens the Paystack popup for an existing transaction (the server created it and sent access_code).
 * The amount is never sent from here. If the popup cannot open, the customer is redirected to
 * Paystack's hosted page (docs/04-paystack.md, "redirect as a fallback").
 */
export function openPaystack({ accessCode, authorizationUrl, onSuccess, onCancel }) {
  try {
    const popup = new PaystackPop();
    popup.resumeTransaction(accessCode, {
      onSuccess: (transaction) => onSuccess?.(transaction),
      onCancel: () => onCancel?.(),
      onError: () => onCancel?.(),
    });
  } catch {
    if (authorizationUrl) window.location.assign(authorizationUrl);
    else onCancel?.();
  }
}
