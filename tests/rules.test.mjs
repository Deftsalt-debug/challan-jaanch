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
  maskIdentifier,
  redactCaseText,
} from '../lib/cases.ts';
import { inspectChallanMessage, officialSafetyUrls, responseSteps } from '../lib/scam-shield.ts';
import { nextRoutes, officialRouteUrls } from '../lib/routes.ts';

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
  assert.match(assessment.nextBestEvidence.en, /original/i);
  assert.match(assessment.nextBestEvidence.hi, /मूल/);
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

test('redacted packet prose masks every challan and registration identifier', () => {
  const caseFile = cloneCase(cases['wrong-vehicle']);
  const finding = assessCase(caseFile, confirmDecisive(caseFile)).findings[0];
  const redacted = redactCaseText(`${caseFile.challanNumber} · ${finding.neutralClaim.en}`, caseFile);
  assert.doesNotMatch(redacted, new RegExp(caseFile.challanNumber, 'u'));
  for (const fact of caseFile.facts.filter((entry) => entry.key.toLowerCase().includes('plate'))) {
    assert.doesNotMatch(redacted, new RegExp(fact.value, 'u'));
  }
  assert.match(redacted, new RegExp(maskIdentifier(caseFile.challanNumber), 'u'));
  assert.match(redacted, /••••/u);
});

test('Rule 167 clock adds calendar days without local-time drift', () => {
  assert.equal(addCalendarDays('2026-01-20', 45), '2026-03-06');
  const deadline = deadlineFor(cases['wrong-vehicle'], new Date('2026-08-23T12:00:00Z'));
  assert.equal(deadline.date, '2026-09-26');
  assert.equal(deadline.daysLeft, 34);
  assert.equal(deadline.status, 'open');
});

test('Rule 167 clock changes day at midnight in India, not midnight UTC', () => {
  const caseFile = cloneCase(cases['wrong-vehicle']);
  caseFile.issueDate = '2026-07-14'; // 45-day safety date: 28 August 2026
  const deadline = deadlineFor(caseFile, new Date('2026-08-27T20:00:00Z')); // 01:30 IST on 28 August
  assert.equal(deadline.date, '2026-08-28');
  assert.equal(deadline.daysLeft, 0);
  assert.equal(deadline.status, 'today');
});

test('calendar validation rejects impossible extracted dates before rendering', () => {
  assert.equal(isValidIsoDate('2026-02-28'), true);
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(formatDate('2026-02-30'), 'Date not confirmed');
  assert.throws(() => addCalendarDays('not-a-date', 45), /valid YYYY-MM-DD/);
});

test('unclear vehicle-family sources abstain instead of claiming no ground', () => {
  const caseFile = cloneCase(cases['wrong-vehicle']);
  const byKey = Object.fromEntries(caseFile.facts.map((fact) => [fact.key, fact]));
  byKey.photoPlate.value = byKey.rcPlate.value;
  byKey.photoFamily.reliability = 0.5;
  const assessment = assessCase(caseFile, confirmDecisive(caseFile));
  assert.equal(assessment.outcome, 'unable');
  assert.match(assessment.headline.en, /vehicle family/i);
  assert.equal(assessment.findings.length, 0);
});

