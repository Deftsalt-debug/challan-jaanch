import type { Bilingual } from './i18n.ts';
import { bi } from './i18n.ts';

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
  title: Bilingual;
  detail: Bilingual;
}

export interface InspectedDestination {
  raw: string;
  display: string;
  hostname: string;
  classification: 'official' | 'lookalike' | 'unverified';
  explanation: Bilingual;
}

export interface ScamAssessment {
  outcome: ScamOutcome;
  track: ScamTrack;
  eyebrow: Bilingual;
  headline: Bilingual;
  explanation: Bilingual;
  signals: ScamSignal[];
  destinations: InspectedDestination[];
}

export const OFFICIAL_ECHALLAN_URL = 'https://echallan.parivahan.gov.in/index/check-challan-status';
export const CYBERCRIME_REPORT_URL = 'https://www.cybercrime.gov.in/';
export const CYBERCRIME_SUSPECT_URL = 'https://www.cybercrime.gov.in/Webform/cyber_suspect.aspx';

const officialHosts = new Map<string, Bilingual>([
  ['echallan.parivahan.gov.in', bi('Exact HTTPS hostname used by the national eChallan service.', 'राष्ट्रीय ई-चालान सेवा का असली HTTPS पता।')],
  ['mparivahan.parivahan.gov.in', bi('Exact HTTPS hostname used by the official mParivahan service.', 'आधिकारिक mParivahan सेवा का असली HTTPS पता।')],
]);
const shortenerHosts = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'shorturl.at', 'goo.gl', 'is.gd']);
const impersonationWords = ['challan', 'echallan', 'parivahan', 'mparivahan', 'vahan', 'rto', 'trafficpolice', 'traffic-police'];

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.;!?\]}>'”’]+$/u, '');
}

