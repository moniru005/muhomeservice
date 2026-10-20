export const BOOKING_STATUSES = ['New', 'Contacted', 'Assigned', 'On the way', 'Inspection', 'Quotation sent', 'Approved', 'In progress', 'Completed', 'Cancelled'];
export function isValidTicketId(value) { return /^MU-\d{4}-[A-Z0-9]{6}$/i.test(String(value || '').trim()); }
