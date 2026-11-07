# Advanced Booking & Offline Advance Payment Workflow

## Implemented flow
1. Customer submits a booking; the server validates the customer, catalogue, service area and minimum booking amount, then recalculates all prices.
2. `service.advanceRequired` controls whether advance is mandatory. If false, the booking is stored as `Pending Confirmation` with `paymentStatus: not_required`. If true and calculated advance is greater than zero, it is stored as `Pending Payment` with an expiry timestamp.
3. Pending Payment bookings are excluded from the normal Admin booking list. They remain persisted for traceability and are not confirmed.
4. Customer submits offline payment method, sender phone and transaction ID. Duplicate method/transaction pairs are protected by a unique MongoDB index.
5. Admin verifies or rejects the submission in the Offline Payment Verification panel. Successful verification records an income ledger entry and moves the booking to `Pending Confirmation`; it does not confirm the booking.
6. Admin must explicitly move the booking to `Confirmed`. The API blocks confirmation if required advance has not been verified.

## Status fields
- Booking: `Pending Payment`, `Pending Confirmation`, `Confirmed`, then the existing service workflow statuses.
- Payment: `unpaid`, `submitted`, `verified`, `rejected`, `expired`, or `not_required`.

## CMS settings
General Settings > Service Configuration now includes Advance Payment Required, Advance type, advance value, Payment expiry minutes and offline payment instructions.

## Operational notes
- Payment expiry is enforced when the customer submits proof and when Admin loads the verification queue. A background worker should be added if the deployment requires expiry to happen at an exact time without a subsequent request.
- A payment proof URL field is supported by the API, while the current customer form collects transaction ID and sender number. Add protected file upload/storage before enabling image evidence.
- Slot reservation is not hard-coded because the project has no configured slot capacity/availability model. The expiry timestamp is stored so slot holds can be connected safely once capacity rules are defined.
- When an Admin cancels a booking with a verified advance, it enters Offline Advance Refund Review. Admin records the refund reference; the expense is written to the Income-Expense Ledger.
- Payment verification and booking confirmation remain separate actions by design.
