# MU Home Service — Unified CMS foundation

## Included in this package
- Admin Role & Permission screen at `/admin/roles`.
- MongoDB-backed role permission maps (`rolePermissions`).
- `GET /api/roles` and `PUT /api/roles/:role/permissions` restricted to Admin.
- `GET /api/permissions/me` for the signed-in user's role permissions.
- Reusable backend middleware `requirePermission(resource, action)`.
- Public registration supports Customer, Technician, and Staff; Admin is rejected.
- Staff and Technician accounts remain pending until Admin approval (`accountStatus: "approved"`) and do not receive a login token at registration.
- Existing site and service data are retained.

## Important scope note
This is an incremental upgrade package, not a claim that every legacy screen/API has already been consolidated. Existing `/admin`, `/admin/content`, `/admin/management`, and `/admin/cms` screens remain to preserve current workflows. Existing `/api/admin/*` endpoints remain Admin-only; permission-aware API migrations need resource ownership checks before non-admin roles can be safely granted access to those operations.

## Setup
1. Extract the ZIP.
2. Configure `server/.env` from `server/.env.example`, including MongoDB and a strong JWT secret.
3. Run `npm install` at the project root, then `npm run install:all` if needed.
4. Seed the first Admin with `npm run seed:admin --prefix server`.
5. Run `npm run dev`.
6. Log in as Admin and open `/admin/roles`.

## Approval note
To approve a Staff or Technician registration, update that user's `accountStatus` to `approved` through a secure Admin workflow or MongoDB administrative tooling. The current UI does not yet include an account-approval control for Staff.

## Customer-account-only booking update
- Booking creation now requires an authenticated `customer` role; public, admin, staff, and technician booking creation is rejected by the backend.
- Booking ownership (`userId`) and customer name, phone, and email are derived from the verified customer account in MongoDB, not trusted from submitted form data.
- Booking form asks the user to log in as a Customer/Client and pre-fills the account profile fields.
- Existing customer dashboard queries bookings by the authenticated account ID, preserving account-specific booking history.

## Customer-only booking guard fix (2026-10-18)
- Booking forms are no longer rendered for logged-out users or non-customer roles; a clear Customer/Client login and registration prompt is shown instead.
- Booking submission re-checks session state before sending a request.
- Expired/invalid login sessions are cleared after a 401 response and the booking form is replaced by the login prompt.
- Backend `POST /bookings` remains protected by authentication and the `customer` role middleware.

## Admin booking deletion (2026-10-18)
- Added an Admin-only `DELETE /api/admin/bookings/:id` endpoint with ObjectId validation and 404 handling.
- Added a Delete action to the Admin booking list, including a confirmation prompt and success/error feedback.
- Booking deletion is protected server-side by the existing Admin JWT middleware; Customer, Staff, and Technician accounts cannot call this endpoint.

## Account profiles and profile photos (2026-10-19)
- Added a private `/api/auth/me` profile endpoint and authenticated `PUT /api/auth/me` update endpoint for the current account only; users cannot select another account ID.
- Added editable name and phone fields and profile-photo upload (JPG/PNG/WebP, maximum 3 MB) for Customer, Technician, Staff, and Admin accounts.
- Profile photo paths are saved to that account's MongoDB document; uploaded images are served from `/uploads/profiles/`. Replacing a photo attempts to remove the old uploaded photo.
- Added `/profile` UI with image preview, profile update form, role/email display, and links from the user dashboard and Admin dashboard.
- Email and account role are read-only in the profile form. Profile updates require the account's JWT.
