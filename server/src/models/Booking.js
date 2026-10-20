export const BOOKING_STATUSES = ['New', 'Contacted', 'Assigned', 'On the way', 'Inspection', 'Quotation sent', 'Approved', 'In progress', 'Completed', 'Cancelled'];
export function createBookingRecord({ name, phone, email = '', serviceId, serviceName, userId = null, address, area = 'Maijdee', preferredDate = '', preferredTime = 'যেকোনো সময়', problem, ticketId }) {
  const now = new Date();
  return { ticketId, name, phone, email, serviceId, serviceName, userId, address, area, preferredDate, preferredTime, problem, status: 'New', adminNote: '', technicianId: null, createdAt: now, updatedAt: now };
}
