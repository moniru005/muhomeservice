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

test('multi-service discount, optional duration, VAT and fixed advance are calculated', () => {
  const quote = calculateBookingQuote({
    selectedItems: [
      {id:'ac',name:'AC Service',price:1000,durationMinutes:90,discountPercent:10},
      {id:'electrical',name:'Electrical',price:500,discountPercent:5},
    ],
    emergencyRequested: true, emergencyAllowed: true,
    rules: { emergencyFee:100, taxRate:10, advanceRequired:true, advanceType:'fixed', bookingAdvance:200 }
  });
  assert.equal(quote.totalPrice, 1500);
  assert.equal(quote.totalDiscount, 125);
  assert.equal(quote.discountedSubtotal, 1375);
  assert.equal(quote.totalDurationMinutes, 90);
  assert.equal(quote.taxAmount, 137.5);
  assert.equal(quote.emergencyFee, 100);
  assert.equal(quote.totalAmount, 1612.5);
  assert.equal(quote.advanceDue, 200);
  assert.equal(quote.remainingBalance, 1412.5);
  assert.equal(quote.items[1].durationMinutes, null);
});

test('percentage advance is capped at grand total and optional duration remains null', () => {
  const quote = calculateBookingQuote({
    selectedItems: [{id:'x',name:'No duration',price:200}],
    rules: {taxRate:10, advanceRequired:true, advanceType:'percentage', bookingAdvance:150}
  });
  assert.equal(quote.totalDurationMinutes, null);
  assert.equal(quote.totalAmount, 220);
  assert.equal(quote.advanceDue, 220);
  assert.equal(quote.remainingBalance, 0);
});

test('discount is capped at 100 percent and VAT applies to discounted subtotal', () => {
  const quote = calculateBookingQuote({
    selectedItems: [{id:'x',name:'Free promo',price:250,discountPercent:150}],
    rules: {taxRate:5}
  });
  assert.equal(quote.totalDiscount, 250);
  assert.equal(quote.discountedSubtotal, 0);
  assert.equal(quote.taxAmount, 0);
  assert.equal(quote.totalAmount, 0);
});

test('advance is zero and optional when CMS advanceRequired is disabled', () => {
  const quote = calculateBookingQuote({ selectedItems: [{id:'x',name:'No advance',price:500}], rules: { advanceRequired:false, advanceType:'fixed', bookingAdvance:100 } });
  assert.equal(quote.advanceRequired, false);
  assert.equal(quote.advanceDue, 0);
  assert.equal(quote.remainingBalance, 500);
});
