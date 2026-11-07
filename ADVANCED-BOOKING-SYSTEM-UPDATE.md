# Advanced Booking System Update

## Service catalogue
- Services support `price`, optional `durationMinutes` (whole minutes), and `discountPercent` (0–100).
- The CMS calculates `discountAmount` and `discountedPrice` for display; these values are recalculated by the API from the saved catalogue when a booking is submitted.
- Leaving duration blank is valid and does not prevent booking.

## Booking calculation
For selected services:
- `totalPrice` = sum of original service prices
- `totalDiscount` = sum of each service's `price * discountPercent / 100`
- `discountedSubtotal` = `totalPrice - totalDiscount`
- `totalDurationMinutes` = sum of configured durations; stored as `null` when no duration is configured
- VAT is calculated on the discounted subtotal (subject to the existing configured minimum-booking rule)
- Emergency fee is added after VAT
- `grandTotal` / `totalAmount` = discounted subtotal + VAT + emergency fee
- Advance uses the existing General Settings fixed/percentage rule and is capped at the grand total
- Remaining balance = grand total - advance

The API stores the per-service pricing breakdown and all aggregate totals on the booking record. Admin booking rows display the saved breakdown.

## Verification
Run `cd server && npm test`. The booking-rule suite covers discounts, optional duration, VAT, emergency fee, fixed advance, percentage advance, and rounding. A frontend production build should be run with `cd client && npm ci && npm run build` in an environment where npm dependencies can be installed.
