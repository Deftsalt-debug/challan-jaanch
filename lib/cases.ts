import type { Bilingual, Language } from './i18n.ts';
import { bi, localeTag } from './i18n.ts';

export type CaseKind = 'wrong-vehicle' | 'ambiguous-photo' | 'duplicate-event' | 'manual';
export type Outcome = 'supported' | 'review' | 'unable' | 'none';
export type FactSource = 'challan' | 'photo' | 'vehicle' | 'second-challan' | 'user';

export interface CaseFact {
  key: string;
  label: Bilingual;
  value: string;
  source: FactSource;
  sourceLabel: Bilingual;
  clarity: 'unreviewed' | 'clear' | 'unclear';
  decisive?: boolean;
  alternatives?: { value: string }[];
  help: Bilingual;
}

export interface DemoCase {
  id: string;
  kind: CaseKind;
  title: Bilingual;
  shortTitle: Bilingual;
  story: Bilingual;
  issueDate: string;
  jurisdiction: Bilingual;
  challanNumber: string;
  amount: string;
  offence: Bilingual;
  occurredAt: string;
  location: Bilingual;
  facts: CaseFact[];
  documentNames: string[];
  synthetic: boolean;
}

export interface Finding {
  id: string;
  title: Bilingual;
  neutralClaim: Bilingual;
  rule: string;
  anchors: string[];
  limitations: Bilingual[];
  packetEligible: boolean;
}

export interface CounterCheck {
  label: Bilingual;
  result: 'resolved' | 'unresolved' | 'not-applicable';
  explanation: Bilingual;
}

export interface Assessment {
  outcome: Outcome;
  eyebrow: Bilingual;
  headline: Bilingual;
  explanation: Bilingual;
  findings: Finding[];
  counterChecks: CounterCheck[];
  nextBestEvidence?: Bilingual;
}

