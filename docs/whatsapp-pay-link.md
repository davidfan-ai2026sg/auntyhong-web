# WhatsApp order → pay link

Hong (CS bot) creates a pending shop order and sends the customer a pay URL.

## Auth

Header (either):

- `Authorization: Bearer <WA_ORDER_API_KEY>`
- `x-wa-order-key: <WA_ORDER_API_KEY>`

## Create order

`POST /api/wa/orders`

```json
{
  "client_order_id": "optional-idempotency-key",
  "wa_id": "6598881215",
  "customer_name": "David",
  "fulfillment": "pickup",
  "address": "",
  "notes": "Confirmed on WhatsApp",
  "lines": [
    {
      "slug": "lucky-duo-cookies-giftset",
      "qty": 2,
      "options": {
        "Cookie Tin #1": "Melty Kuih Bangkit",
        "Cookie Tin #2": "Malty Cashew Bars"
      }
    }
  ]
}
```

Response `201`:

```json
{
  "orderId": 12,
  "order_no": "AH20260905-012",
  "payUrl": "https://auntyhong-web.vercel.app/pay/12",
  "total": 132,
  "totalCents": 13200,
  "status": "pending_payment",
  "currency": "SGD"
}
```

Send `payUrl` to the customer on WhatsApp. They pay with Stripe on that page (S$50 minimum still enforced).

## Poll status

`GET /api/wa/orders/:id` (same auth) — returns `status`, `payment_method`, items.

## Paid webhook (optional)

Set `WA_ORDER_PAID_WEBHOOK_URL` (+ optional `WA_ORDER_PAID_WEBHOOK_KEY`). On Stripe success for a WhatsApp-origin order, the shop POSTs `{ event, orderId, order_no, wa_id, total, status }`.
