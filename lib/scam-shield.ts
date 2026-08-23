export type ScamChannel = 'whatsapp' | 'sms' | 'call' | 'email' | 'other';
export type ScamOutcome = 'danger' | 'suspicious' | 'unverified';
export type ScamTrack = 'emergency' | 'report-attempt' | 'verify';

export interface ScamInput {
  message: string;
  channel: ScamChannel;
  clicked: boolean;
  installed: boolean;
  paid: boolean;
  sharedCredentials: boolean;
}

export interface ScamSignal {
  id: string;
  severity: 'critical' | 'caution';
  title: string;
  detail: string;
}

export interface InspectedDestination {
  raw: string;
  display: string;
  hostname: string;
  classification: 'official' | 'lookalike' | 'unverified';
  explanation: string;
}

export interface ScamAssessment {
  outcome: ScamOutcome;
  track: ScamTrack;
  eyebrow: string;
  headline: string;
  explanation: string;
  signals: ScamSignal[];
  destinations: InspectedDestination[];
}

export const OFFICIAL_ECHALLAN_URL = 'https://echallan.parivahan.gov.in/index/check-challan-status';
export const CYBERCRIME_REPORT_URL = 'https://www.cybercrime.gov.in/';
export const CYBERCRIME_SUSPECT_URL = 'https://www.cybercrime.gov.in/Webform/cyber_suspect.aspx';

const officialHosts = new Map([
  ['echallan.parivahan.gov.in', 'Exact HTTPS hostname used by the national eChallan service.'],
  ['mparivahan.parivahan.gov.in', 'Exact HTTPS hostname used by the official mParivahan service.'],
]);
const shortenerHosts = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'shorturl.at', 'goo.gl', 'is.gd']);
const impersonationWords = ['challan', 'echallan', 'parivahan', 'mparivahan', 'vahan', 'rto', 'trafficpolice', 'traffic-police'];

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.;!?\]}>'”’]+$/u, '');
}

