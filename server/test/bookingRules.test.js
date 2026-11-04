import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBookingQuote, isServiceAreaAllowed, parseServiceAreas } from '../src/services/bookingRules.js';

test('configured service areas parse and match exactly, case-insensitively', () => {
  const areas = parseServiceAreas('Maijdee, Sonapur\nChowmuhani');
  assert.equal(areas.length, 3);
  assert.equal(isServiceAreaAllowed('maijdee', areas), true);
  assert.equal(isServiceAreaAllowed('Maijdee East', areas), false);
  assert.equal(isServiceAreaAllowed('Other area', areas), false);
});

test('empty service area configuration does not restrict legacy bookings', () => {
  assert.equal(isServiceAreaAllowed('Any area', []), true);
});

test('quote applies minimum, emergency fee, VAT and fixed advance with safe rounding', () => {
  const quote = calculateBookingQuote({ rawPrice: 80, emergencyRequested: true, emergencyAllowed: true, rules: {
    minimumBooking: 100, emergencyFee: 25, taxRate: 7.5, advanceType: 'fixed', bookingAdvance: 50
  }});
  assert.deepEqual(quote, { price:80, minimumBooking:100, baseAmount:100, emergencyFee:25, taxRate:7.5, taxAmount:9.38, totalAmount:134.38, advanceType:'fixed', advanceDue:50 });
});

test('percentage advance is capped at total; emergency fee requires enabled emergency service', () => {
  const quote = calculateBookingQuote({ rawPrice: 200, emergencyRequested: true, emergencyAllowed: false, rules: { taxRate:10, advanceType:'percentage', bookingAdvance:150, emergencyFee:75 } });
  assert.equal(quote.emergencyFee, 0);
  assert.equal(quote.totalAmount, 220);
  assert.equal(quote.advanceDue, 220);
});
