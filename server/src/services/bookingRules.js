/** Booking rules shared by booking creation and unit tests. */
export const normalizeArea = (value) => String(value || '')
  .trim()
  .toLocaleLowerCase('en')
  .replace(/\s+/g, ' ');

export function parseServiceAreas(value) {
  return [...new Set(String(value || '').split(/[\n,;]+/).map((area) => area.trim()).filter(Boolean))];
}

export function isServiceAreaAllowed(requestedArea, configuredAreas) {
  // An empty list means the business has not configured geographic restrictions.
  if (!configuredAreas.length) return true;
  const requested = normalizeArea(requestedArea);
  return Boolean(requested) && configuredAreas.some((area) => normalizeArea(area) === requested);
}

const nonNegative = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateBookingQuote({ rawPrice, rules = {}, emergencyRequested = false, emergencyAllowed = false }) {
  const price = nonNegative(rawPrice);
  const minimumBooking = nonNegative(rules.minimumBooking);
  const baseAmount = Math.max(price, minimumBooking);
  const emergencyFee = emergencyRequested && emergencyAllowed ? nonNegative(rules.emergencyFee) : 0;
  const taxRate = Math.min(100, nonNegative(rules.taxRate));
  const subtotal = baseAmount + emergencyFee;
  const taxAmount = money(subtotal * taxRate / 100);
  const totalAmount = money(subtotal + taxAmount);
  const advanceType = String(rules.advanceType || 'fixed').toLowerCase() === 'percentage' ? 'percentage' : 'fixed';
  const advanceInput = nonNegative(rules.bookingAdvance);
  const advanceDue = money(Math.min(totalAmount, advanceType === 'percentage'
    ? totalAmount * Math.min(100, advanceInput) / 100
    : advanceInput));
  return { price, minimumBooking, baseAmount: money(baseAmount), emergencyFee: money(emergencyFee), taxRate, taxAmount, totalAmount, advanceType, advanceDue };
}
