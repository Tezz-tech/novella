# WhatsApp templates (submit these in Meta Business Manager)

All order messages go by WhatsApp only. The store has no email to customers. WhatsApp
requires that any message the store starts uses an **approved template**, so create these
templates, wait for approval, then set `WHATSAPP_TEMPLATE_LANG` to the language code you used
(e.g. `en`). Template names and parameter order must match exactly.

| Template name | Category | Sent to | Body (placeholders are the parameters, in order) |
|---|---|---|---|
| `owner_new_order` | Utility | Owner (`OWNER_WHATSAPP_NUMBER`) | `New paid order {{1}}. Customer: {{2}} ({{3}}). Total: {{4}}. Items: {{5}}. Delivery: {{6}}. {{7}}` |
| `order_received` | Utility | Customer | `Hi {{1}}, thank you! Order {{2}} is paid. Total: {{3}}. We will message you here as it moves.` |
| `order_status` | Utility | Customer | `Hi {{1}}, your order {{2}} is now {{3}}. {{4}}` |
| `password_reset` | Utility | Customer | `Hi {{1}}, use this link to reset your Novelle Tech password (valid for 30 minutes): {{2}}` |

Parameter meanings:

- `owner_new_order`: order number, customer name, customer phone, total (₦), item count,
  delivery address or "Pickup", and either "Stock OK" or the items that are short.
- `order_received`: first name, order number, total.
- `order_status`: first name, order number, the status in words (being prepared, on its way,
  delivered, cancelled), and a short note. For shipped orders the note holds the courier and tracking number.
- `password_reset`: first name, reset link.

## Setup checklist

1. Create a Meta app, add the **WhatsApp** product, and add a business phone number.
   Note the **Phone number ID** and create a permanent **System User** access token.
2. Put these in `server/.env`:
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `OWNER_WHATSAPP_NUMBER`.
3. The owner's personal number must be different from the business number. A business number
   cannot send to itself.
4. Submit the four templates above and wait for approval.
5. Test with a paid test order. The owner should get `owner_new_order` within seconds.

Without these settings the server logs each message instead of sending it, so the rest of the site still works.
