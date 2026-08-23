import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCalendarDays,
  assessCase,
  cases,
  cloneCase,
  deadlineFor,
  normaliseRegistration,
} from '../lib/cases.ts';

function confirmDecisive(caseFile) {
  return new Set(caseFile.facts.filter((fact) => fact.decisive).map((fact) => fact.key));
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