test('citizen-supplied findings use source-neutral counter-checks', () => {
  const caseFile = cloneCase(cases['wrong-vehicle']);
  caseFile.synthetic = false;
  const assessment = assessCase(caseFile, confirmDecisive(caseFile));
  assert.equal(assessment.outcome, 'supported');
  const prose = assessment.counterChecks.flatMap((item) => [item.explanation.en, item.explanation.hi]).join(' ');
  assert.doesNotMatch(prose, /synthetic|नकली/i);
  assert.match(prose, /citizen confirmed|नागरिक ने/iu);
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

test('Scam Shield reads Devanagari and Hinglish lures, not only English ones', () => {
  const hindi = inspectChallanMessage({
    message: 'अंतिम चेतावनी: चालान ₹2,000 बाकी है। तुरंत भुगतान करें वरना वाहन ज़ब्त होगा। ऐप डाउनलोड करें।',
    channel: 'whatsapp',
    clicked: false,
    installed: false,
    paid: false,
    sharedCredentials: false,
  });
  assert.equal(hindi.outcome, 'danger');
  assert.ok(hindi.signals.some((signal) => signal.id === 'apk'));
  assert.ok(hindi.signals.some((signal) => signal.id === 'threat'));
  assert.ok(hindi.signals.some((signal) => signal.id === 'whatsapp-challan'));

  const otpHindi = inspectChallanMessage({ message: 'चालान रद्द करने के लिए ओटीपी बताइए', channel: 'call', clicked: false, installed: false, paid: false, sharedCredentials: false });
  assert.ok(otpHindi.signals.some((signal) => signal.id === 'credentials'));
});

test('recovery plan is ordered containment first and is written in both languages', () => {
  const installed = responseSteps({ message: '', channel: 'sms', clicked: false, installed: true, paid: false, sharedCredentials: false });
  assert.match(installed[0].en, /Disconnect/i);
  assert.match(installed[1].en, /1930/);

  const paid = responseSteps({ message: '', channel: 'sms', clicked: false, installed: false, paid: true, sharedCredentials: false });
  assert.match(paid[0].en, /1930/);

  for (const step of [...installed, ...paid]) {
    assert.ok(step.hi.trim().length > 0, 'every recovery step needs Hindi');
    assert.notEqual(step.hi, step.en);
  }
});

test('Scam Shield distinguishes a downloaded APK from an installed one', () => {
  const downloaded = inspectChallanMessage({
    message: '',
    channel: 'sms',
    clicked: true,
    downloaded: true,
    installed: false,
    grantedPermissions: false,
    paid: false,
    sharedCredentials: false,
  });
  assert.equal(downloaded.outcome, 'suspicious');
  assert.equal(downloaded.track, 'report-attempt');
  assert.ok(downloaded.signals.some((signal) => signal.id === 'downloaded'));
  assert.match(responseSteps({ message: '', channel: 'sms', clicked: true, downloaded: true, installed: false, grantedPermissions: false, paid: false, sharedCredentials: false })[0].en, /Do not open/i);

  const permissions = inspectChallanMessage({
    message: '',
    channel: 'whatsapp',
    clicked: true,
    downloaded: true,
    installed: true,
    grantedPermissions: true,
    paid: false,
    sharedCredentials: false,
  });
  assert.equal(permissions.outcome, 'danger');
  assert.equal(permissions.track, 'emergency');
  assert.ok(permissions.signals.some((signal) => signal.id === 'permissions'));
  assert.match(responseSteps({ message: '', channel: 'whatsapp', clicked: true, downloaded: true, installed: true, grantedPermissions: true, paid: false, sharedCredentials: false })[2].en, /uninstall/i);
  assert.match(responseSteps({ message: '', channel: 'whatsapp', clicked: true, downloaded: true, installed: true, grantedPermissions: true, paid: false, sharedCredentials: false })[3].en, /Play Protect/i);
  for (const signal of [...downloaded.signals, ...permissions.signals]) {
    assertBilingual(signal.title, `${signal.id}.title`);
    assertBilingual(signal.detail, `${signal.id}.detail`);
  }
});

test('every Scam Shield escape route is a fixed HTTPS official destination', () => {
  const allowedHosts = new Set(['echallan.parivahan.gov.in', 'www.cybercrime.gov.in', 'sancharsaathi.gov.in', 'www.cert-in.org.in']);
  for (const route of officialSafetyUrls) {
    const parsed = new URL(route);
    assert.equal(parsed.protocol, 'https:');
    assert.ok(allowedHosts.has(parsed.hostname), `unexpected safety host: ${parsed.hostname}`);
  }
});

/**
 * The language toggle must never drop a citizen onto a screen that silently
 * falls back to English. These walk the rule layer's own output rather than the
 * components, which is where the untranslated copy used to hide.
 */
function assertBilingual(value, where) {
  assert.ok(value && typeof value === 'object', `${where} should be a bilingual value`);
  assert.ok(typeof value.en === 'string' && value.en.trim().length > 0, `${where} is missing English`);
  assert.ok(typeof value.hi === 'string' && value.hi.trim().length > 0, `${where} is missing Hindi`);
  assert.ok(/[ऀ-ॿ]/u.test(value.hi), `${where} Hindi is not written in Devanagari`);
}

test('every fixture field carries real Hindi, not an English fallback', () => {
  for (const [key, fixture] of Object.entries(cases)) {
    assertBilingual(fixture.title, `${key}.title`);
    assertBilingual(fixture.shortTitle, `${key}.shortTitle`);
    assertBilingual(fixture.story, `${key}.story`);
    assertBilingual(fixture.offence, `${key}.offence`);
    assertBilingual(fixture.location, `${key}.location`);
    for (const fact of fixture.facts) {
      assertBilingual(fact.label, `${key}.${fact.key}.label`);
      assertBilingual(fact.sourceLabel, `${key}.${fact.key}.sourceLabel`);
      assertBilingual(fact.help, `${key}.${fact.key}.help`);
    }
  }
});

test('every assessment outcome is presentable in Hindi', () => {
  const states = [
    assessCase(cloneCase(cases['wrong-vehicle']), confirmDecisive(cases['wrong-vehicle'])),
    assessCase(cloneCase(cases['ambiguous-photo']), confirmDecisive(cases['ambiguous-photo'])),
    assessCase(cloneCase(cases['duplicate-event']), confirmDecisive(cases['duplicate-event'])),
    assessCase(cloneCase(cases['wrong-vehicle']), new Set()),
  ];
  for (const assessment of states) {
    assertBilingual(assessment.eyebrow, `${assessment.outcome}.eyebrow`);
    assertBilingual(assessment.headline, `${assessment.outcome}.headline`);
    assertBilingual(assessment.explanation, `${assessment.outcome}.explanation`);
    for (const finding of assessment.findings) {
      assertBilingual(finding.title, `${finding.id}.title`);
      assertBilingual(finding.neutralClaim, `${finding.id}.neutralClaim`);
      for (const limitation of finding.limitations) assertBilingual(limitation, `${finding.id}.limitation`);
    }
    for (const check of assessment.counterChecks) {
      assertBilingual(check.label, 'counterCheck.label');
      assertBilingual(check.explanation, 'counterCheck.explanation');
    }
  }
});

test('every scam signal and destination verdict is presentable in Hindi', () => {
  const assessment = inspectChallanMessage({
    message: 'FINAL WARNING pay ₹2,000 at http://echallan-parivahan.example/pay or share your OTP. Install RTO-Challan.apk via bit.ly/x and use AnyDesk.',
    channel: 'whatsapp',
    clicked: true,
    installed: true,
    paid: true,
    sharedCredentials: true,
  });
  assertBilingual(assessment.eyebrow, 'scam.eyebrow');
  assertBilingual(assessment.headline, 'scam.headline');
  assertBilingual(assessment.explanation, 'scam.explanation');
  assert.ok(assessment.signals.length >= 6);
  for (const signal of assessment.signals) {
    assertBilingual(signal.title, `signal.${signal.id}.title`);
    assertBilingual(signal.detail, `signal.${signal.id}.detail`);
  }
  for (const destination of assessment.destinations) assertBilingual(destination.explanation, `destination.${destination.hostname}`);
});

test('dates render in the reader’s own language', () => {
  assert.equal(formatDate('2026-02-30', 'hi'), 'तारीख़ पुष्ट नहीं');
  const hindiDate = formatDate('2026-08-12', 'hi');
  assert.ok(/[ऀ-ॿ]/u.test(hindiDate), `expected Devanagari date, received ${hindiDate}`);
  assert.notEqual(hindiDate, formatDate('2026-08-12', 'en'));
});

test('every next-step destination is an official government host over HTTPS', () => {
  for (const url of officialRouteUrls) {
    const parsed = new URL(url);
    assert.equal(parsed.protocol, 'https:', `${url} must be HTTPS`);
    assert.ok(parsed.hostname.endsWith('.gov.in'), `${url} must be a .gov.in host`);
  }

  // The rendered plan must never introduce a destination outside that set.
  const allowed = new Set(officialRouteUrls);
  for (const outcome of ['supported', 'unable', 'none', 'review']) {
    const plan = nextRoutes(outcome, { status: 'open', daysLeft: 30 });
    for (const route of plan.routes) {
      assert.ok(allowed.has(route.url), `unexpected destination ${route.url}`);
      if (route.secondary) assert.ok(allowed.has(route.secondary.url), `unexpected secondary ${route.secondary.url}`);
    }
  }
});

test('next steps stay available when no contradiction was supported', () => {
  const supported = nextRoutes('supported', { status: 'open', daysLeft: 30 });
  const none = nextRoutes('none', { status: 'open', daysLeft: 30 });

  // Routes are identical; only the framing changes. Hiding official routes from
  // somebody whose grounds this tool cannot see would be the wrong call.
  assert.deepEqual(none.routes.map((route) => route.id), supported.routes.map((route) => route.id));
  assert.notEqual(pickEn(none.lead), pickEn(supported.lead));
  assert.match(pickEn(none.lead), /not the same as the challan being correct/i);
});

test('an uncalculable or expired deadline is treated as urgent', () => {
  assert.equal(nextRoutes('supported', null).routes[0].status, 'act-now');
  assert.equal(nextRoutes('supported', { status: 'passed', daysLeft: -3 }).routes[0].status, 'act-now');
  assert.equal(nextRoutes('supported', { status: 'open', daysLeft: 4 }).routes[0].status, 'act-now');
  assert.equal(nextRoutes('supported', { status: 'open', daysLeft: 30 }).routes[0].status, 'closing');
});

test('the route plan never predicts an outcome or claims a submission', () => {
  const plan = nextRoutes('supported', { status: 'open', daysLeft: 30 });
  const prose = [plan.lead, plan.caution, ...plan.routes.flatMap((r) => [r.title, r.what, r.when])]
    .map(pickEn)
    .join(' ');
  assert.doesNotMatch(prose, /\b(will be (cancelled|dismissed|waived)|guaranteed|we (will )?(file|submit)|on your behalf)\b/i);
  assert.match(pickEn(plan.lead), /Nothing has been submitted|open each of them yourself/i);
});

test('every next-step string is presentable in Hindi', () => {
  const plan = nextRoutes('supported', { status: 'open', daysLeft: 30 });
  assertBilingual(plan.lead, 'routes.lead');
  assertBilingual(plan.caution, 'routes.caution');
  for (const route of plan.routes) {
    assertBilingual(route.authority, `${route.id}.authority`);
    assertBilingual(route.title, `${route.id}.title`);
    assertBilingual(route.what, `${route.id}.what`);
    assertBilingual(route.when, `${route.id}.when`);
    if (route.secondary) assertBilingual(route.secondary.label, `${route.id}.secondary`);
  }
});

function pickEn(value) {
  return value.en;
}

/**
 * Security headers are declared twice: in next.config.ts, which the current host
 * honours, and in public/_headers, which a static host would read instead. They
 * were found out of step once — _headers was missing Cross-Origin-Resource-Policy
 * and Strict-Transport-Security — which means whichever layer a platform happens
 * to honour silently decides the security posture. This keeps them identical.
 */
test('security headers are identical in next.config.ts and public/_headers', async () => {
  const { readFile } = await import('node:fs/promises');
  const [config, headersFile] = await Promise.all([
    readFile(new URL('../next.config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../public/_headers', import.meta.url), 'utf8'),
  ]);

  const declared = new Map();
  for (const [, key, value] of config.matchAll(/\{\s*key:\s*'([^']+)',\s*value:\s*'([^']+)'\s*\}/g)) {
    declared.set(key.toLowerCase(), value);
  }
  assert.ok(declared.size >= 7, `expected the security header block, found ${declared.size}`);

  const served = new Map();
  for (const line of headersFile.split('\n')) {
    const match = /^\s{2}([A-Za-z-]+):\s*(.+?)\s*$/.exec(line);
    if (match) served.set(match[1].toLowerCase(), match[2]);
  }

  for (const [key, value] of declared) {
    assert.equal(served.get(key), value, `public/_headers is missing or disagrees on ${key}`);
  }

  // Content-hashed assets must be cacheable in both places.
  assert.match(headersFile, /\/_next\/static\/\*/);
  assert.match(headersFile, /max-age=31536000, immutable/);
  assert.match(config, /max-age=31536000, immutable/);
});

test('submission pack stays inside the hackathon summary and video limits', async () => {
  const { readFile } = await import('node:fs/promises');
  const [submission, video] = await Promise.all([
    readFile(new URL('../SUBMISSION.md', import.meta.url), 'utf8'),
    readFile(new URL('../submission/challan-jaanch-submission.mp4', import.meta.url)),
  ]);

  const summary = submission.match(/## Project summary\s+([\s\S]*?)\s+\*\*Word count:/u)?.[1]?.trim();
  const declared = Number(submission.match(/\*\*Word count:\*\*\s+(\d+)/u)?.[1]);
  assert.ok(summary, 'project summary block is missing');
  const words = summary.split(/\s+/u).filter(Boolean).length;
  assert.equal(words, declared, 'declared project-summary word count is stale');
  assert.ok(words <= 250, `project summary is ${words} words; the limit is 250`);

  const mvhd = video.indexOf(Buffer.from('mvhd'));
  assert.ok(mvhd > 0, 'submission video has no readable MP4 movie header');
  const version = video[mvhd + 4];
  const timescale = version === 1 ? video.readUInt32BE(mvhd + 24) : video.readUInt32BE(mvhd + 16);
  const duration = version === 1 ? Number(video.readBigUInt64BE(mvhd + 28)) : video.readUInt32BE(mvhd + 20);
  const seconds = duration / timescale;
  assert.ok(seconds > 60, `submission video is unexpectedly short (${seconds.toFixed(1)}s)`);
  assert.ok(seconds <= 120, `submission video is ${seconds.toFixed(1)}s; the limit is 120s`);
});

test('packet integrity metadata never invents hashes for synthetic files', async () => {
  const { readFile } = await import('node:fs/promises');
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /sha256:\s*fileHashes\[[^\]]+\]\s*\|\|\s*`SYNTHETIC-/u);
  assert.doesNotMatch(page, /official_submission/u);
  assert.match(page, /mode:\s*packetMode === 'redacted' \? 'redacted_share' : 'official_handoff'/u);
  assert.match(page, /sha256:\s*null,\s*integrity:\s*'not_computed_no_source_bytes'/u);
  assert.match(page, /sourceRole:\s*'synthetic_fixture'/u);
});
