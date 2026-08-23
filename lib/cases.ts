export type CaseKind = 'wrong-vehicle' | 'ambiguous-photo' | 'duplicate-event' | 'manual';
export type Outcome = 'supported' | 'review' | 'unable' | 'none';
export type FactSource = 'challan' | 'photo' | 'vehicle' | 'second-challan' | 'user';

export interface CaseFact {
  key: string;
  label: string;
  value: string;
  source: FactSource;
  sourceLabel: string;
  reliability: number;
  decisive?: boolean;
  alternatives?: { value: string; reliability: number }[];
  help: string;
}

export interface DemoCase {
  id: string;
  kind: CaseKind;
  title: string;
  shortTitle: string;
  story: string;
  issueDate: string;
  jurisdiction: string;
  challanNumber: string;
  amount: string;
  offence: string;
  occurredAt: string;
  location: string;
  facts: CaseFact[];
  documentNames: string[];
  synthetic: boolean;
}

export interface Finding {
  id: string;
  title: string;
  neutralClaim: string;
  rule: string;
  anchors: string[];
  limitations: string[];
  packetEligible: boolean;
}

export interface CounterCheck {
  label: string;
  result: 'resolved' | 'unresolved' | 'not-applicable';
  explanation: string;
}

export interface Assessment {
  outcome: Outcome;
  eyebrow: string;
  headline: string;
  explanation: string;
  findings: Finding[];
  counterChecks: CounterCheck[];
  nextBestEvidence?: string;
}

