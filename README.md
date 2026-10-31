# MU Home Service
A responsive Bangla-first home and office technical service booking website with React + Vite frontend, Express backend, and MongoDB Native Driver (no Mongoose).

## Features
- Responsive landing page, service categories, local indicative rates, annual packages
- Service booking form stored in MongoDB
- Admin login using JWT + bcrypt
- Admin dashboard to review requests and update job status
- Customer/Technician/Staff registration and JWT sessions; Staff and Technician require Admin approval before login
- Admin website content editor to add/modify/remove service and package cards
- Role & Permission Manager at `/admin/roles` with server-stored per-role resource actions
- Permission lookup endpoint (`GET /api/permissions/me`) and reusable backend `requirePermission(resource, action)` middleware
- Technician uniform concept with MU Home Service logo and company name
- SolaimanLipi font configured as the preferred Bengali font
- Contact form endpoint
- Basic server-side validation, Helmet, CORS, rate limiting

## Requirements
- Node.js 20+
- MongoDB database (local or MongoDB Atlas)

## Setup
1. Copy `server/.env.example` to `server/.env` and set values.
2. Install dependencies from the project root:
   ```bash
   npm install
   npm run install:all
   ```
3. Create the first admin user:
   ```bash
   npm run seed:admin --prefix server
   ```
   Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env` first.
4. Run both frontend and backend:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173`; admin: `http://localhost:5173/admin`.

## SolaimanLipi font
Place a properly licensed `SolaimanLipi.ttf` file at `client/public/fonts/SolaimanLipi.ttf`. The stylesheet prioritizes SolaimanLipi and falls back to Noto Sans Bengali/Hind Siliguri if the font file is not installed. The font itself is not bundled with this project.

## Role-based access
Public registration allows **customer**, **technician**, or **staff**. Staff and Technician accounts are marked pending and cannot log in until an administrator sets `accountStatus: "approved"`. Public registration rejects `admin`; admin accounts are created with the seed script. The Role & Permission Manager is available at `/admin/roles` and persists permission maps in MongoDB. The reusable `requirePermission(resource, action)` middleware is provided for endpoint-level authorization; existing legacy `/api/admin/*` routes remain Admin-only unless explicitly migrated to scoped permission checks. Review and test all route-level authorization and resource ownership before production deployment.

## Production
- Set `CLIENT_ORIGIN` to the deployed frontend URL and `VITE_API_URL` to the backend API URL before building the frontend.
- Deploy `client` to a static host (Vercel/Netlify) and `server` to a Node host (Render/Railway/VPS); configure environment variables on both.
- Point `muhomeservice.com` DNS to your chosen hosting provider. This project does not itself purchase a domain or deploy the website.
- Use HTTPS, a strong unique JWT secret, a production MongoDB user with least privilege, backups, and real transactional SMS/WhatsApp provider credentials before public launch.

