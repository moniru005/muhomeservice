# Technician Leave Management Update

## Implemented
- Replaced the Technician Dashboard leave `window.prompt()` flow with a responsive custom modal form.
- Added leave types: Casual, Sick, Emergency and Other.
- Added start/end date validation and inclusive duration calculation.
- Added optional PDF/JPG/PNG/WEBP evidence upload (5 MB maximum).
- Added technician leave history with Pending/Approved/Rejected status and admin review note.
- Added an authenticated technician leave-decision notification feed.
- Extended Admin Leave Approval with leave type, duration, secure supporting-document viewing and optional review comments.
- Preserved the existing leave request and admin approval API paths; requests without the new optional fields remain supported through defaults.

## Backend/API
- `POST /technician/leave-requests` now accepts multipart form data (`document` optional).
- `GET /technician/leave-requests` returns the technician's own history.
- `GET /technician/leave-notifications` returns leave-decision notifications for the signed-in technician.
- `GET /admin/technician-leave-requests/:id/document` is admin-authenticated for supporting documents.
- `PATCH /admin/technician-leave-requests/:id` accepts `status` and optional `reviewNote`.

## Storage
- Local uploads are stored under `server/uploads/leave-attachments/` and are not exposed as a public static directory.
- If `UPLOAD_STORAGE=cloudinary` is configured, the existing server-side Cloudinary storage integration is used.

## Validation
- Backend JavaScript syntax check passed (`node --check`).
- JSX syntax transpilation passed for the edited Technician Dashboard and Admin components.
- Full Vite production build could not be run in this environment because client dependencies were not installed and package registry access timed out. Run `npm ci` in `client/`, then `npm run build` to perform the full build check.