function extractDestinations(message: string): InspectedDestination[] {
  const matches = message.match(/(?:https?:\/\/|www\.)[^\s<>{}\[\]"']+|(?<![@\w/.])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>{}\[\]"']*)?/giu) ?? [];
  const seen = new Set<string>();
  const destinations: InspectedDestination[] = [];

  for (const match of matches) {
    const raw = stripTrailingPunctuation(match);
    if (seen.has(raw)) continue;
    seen.add(raw);
    try {
      const parsed = new URL(/^https?:\/\//iu.test(raw) ? raw : `https://${raw}`);
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
          ? officialHosts.get(hostname) ?? bi('Exact hostname on the recognised official transport-service allowlist.', 'मान्यता प्राप्त आधिकारिक परिवहन सेवा सूची में शामिल असली पता।')
          : looksOfficial
            ? bi('Uses transport or challan wording but is not a recognised official transport-service hostname.', 'परिवहन या चालान जैसे शब्द इस्तेमाल करता है, पर यह मान्यता प्राप्त आधिकारिक पता नहीं है।')
            : bi('Not one of the official destinations recognised by this checker.', 'यह इस जाँचकर्ता की आधिकारिक सूची में शामिल पता नहीं है।'),
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

  if (input.channel === 'whatsapp' && /\b(?:challan|e-?challan|rto|parivahan|traffic police)\b|चालान|परिवहन|यातायात|आरटीओ/iu.test(message)) {
    addSignal(signals, {
      id: 'whatsapp-challan',
      severity: 'caution',
      title: bi('Unexpected challan over WhatsApp', 'WhatsApp पर अचानक आया चालान'),
      detail: bi(
        'Current government cyber guidance warns about fake RTO and Parivahan messages distributed through WhatsApp. Verify independently rather than continuing in the chat.',
        'सरकारी साइबर सलाह में WhatsApp पर भेजे जा रहे नकली RTO और परिवहन संदेशों की चेतावनी है। चैट में आगे बढ़ने के बजाय अलग से जाँच करें।',
      ),
    });
  }

  if (/\.apk\b|android\s+(?:package|app)|install\s+(?:this|the)\s+app|unknown\s+sources?|ऐप\s*(?:इंस्टॉल|डाउनलोड)|इंस्टॉल\s*कर|डाउनलोड\s*कर|अनजान\s*स्रोत/iu.test(message)) {
    addSignal(signals, {
      id: 'apk',
      severity: 'critical',
      title: bi('App or APK installation request', 'ऐप या APK इंस्टॉल करने की माँग'),
      detail: bi(
        'Government cyber advisories warn about fake RTO/Parivahan APKs sent through messages. Do not download, upload, or install the file.',
        'सरकारी साइबर सलाह में संदेशों से भेजे जा रहे नकली RTO/परिवहन APK की चेतावनी है। फ़ाइल को डाउनलोड, अपलोड या इंस्टॉल न करें।',
      ),
    });
  }
  if (/\b(?:otp|one[- ]time password|upi pin|pin number|cvv|card number|netbanking password|bank password|share screen)\b|ओटीपी|यूपीआई\s*पिन|पिन\s*(?:नंबर|बताइए|बताएं|बताएँ)|सीवीवी|कार्ड\s*नंबर|पासवर्ड|स्क्रीन\s*शेयर/iu.test(message)) {
    addSignal(signals, {
      id: 'credentials',
      severity: 'critical',
      title: bi('Credential or OTP request', 'OTP या गोपनीय जानकारी की माँग'),
      detail: bi(
        'The official eChallan service says it does not request passwords, OTPs, payment details, or sensitive information through calls, emails, messages, or links.',
        'आधिकारिक ई-चालान सेवा कहती है कि वह कॉल, ईमेल, संदेश या लिंक से पासवर्ड, OTP, भुगतान जानकारी या गोपनीय जानकारी कभी नहीं माँगती।',
      ),
    });
  }
  if (/\b(?:anydesk|teamviewer|quicksupport|remote access|screen sharing)\b|रिमोट\s*(?:एक्सेस|कंट्रोल)/iu.test(message)) {
    addSignal(signals, {
      id: 'remote-access',
      severity: 'critical',
      title: bi('Remote-access request', 'फ़ोन का रिमोट कंट्रोल माँगा जा रहा है'),
      detail: bi(
        'Do not install remote-control software or let a caller view or control the device used for banking.',
        'रिमोट कंट्रोल ऐप इंस्टॉल न करें और बैंकिंग वाले फ़ोन को किसी कॉल करने वाले को देखने या चलाने न दें।',
      ),
    });
  }
  if (/\b(?:pay now|pay immediately|payment link|scan (?:this )?qr|send (?:the )?money|upi id|phonepe|paytm|google pay|gpay)\b|₹\s?\d|अभी\s*भुगतान|भुगतान\s*लिंक|पैसे\s*(?:भेज|जमा)|क्यूआर\s*स्कैन|यूपीआई\s*आईडी/iu.test(message)) {
    addSignal(signals, {
      id: 'direct-payment',
      severity: 'caution',
      title: bi('Direct payment pressure', 'सीधे भुगतान का दबाव'),
      detail: bi(
        'Do not pay from a message or caller-provided destination. Independently type the official eChallan address and verify whether a challan exists.',
        'संदेश या कॉल करने वाले के दिए पते से भुगतान न करें। आधिकारिक ई-चालान पता ख़ुद टाइप करके जाँचें कि चालान है भी या नहीं।',
      ),
    });
  }
  if (/\b(?:arrest|warrant|license (?:will be )?(?:blocked|suspended|cancelled)|vehicle (?:will be )?seized|final warning|within \d+ (?:minutes?|hours?)|pay today|immediately|urgent)\b|गिरफ़्तार|गिरफ्तार|वारंट|लाइसेंस\s*(?:रद्द|निलंबित|ब्लॉक)|वाहन\s*ज़ब्त|वाहन\s*जब्त|अंतिम\s*चेतावनी|आज\s*ही|तुरंत|जल्दी\s*कर/iu.test(message)) {
    addSignal(signals, {
      id: 'threat',
      severity: 'caution',
      title: bi('Threat or artificial urgency', 'धमकी या बनावटी जल्दबाज़ी'),
      detail: bi(
        'Pressure and threats are used to stop people from independently checking a claim.',
        'दबाव और धमकी इसलिए दी जाती है ताकि आप अलग से जाँच न कर सकें।',
      ),
    });
  }

  for (const destination of destinations) {
    if (destination.classification === 'lookalike') {
      addSignal(signals, {
        id: `lookalike-${destination.hostname}`,
        severity: 'critical',
        title: bi('Lookalike challan destination', 'नकली चालान पता'),
        detail: bi(
          `${destination.hostname} is not a recognised official transport-service hostname. Do not open it from the message.`,
          `${destination.hostname} कोई मान्यता प्राप्त आधिकारिक परिवहन पता नहीं है। इसे संदेश से न खोलें।`,
        ),
      });
    } else if (destination.classification === 'unverified') {
      addSignal(signals, {
        id: `unverified-${destination.hostname}`,
        severity: 'caution',
        title: bi('Unverified destination', 'अपुष्ट पता'),
        detail: bi(
          `${destination.hostname} is outside the small official allowlist used by this checker. That does not prove fraud; verify through an independently opened government service.`,
          `${destination.hostname} इस जाँचकर्ता की छोटी आधिकारिक सूची से बाहर है। इससे धोखाधड़ी साबित नहीं होती; सरकारी सेवा अलग से खोलकर जाँचें।`,
        ),
      });
    }
    if (destination.raw.toLowerCase().startsWith('http://')) {
      addSignal(signals, {
        id: `http-${destination.hostname}`,
        severity: 'caution',
        title: bi('Unencrypted link', 'बिना सुरक्षा वाला लिंक'),
        detail: bi(`${destination.hostname} uses HTTP rather than HTTPS.`, `${destination.hostname} HTTPS के बजाय HTTP इस्तेमाल करता है।`),
      });
    }
    if (destination.hostname.startsWith('xn--')) {
      addSignal(signals, {
        id: `punycode-${destination.hostname}`,
        severity: 'critical',
        title: bi('Encoded lookalike hostname', 'छिपे अक्षरों वाला नकली पता'),
        detail: bi(
          'The hostname uses an internationalised-domain encoding that can conceal lookalike characters.',
          'यह पता ऐसी कोडिंग इस्तेमाल करता है जिसमें मिलते-जुलते अक्षर छिपाए जा सकते हैं।',
        ),
      });
    }
    if (shortenerHosts.has(destination.hostname)) {
      addSignal(signals, {
        id: `shortener-${destination.hostname}`,
        severity: 'caution',
        title: bi('Hidden link destination', 'छिपा हुआ लिंक पता'),
        detail: bi(
          'A shortened link conceals the final website address. Do not follow it to verify a challan.',
          'छोटा किया गया लिंक असली पता छिपा देता है। चालान जाँचने के लिए इसे न खोलें।',
        ),
      });
    }
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(destination.hostname)) {
      addSignal(signals, {
        id: `ip-${destination.hostname}`,
        severity: 'critical',
        title: bi('Raw IP address used as a website', 'वेबसाइट की जगह सीधा IP पता'),
        detail: bi(
          'A numeric IP address is not the known official eChallan hostname.',
          'अंकों वाला IP पता आधिकारिक ई-चालान का जाना-पहचाना पता नहीं है।',
        ),
      });
    }
  }

  if (input.clicked) {
    addSignal(signals, {
      id: 'clicked',
      severity: 'caution',
      title: bi('Link was opened', 'लिंक खोला जा चुका है'),
      detail: bi(
        'Close it, enter nothing, and independently verify the challan on the official service.',
        'उसे बंद करें, कुछ भी न भरें, और आधिकारिक सेवा पर अलग से चालान जाँचें।',
      ),
    });
  }
  if (input.installed) {
    addSignal(signals, {
      id: 'installed',
      severity: 'critical',
      title: bi('Suspicious app may be installed', 'संदिग्ध ऐप इंस्टॉल हो सकता है'),
      detail: bi(
        'Disconnect that device from the internet. Use another device to contact your bank and 1930; do not enter new credentials on the affected device.',
        'उस फ़ोन का इंटरनेट बंद करें। बैंक और 1930 से संपर्क के लिए दूसरा फ़ोन इस्तेमाल करें; प्रभावित फ़ोन पर नया पासवर्ड या OTP न डालें।',
      ),
    });
  }
  if (input.paid) {
    addSignal(signals, {
      id: 'paid',
      severity: 'critical',
      title: bi('Money may have been transferred', 'पैसा भेजा जा चुका हो सकता है'),
      detail: bi(
        'Call the national financial-cyber-fraud helpline 1930 immediately, contact the bank or payment provider, and preserve the transaction ID.',
        'तुरंत राष्ट्रीय साइबर वित्तीय धोखाधड़ी हेल्पलाइन 1930 पर कॉल करें, बैंक या भुगतान सेवा से संपर्क करें, और लेन-देन आईडी सुरक्षित रखें।',
      ),
    });
  }
  if (input.sharedCredentials) {
    addSignal(signals, {
      id: 'shared',
      severity: 'critical',
      title: bi('A secret or financial credential was shared', 'गोपनीय या वित्तीय जानकारी साझा हुई'),
      detail: bi(
        'From a clean device, contact the bank or provider, secure the affected accounts, and report the incident immediately.',
        'किसी सुरक्षित फ़ोन से बैंक या सेवा प्रदाता से संपर्क करें, प्रभावित खाते सुरक्षित करें, और तुरंत शिकायत दर्ज करें।',
      ),
    });
  }

  const critical = signals.filter((signal) => signal.severity === 'critical').length;
  const exposed = input.installed || input.paid || input.sharedCredentials;
  const outcome: ScamOutcome = critical > 0 || signals.length >= 3 ? 'danger' : signals.length > 0 ? 'suspicious' : 'unverified';
  const track: ScamTrack = exposed ? 'emergency' : outcome === 'unverified' ? 'verify' : 'report-attempt';

  if (outcome === 'danger') {
    return {
      outcome,
      track,
      eyebrow: exposed
        ? bi('Immediate response recommended', 'तुरंत कार्रवाई ज़रूरी')
        : bi('High-risk pattern detected', 'उच्च जोखिम का पैटर्न मिला'),
      headline: exposed
        ? bi('Act now from a clean device.', 'किसी सुरक्षित फ़ोन से अभी कार्रवाई करें।')
        : bi('Stop. Do not pay, install, or reply.', 'रुकें। भुगतान न करें, कुछ इंस्टॉल न करें, जवाब न दें।'),
      explanation: exposed
        ? bi(
          'Use the ordered response plan below. Speed matters after a financial transfer or device compromise.',
          'नीचे दी गई क्रमवार योजना अपनाएँ। पैसा जाने या फ़ोन प्रभावित होने के बाद तेज़ी बहुत मायने रखती है।',
        )
        : bi(
          'One or more patterns match current government warnings about eChallan impersonation. This is risk triage, not a legal finding.',
          'एक या अधिक पैटर्न ई-चालान की नकल पर मौजूदा सरकारी चेतावनियों से मेल खाते हैं। यह जोखिम की छँटाई है, कोई क़ानूनी निष्कर्ष नहीं।',
        ),
      signals,
      destinations,
    };
  }
  if (outcome === 'suspicious') {
    return {
      outcome,
      track,
      eyebrow: bi('Suspicious pattern detected', 'संदिग्ध पैटर्न मिला'),
      headline: bi('Pause and verify independently.', 'रुकें और अलग से जाँच करें।'),
      explanation: bi(
        'Do not use the message, number, attachment, QR code, or payment link to continue. Open the official service separately.',
        'आगे बढ़ने के लिए इस संदेश, नंबर, फ़ाइल, QR कोड या भुगतान लिंक का इस्तेमाल न करें। आधिकारिक सेवा अलग से खोलें।',
      ),
      signals,
      destinations,
    };
  }
  return {
    outcome,
    track,
    eyebrow: bi('No obvious red flag found', 'कोई स्पष्ट ख़तरे का निशान नहीं मिला'),
    headline: bi('Still verify outside the message.', 'फिर भी संदेश से बाहर जाकर जाँच करें।'),
    explanation: bi(
      'This checker cannot authenticate a sender or prove that a message is safe. Independently open the official eChallan service and search there.',
      'यह जाँचकर्ता भेजने वाले की पहचान नहीं कर सकता और न यह साबित कर सकता है कि संदेश सुरक्षित है। आधिकारिक ई-चालान सेवा अलग से खोलकर वहीं खोजें।',
    ),
    signals,
    destinations,
  };
}

/**
 * The ordered recovery plan. Lives in the rule layer rather than the component
 * so the ordering — contain, then call, then preserve, then report — is covered
 * by the deterministic tests.
 */
export function responseSteps(input: ScamInput): Bilingual[] {
  if (input.installed) {
    return [
      bi('Disconnect the affected phone from mobile data and Wi-Fi. Do not enter another password, PIN, or OTP on it.', 'प्रभावित फ़ोन का मोबाइल डेटा और Wi-Fi बंद करें। उस पर कोई और पासवर्ड, PIN या OTP न डालें।'),
      bi('From a different, trusted device, call 1930 and contact your bank or payment provider.', 'किसी दूसरे भरोसेमंद फ़ोन से 1930 पर कॉल करें और अपने बैंक या भुगतान सेवा से संपर्क करें।'),
      bi('Preserve screenshots, the sender number, APK name, permissions shown, transaction alerts, and timestamps.', 'स्क्रीनशॉट, भेजने वाले का नंबर, APK का नाम, माँगी गई अनुमतियाँ, लेन-देन अलर्ट और समय सुरक्षित रखें।'),
      bi('Report at cybercrime.gov.in and arrange professional device cleanup or a secure reset before using banking again.', 'cybercrime.gov.in पर शिकायत करें और बैंकिंग दोबारा इस्तेमाल करने से पहले फ़ोन की पेशेवर सफ़ाई या सुरक्षित रीसेट कराएँ।'),
    ];
  }
  if (input.paid || input.sharedCredentials) {
    return [
      bi('Call 1930 immediately. Fast reporting can help financial institutions act on the transfer.', 'तुरंत 1930 पर कॉल करें। जल्दी शिकायत करने से बैंक लेन-देन पर कार्रवाई कर सकते हैं।'),
      bi('Contact the bank, card issuer, wallet, or UPI provider using a trusted number and secure affected accounts.', 'भरोसेमंद नंबर से बैंक, कार्ड कंपनी, वॉलेट या UPI सेवा से संपर्क करें और प्रभावित खाते सुरक्षित करें।'),
      bi('Preserve the transaction ID, amount, time, sender details, message screenshots, and any acknowledgement.', 'लेन-देन आईडी, राशि, समय, भेजने वाले का विवरण, संदेश के स्क्रीनशॉट और कोई भी रसीद सुरक्षित रखें।'),
      bi('Complete the complaint at cybercrime.gov.in. Do not negotiate with or warn the sender.', 'cybercrime.gov.in पर शिकायत पूरी करें। भेजने वाले से बातचीत या उसे सचेत न करें।'),
    ];
  }
  if (input.clicked) {
    return [
      bi('Close the page. Do not enter credentials, approve a notification, install a file, or make a payment.', 'पेज बंद करें। कोई जानकारी न भरें, कोई सूचना स्वीकार न करें, कोई फ़ाइल इंस्टॉल न करें, भुगतान न करें।'),
      bi('Independently type the official eChallan address and search for the challan there.', 'आधिकारिक ई-चालान पता ख़ुद टाइप करें और वहीं चालान खोजें।'),
      bi('Preserve the original message and report the suspicious destination to I4C if it was impersonating eChallan.', 'मूल संदेश सुरक्षित रखें और अगर वह ई-चालान की नकल कर रहा था तो संदिग्ध पते की शिकायत I4C को करें।'),
    ];
  }
  return [
    bi('Do not reply, call the supplied number, scan its QR code, install its attachment, or follow its payment link.', 'जवाब न दें, दिए गए नंबर पर कॉल न करें, उसका QR स्कैन न करें, उसकी फ़ाइल इंस्टॉल न करें, उसका भुगतान लिंक न खोलें।'),
    bi('Independently open the official eChallan service and check whether a matching challan exists.', 'आधिकारिक ई-चालान सेवा अलग से खोलें और देखें कि वैसा कोई चालान है भी या नहीं।'),
    bi('Preserve the original message. Report the sender or destination to I4C when it appears to impersonate a public service.', 'मूल संदेश सुरक्षित रखें। अगर वह किसी सरकारी सेवा की नकल कर रहा हो तो भेजने वाले या पते की शिकायत I4C को करें।'),
  ];
}
