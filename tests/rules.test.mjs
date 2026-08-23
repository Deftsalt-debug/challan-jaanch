import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCalendarDays,
  assessCase,
  cases,
  cloneCase,
  deadlineFor,
  normaliseRegistration,
  formatDate,
  isValidIsoDate,
} from '../lib/cases.ts';
import { inspectChallanMessage } from '../lib/scam-shield.ts';

function confirmDecisive(caseFile) {
  return new Set(caseFile.facts.filter((fact) => fact.decisive).map((fact) => fact.key));
}

function mockImage(name) {
  return { name, type: 'image/png', data: 'data:image/png;base64,AA==' };
}

test('clear vehicle mismatch produces two packet-ready findings', () => {
  const caseFile = cloneCase(cases['wrong-vehicle']);
  const assessment = assessCase(caseFile, confirmDecisive(caseFile));
  assert.equal(assessment.outcome, 'supported');
  assert.deepEqual(assessment.findings.map((finding) => finding.rule), [
    'REGISTRATION_MARK_CONFLICT',
    'VEHICLE_FAMILY_CONFLICT',
  ]);
  assert.ok(assessment.findings.every((finding) => finding.packetEligible));
});

test('ambiguous decisive character refuses to create a finding', () => {
  const caseFile = cloneCase(cases['ambiguous-photo']);
  const assessment = assessCase(caseFile, confirmDecisive(caseFile));
  assert.equal(assessment.outcome, 'unable');
  assert.equal(assessment.findings.length, 0);
  assert.match(assessment.nextBestEvidence, /original/i);
});

test('exact duplicate event is supported only across distinct challan numbers', () => {
  const caseFile = cloneCase(cases['duplicate-event']);
  const confirmed = confirmDecisive(caseFile);
  assert.equal(assessCase(caseFile, confirmed).outcome, 'supported');
  caseFile.facts.find((fact) => fact.key === 'challanB').value = caseFile.facts.find((fact) => fact.key === 'challanA').value;
  assert.equal(assessCase(caseFile, confirmed).outcome, 'none');
});

test('unconfirmed decisive fields lock the comparison', () => {
  const assessment = assessCase(cloneCase(cases['wrong-vehicle']), new Set());
  assert.equal(assessment.outcome, 'review');
  assert.equal(assessment.findings.length, 0);
});

test('registration normalization does not guess visually confusable characters', () => {
  assert.equal(normaliseRegistration(' zz-00 cj 000o '), 'ZZ00CJ000O');
  assert.notEqual(normaliseRegistration('ZZ00CJ000O'), normaliseRegistration('ZZ00CJ0000'));
});

test('Rule 167 clock adds calendar days without local-time drift', () => {
  assert.equal(addCalendarDays('2026-01-20', 45), '2026-03-06');
  const deadline = deadlineFor(cases['wrong-vehicle'], new Date('2026-08-23T12:00:00Z'));
  assert.equal(deadline.date, '2026-09-26');
  assert.equal(deadline.daysLeft, 34);
  assert.equal(deadline.status, 'open');
});

test('calendar validation rejects impossible extracted dates before rendering', () => {
  assert.equal(isValidIsoDate('2026-02-28'), true);
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(formatDate('2026-02-30'), 'Date not confirmed');
  assert.throws(() => addCalendarDays('not-a-date', 45), /valid YYYY-MM-DD/);
});

test('live extraction endpoint fails honestly when no API key is configured', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const { POST } = await import('../app/api/analyze/route.ts');
  const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: '{}' }));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, 'LIVE_EXTRACTION_NOT_CONFIGURED');
  if (previous) process.env.OPENAI_API_KEY = previous;
});

test('live extraction endpoint rejects excess documents before upstream processing', async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  try {
    const { POST } = await import('../app/api/analyze/route.ts');
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: [mockImage('1.png'), mockImage('2.png'), mockImage('3.png'), mockImage('4.png')] }) }));
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.code, 'TOO_MANY_DOCUMENTS');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    if (previous) process.env.OPENAI_API_KEY = previous; else delete process.env.OPENAI_API_KEY;
  }
});

