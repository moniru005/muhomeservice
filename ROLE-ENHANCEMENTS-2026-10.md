# MU Home Service — Role workflow enhancements

## Customer
- Upload up to five booking images/documents per request (JPG/PNG/WebP/PDF, 5 MB per file).
- Authenticated invoice and receipt JSON endpoints, ownership-checked.
- Submit complaints for owned bookings; submit warranty claims only for completed jobs whose warranty is still active.
- Technician completion requires a six-digit OTP sent via configured SMS and optional WhatsApp provider; OTP expires after 10 minutes.

## Technician
- Update own skills and service areas.
- Admin controls commission rates (0–100%).
- Attendance check-in/check-out and leave requests; Admin can review leave requests.
- Existing direct work-photo upload retained.

## Staff/Admin
- Customer directory with search and pagination; Staff access is permission checked.
- Service-specific quotation templates can be saved and selected in the Operations quotation UI.
- Refund request, approval/rejection, and provider-side processing workflow. bKash refunds use the bKash refund endpoint; generic providers require PAYMENT_REFUND_URL. Provider confirmation reference is required before marking processed.
- Booking deletion now archives the record and preserves all payment, finance, refund, and invoice relationships.

## Environment variables
- `DEFAULT_WARRANTY_DAYS=30`
- Optional WhatsApp provider adapter: `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`. The endpoint must accept `{to, message, context}`; WhatsApp template approval/provider payload rules remain provider-specific.
- Generic refund adapter: `PAYMENT_REFUND_URL` and `PAYMENT_API_TOKEN`. bKash refund uses existing bKash credentials.

## API additions
- `POST /api/customer/bookings/:id/photos`
- `GET /api/customer/bookings/:id/invoice`
- `GET /api/customer/bookings/:id/receipt`
- `POST /api/customer/bookings/:id/warranty-claims`
- `POST /api/customer/bookings/:id/complaints`; `GET /api/customer/claims`
- `POST /api/technician/bookings/:id/completion-otp`; `PATCH /api/technician/bookings/:id/complete`
- `GET/PATCH /api/technician/profile/work-preferences`
- `GET /api/admin/technicians/commission`; `PATCH /api/admin/technicians/:id/commission`
- `POST/GET /api/technician/attendance`; `POST/GET /api/technician/leave-requests`
- `GET /api/admin/technician-leave-requests`; `PATCH /api/admin/technician-leave-requests/:id`
- `GET /api/admin/customers`
- `GET/POST/PATCH /api/quotation-templates`
- `POST/GET /api/admin/refunds`; `PATCH /api/admin/refunds/:id`; `POST /api/admin/refunds/:id/process`

## Validation status
JavaScript and JSX syntax checks pass, and ZIP integrity was checked. Full frontend production build, MongoDB integration tests, provider sandbox tests and live SMS/WhatsApp delivery were not run in this environment. bKash production refunds and any generic provider adapter must be verified in the provider's sandbox before live use.

## Role-gap corrections (29 Oct 2026)

- Customer booking creation returns the persisted booking ID and uploads up to five JPG/PNG/WebP photos immediately from the booking form. If upload fails after the booking succeeds, the UI keeps the successful booking reference and warns about the photo upload instead of encouraging a duplicate booking.
- Customers can request rescheduling while a booking is `New` or `Contacted`; the request is recorded in status history and a Staff notification is created. SMS/WhatsApp notifications are sent only when configured.
- Rejected quotations now move the booking to `Quotation rejected`, not silently back to `Inspection`. The customer can explicitly request a new quotation, which returns the booking to `Inspection` and creates a Staff notification.
- Invoice and receipt responses are rendered in a readable dashboard dialog with Print / Save PDF, rather than an alert containing raw JSON.
- Staff individual permission API now accepts `managePayments` and `viewReports`; finance and report endpoints honor these individual grants alongside the role-level Permission Manager. Quotation creation, booking status changes and report access also honor the corresponding Staff grants.
- Added an Admin Quotation screen and upgraded Customer Directory to searchable pagination.
- Service Operations accepts direct image uploads for report evidence. Uploaded images are linked into the subsequent Service Report, and report lists display links to evidence images.
- Booking deletion remains a soft archive so Finance, Payments, Refunds and audit references remain connected.

Validation performed: Node syntax checks for changed server files and TypeScript JSX transpilation checks for changed React files. A full Vite production build could not be completed because dependency installation timed out in this environment; live MongoDB/API and provider sandbox tests remain required.
- Added a dedicated Admin Management Center `Customer Directory` tab with search and pagination, separate from the booking table.
