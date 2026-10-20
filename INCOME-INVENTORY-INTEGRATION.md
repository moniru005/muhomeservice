# MU Home Service — Income, Expense, Inventory & Booking integration

## Workflow and accounting rules

1. A booking is operational work, not income by itself. Only record money actually received through `POST /api/admin/bookings/:id/payments`; this updates the booking payment ledger and writes one linked `financeEntries` income row.
2. A booking can have multiple partial payments. Pass a unique `reference` when available; every payment also gets a server-generated `paymentId`. Never create a second manual income row for the same payment.
3. Inventory quantity changes should use `POST /api/admin/inventory/:id/movements`, not direct quantity edits:
   - `type: "in"`: receive/purchase stock. Set `recordPurchaseExpense: true` to also create an expense for quantity × unitCost.
   - `type: "out"`: consume stock. Include `bookingId` for booking-related usage; by default, the cost of usage is added as a linked expense. Set `recordUsageExpense: false` only for non-costed movements such as a correction.
4. Stock cannot be taken below zero. Every movement records the item, quantity, user, timestamp, optional booking, note and cost.
5. `sourceKey` makes system-generated ledger entries traceable and unique. `sourceType`, `sourceId`, `bookingId`, and `ticketId` connect finance entries to the source operation.
6. Admin-only endpoints remain protected by `requireAdmin`. Staff permissions should be separately granted for any future staff-facing finance or stock actions; these new endpoints are intentionally admin-only.

## New API endpoints

- `GET /api/admin/operations/summary` — income, expense, profit, inventory valuation, low-stock items, and unpaid booking summary.
- `GET /api/admin/operations/bookings` — recent bookings with payment totals for the admin operations UI.
- `POST /api/admin/bookings/:id/payments` body: `{ "amount": 1500, "method": "cash", "reference": "receipt-001" }`.
- `POST /api/admin/inventory/:id/movements` body example: `{ "type": "out", "quantity": 1, "unitCost": 1200, "bookingId": "<booking ObjectId>", "note": "CCTV camera used", "recordUsageExpense": true }`.
- `GET /api/admin/inventory/:id/movements` — item movement history.

## Important migration notes

- Existing finance rows and inventory quantities are retained. Historical rows do not automatically get source links because their origin cannot be safely inferred.
- Legacy bookings without `totalAmount` or `quotedAmount` still accept payments; their payment status stays `partial` until the quoted total is stored. Add a quote/total field in the quotation workflow to enable automatic `paid` status.
- Inventory items created with an opening quantity are opening balances; they are not treated as a purchase expense unless stock-in is recorded with `recordPurchaseExpense: true`.
- Profit is calculated from ledger income minus ledger expense. Inventory stock value is shown separately and is not itself a cash expense until purchase expense is recorded; consumed stock can be recognized as service material cost through a stock-out movement.