export const cases: Record<string, DemoCase> = {
  'wrong-vehicle': {
    id: 'CJ-DEMO-0001',
    kind: 'wrong-vehicle',
    title: 'The photograph shows another vehicle',
    shortTitle: 'Clear vehicle mismatch',
    story: 'A synthetic challan is recorded against a blue hatchback, but its enforcement photograph shows a black two-wheeler with a different final plate digit.',
    issueDate: '2026-08-12',
    jurisdiction: 'Maharashtra · demonstration pack',
    challanNumber: 'DEMO-MH-260812-1001',
    amount: '₹1,000',
    offence: 'Red-light violation · demo code',
    occurredAt: '11 Aug 2026 · 09:42:18 IST',
    location: 'Demo Junction A, Pune',
    documentNames: ['synthetic-challan-0001.pdf', 'synthetic-vehicle-record-0001.pdf'],
    synthetic: true,
    facts: [
      { key: 'recordPlate', label: 'Registration on challan', value: 'ZZ00CJ0001', source: 'challan', sourceLabel: 'Challan record · field 04', reliability: 0.99, decisive: true, help: 'Printed registration mark on the synthetic challan.' },
      { key: 'photoPlate', label: 'Plate visible in photograph', value: 'ZZ00CJ0007', source: 'photo', sourceLabel: 'Enforcement photo · highlighted crop', reliability: 0.98, decisive: true, help: 'Visible plate read from the supplied enforcement photograph.' },
      { key: 'rcPlate', label: 'Registration on vehicle record', value: 'ZZ00CJ0001', source: 'vehicle', sourceLabel: 'Vehicle record · registration field', reliability: 0.99, decisive: true, help: 'Registration confirmed from the supplied synthetic vehicle record.' },
      { key: 'photoFamily', label: 'Vehicle family in photograph', value: 'Two-wheeler', source: 'photo', sourceLabel: 'Enforcement photo · full frame', reliability: 0.97, decisive: true, help: 'Broad vehicle family only; the system does not infer a specific model.' },
      { key: 'rcFamily', label: 'Vehicle family on record', value: 'Passenger car', source: 'vehicle', sourceLabel: 'Vehicle record · class field', reliability: 0.99, decisive: true, help: 'Normalised from the vehicle-class field.' },
      { key: 'rcColour', label: 'Colour on vehicle record', value: 'Blue', source: 'vehicle', sourceLabel: 'Vehicle record · colour field', reliability: 0.99, help: 'Colour is corroborating context only and never creates a finding by itself.' },
    ],
  },
  'ambiguous-photo': {
    id: 'CJ-DEMO-0002',
    kind: 'ambiguous-photo',
    title: 'The image is too unclear to decide',
    shortTitle: 'Ambiguous plate — refusal',
    story: 'The final character may be Z or 2. Because that character would determine the finding, Challan Jaanch refuses to manufacture a mismatch.',
    issueDate: '2026-08-15',
    jurisdiction: 'Maharashtra · demonstration pack',
    challanNumber: 'DEMO-MH-260815-2001',
    amount: '₹2,000',
    offence: 'Speeding · demo code',
    occurredAt: '14 Aug 2026 · 21:16:09 IST',
    location: 'Demo Junction B, Mumbai',
    documentNames: ['synthetic-challan-0002.pdf', 'synthetic-vehicle-record-0002.pdf'],
    synthetic: true,
    facts: [
      { key: 'recordPlate', label: 'Registration on challan', value: 'ZZ00CJ0002', source: 'challan', sourceLabel: 'Challan record · field 04', reliability: 0.99, decisive: true, help: 'Printed registration mark on the synthetic challan.' },
      { key: 'photoPlate', label: 'Possible plate in photograph', value: 'ZZ00CJ000Z', source: 'photo', sourceLabel: 'Enforcement photo · blurred crop', reliability: 0.56, decisive: true, alternatives: [{ value: 'ZZ00CJ0002', reliability: 0.44 }], help: 'Two readings remain plausible; neither is safe to treat as fact.' },
      { key: 'rcPlate', label: 'Registration on vehicle record', value: 'ZZ00CJ0002', source: 'vehicle', sourceLabel: 'Vehicle record · registration field', reliability: 0.99, decisive: true, help: 'Registration confirmed from the supplied synthetic record.' },
      { key: 'photoFamily', label: 'Vehicle family in photograph', value: 'Unknown', source: 'photo', sourceLabel: 'Enforcement photo · full frame', reliability: 0.45, decisive: true, help: 'The frame is too dark for a dependable broad-class reading.' },
      { key: 'rcFamily', label: 'Vehicle family on record', value: 'Passenger car', source: 'vehicle', sourceLabel: 'Vehicle record · class field', reliability: 0.99, decisive: true, help: 'Normalised from the vehicle-class field.' },
    ],
  },
  'duplicate-event': {
    id: 'CJ-DEMO-0003',
    kind: 'duplicate-event',
    title: 'One capture appears twice',
    shortTitle: 'Exact duplicate event',
    story: 'Two distinct synthetic challan numbers point to the same capture identifier, timestamp, camera, offence and amount.',
    issueDate: '2026-08-14',
    jurisdiction: 'Maharashtra · demonstration pack',
    challanNumber: 'DEMO-MH-260814-3001 / 3002',
    amount: '₹500 each',
    offence: 'Stop-line violation · demo code',
    occurredAt: '14 Aug 2026 · 18:07:04 IST',
    location: 'Demo Junction C, Mumbai',
    documentNames: ['synthetic-challan-3001.pdf', 'synthetic-challan-3002.pdf', 'synthetic-vehicle-record-0003.pdf'],
    synthetic: true,
    facts: [
      { key: 'challanA', label: 'First challan number', value: 'DEMO-MH-260814-3001', source: 'challan', sourceLabel: 'Challan A · heading', reliability: 0.99, decisive: true, help: 'First independently issued synthetic challan number.' },
      { key: 'challanB', label: 'Second challan number', value: 'DEMO-MH-260814-3002', source: 'second-challan', sourceLabel: 'Challan B · heading', reliability: 0.99, decisive: true, help: 'Second independently issued synthetic challan number.' },
      { key: 'captureA', label: 'Capture ID · first record', value: 'CJ-CAM-44-000771', source: 'challan', sourceLabel: 'Challan A · evidence metadata', reliability: 0.99, decisive: true, help: 'Capture identifier included in the supplied evidence bundle.' },
      { key: 'captureB', label: 'Capture ID · second record', value: 'CJ-CAM-44-000771', source: 'second-challan', sourceLabel: 'Challan B · evidence metadata', reliability: 0.99, decisive: true, help: 'Same capture identifier appears on the second record.' },
      { key: 'eventA', label: 'Event fingerprint · first', value: '18:07:04 · CJ-CAM-44 · ₹500', source: 'challan', sourceLabel: 'Challan A · event fields', reliability: 0.99, decisive: true, help: 'Time, camera and amount condensed for comparison.' },
      { key: 'eventB', label: 'Event fingerprint · second', value: '18:07:04 · CJ-CAM-44 · ₹500', source: 'second-challan', sourceLabel: 'Challan B · event fields', reliability: 0.99, decisive: true, help: 'Same time, camera and amount on the second record.' },
    ],
  },
};

