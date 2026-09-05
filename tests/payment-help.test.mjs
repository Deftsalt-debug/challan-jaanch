import assert from 'node:assert/strict';
import test from 'node:test';
import { paymentChecklist, paymentIssues, paymentPlan, paymentPortals, paymentSources } from '../lib/payment-help.ts';

test('all twenty payment scenarios have bilingual guidance and fixed HTTPS destinations', () => {
  const hosts = new Set(['echallan.parivahan.gov.in', 'echallan.parivahan.nic.in', 'vcourts.gov.in', 'support.google.com']);
  assert.equal(paymentPortals.length * paymentIssues.length, 20);
  for (const { id: portal } of paymentPortals) for (const { id: issue } of paymentIssues) {
    const plan = paymentPlan(portal, issue);
    for (const field of [plan.title, plan.destination.label, ...plan.steps, ...plan.records]) {
      assert.ok(field.en.trim());
      assert.match(field.hi, /[\u0900-\u097f]/u);
    }
    const url = new URL(plan.destination.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(hosts.has(url.hostname));
    assert.equal(url.search, '');
    assert.equal(url.username, '');
    assert.ok(plan.steps.length >= 2);
  }
});

test('NextGen distinguishes pending transactions from receipt retrieval', () => {
  assert.equal(paymentPlan('nextgen', 'debited').destination.url, paymentSources[1].url);
  assert.equal(paymentPlan('nextgen', 'twice').destination.url, paymentSources[1].url);
  for (const issue of ['receipt', 'pending']) {
    assert.equal(paymentPlan('nextgen', issue).destination.url, paymentSources[0].url);
    assert.match(paymentChecklist('nextgen', issue, 'en'), /Download Payment Receipt/);
  }
});

test('court receipt guidance stays on the court route', () => {
  const plan = paymentPlan('court', 'receipt');
  assert.equal(new URL(plan.destination.url).hostname, 'vcourts.gov.in');
  assert.match(paymentChecklist('court', 'receipt', 'en'), /View.*Reprint/);
});

test('unknown payment service does not imply universal national lookup', () => {
  const text = paymentChecklist('other', 'pending', 'en');
  assert.match(text, /original service/);
  assert.match(text, /not a lookup for every service/);
  assert.match(text, /third-party app/i);
});

test('possible double payment is not treated as a duplicate challan or promised refund', () => {
  const text = paymentChecklist('national', 'twice', 'en');
  assert.match(text, /Two debits do not by themselves establish a duplicate challan/);
  assert.match(text, /refund eligibility and timing must be confirmed/);
  assert.match(text, /Both attempts/);
});

test('Google Pay route distinguishes bill payment from a direct UPI transfer', () => {
  const text = paymentChecklist('gpay', 'debited', 'en');
  assert.match(text, /90-day dispute window/);
  assert.match(text, /not for a direct transfer/);
  assert.match(text, /Having issues → Payment issues → Raise dispute/);
  assert.equal(paymentPlan('gpay', 'debited').destination.url, paymentSources[3].url);
});

test('copied checklists retain language, scenario, privacy guidance and non-submission boundary', () => {
  for (const { id: portal } of paymentPortals) for (const { id: issue } of paymentIssues) {
    const english = paymentChecklist(portal, issue, 'en');
    const hindi = paymentChecklist(portal, issue, 'hi');
    assert.match(english, /No payment verified, refund requested or complaint submitted/);
    assert.match(hindi, /न भुगतान सत्यापित हुआ/);
    assert.match(english, /redact unrelated bank details/);
    assert.ok(english.includes(paymentPlan(portal, issue).title.en));
    assert.ok(hindi.includes(paymentPlan(portal, issue).title.hi));
  }
});