test('live extraction endpoint rejects a null JSON body without throwing', async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  try {
    const { POST } = await import('../app/api/analyze/route.ts');
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' }));
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.code, 'MISSING_DOCUMENTS');
  } finally {
    if (previous) process.env.OPENAI_API_KEY = previous; else delete process.env.OPENAI_API_KEY;
  }
});

test('live extraction endpoint rejects structurally invalid model output', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({ challanNumber: null, issueDate: '2026-02-30', recordPlate: null, photoPlate: null, rcPlate: null, photoFamily: 'Unknown', rcFamily: 'Unknown', occurredAt: null, location: null, offence: null, amount: null, notes: [] }) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const { POST } = await import('../app/api/analyze/route.ts');
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: [mockImage('challan.png'), mockImage('vehicle.png')] }) }));
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.code, 'INVALID_EXTRACTION');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) process.env.OPENAI_API_KEY = previousKey; else delete process.env.OPENAI_API_KEY;
  }
});

test('Scam Shield flags fake challan APKs and lookalike destinations without opening them', () => {
  const assessment = inspectChallanMessage({
    message: 'Pay ₹1,000 now and install https://mparivahan-pay.example/RTO-Challan.apk',
    channel: 'whatsapp',
    clicked: false,
    installed: false,
    paid: false,
    sharedCredentials: false,
  });
  assert.equal(assessment.outcome, 'danger');
  assert.equal(assessment.track, 'report-attempt');
  assert.ok(assessment.signals.some((signal) => signal.id === 'apk'));
  assert.equal(assessment.destinations[0].classification, 'lookalike');
});

test('Scam Shield recognises exact HTTPS eChallan and mParivahan hostnames', () => {
  const official = inspectChallanMessage({ message: 'https://echallan.parivahan.gov.in/index/check-challan-status', channel: 'other', clicked: false, installed: false, paid: false, sharedCredentials: false });
  assert.equal(official.outcome, 'unverified');
  assert.equal(official.destinations[0].classification, 'official');

  const mParivahan = inspectChallanMessage({ message: 'https://mparivahan.parivahan.gov.in/', channel: 'other', clicked: false, installed: false, paid: false, sharedCredentials: false });
  assert.equal(mParivahan.outcome, 'unverified');
  assert.equal(mParivahan.destinations[0].classification, 'official');

  const lookalike = inspectChallanMessage({ message: 'https://echallan.parivahan.gov.in.example/pay', channel: 'sms', clicked: false, installed: false, paid: false, sharedCredentials: false });
  assert.equal(lookalike.outcome, 'danger');
  assert.equal(lookalike.destinations[0].classification, 'lookalike');
});

test('Scam Shield routes financial or credential exposure to emergency response', () => {
  const assessment = inspectChallanMessage({ message: 'I sent the payment and shared my OTP', channel: 'call', clicked: true, installed: false, paid: true, sharedCredentials: true });
  assert.equal(assessment.outcome, 'danger');
  assert.equal(assessment.track, 'emergency');
  assert.ok(assessment.signals.some((signal) => signal.id === 'paid'));
  assert.ok(assessment.signals.some((signal) => signal.id === 'shared'));
});

test('Scam Shield catches bare lookalike domains and uses the selected WhatsApp context', () => {
  const assessment = inspectChallanMessage({ message: 'RTO challan details at echallan-payment.example/pay', channel: 'whatsapp', clicked: false, installed: false, paid: false, sharedCredentials: false });
  assert.equal(assessment.outcome, 'danger');
  assert.equal(assessment.destinations[0].hostname, 'echallan-payment.example');
  assert.ok(assessment.signals.some((signal) => signal.id === 'whatsapp-challan'));
});
