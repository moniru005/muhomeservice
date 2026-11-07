/** Booking rules shared by booking creation and unit tests. */
export const normalizeArea = (value) => String(value || '')
  .trim()
  .toLocaleLowerCase('en')
  .replace(/\s+/g, ' ');

export function parseServiceAreas(value) {
  return [...new Set(String(value || '').split(/[\n,;]+/).map((area) => area.trim()).filter(Boolean))];
}

export function isServiceAreaAllowed(requestedArea, configuredAreas) {
  if (!configuredAreas.length) return true;
  const requested = normalizeArea(requestedArea);
  return Boolean(requested) && configuredAreas.some((area) => normalizeArea(area) === requested);
}

const nonNegative = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Prices are always derived from the server's saved catalogue.
 * Duration is optional; only explicitly configured durations contribute.
 */
export function calculateBookingQuote({ selectedItems = [], rawPrice, rules = {}, emergencyRequested = false, emergencyAllowed = false }) {
  const items = selectedItems.length
    ? selectedItems.map((item) => {
        const price = nonNegative(item.price);
        const discountPercent = Math.min(100, nonNegative(item.discountPercent ?? item.discount ?? 0));
        const discountAmount = money(price * discountPercent / 100);
        const durationValue = item.durationMinutes ?? item.duration;
        const durationMinutes = durationValue === "" || durationValue == null ? null : Math.max(0, Math.floor(Number(durationValue) || 0));
        return {
          serviceId: String(item.id || ""),
          serviceName: String(item.name || ""),
          price: money(price),
          durationMinutes,
          discountPercent,
          discountAmount,
          discountedPrice: money(price - discountAmount),
        };
      })
    : [];
  const price = money(items.length ? items.reduce((sum, item) => sum + item.price, 0) : nonNegative(rawPrice));
  const totalDiscount = money(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const discountedSubtotal = money(price - totalDiscount);
  const totalDurationMinutes = items.reduce((sum, item) => sum + (item.durationMinutes == null ? 0 : item.durationMinutes), 0);
  const minimumBooking = nonNegative(rules.minimumBooking);
  const baseAmount = Math.max(discountedSubtotal, minimumBooking);
  const emergencyFee = emergencyRequested && emergencyAllowed ? nonNegative(rules.emergencyFee) : 0;
  const taxRate = Math.min(100, nonNegative(rules.taxRate));
  const taxAmount = money(baseAmount * taxRate / 100);
  const totalAmount = money(baseAmount + taxAmount + emergencyFee);
  const advanceType = String(rules.advanceType || 'fixed').toLowerCase() === 'percentage' ? 'percentage' : 'fixed';
  const advanceInput = nonNegative(rules.bookingAdvance);
  const advanceRequired = rules.advanceRequired === true && advanceInput > 0;
  const advanceDue = advanceRequired ? money(Math.min(totalAmount, advanceType === 'percentage'
    ? totalAmount * Math.min(100, advanceInput) / 100
    : advanceInput)) : 0;
  return {
    price, totalPrice: price, totalDiscount, discountedSubtotal,
    minimumBooking, baseAmount: money(baseAmount), emergencyFee, taxRate,
    taxAmount, totalAmount, advanceType, advanceRequired, advanceDue,
    remainingBalance: money(totalAmount - advanceDue),
    totalDurationMinutes: totalDurationMinutes || null,
    items,
  };
}
