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

## Follow-up hardening (2026-10-28)

- Role & Permission Manager (`rolePermissions`) is now the source of truth for staff module authorization. Staff legacy per-user `permissions` arrays are no longer used by the protected booking, quotation, service-report, finance, and inventory routes. `/api/auth/me` also returns `rolePermissions` so the UI can reflect the same policy.
- Permission resources now include `payments`, `inventory`, `quotations`, `reports`, `ownPayments`, `ownQuotations`, `earnings`, and `servicePhotos`; the admin Role & Permission page exposes these resources and wildcard action.
- Assigning technicians now rejects Completed/Cancelled bookings and does not regress active workflow statuses to `Assigned`. Only `New` or `Contacted` bookings transition to `Assigned`; assignment changes are recorded in status history and use a status compare-and-set to avoid overwriting concurrent changes.
- Customer quotations are loaded by first fetching the authenticated customer's booking IDs and then issuing one `$in` query against quotations, rather than one booking lookup per quotation. Supporting indexes are created on `bookings(userId, createdAt)` and `quotations(bookingId, createdAt)`.

### SMS and online payments

Live SMS and gateway payments still require merchant/provider credentials and a publicly reachable callback URL. They must not be marked as implemented or production-ready until the merchant selects a provider, supplies credentials in server environment variables, and end-to-end callback/signature validation is tested. Existing manually recorded payments remain available; do not store gateway secrets in source control.
