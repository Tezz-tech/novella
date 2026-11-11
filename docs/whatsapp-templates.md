# WhatsApp template (submit in Meta Business Manager)

The store sends one automatic WhatsApp message: an alert to the owner for each paid order.
WhatsApp only lets a business start a message with an **approved template**, so submit this
template, wait for approval, then set `WHATSAPP_TEMPLATE_LANG` to the language you used (e.g. `en`).

| Template name | Category | Sent to | Body (placeholders are parameters, in order) |
|---|---|---|---|
| `owner_new_order` | Utility | Owner (`OWNER_WHATSAPP_NUMBER`) | `New paid order {{1}}. Customer: {{2}} ({{3}}). Total: {{4}}. Items: {{5}}. Delivery: {{6}}. {{7}}` |

Parameters: order number, customer name, customer phone, total (₦), item count, delivery
address or "Pickup", and either "Stock OK" or the items that are short.

## Setup

1. Create a Meta app, add the WhatsApp product, and register a business phone number. Note the
   **Phone number ID** and create a permanent **System User** access token.
2. Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` and `OWNER_WHATSAPP_NUMBER` in `server/.env`.
3. The owner's personal number must differ from the business number.
4. Submit the template above and wait for approval.

Without these settings the server logs the alert instead of sending it, so the site still works.