export function cloneCase(source: DemoCase): DemoCase {
  return JSON.parse(JSON.stringify(source)) as DemoCase;
}

export function normaliseRegistration(value: string): string {
  return value.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '');
}

function allConfirmed(keys: string[], confirmed: Set<string>): boolean {
  return keys.every((key) => confirmed.has(key));
}

export function assessCase(caseFile: DemoCase, confirmed: Set<string>): Assessment {
  const byKey = Object.fromEntries(caseFile.facts.map((fact) => [fact.key, fact]));

  if (caseFile.kind === 'duplicate-event') {
    const keys = ['challanA', 'challanB', 'captureA', 'captureB', 'eventA', 'eventB'];
    if (!allConfirmed(keys, confirmed)) return pendingAssessment('Confirm all six decisive fields before comparing the records.');
    const exactDuplicate = byKey.challanA.value !== byKey.challanB.value && byKey.captureA.value === byKey.captureB.value && byKey.eventA.value === byKey.eventB.value;
    if (exactDuplicate) {
      return {
        outcome: 'supported',
        eyebrow: 'Objective ground found',
        headline: 'The supplied records describe the same capture twice.',
        explanation: 'Distinct challan numbers share an identical capture identifier and event fingerprint. This is a record-level contradiction, not a prediction about the authority’s decision.',
        findings: [{ id: 'F-DUP-01', title: 'Exact duplicate event', neutralClaim: 'Two distinct challan numbers in the supplied records point to the same capture identifier, time, camera and amount.', rule: 'EXACT_DUPLICATE_EVENT', anchors: keys, limitations: ['The authority must confirm whether the records represent separate statutory offences.'], packetEligible: true }],
        counterChecks: [
          { label: 'Distinct challan numbers', result: 'resolved', explanation: 'The two record identifiers are different.' },
          { label: 'Same underlying capture', result: 'resolved', explanation: 'Capture identifier, time, camera and amount match exactly.' },
          { label: 'Separate offences ruled out', result: 'unresolved', explanation: 'Only the issuing authority can confirm whether separate provisions were intentionally charged.' },
        ],
      };
    }
    return noGroundAssessment();
  }

  const plateKeys = ['recordPlate', 'photoPlate', 'rcPlate'];
  const classKeys = ['photoFamily', 'rcFamily'];
  if (!allConfirmed([...plateKeys, ...classKeys], confirmed)) return pendingAssessment('Confirm the five decisive facts before the comparison runs.');

  const photoPlate = byKey.photoPlate;
  if (photoPlate.reliability < 0.7 || (photoPlate.alternatives?.length && Math.abs(photoPlate.reliability - photoPlate.alternatives[0].reliability) < 0.15)) {
    return {
      outcome: 'unable',
      eyebrow: 'Unable to assess safely',
      headline: 'The decisive character is too ambiguous.',
      explanation: 'Two different plate readings remain plausible. Challan Jaanch will not turn an uncertain OCR reading into an allegation.',
      findings: [],
      counterChecks: [
        { label: 'Full plate visible', result: 'unresolved', explanation: 'The final character is blurred.' },
        { label: 'Alternative OCR reading ruled out', result: 'unresolved', explanation: `${photoPlate.alternatives?.[0]?.value ?? 'Another reading'} remains plausible.` },
        { label: 'Vehicle family independently visible', result: 'unresolved', explanation: 'The broad vehicle class cannot be read dependably from this frame.' },
      ],
      nextBestEvidence: 'Download or request the original, uncropped enforcement photograph.',
    };
  }

  const recordPlate = normaliseRegistration(byKey.recordPlate.value);
  const visiblePlate = normaliseRegistration(photoPlate.value);
  const rcPlate = normaliseRegistration(byKey.rcPlate.value);
  const plateConflict = recordPlate === rcPlate && visiblePlate !== rcPlate && Math.min(byKey.recordPlate.reliability, photoPlate.reliability, byKey.rcPlate.reliability) >= 0.92;
  const familyConflict = byKey.photoFamily.value !== 'Unknown' && byKey.photoFamily.value !== byKey.rcFamily.value && Math.min(byKey.photoFamily.reliability, byKey.rcFamily.reliability) >= 0.92;

  const findings: Finding[] = [];
  if (plateConflict) findings.push({ id: 'F-REG-01', title: 'Registration-mark conflict', neutralClaim: `The challan and vehicle record show ${byKey.rcPlate.value}, while the supplied enforcement photograph shows ${photoPlate.value}.`, rule: 'REGISTRATION_MARK_CONFLICT', anchors: plateKeys, limitations: ['The product does not determine why the records conflict.'], packetEligible: true });
  if (familyConflict) findings.push({ id: 'F-CLASS-01', title: 'Broad vehicle-family conflict', neutralClaim: `The enforcement photograph appears to show a ${byKey.photoFamily.value.toLowerCase()}, while the supplied vehicle record says ${byKey.rcFamily.value.toLowerCase()}.`, rule: 'VEHICLE_FAMILY_CONFLICT', anchors: classKeys, limitations: ['Only broad vehicle families are compared; model identity is not inferred.'], packetEligible: true });

  if (!findings.length) return noGroundAssessment();
  return {
    outcome: 'supported',
    eyebrow: 'Objective ground found',
    headline: findings.length > 1 ? 'Two independent contradictions are supported.' : 'One objective contradiction is supported.',
    explanation: 'The conclusion is limited to conflicts visible in the supplied records. It does not declare the challan invalid or predict the grievance outcome.',
    findings,
    counterChecks: [
      { label: 'Confusable character ruled out', result: 'resolved', explanation: 'The decisive digit is visible in the synthetic full-resolution crop and was confirmed by the user.' },
      { label: 'Vehicle classes are comparable', result: 'resolved', explanation: 'A two-wheeler and passenger car are different broad families.' },
      { label: 'Record could be stale', result: 'not-applicable', explanation: 'Plate and class findings do not rely on colour or specific model data.' },
      { label: 'Cause of the mismatch known', result: 'unresolved', explanation: 'The product reports the contradiction but does not infer cloning, fraud or authority error.' },
    ],
  };
}