export const cases: Record<string, DemoCase> = {
  'wrong-vehicle': {
    id: 'CJ-DEMO-0001',
    kind: 'wrong-vehicle',
    title: bi('The photograph shows another vehicle', 'फोटो में कोई दूसरा वाहन है'),
    shortTitle: bi('Clear vehicle mismatch', 'साफ़ वाहन बेमेल'),
    story: bi(
      'A synthetic challan is recorded against a blue hatchback, but its enforcement photograph shows a black two-wheeler with a different final plate digit.',
      'एक नकली चालान नीली हैचबैक पर दर्ज है, लेकिन उसकी कार्रवाई-फोटो में काला दोपहिया दिखता है और नंबर का आख़िरी अंक अलग है।',
    ),
    issueDate: '2026-08-12',
    jurisdiction: bi('Maharashtra · demonstration pack', 'महाराष्ट्र · डेमो पैक'),
    challanNumber: 'DEMO-MH-260812-1001',
    amount: '₹1,000',
    offence: bi('Red-light violation · demo code', 'लाल बत्ती उल्लंघन · डेमो कोड'),
    occurredAt: '11 Aug 2026 · 09:42:18 IST',
    location: bi('Demo Junction A, Pune', 'डेमो जंक्शन A, पुणे'),
    documentNames: ['synthetic-challan-0001.pdf', 'synthetic-vehicle-record-0001.pdf'],
    synthetic: true,
    facts: [
      { key: 'recordPlate', label: bi('Registration on challan', 'चालान पर पंजीकरण नंबर'), value: 'ZZ00CJ0001', source: 'challan', sourceLabel: bi('Challan record · field 04', 'चालान रिकॉर्ड · फ़ील्ड 04'), clarity: 'clear', decisive: true, help: bi('Printed registration mark on the synthetic challan.', 'नकली चालान पर छपा पंजीकरण चिह्न।') },
      { key: 'photoPlate', label: bi('Plate visible in photograph', 'फोटो में दिख रहा नंबर'), value: 'ZZ00CJ0007', source: 'photo', sourceLabel: bi('Enforcement photo · highlighted crop', 'कार्रवाई-फोटो · चिह्नित हिस्सा'), clarity: 'clear', decisive: true, help: bi('Visible plate read from the supplied enforcement photograph.', 'दी गई कार्रवाई-फोटो से पढ़ा गया नंबर।') },
      { key: 'rcPlate', label: bi('Registration on vehicle record', 'वाहन रिकॉर्ड पर पंजीकरण नंबर'), value: 'ZZ00CJ0001', source: 'vehicle', sourceLabel: bi('Vehicle record · registration field', 'वाहन रिकॉर्ड · पंजीकरण फ़ील्ड'), clarity: 'clear', decisive: true, help: bi('Registration confirmed from the supplied synthetic vehicle record.', 'दिए गए नकली वाहन रिकॉर्ड से पुष्ट पंजीकरण।') },
      { key: 'photoFamily', label: bi('Vehicle family in photograph', 'फोटो में वाहन का प्रकार'), value: 'Two-wheeler', source: 'photo', sourceLabel: bi('Enforcement photo · full frame', 'कार्रवाई-फोटो · पूरा फ़्रेम'), clarity: 'clear', decisive: true, help: bi('Broad vehicle family only; the system does not infer a specific model.', 'सिर्फ़ मोटा प्रकार; सिस्टम कोई ख़ास मॉडल नहीं बताता।') },
      { key: 'rcFamily', label: bi('Vehicle family on record', 'रिकॉर्ड पर वाहन का प्रकार'), value: 'Passenger car', source: 'vehicle', sourceLabel: bi('Vehicle record · class field', 'वाहन रिकॉर्ड · श्रेणी फ़ील्ड'), clarity: 'clear', decisive: true, help: bi('Normalised from the vehicle-class field.', 'वाहन-श्रेणी फ़ील्ड से सामान्यीकृत।') },
      { key: 'rcColour', label: bi('Colour on vehicle record', 'वाहन रिकॉर्ड पर रंग'), value: 'Blue', source: 'vehicle', sourceLabel: bi('Vehicle record · colour field', 'वाहन रिकॉर्ड · रंग फ़ील्ड'), clarity: 'clear', help: bi('Colour is corroborating context only and never creates a finding by itself.', 'रंग सिर्फ़ सहायक संदर्भ है; अकेले इससे कोई निष्कर्ष नहीं बनता।') },
    ],
  },
  'ambiguous-photo': {
    id: 'CJ-DEMO-0002',
    kind: 'ambiguous-photo',
    title: bi('The image is too unclear to decide', 'तस्वीर इतनी धुंधली है कि फ़ैसला नहीं हो सकता'),
    shortTitle: bi('Ambiguous plate — refusal', 'अस्पष्ट नंबर — इनकार'),
    story: bi(
      'The final character may be Z or 2. Because that character would determine the finding, Challan Jaanch refuses to manufacture a mismatch.',
      'आख़िरी अक्षर Z भी हो सकता है और 2 भी। चूँकि यही अक्षर नतीजा तय करता, चालान जाँच झूठा बेमेल बनाने से इनकार करता है।',
    ),
    issueDate: '2026-08-15',
    jurisdiction: bi('Maharashtra · demonstration pack', 'महाराष्ट्र · डेमो पैक'),
    challanNumber: 'DEMO-MH-260815-2001',
    amount: '₹2,000',
    offence: bi('Speeding · demo code', 'तेज़ रफ़्तार · डेमो कोड'),
    occurredAt: '14 Aug 2026 · 21:16:09 IST',
    location: bi('Demo Junction B, Mumbai', 'डेमो जंक्शन B, मुंबई'),
    documentNames: ['synthetic-challan-0002.pdf', 'synthetic-vehicle-record-0002.pdf'],
    synthetic: true,
    facts: [
      { key: 'recordPlate', label: bi('Registration on challan', 'चालान पर पंजीकरण नंबर'), value: 'ZZ00CJ0002', source: 'challan', sourceLabel: bi('Challan record · field 04', 'चालान रिकॉर्ड · फ़ील्ड 04'), clarity: 'clear', decisive: true, help: bi('Printed registration mark on the synthetic challan.', 'नकली चालान पर छपा पंजीकरण चिह्न।') },
      { key: 'photoPlate', label: bi('Possible plate in photograph', 'फोटो में संभावित नंबर'), value: 'ZZ00CJ000Z', source: 'photo', sourceLabel: bi('Enforcement photo · blurred crop', 'कार्रवाई-फोटो · धुंधला हिस्सा'), clarity: 'unclear', decisive: true, alternatives: [{ value: 'ZZ00CJ0002' }], help: bi('Two readings remain plausible; neither is safe to treat as fact.', 'दो पाठ संभव हैं; किसी को भी तथ्य मानना सुरक्षित नहीं।') },
      { key: 'rcPlate', label: bi('Registration on vehicle record', 'वाहन रिकॉर्ड पर पंजीकरण नंबर'), value: 'ZZ00CJ0002', source: 'vehicle', sourceLabel: bi('Vehicle record · registration field', 'वाहन रिकॉर्ड · पंजीकरण फ़ील्ड'), clarity: 'clear', decisive: true, help: bi('Registration confirmed from the supplied synthetic record.', 'दिए गए नकली रिकॉर्ड से पुष्ट पंजीकरण।') },
      { key: 'photoFamily', label: bi('Vehicle family in photograph', 'फोटो में वाहन का प्रकार'), value: 'Unknown', source: 'photo', sourceLabel: bi('Enforcement photo · full frame', 'कार्रवाई-फोटो · पूरा फ़्रेम'), clarity: 'unclear', decisive: true, help: bi('The frame is too dark for a dependable broad-class reading.', 'फ़्रेम इतना अंधेरा है कि मोटा प्रकार भी भरोसे से नहीं पढ़ा जा सकता।') },
      { key: 'rcFamily', label: bi('Vehicle family on record', 'रिकॉर्ड पर वाहन का प्रकार'), value: 'Passenger car', source: 'vehicle', sourceLabel: bi('Vehicle record · class field', 'वाहन रिकॉर्ड · श्रेणी फ़ील्ड'), clarity: 'clear', decisive: true, help: bi('Normalised from the vehicle-class field.', 'वाहन-श्रेणी फ़ील्ड से सामान्यीकृत।') },
    ],
  },
  'duplicate-event': {
    id: 'CJ-DEMO-0003',
    kind: 'duplicate-event',
    title: bi('One capture appears twice', 'एक ही कैप्चर दो बार दर्ज है'),
    shortTitle: bi('Exact duplicate event', 'बिल्कुल एक जैसी घटना'),
    story: bi(
      'Two distinct synthetic challan numbers point to the same capture identifier, timestamp, camera, offence and amount.',
      'दो अलग-अलग नकली चालान नंबर एक ही कैप्चर पहचान, समय, कैमरे, अपराध और राशि की ओर इशारा करते हैं।',
    ),
    issueDate: '2026-08-14',
    jurisdiction: bi('Maharashtra · demonstration pack', 'महाराष्ट्र · डेमो पैक'),
    challanNumber: 'DEMO-MH-260814-3001 / 3002',
    amount: '₹500 each',
    offence: bi('Stop-line violation · demo code', 'स्टॉप-लाइन उल्लंघन · डेमो कोड'),
    occurredAt: '14 Aug 2026 · 18:07:04 IST',
    location: bi('Demo Junction C, Mumbai', 'डेमो जंक्शन C, मुंबई'),
    documentNames: ['synthetic-challan-3001.pdf', 'synthetic-challan-3002.pdf', 'synthetic-vehicle-record-0003.pdf'],
    synthetic: true,
    facts: [
      { key: 'challanA', label: bi('First challan number', 'पहला चालान नंबर'), value: 'DEMO-MH-260814-3001', source: 'challan', sourceLabel: bi('Challan A · heading', 'चालान A · शीर्षक'), clarity: 'clear', decisive: true, help: bi('First independently issued synthetic challan number.', 'अलग से जारी पहला नकली चालान नंबर।') },
      { key: 'challanB', label: bi('Second challan number', 'दूसरा चालान नंबर'), value: 'DEMO-MH-260814-3002', source: 'second-challan', sourceLabel: bi('Challan B · heading', 'चालान B · शीर्षक'), clarity: 'clear', decisive: true, help: bi('Second independently issued synthetic challan number.', 'अलग से जारी दूसरा नकली चालान नंबर।') },
      { key: 'captureA', label: bi('Capture ID · first record', 'कैप्चर पहचान · पहला रिकॉर्ड'), value: 'CJ-CAM-44-000771', source: 'challan', sourceLabel: bi('Challan A · evidence metadata', 'चालान A · साक्ष्य मेटाडेटा'), clarity: 'clear', decisive: true, help: bi('Capture identifier included in the supplied evidence bundle.', 'दिए गए साक्ष्य बंडल में शामिल कैप्चर पहचान।') },
      { key: 'captureB', label: bi('Capture ID · second record', 'कैप्चर पहचान · दूसरा रिकॉर्ड'), value: 'CJ-CAM-44-000771', source: 'second-challan', sourceLabel: bi('Challan B · evidence metadata', 'चालान B · साक्ष्य मेटाडेटा'), clarity: 'clear', decisive: true, help: bi('Same capture identifier appears on the second record.', 'वही कैप्चर पहचान दूसरे रिकॉर्ड पर भी है।') },
      { key: 'eventA', label: bi('Event fingerprint · first', 'घटना पहचान · पहली'), value: '18:07:04 · CJ-CAM-44 · ₹500', source: 'challan', sourceLabel: bi('Challan A · event fields', 'चालान A · घटना फ़ील्ड'), clarity: 'clear', decisive: true, help: bi('Time, camera and amount condensed for comparison.', 'तुलना के लिए समय, कैमरा और राशि एक साथ।') },
      { key: 'eventB', label: bi('Event fingerprint · second', 'घटना पहचान · दूसरी'), value: '18:07:04 · CJ-CAM-44 · ₹500', source: 'second-challan', sourceLabel: bi('Challan B · event fields', 'चालान B · घटना फ़ील्ड'), clarity: 'clear', decisive: true, help: bi('Same time, camera and amount on the second record.', 'दूसरे रिकॉर्ड पर भी वही समय, कैमरा और राशि।') },
    ],
  },
};

