# MU Home Service — Role Workflow Update

## Included
- Customer-owned booking list and recorded payment summary APIs.
- Customer cancellation limited to `New` and `Contacted` bookings.
- Customer dashboard rating/comment form for completed bookings, using the existing authenticated feedback API.
- Technician accept/reject decisions for assigned jobs.
- Technician-only work-photo upload endpoint (JPG/PNG/WebP, max 5 MB per image, max five files per request).
- Technician earnings summary based on completed assigned work and configured commission rate (commission rate configured on the user record; zero until configured).
- Staff booking status updates gated by `manageBookings`.
- Staff finance and inventory API access gated by `managePayments` / `manageInventory`.
- Admin booking pagination (`page`, `limit`, `total`, `pages`) with a paginated admin list UI.
- Staff booking queue no longer returned to staff who have no booking-related permission.

## Provider dependencies
Online payment gateway and SMS sending are not activated: provider credentials, merchant configuration, callback signing, and sandbox/production verification are not present in the supplied project. Do not treat a customer payment request as paid until a trusted provider callback confirms it.