function pendingAssessment(explanation: string): Assessment {
  return { outcome: 'review', eyebrow: 'Confirmation required', headline: 'The comparison has not run yet.', explanation, findings: [], counterChecks: [] };
}

function noGroundAssessment(): Assessment {
  return { outcome: 'none', eyebrow: 'No objective ground found', headline: 'The confirmed fields do not conflict.', explanation: 'This does not mean the challan is valid. It only means this tool found no supported objective mismatch in the supplied fields.', findings: [], counterChecks: [{ label: 'Confirmed record fields compared', result: 'resolved', explanation: 'No supported contradiction was found under the narrow rules.' }] };
}

export function addCalendarDays(date: string, days: number): string {
  if (!isValidIsoDate(date)) throw new Error('Expected a valid YYYY-MM-DD calendar date.');
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return false;
  const value = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === date;
}

export function formatDate(date: string): string {
  if (!isValidIsoDate(date)) return 'Date not confirmed';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function deadlineFor(caseFile: DemoCase, today = new Date()): { date: string; daysLeft: number; status: 'open' | 'today' | 'passed' } {
  const date = addCalendarDays(caseFile.issueDate, 45);
  const [year, month, day] = date.split('-').map(Number);
  const deadline = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const daysLeft = Math.ceil((deadline - now) / 86_400_000);
  return { date, daysLeft, status: daysLeft > 0 ? 'open' : daysLeft === 0 ? 'today' : 'passed' };
}

export function sourceTone(source: FactSource): string {
  if (source === 'photo') return 'photo';
  if (source === 'vehicle') return 'vehicle';
  if (source === 'second-challan') return 'second';
  if (source === 'user') return 'user';
  return 'challan';
}
