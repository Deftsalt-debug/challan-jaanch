import { bi, pick, type Bilingual, type Language } from './i18n.ts';

export type PaymentPortal = 'nextgen' | 'national' | 'court' | 'gpay' | 'other';
export type PaymentIssue = 'debited' | 'receipt' | 'pending' | 'twice';
export const paymentPortals: { id: PaymentPortal; label: Bilingual }[] = [
  { id: 'nextgen', label: bi('NextGen eChallan', 'NextGen ई-चालान') },
  { id: 'national', label: bi('National eChallan', 'राष्ट्रीय ई-चालान') },
  { id: 'court', label: bi('Virtual Court', 'वर्चुअल कोर्ट') },
  { id: 'gpay', label: bi('Google Pay · Traffic challans bill payment', 'Google Pay · यातायात चालान बिल भुगतान') },
  { id: 'other', label: bi('State portal, another service, or unsure', 'राज्य पोर्टल, अन्य सेवा या पता नहीं') },
];
export const paymentIssues: { id: PaymentIssue; label: Bilingual }[] = [
  { id: 'debited', label: bi('Money deducted, no receipt', 'पैसा कटा, रसीद नहीं मिली') },
  { id: 'receipt', label: bi('I need a copy of my receipt', 'मुझे रसीद की प्रति चाहिए') },
  { id: 'pending', label: bi('I have a receipt, but it still says pending', 'रसीद है, फिर भी भुगतान बाकी दिखता है') },
  { id: 'twice', label: bi('I may have paid twice', 'शायद दो बार भुगतान हो गया') },
];

export const paymentSources = [
  { url: 'https://echallan.parivahan.nic.in/', label: bi('NextGen payment services', 'NextGen भुगतान सेवाएँ') },
  { url: 'https://echallan.parivahan.nic.in/challan/payment-verification', label: bi('NextGen pending transaction check', 'NextGen लंबित लेन-देन जाँच') },
  { url: 'https://vcourts.gov.in/virtualcourt/faq.php', label: bi('Virtual Courts receipt FAQ', 'वर्चुअल कोर्ट रसीद संबंधी प्रश्न') },
  { url: 'https://support.google.com/pay/india/answer/16376992', label: bi('Google Pay e-challan help', 'Google Pay ई-चालान सहायता') },
] as const;

export interface PaymentPlan {
  title: Bilingual;
  steps: Bilingual[];
  records: Bilingual[];
  destination: { url: string; label: Bilingual };
}