export function cloneCase(source: DemoCase): DemoCase {
  return JSON.parse(JSON.stringify(source)) as DemoCase;
}

export function maskIdentifier(value: string): string {
  if (value.length < 6) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-4)}`;
}

/** Masks every challan and registration identifier that can appear in prose. */
export function redactCaseText(value: string, caseFile: DemoCase): string {
  const identifiers = [
    caseFile.challanNumber,
    ...caseFile.facts.filter((fact) => fact.key.toLowerCase().includes('plate')).map((fact) => fact.value),
  ].filter(Boolean);
  return [...new Set(identifiers)]
    .sort((left, right) => right.length - left.length)
    .reduce((text, identifier) => text.replaceAll(identifier, maskIdentifier(identifier)), value);
}

export function normaliseRegistration(value: string): string {
  return value.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '');
}

function allConfirmed(keys: string[], confirmed: Set<string>): boolean {
  return keys.every((key) => confirmed.has(key));
}

export function assessCase(caseFile: DemoCase, confirmed: Set<string>): Assessment {
  const byKey = Object.fromEntries(caseFile.facts.map((fact) => [fact.key, fact]));

  if (caseFile.facts.some((fact) => fact.decisive && (!fact.value.trim() || fact.clarity === 'unreviewed'))) {
    return pendingAssessment(bi(
      'Review each decisive value and its source clarity before comparing.',
      'तुलना से पहले हर निर्णायक मान और उसके स्रोत की स्पष्टता जाँचें।',
    ));
  }

  if (caseFile.kind === 'duplicate-event') {
    const keys = ['challanA', 'challanB', 'captureA', 'captureB', 'eventA', 'eventB'];
    if (!allConfirmed(keys, confirmed)) {
      return pendingAssessment(bi(
        'Confirm all six decisive fields before comparing the records.',
        'रिकॉर्ड मिलाने से पहले छहों निर्णायक फ़ील्ड पुष्ट करें।',
      ));
    }
    const exactDuplicate = byKey.challanA.value !== byKey.challanB.value && byKey.captureA.value === byKey.captureB.value && byKey.eventA.value === byKey.eventB.value;
    if (exactDuplicate) {
      return {
        outcome: 'supported',
        eyebrow: bi('Objective ground found', 'वस्तुनिष्ठ आधार मिला'),
        headline: bi('The supplied records describe the same capture twice.', 'दिए गए रिकॉर्ड एक ही कैप्चर को दो बार दर्ज करते हैं।'),
        explanation: bi(
          'Distinct challan numbers share an identical capture identifier and event fingerprint. This is a record-level contradiction, not a prediction about the authority’s decision.',
          'अलग-अलग चालान नंबरों की कैप्चर पहचान और घटना पहचान एक जैसी है। यह रिकॉर्ड-स्तर का विरोधाभास है, अधिकारी के फ़ैसले की भविष्यवाणी नहीं।',
        ),
        findings: [{
          id: 'F-DUP-01',
          title: bi('Exact duplicate event', 'बिल्कुल एक जैसी घटना'),
          neutralClaim: bi(
            'Two distinct challan numbers in the supplied records point to the same capture identifier, time, camera and amount.',
            'दिए गए रिकॉर्ड में दो अलग चालान नंबर एक ही कैप्चर पहचान, समय, कैमरे और राशि की ओर इशारा करते हैं।',
          ),
          rule: 'EXACT_DUPLICATE_EVENT',
          anchors: keys,
          limitations: [bi(
            'The authority must confirm whether the records represent separate statutory offences.',
            'यह अधिकारी को तय करना है कि दोनों रिकॉर्ड अलग-अलग वैधानिक अपराध हैं या नहीं।',
          )],
          packetEligible: true,
        }],
        counterChecks: [
          { label: bi('Distinct challan numbers', 'अलग-अलग चालान नंबर'), result: 'resolved', explanation: bi('The two record identifiers are different.', 'दोनों रिकॉर्ड की पहचान अलग है।') },
          { label: bi('Same underlying capture', 'एक ही मूल कैप्चर'), result: 'resolved', explanation: bi('Capture identifier, time, camera and amount match exactly.', 'कैप्चर पहचान, समय, कैमरा और राशि पूरी तरह मेल खाते हैं।') },
          { label: bi('Separate offences ruled out', 'अलग अपराध होने की संभावना'), result: 'unresolved', explanation: bi('Only the issuing authority can confirm whether separate provisions were intentionally charged.', 'सिर्फ़ जारी करने वाला अधिकारी बता सकता है कि अलग धाराएँ जानबूझकर लगाई गई थीं या नहीं।') },
        ],
      };
    }
    return noGroundAssessment();
  }

  const plateKeys = ['recordPlate', 'photoPlate', 'rcPlate'];
  const classKeys = ['photoFamily', 'rcFamily'];
  if (!allConfirmed([...plateKeys, ...classKeys], confirmed)) {
    return pendingAssessment(bi(
      'Confirm the five decisive facts before the comparison runs.',
      'तुलना चलाने से पहले पाँचों निर्णायक तथ्य पुष्ट करें।',
    ));
  }

  const photoPlate = byKey.photoPlate;
  if (plateKeys.some((key) => byKey[key].clarity !== 'clear') || photoPlate.alternatives?.length) {
    const alternate = photoPlate.alternatives?.[0]?.value;
    return {
      outcome: 'unable',
      eyebrow: bi('Unable to assess safely', 'सुरक्षित रूप से आकलन संभव नहीं'),
      headline: bi('The registration sources are not clear enough.', 'पंजीकरण के स्रोत पर्याप्त साफ़ नहीं हैं।'),
      explanation: bi(
        'At least one registration source is unclear or has an alternative reading. Review the originals before making a plate comparison.',
        'कम से कम एक पंजीकरण स्रोत अस्पष्ट है या उसका दूसरा पाठ संभव है। नंबर की तुलना से पहले मूल दस्तावेज़ जाँचें।',
      ),
      findings: [],
      counterChecks: [
        { label: bi('Full plate visible', 'पूरा नंबर दिख रहा है'), result: 'unresolved', explanation: bi('A complete, clear reading has not been established for every registration source.', 'हर पंजीकरण स्रोत का पूरा और साफ़ पाठ स्थापित नहीं हुआ है।') },
        ...(alternate ? [{
          label: bi('Alternative reading remains', 'दूसरा संभावित पाठ बाकी है'),
          result: 'unresolved' as const,
          explanation: bi(`${alternate} remains plausible.`, `${alternate} अब भी संभव है।`),
        }] : []),
      ],
      nextBestEvidence: bi(
        'Review clearer original registration records and the uncropped enforcement photograph.',
        'पंजीकरण के अधिक साफ़ मूल रिकॉर्ड और बिना काटी गई कार्रवाई-फोटो जाँचें।',
      ),
    };
  }

  const recordPlate = normaliseRegistration(byKey.recordPlate.value);
  const visiblePlate = normaliseRegistration(photoPlate.value);
  const rcPlate = normaliseRegistration(byKey.rcPlate.value);
  const plateConflict = recordPlate === rcPlate && visiblePlate !== rcPlate;
  const familySourcesClear = byKey.photoFamily.value !== 'Unknown'
    && byKey.rcFamily.value !== 'Unknown'
    && byKey.photoFamily.clarity === 'clear' && byKey.rcFamily.clarity === 'clear';
  const familyConflict = familySourcesClear && byKey.photoFamily.value !== byKey.rcFamily.value;

  // A clear plate contradiction is independently sufficient. Without one, an
  // unreadable vehicle family must produce an abstention rather than the much
  // stronger (and misleading) "No objective ground found" outcome.
  if (!plateConflict && !familySourcesClear) {
    return {
      outcome: 'unable',
      eyebrow: bi('Unable to assess safely', 'सुरक्षित रूप से आकलन संभव नहीं'),
      headline: bi('The vehicle family is not clear enough.', 'वाहन का प्रकार पर्याप्त साफ़ नहीं है।'),
      explanation: bi(
        'The supplied photograph or vehicle record does not support a dependable broad-class comparison. Challan Jaanch will not treat missing clarity as agreement.',
        'दी गई फोटो या वाहन रिकॉर्ड से वाहन के मोटे प्रकार की भरोसेमंद तुलना नहीं हो सकती। चालान जाँच अस्पष्टता को मेल मानकर नहीं चलेगा।',
      ),
      findings: [],
      counterChecks: [
        {
          label: bi('Broad vehicle family visible', 'वाहन का मोटा प्रकार साफ़ दिखता है'),
          result: 'unresolved',
          explanation: bi('Mark the source as clear only when the broad family is visible in the original.', 'स्रोत को तभी साफ़ मानें जब मूल में वाहन का मोटा प्रकार साफ़ दिखे।'),
        },
        {
          label: bi('Plate contradiction independently supported', 'नंबर का विरोधाभास अलग से प्रमाणित'),
          result: 'unresolved',
          explanation: bi('The confirmed plate fields do not independently support a contradiction.', 'पुष्ट नंबर फ़ील्ड अलग से कोई विरोधाभास प्रमाणित नहीं करते।'),
        },
      ],
      nextBestEvidence: bi(
        'Use the original full-frame enforcement photograph or a clearer vehicle record.',
        'मूल पूरे फ़्रेम वाली कार्रवाई-फोटो या ज़्यादा साफ़ वाहन रिकॉर्ड इस्तेमाल करें।',
      ),
    };
  }

  const findings: Finding[] = [];
  if (plateConflict) {
    findings.push({
      id: 'F-REG-01',
      title: bi('Registration-mark conflict', 'पंजीकरण नंबर में विरोधाभास'),
      neutralClaim: bi(
        `The challan and vehicle record show ${byKey.rcPlate.value}, while the supplied enforcement photograph shows ${photoPlate.value}.`,
        `चालान और वाहन रिकॉर्ड में ${byKey.rcPlate.value} है, जबकि दी गई कार्रवाई-फोटो में ${photoPlate.value} दिखता है।`,
      ),
      rule: 'REGISTRATION_MARK_CONFLICT',
      anchors: plateKeys,
      limitations: [bi('The product does not determine why the records conflict.', 'यह उत्पाद यह तय नहीं करता कि रिकॉर्ड में अंतर क्यों है।')],
      packetEligible: true,
    });
  }
  if (familyConflict) {
    findings.push({
      id: 'F-CLASS-01',
      title: bi('Broad vehicle-family conflict', 'वाहन के प्रकार में विरोधाभास'),
      neutralClaim: bi(
        `The enforcement photograph appears to show a ${byKey.photoFamily.value.toLowerCase()}, while the supplied vehicle record says ${byKey.rcFamily.value.toLowerCase()}.`,
        `कार्रवाई-फोटो में ${vehicleFamilyHindi(byKey.photoFamily.value)} दिखता है, जबकि दिए गए वाहन रिकॉर्ड में ${vehicleFamilyHindi(byKey.rcFamily.value)} लिखा है।`,
      ),
      rule: 'VEHICLE_FAMILY_CONFLICT',
      anchors: classKeys,
      limitations: [bi('Only broad vehicle families are compared; model identity is not inferred.', 'सिर्फ़ मोटे प्रकार की तुलना होती है; मॉडल की पहचान नहीं की जाती।')],
      packetEligible: true,
    });
  }

  if (!findings.length) return noGroundAssessment();
  return {
    outcome: 'supported',
    eyebrow: bi('Objective ground found', 'वस्तुनिष्ठ आधार मिला'),
    headline: findings.length > 1
      ? bi('Two independent contradictions are supported.', 'दो अलग-अलग विरोधाभास प्रमाणित हैं।')
      : bi('One objective contradiction is supported.', 'एक वस्तुनिष्ठ विरोधाभास प्रमाणित है।'),
    explanation: bi(
      'The conclusion is limited to conflicts visible in the supplied records. It does not declare the challan invalid or predict the grievance outcome.',
      'यह निष्कर्ष सिर्फ़ दिए गए रिकॉर्ड में दिखने वाले अंतर तक सीमित है। यह चालान को अमान्य नहीं बताता और न शिकायत का नतीजा बताता है।',
    ),
    findings,
    counterChecks: [
      plateConflict
        ? { label: bi('Confusable character ruled out', 'भ्रम पैदा करने वाला अक्षर ख़ारिज'), result: 'resolved', explanation: bi('The visible plate was treated as clear only after the citizen confirmed it against the supplied source.', 'दिख रहे नंबर को तभी साफ़ माना गया जब नागरिक ने उसे दिए गए स्रोत से मिलाकर पुष्ट किया।') }
        : { label: bi('Plate contradiction used', 'नंबर का विरोधाभास इस्तेमाल हुआ'), result: 'not-applicable', explanation: bi('No registration-mark finding is included in this result.', 'इस नतीजे में पंजीकरण नंबर का कोई निष्कर्ष शामिल नहीं है।') },
      familyConflict
        ? { label: bi('Vehicle classes are comparable', 'वाहन श्रेणियाँ तुलना योग्य हैं'), result: 'resolved', explanation: bi(`The confirmed broad families — ${byKey.photoFamily.value} and ${byKey.rcFamily.value} — are different.`, `पुष्ट मोटे प्रकार — ${vehicleFamilyHindi(byKey.photoFamily.value)} और ${vehicleFamilyHindi(byKey.rcFamily.value)} — अलग हैं।`) }
        : { label: bi('Vehicle-family contradiction used', 'वाहन प्रकार का विरोधाभास इस्तेमाल हुआ'), result: familySourcesClear ? 'not-applicable' : 'unresolved', explanation: familySourcesClear ? bi('No broad vehicle-family finding is included in this result.', 'इस नतीजे में वाहन के मोटे प्रकार का कोई निष्कर्ष शामिल नहीं है।') : bi('The vehicle-family sources were not clear enough for a class finding, so none was included.', 'वाहन प्रकार वाले स्रोत निष्कर्ष के लिए पर्याप्त साफ़ नहीं थे, इसलिए ऐसा कोई निष्कर्ष शामिल नहीं है।') },
      { label: bi('Record could be stale', 'रिकॉर्ड पुराना हो सकता है'), result: 'not-applicable', explanation: bi('Plate and class findings do not rely on colour or specific model data.', 'नंबर और श्रेणी के निष्कर्ष रंग या मॉडल की जानकारी पर निर्भर नहीं हैं।') },
      { label: bi('Cause of the mismatch known', 'बेमेल का कारण ज्ञात'), result: 'unresolved', explanation: bi('The product reports the contradiction but does not infer cloning, fraud or authority error.', 'उत्पाद विरोधाभास बताता है, पर क्लोनिंग, धोखाधड़ी या विभागीय ग़लती का अनुमान नहीं लगाता।') },
    ],
  };
}

/**
 * Broad vehicle families and colours are closed sets used as canonical values by
 * the comparison rules, so they are stored in English and only *displayed* in
 * the reader's language. Translating the stored value would break the rules;
 * leaving it untranslated on screen would strand a Hindi reader.
 */
const vehicleFamilies: Record<string, string> = {
  'Two-wheeler': 'दोपहिया',
  'Passenger car': 'कार',
  'Goods vehicle': 'माल वाहन',
  Bus: 'बस',
  'Three-wheeler': 'तिपहिया',
  Other: 'अन्य',
  Unknown: 'अज्ञात',
};

const colours: Record<string, string> = {
  Blue: 'नीला',
  Black: 'काला',
  White: 'सफ़ेद',
  Red: 'लाल',
  Silver: 'सिल्वर',
  Grey: 'स्लेटी',
  Gray: 'स्लेटी',
  Green: 'हरा',
  Yellow: 'पीला',
  Orange: 'नारंगी',
  Brown: 'भूरा',
};

function vehicleFamilyHindi(value: string): string {
  return vehicleFamilies[value] ?? value.toLowerCase();
}

/** Display-only label for a canonical vehicle-family value. */
export function vehicleFamilyLabel(value: string, language: Language): string {
  if (language === 'en') return value;
  return vehicleFamilies[value] ?? value;
}

/** Display-only label for a canonical colour value. */
export function colourLabel(value: string, language: Language): string {
  if (language === 'en') return value;
  return colours[value] ?? value;
}

function pendingAssessment(explanation: Bilingual): Assessment {
  return {
    outcome: 'review',
    eyebrow: bi('Confirmation required', 'पुष्टि ज़रूरी'),
    headline: bi('The comparison has not run yet.', 'तुलना अभी चली नहीं है।'),
    explanation,
    findings: [],
    counterChecks: [],
  };
}

function noGroundAssessment(): Assessment {
  return {
    outcome: 'none',
    eyebrow: bi('No objective ground found', 'कोई वस्तुनिष्ठ आधार नहीं मिला'),
    headline: bi('The confirmed fields do not conflict.', 'पुष्ट किए गए फ़ील्ड में कोई अंतर नहीं है।'),
    explanation: bi(
      'This does not mean the challan is valid. It only means this tool found no supported objective mismatch in the supplied fields.',
      'इसका मतलब यह नहीं कि चालान सही है। इसका मतलब सिर्फ़ इतना है कि दिए गए फ़ील्ड में इस टूल को कोई प्रमाणित बेमेल नहीं मिला।',
    ),
    findings: [],
    counterChecks: [{
      label: bi('Confirmed record fields compared', 'पुष्ट रिकॉर्ड फ़ील्ड की तुलना हुई'),
      result: 'resolved',
      explanation: bi('No supported contradiction was found under the narrow rules.', 'सीमित नियमों के तहत कोई प्रमाणित विरोधाभास नहीं मिला।'),
    }],
  };
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

export function formatDate(date: string, language: Language = 'en'): string {
  if (!isValidIsoDate(date)) return language === 'hi' ? 'तारीख़ पुष्ट नहीं' : 'Date not confirmed';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(localeTag[language], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function deadlineFor(caseFile: DemoCase, today = new Date()): { date: string; daysLeft: number; status: 'open' | 'today' | 'passed' } {
  const date = addCalendarDays(caseFile.issueDate, 45);
  const [year, month, day] = date.split('-').map(Number);
  const deadline = Date.UTC(year, month - 1, day);
  // The rule is a calendar-day clock for an Indian public service. Using the
  // UTC date makes the status one day late between midnight and 05:30 IST.
  const indiaParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(today).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  ) as Record<'year' | 'month' | 'day', number>;
  const now = Date.UTC(indiaParts.year, indiaParts.month - 1, indiaParts.day);
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