## API overview
- `GET /api/health`
- `GET /api/services`
- `GET /api/packages`
- `POST /api/bookings`
- `POST /api/contact`
- `POST /api/auth/register` (customer, technician, staff; admin prohibited; staff/technician approval required)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary` (authenticated role-aware summary)
- `GET /api/admin/content` / `PUT /api/admin/content` (admin-only CMS)
- `GET /api/admin/bookings` (JWT admin)
- `PATCH /api/admin/bookings/:id/status` (JWT admin)
- `GET /api/admin/stats` (JWT admin)
- `GET /api/roles` / `PUT /api/roles/:role/permissions` (JWT admin)
- `GET /api/permissions/me` (authenticated current-role permissions)

## Important business notes
Rates shown on the website are indicative starting prices for Maijdee/Noakhali. Final quotes depend on site inspection, distance, job scope and parts. The booking form does not process online payments or send SMS/WhatsApp automatically; those require payment/provider integrations.


## Source structure

### Frontend (`client/src`)
- `components/`: reusable UI elements such as `BrandMark` and `LoadingState`.
- `pages/`: route-level screens can be split here as the UI grows; the existing route composition is in `App.jsx`.
- `models/`: frontend catalog defaults and small domain helpers.
- `hooks/`: reusable React hooks (`useSiteContent`).
- `services/`: shared HTTP/API helpers.
- `main.jsx`: React entry point; `App.jsx` contains the current route composition and screens.

### Backend (`server/src`)
- `models/`: domain record helpers and role constants; MongoDB Native Driver is used (no Mongoose).
- `routes/`: Express route definitions.
- `middleware/`: authentication and authorization middleware.
- `validators/`: request validation helpers.
- `controllers/` and `services/`: reserved separation points for extracting route logic as the API expands.

This is a source-organization refactor. Please run the build and exercise login, booking, editor, and dashboard flows in a local environment before production deployment.


## Password recovery via email

Forgot Password is available at `/forgot-password`; reset links open `/reset-password?token=...`. Configure SMTP in `server/.env` before using this feature:

```env
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
MAIL_FROM=MU Home Service <no-reply@your-domain.com>
```

The API returns a generic response so it does not reveal whether an email is registered. Reset tokens are random, stored only as SHA-256 hashes, expire after 30 minutes, and are single-use. Passwords are re-hashed with bcrypt. If SMTP is not configured or email delivery fails, the reset request is not completed; configure valid SMTP credentials before production use. Never commit real SMTP credentials to source control.

## Modern CMS v2

The `/admin/cms` workspace now includes a modern responsive admin layout, CMS overview metrics, page search and page creation, page SEO fields, visual section editing, section reorder (up/down), duplicate/hide/delete actions, preview mode, publish/draft workflow, media upload/copy/delete, and shortcuts to the existing service/package editor, booking dashboard, and management center.

### CMS workflow
1. Sign in with an administrator account at `/admin/cms`.
2. Open **Visual page builder** and select a page or choose **Add new page**.
3. Edit page title, URL slug, SEO title/description, then add or edit sections.
4. Save Draft to store changes, use Preview to review, and Publish to publish the page.
5. Use Media Library to upload images and copy their URLs into section Image URL fields.

Note: CMS settings shown under **CMS settings** are currently workspace-only preview settings; they are not persisted to the database. The public CMS page route is `/p/:slug`. The root homepage `/` still uses the existing homepage component and has not yet been connected to the CMS Home page. The booking/people/reports shortcuts lead to the existing operations and management screens; they are not separate new modules in this CMS view.


## Unified CMS upgrade notes
This archive adds a first-stage role/permission backend and an Admin Role & Permission screen. The current legacy Admin Booking, Service Editor, Management Center, and Page Builder routes are retained to avoid breaking existing workflows; they have **not yet been fully consolidated into a single shared dashboard**. Admin-only legacy endpoints remain Admin-only. Before production, migrate each endpoint to `requirePermission` with object-level ownership checks and consolidate the remaining frontend routes/navigation.

### Customer-only booking rule
Only an authenticated account with the `customer` role can create a booking. The API derives `userId`, name, phone, and email from the customer record in MongoDB; submitted identity fields are not trusted. Staff, technicians, admins, and unauthenticated visitors cannot create bookings through the booking API. Customers see their own bookings in the account dashboard.

### Admin: delete customer bookings
The Admin booking list now includes a **Delete** action. Admins must confirm before a booking is permanently deleted. The API endpoint is `DELETE /api/admin/bookings/:id` and requires an Admin JWT. Customer, Staff, and Technician accounts are not authorized to delete bookings.

### Account profiles and profile photos
Each signed-in account (Customer, Technician, Staff, and Admin) can open **My Profile** from their dashboard at `/profile` (Admin uses `/profile?account=admin`). The profile page supports updating the account name and phone number and uploading a JPG, PNG, or WebP profile photo up to 3 MB. Email and role are read-only. The backend applies updates only to the account identified by the verified JWT; it does not accept a user ID from the form. Profile photo files are stored under `server/uploads/profiles/`, while the photo URL is stored on the matching account record in MongoDB. Back up uploaded profile photos along with the database.


## Hosting (বাংলা)
See [`HOSTING-DEPLOY-GUIDE-BN.md`](./HOSTING-DEPLOY-GUIDE-BN.md) for Vercel + Render + MongoDB Atlas deployment steps.

## Phase 3 — Business Control

Business Control dashboard: `/admin/business-control`. Details, endpoints, feedback API and verification caveats are documented in `PHASE-3-BUSINESS-CONTROL-BN.md`.

## Role workflow completion update

This package adds role-scoped customer booking/payment APIs, customer cancellation for eligible early-stage bookings, feedback form support in the customer dashboard, technician assignment decisions, work-photo uploads, technician commission summaries, permission-gated staff booking status changes, staff finance/inventory API access, and server-side booking pagination.

### Staff permissions

Admins can grant Staff these explicit capabilities from Staff Management: `manageBookings`, `assignTechnicians`, `manageQuotations`, `managePayments`, and `manageInventory`. Sensitive API endpoints validate the permission server-side; hiding a menu is not treated as authorization. Staff without booking-related permissions do not receive the global booking queue through the dashboard summary.

### External integrations still require credentials

The repository does not include an online payment gateway merchant account or an SMS provider account. Online payment collection and outbound SMS must not be enabled by pretending a payment was successful. Configure a selected gateway (for example, SSLCOMMERZ) and SMS provider credentials, implement/verify their signed callbacks, and test in sandbox before enabling those flows in production. The existing recorded-payment ledger is for payments actually received by an authorized Admin or Staff member.

### Deployment checks

- Install dependencies in both `server` and `client`, then run the client production build.
- Configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and `VITE_API_URL` for the target environment.
- Ensure `server/uploads/service-reports` is persistent and served under `/api/uploads/service-reports/`.
- Set Staff permissions in the Admin UI and test each role with separate accounts. In particular verify that one customer cannot access another customer's bookings/payments, and an unassigned technician cannot access another technician's work.
- Test online payment/SMS only after the provider adapter and credentials are supplied; these cannot be verified from this ZIP alone.

### Role permissions, assignment workflow, quotation query performance

The Role & Permission Manager configuration is authoritative for staff access to bookings, quotations, reports, payments, and inventory. After changing role permissions, sign in again or refresh the session to load `rolePermissions`. Technician assignment will not reopen Completed/Cancelled bookings or regress an active booking to `Assigned`. Customer quotations are queried using the customer's booking IDs in a batched database query and supporting indexes.

SMS and online gateway payment processing require provider credentials and a configured public callback URL. The current package does not claim live SMS or online gateway processing without those details and a verified end-to-end merchant test; manual payment recording is still supported.

## Online payment and SMS adapter

See [`PAYMENT-SMS-INTEGRATION.md`](./PAYMENT-SMS-INTEGRATION.md) for the provider-neutral checkout/webhook and SMS API contracts, environment variables, signature verification, idempotency protections, and production checklist. The integration remains disabled until server-side provider credentials and endpoints are configured. A generic adapter is not a substitute for implementing the selected provider's exact authentication and webhook-signature protocol.

## bKash and Bangladesh SMS gateway

The current integration package includes a bKash Tokenized Checkout adapter (sandbox by default) and a MiMSMS transactional SMS adapter. See `PAYMENT-SMS-INTEGRATION.md` and `server/.env.example` for server-only credentials and callback setup. Online payments remain unavailable until approved merchant credentials and a public HTTPS callback URL are configured. Do not switch bKash to production until sandbox cases and settlement reconciliation have been tested.

## Role workflow additions
- Customer booking attachments: `POST /api/customer/bookings/:id/photos` (`photos`, up to 5 JPG/PNG/WebP/PDF files, 5 MB each).
- Invoice and receipt data: `GET /api/customer/bookings/:id/invoice` and `/receipt` (authenticated; customer ownership enforced).
- Warranty claims and complaints: `POST /api/customer/bookings/:id/warranty-claims` and `/complaints`. Warranty starts when a job is completed using the OTP flow; default duration is `DEFAULT_WARRANTY_DAYS` (30 days).
- Completion confirmation: Technician requests an OTP at `POST /api/technician/bookings/:id/completion-otp`; then verifies at `PATCH /api/technician/bookings/:id/complete`. SMS and optional WhatsApp notifications are attempted safely.
- Technician preferences: `GET/PATCH /api/technician/profile/work-preferences`; Admin commission management at `/api/admin/technicians/commission` and `/api/admin/technicians/:id/commission`.
- Technician attendance and leave: `/api/technician/attendance`, `/api/technician/leave-requests`, and Admin review at `/api/admin/technician-leave-requests`.
- Customer directory and quotation templates: `/api/admin/customers`, `/api/quotation-templates`.
- Refund requests: `/api/admin/refunds`. Admin can approve/reject, then call `/api/admin/refunds/:id/process` to attempt provider-side execution. bKash uses its refund API; generic providers need `PAYMENT_REFUND_URL`. The system marks a refund processed only after the provider returns a reference; uncertain outcomes move to reconciliation review.
- Booking deletion is now an archive/soft-delete operation. Payment, finance, refund, and invoice references remain connected to the original booking ID.
- Optional WhatsApp adapter: set `WHATSAPP_API_URL` and `WHATSAPP_API_TOKEN`. The configured provider must accept JSON `{to, message, context}`; approved WhatsApp templates/provider-specific payloads may require an adapter change.

### Role workflow fixes (29 Oct 2026)

Latest role fixes add booking-form photo upload, customer reschedule requests, a new-quotation request after rejection, readable invoice/receipt dialogs, direct Service Report photo uploads, searchable paginated Customer Directory, and an Admin Quotation screen. Staff permission toggles now accept `managePayments` and `viewReports`, and protected finance/report/quotation/booking operations honor these individual grants alongside role-level permissions. Booking deletion remains an archive to preserve financial relationships. See `ROLE-ENHANCEMENTS-2026-10.md` for details and verification limits.

## Third-party Partner fulfilment

See `PARTNER-ECOSYSTEM-IMPLEMENTATION.md` for the new Partner role, approval, service fulfilment configuration, privacy-safe dispatch/acceptance flow, partner payout ledger, API endpoints, and deployment cautions. Partner registration is pending Admin approval and requires Partner Terms acceptance. The Partner API is implemented; dedicated polished Partner/Admin management screens and partner-technician team invitations remain follow-up UI work.

## Admin Audit Log UI Bug Fix (2026-10-31)
- Audit entries now display the HTTP method, response status, timestamp, endpoint, and actor ID in separate readable rows.
- Long API paths and identifiers wrap safely on narrow screens instead of overflowing or running together.
- Audit Log loading failures now show an explicit error with Retry; they are no longer presented as an empty log.
- Added a dedicated Refresh Logs action. Existing audit API and stored records are unchanged.

## CMS frontend theme presets

The CMS Website Settings screen includes four public-site appearance presets: Classic Original (the existing default), Ocean Blue, Emerald Fresh, and Sunset Warm. Select a preset and choose **Publish Theme** to save the active preset in MongoDB (`siteContent` document `_id: frontendTheme`). The public client reads `/api/site-theme` and applies the published preset to the public frontend. Admin and partner workspaces are intentionally excluded from public theme styling. Existing page content, booking, authentication, dashboard, and operational APIs are unchanged.
