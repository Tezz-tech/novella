# 04 — Paystack Integration

Base URL `https://api.paystack.co`, header `Authorization: Bearer
${PAYSTACK_SECRET_KEY}`. Amounts are in the **subunit** (kobo for NGN:
₦1 = 100). Develop with test keys and use Paystack's test cards.

## Flow

```
Client                     Server                              Paystack
  | POST /api/orders  ---->  validate + re-price from DB
  |                          check stock (no deduction yet)
  |                          create Order(pending_payment, reference=NVT-<orderNo>-<rand>)
  |                          POST /transaction/initialize  ---->  {authorization_url, access_code, reference}
  | <---- {reference, accessCode, authorizationUrl}
  | open Paystack Popup (resumeTransaction(accessCode)) — fallback: redirect to authorizationUrl
  |                                                    <---- customer pays
  |                          webhook charge.success  <----------
  |                          verify signature → verify transaction → mark paid (idempotent)
  | onSuccess / callback_url → /order/success?reference=...
  | GET /api/payments/verify/:reference → server verifies with GET /transaction/verify/:reference
  | <---- order summary (paid)
```

### Initialize (server)

`POST /transaction/initialize` with:
```json
{
  "email": "customer@email.com",
  "amount": 125000000,
  "currency": "NGN",
  "reference": "NVT-2611-00042-8F3K",
  "callback_url": "${CLIENT_URL}/order/success",
  "metadata": {
    "orderId": "...", "orderNumber": "NVT-2611-00042",
    "custom_fields": [{ "display_name": "Order", "variable_name": "order", "value": "NVT-2611-00042" }]
  }
}
```
Save `access_code` and `reference` on the order.

### Client

Use `@paystack/inline-js`: `new PaystackPop().resumeTransaction(accessCode)`
with `onSuccess` → navigate to the success page, and `onCancel` → show the
"Payment not completed — Retry" state. Never pass the amount from the client.

### Confirming a payment (shared `confirmPayment(reference, source)` service)

1. `GET /transaction/verify/:reference`.
2. Accept only when `data.status === "success"` **and** `data.amount ===
   order.total` **and** `data.currency === order.currency` **and**
   the reference matches the order.
3. In a MongoDB transaction (or an atomic conditional update):
   - Update the order only if `paymentStatus !== 'paid'` (idempotent).
   - Set `paymentStatus: 'paid'`, `status: 'paid'`, payment fields
     (channel, paidAt, fees, last4, cardType), and add a timeline entry.
   - Deduct stock atomically per variant (and per combo child). If a variant has
     run out in the meantime, still mark as paid, but flag
     `stockIssue: true` and alert the admin (never lose a paid order).
   - Increment `soldCount` and coupon `usedCount`.
4. Write a Payment row.
5. After the commit: email the customer + admin.
6. Amount mismatch → `paymentStatus: 'failed'`, flag for admin review, and do not fulfil.

### Webhook `POST /api/payments/paystack/webhook`

- Mount with `express.raw({ type: 'application/json' })` **before**
  `express.json()` for this path only.
- Signature: `crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')`
  must equal the `x-paystack-signature` header (use `timingSafeEqual`). If not, return 401.
- Return `200` quickly, then process:
  - `charge.success` → `confirmPayment(reference, 'webhook')` (it re-verifies through the API).
  - `refund.processed` / `refund.failed` → update the Refund + order paymentStatus.
- Log every event in Payment (dedupe by reference + event).
- The webhook URL to put in the Paystack dashboard:
  `https://<api-domain>/api/payments/paystack/webhook`. For local testing,
  use ngrok or Cloudflare Tunnel; document this in the README.

### Refunds (admin)

`POST /refund` with `{ transaction: reference, amount?, merchant_note, customer_note }`.
Save the Refund as `pending`. The webhook or a re-check updates it. A full
refund → `refunded`, a part refund → `partially_refunded`. Optionally put
stock back (checkbox in the admin modal).

### Admin re-verify

The button on order/payment screens calls `confirmPayment(reference, 'admin_reverify')`.
This fixes orders where a webhook was missed.

## Tests (required)

- Signature: valid passes, tampered body fails.
- Idempotency: calling the webhook twice deducts stock once.
- Amount mismatch is rejected.
- Client-sent price is ignored (`POST /orders` with a fake price still charges the DB price).
- Mock Paystack HTTP with `nock`.