function extractDestinations(message: string): InspectedDestination[] {
  const matches = message.match(/(?:https?:\/\/|www\.)[^\s<>{}\[\]"']+/giu) ?? [];
  const seen = new Set<string>();
  const destinations: InspectedDestination[] = [];

  for (const match of matches) {
    const raw = stripTrailingPunctuation(match);
    if (seen.has(raw)) continue;
    seen.add(raw);
    try {
      const parsed = new URL(raw.startsWith('www.') ? `https://${raw}` : raw);
      const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
      const display = `${hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`.slice(0, 96);
      const looksOfficial = impersonationWords.some((word) => `${hostname}${parsed.pathname}`.toLowerCase().includes(word));
      const isOfficial = parsed.protocol === 'https:' && officialHosts.has(hostname);
      destinations.push({
        raw,
        display,
        hostname,
        classification: isOfficial ? 'official' : looksOfficial ? 'lookalike' : 'unverified',
        explanation: isOfficial
          ? officialHosts.get(hostname) ?? 'Exact hostname on the recognised official transport-service allowlist.'
          : looksOfficial
            ? 'Uses transport or challan wording but is not the known national eChallan hostname.'
            : 'Not one of the official destinations recognised by this checker.',
      });
    } catch {
      // Malformed text is not rendered as a destination. Other message signals still apply.
    }
  }
  return destinations;
}

function addSignal(signals: ScamSignal[], signal: ScamSignal) {
  if (!signals.some((entry) => entry.id === signal.id)) signals.push(signal);
}

export function inspectChallanMessage(input: ScamInput): ScamAssessment {
  const message = input.message.normalize('NFKC');
  const destinations = extractDestinations(message);
  const signals: ScamSignal[] = [];

  if (/\.apk\b|android\s+(?:package|app)|install\s+(?:this|the)\s+app|unknown\s+sources?/iu.test(message)) {
    addSignal(signals, { id: 'apk', severity: 'critical', title: 'App or APK installation request', detail: 'Government cyber advisories warn about fake RTO/Parivahan APKs sent through messages. Do not download, upload, or install the file.' });
  }
  if (/\b(?:otp|one[- ]time password|upi pin|pin number|cvv|card number|netbanking password|bank password|share screen)\b/iu.test(message)) {
    addSignal(signals, { id: 'credentials', severity: 'critical', title: 'Credential or OTP request', detail: 'The official eChallan service says it does not request passwords, OTPs, payment details, or sensitive information through calls, emails, messages, or links.' });
  }
  if (/\b(?:anydesk|teamviewer|quicksupport|remote access|screen sharing)\b/iu.test(message)) {
    addSignal(signals, { id: 'remote-access', severity: 'critical', title: 'Remote-access request', detail: 'Do not install remote-control software or let a caller view or control the device used for banking.' });
  }
  if (/\b(?:pay now|pay immediately|payment link|scan (?:this )?qr|send (?:the )?money|upi id|phonepe|paytm|google pay|gpay)\b|₹\s?\d/iu.test(message)) {
    addSignal(signals, { id: 'direct-payment', severity: 'caution', title: 'Direct payment pressure', detail: 'Do not pay from a message or caller-provided destination. Independently type the official eChallan address and verify whether a challan exists.' });
  }
  if (/\b(?:arrest|warrant|license (?:will be )?(?:blocked|suspended|cancelled)|vehicle (?:will be )?seized|final warning|within \d+ (?:minutes?|hours?)|pay today|immediately|urgent)\b/iu.test(message)) {
    addSignal(signals, { id: 'threat', severity: 'caution', title: 'Threat or artificial urgency', detail: 'Pressure and threats are used to stop people from independently checking a claim.' });
  }

  for (const destination of destinations) {
    if (destination.classification === 'lookalike') {
      addSignal(signals, { id: `lookalike-${destination.hostname}`, severity: 'critical', title: 'Lookalike challan destination', detail: `${destination.hostname} is not the known national eChallan hostname. Do not open it from the message.` });
    } else if (destination.classification === 'unverified') {
      addSignal(signals, { id: `unverified-${destination.hostname}`, severity: 'caution', title: 'Unverified destination', detail: `${destination.hostname} is outside the small official allowlist used by this checker. That does not prove fraud; verify through an independently opened government service.` });
    }
    if (destination.raw.toLowerCase().startsWith('http://')) {
      addSignal(signals, { id: `http-${destination.hostname}`, severity: 'caution', title: 'Unencrypted link', detail: `${destination.hostname} uses HTTP rather than HTTPS.` });
    }
    if (destination.hostname.startsWith('xn--')) {
      addSignal(signals, { id: `punycode-${destination.hostname}`, severity: 'critical', title: 'Encoded lookalike hostname', detail: 'The hostname uses an internationalised-domain encoding that can conceal lookalike characters.' });
    }
    if (shortenerHosts.has(destination.hostname)) {
      addSignal(signals, { id: `shortener-${destination.hostname}`, severity: 'caution', title: 'Hidden link destination', detail: 'A shortened link conceals the final website address. Do not follow it to verify a challan.' });
    }
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(destination.hostname)) {
      addSignal(signals, { id: `ip-${destination.hostname}`, severity: 'critical', title: 'Raw IP address used as a website', detail: 'A numeric IP address is not the known official eChallan hostname.' });
    }
  }

  if (input.clicked) {
    addSignal(signals, { id: 'clicked', severity: 'caution', title: 'Link was opened', detail: 'Close it, enter nothing, and independently verify the challan on the official service.' });
  }
  if (input.installed) {
    addSignal(signals, { id: 'installed', severity: 'critical', title: 'Suspicious app may be installed', detail: 'Disconnect that device from the internet. Use another device to contact your bank and 1930; do not enter new credentials on the affected device.' });
  }
  if (input.paid) {
    addSignal(signals, { id: 'paid', severity: 'critical', title: 'Money may have been transferred', detail: 'Call the national financial-cyber-fraud helpline 1930 immediately, contact the bank or payment provider, and preserve the transaction ID.' });
  }
  if (input.sharedCredentials) {
    addSignal(signals, { id: 'shared', severity: 'critical', title: 'A secret or financial credential was shared', detail: 'From a clean device, contact the bank or provider, secure the affected accounts, and report the incident immediately.' });
  }

  const critical = signals.filter((signal) => signal.severity === 'critical').length;
  const exposed = input.installed || input.paid || input.sharedCredentials;
  const outcome: ScamOutcome = critical > 0 || signals.length >= 3 ? 'danger' : signals.length > 0 ? 'suspicious' : 'unverified';
  const track: ScamTrack = exposed ? 'emergency' : outcome === 'unverified' ? 'verify' : 'report-attempt';

  if (outcome === 'danger') {
    return { outcome, track, eyebrow: exposed ? 'Immediate response recommended' : 'High-risk pattern detected', headline: exposed ? 'Act now from a clean device.' : 'Stop. Do not pay, install, or reply.', explanation: exposed ? 'Use the ordered response plan below. Speed matters after a financial transfer or device compromise.' : 'One or more patterns match current government warnings about eChallan impersonation. This is risk triage, not a legal finding.', signals, destinations };
  }
  if (outcome === 'suspicious') {
    return { outcome, track, eyebrow: 'Suspicious pattern detected', headline: 'Pause and verify independently.', explanation: 'Do not use the message, number, attachment, QR code, or payment link to continue. Open the official service separately.', signals, destinations };
  }
  return { outcome, track, eyebrow: 'No obvious red flag found', headline: 'Still verify outside the message.', explanation: 'This checker cannot authenticate a sender or prove that a message is safe. Independently open the official eChallan service and search there.', signals, destinations };
}