/** Navigation guidance only: no payment lookup, refund decision or settlement prediction. */
export function paymentPlan(portal: PaymentPortal, issue: PaymentIssue): PaymentPlan {
  const steps: Bilingual[] = [];
  if (issue === 'debited' || issue === 'twice') steps.push(bi(
    'Check the existing transaction before making another payment. A bank debit alone does not establish that the challan was settled.',
    'दोबारा भुगतान करने से पहले मौजूदा लेन-देन जाँचें। बैंक से पैसा कटना अपने आप चालान निपटने का प्रमाण नहीं है।',
  ));
  if (issue === 'pending') steps.push(bi(
    'Match the receipt to this challan number and check the issuing service itself. A third-party app may show a different status; keep both records for follow-up.',
    'रसीद का चालान नंबर इस चालान से मिलाएँ और जारी करने वाली सेवा पर स्थिति जाँचें। किसी दूसरे ऐप में अलग स्थिति हो सकती है; आगे पूछताछ के लिए दोनों रिकॉर्ड रखें।',
  ));
  const receiptFlow = issue === 'receipt' || issue === 'pending';
  const destination = portal === 'gpay'
    ? { url: paymentSources[3].url, label: bi('Read Google Pay’s payment guidance', 'Google Pay का भुगतान मार्गदर्शन पढ़ें') }
    : portal === 'court'
    ? { url: 'https://vcourts.gov.in/virtualcourt/', label: bi('Open Virtual Courts', 'वर्चुअल कोर्ट खोलें') }
    : portal === 'nextgen'
      ? { url: receiptFlow ? paymentSources[0].url : paymentSources[1].url, label: receiptFlow ? bi('Open NextGen receipt services', 'NextGen रसीद सेवाएँ खोलें') : bi('Check the pending transaction', 'लंबित लेन-देन जाँचें') }
      : { url: 'https://echallan.parivahan.gov.in/', label: bi('Open official eChallan', 'आधिकारिक ई-चालान खोलें') };

  if (portal === 'gpay') steps.push(bi(
    'For Google Pay’s Traffic challans bill-payment service, open the original payment in transaction history. Review its status and any timeframe shown. If unresolved after that timeframe, use Having issues → Payment issues → Raise dispute. Google’s help page states a 90-day dispute window from payment; check the current terms there. This route is not for a direct transfer to a sender’s UPI address.',
    'Google Pay की यातायात चालान बिल-भुगतान सेवा के लिए लेन-देन इतिहास में मूल भुगतान खोलें। उसकी स्थिति और दिखाई गई समय-सीमा देखें। उस समय के बाद भी समस्या हो तो Having issues → Payment issues → Raise dispute चुनें। Google सहायता पृष्ठ भुगतान से 90 दिन की विवाद अवधि बताता है; वहीं मौजूदा शर्तें जाँचें। यह रास्ता किसी भेजने वाले के UPI पते पर सीधे भेजे पैसे के लिए नहीं है।',
  ));
  else if (portal === 'court') steps.push(bi(
    'Search for the case on Virtual Courts, open View, and look for Reprint. The official FAQ describes receipt retrieval after verification on that service. If no receipt is available, contact the court or state payment authority listed there.',
    'वर्चुअल कोर्ट पर केस खोजें, View खोलें और Reprint देखें। आधिकारिक प्रश्नोत्तर के अनुसार वहीं पुष्टि करके रसीद पाई जा सकती है। रसीद न मिले तो वहाँ बताए गए कोर्ट या राज्य भुगतान विभाग से संपर्क करें।',
  ));
  else if (portal === 'nextgen') steps.push(receiptFlow ? bi(
    'Open Download Payment Receipt on NextGen eChallan. Use the challan details on that official service and keep the downloaded receipt.',
    'NextGen ई-चालान पर Download Payment Receipt खोलें। उसी आधिकारिक सेवा पर चालान विवरण भरें और डाउनलोड की गई रसीद रखें।',
  ) : bi(
    'Open Check Pending Transaction on NextGen eChallan. Enter your challan or vehicle number and captcha there to check the existing attempt.',
    'NextGen ई-चालान पर Check Pending Transaction खोलें। मौजूदा प्रयास जाँचने के लिए वहीं चालान या वाहन नंबर और कैप्चा भरें।',
  ));
  else if (portal === 'national') steps.push(bi(
    'Open the national eChallan portal directly and use its payment-status or receipt option. Follow any state or NextGen redirection shown by the official portal.',
    'राष्ट्रीय ई-चालान पोर्टल सीधे खोलें और भुगतान स्थिति या रसीद का विकल्प चुनें। आधिकारिक पोर्टल राज्य या NextGen सेवा पर भेजे तो उसी रास्ते जाएँ।',
  ));
  else steps.push(bi(
    'Find the original service in your receipt or transaction history, then reach it independently through the issuing authority. A state portal or intermediary payment may not be recorded in the national checker. The national link below is a starting point, not a lookup for every service.',
    'रसीद या लेन-देन इतिहास में मूल सेवा पहचानें, फिर जारी करने वाले विभाग के माध्यम से उस तक पहुँचें। राज्य पोर्टल या मध्यस्थ का भुगतान राष्ट्रीय जाँच में न भी दिखे। नीचे का राष्ट्रीय लिंक शुरुआत के लिए है, हर सेवा की जाँच के लिए नहीं।',
  ));

  if (issue === 'twice') steps.push(bi(
    'Keep both transaction references and any receipts. Ask the receiving authority and your bank or payment provider to reconcile both attempts. Two debits do not by themselves establish a duplicate challan; refund eligibility and timing must be confirmed by the responsible service.',
    'दोनों लेन-देन की पहचान और रसीदें रखें। भुगतान लेने वाले विभाग और बैंक या भुगतान प्रदाता से दोनों प्रयासों का मिलान माँगें। दो बार पैसा कटना अपने आप दोहरा चालान सिद्ध नहीं करता; वापसी की पात्रता और समय संबंधित सेवा से पुष्ट करें।',
  ));
  else steps.push(bi(
    'If the records still disagree, contact the original payment service with the transaction reference and receipt or error record. Ask what status is recorded and what follow-up is required. This helper cannot confirm settlement or promise a resolution time.',
    'रिकॉर्ड में अंतर रहे तो लेन-देन पहचान और रसीद या त्रुटि रिकॉर्ड के साथ मूल भुगतान सेवा से संपर्क करें। पूछें कि क्या स्थिति दर्ज है और आगे क्या करना है। यह सहायक भुगतान निपटने की पुष्टि या समाधान के समय का वादा नहीं कर सकता।',
  ));
  return {
    title: paymentIssues.find((item) => item.id === issue)!.label,
    steps,
    destination,
    records: [
      bi('Challan number and the original payment service', 'चालान नंबर और मूल भुगतान सेवा'),
      bi('Payment date, amount and bank or UPI transaction reference', 'भुगतान तारीख़, राशि और बैंक या UPI लेन-देन पहचान'),
      bi(issue === 'twice' ? 'Both attempts and their separate receipts or error records' : 'Receipt if available, otherwise the error or transaction-status record', issue === 'twice' ? 'दोनों प्रयास और उनकी अलग रसीदें या त्रुटि रिकॉर्ड' : 'रसीद उपलब्ध हो तो वह, अन्यथा त्रुटि या लेन-देन स्थिति का रिकॉर्ड'),
      bi('A dated screenshot of the current official status; redact unrelated bank details', 'मौजूदा आधिकारिक स्थिति का तारीख़ सहित स्क्रीनशॉट; असंबंधित बैंक विवरण छिपाएँ'),
    ],
  };
}

export function paymentChecklist(portal: PaymentPortal, issue: PaymentIssue, language: Language): string {
  const plan = paymentPlan(portal, issue);
  return [
    pick(language, bi('Challan Jaanch · payment follow-up checklist', 'चालान जाँच · भुगतान पूछताछ सूची')),
    pick(language, paymentPortals.find((item) => item.id === portal)!.label),
    pick(language, plan.title), '',
    ...plan.steps.map((step, i) => `${i + 1}. ${pick(language, step)}`), '',
    pick(language, bi('Keep these records privately; attach only what official support requests:', 'ये रिकॉर्ड निजी रखें; आधिकारिक सहायता जो माँगे सिर्फ़ वही जोड़ें:')),
    ...plan.records.map((record) => `• ${pick(language, record)}`), '',
    plan.destination.url, '',
    pick(language, bi('Prepared locally. No payment verified, refund requested or complaint submitted.', 'स्थानीय रूप से तैयार। न भुगतान सत्यापित हुआ, न वापसी माँगी गई, न शिकायत जमा हुई।')),
  ].join('\n');
}
