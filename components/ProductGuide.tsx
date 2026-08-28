'use client';

import { useEffect, useState } from 'react';
import { Language, localeTag, t } from '../lib/i18n';

type GuideTab = 'journey' | 'scams' | 'guardrails' | 'stack' | 'scale';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function AudioGuideButton({ text, language = 'en' }: { text: string; language?: Language }) {
  // Tracking *what* is being spoken rather than a boolean means a stage or
  // language change makes the button fall back to "Listen" on its own, with no
  // effect needed to correct the label.
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const speaking = spokenText === text;

  const toggle = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpokenText(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeTag[language];
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setSpokenText(null);
    utterance.onerror = () => setSpokenText(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpokenText(text);
  };

  // Silence the previous screen's narration when the guidance text changes or
  // the button unmounts. This only touches the speech engine, never state.
  useEffect(() => () => window.speechSynthesis?.cancel(), [text]);

  return (
    <button
      onClick={toggle}
      className={classes('hidden rounded-lg border px-3 py-2 text-xs font-black transition sm:inline-flex', speaking ? 'border-[#315f78] bg-[#eef4f7] text-[#315f78]' : 'border-[#c7c1b6] bg-white/55 text-[#52615f] hover:border-[#315f78]')}
      aria-pressed={speaking}
    >
      {speaking ? t(language, 'Stop audio', 'आवाज़ बंद करें') : t(language, 'Listen', 'सुनें')}
    </button>
  );
}

export function HowItWorksDrawer({ open, onClose, language = 'en' }: { open: boolean; onClose: () => void; language?: Language }) {
  const [tab, setTab] = useState<GuideTab>('journey');
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);
  if (!open) return null;

  const tabs: Array<[GuideTab, string]> = [
    ['journey', t(language, 'Evidence journey', 'साक्ष्य यात्रा')],
    ['scams', t(language, 'Scam Shield', 'ठगी ढाल')],
    ['guardrails', t(language, 'Trust model', 'भरोसे का ढाँचा')],
    ['stack', t(language, 'Technology', 'तकनीक')],
    ['scale', t(language, 'Running it for real', 'असल में चलाना')],
  ];

  const journeySteps: Array<[string, string, string]> = [
    ['01', t(language, 'Bring the records together', 'रिकॉर्ड एक साथ लाएँ'), t(language, 'Load the challan/evidence bundle and the corresponding vehicle record—or run the fully synthetic guided case.', 'चालान/साक्ष्य बंडल और उससे जुड़ा वाहन रिकॉर्ड चुनें—या पूरी तरह नकली निर्देशित केस चलाएँ।')],
    ['02', t(language, 'Extract observable facts', 'दिखने वाले तथ्य निकालें'), t(language, 'The optional multimodal model reads plate, date, broad vehicle class and other visible fields. It makes no legal finding.', 'वैकल्पिक मल्टीमॉडल मॉडल नंबर, तारीख़, वाहन का मोटा प्रकार और अन्य दिखने वाले फ़ील्ड पढ़ता है। यह कोई क़ानूनी निष्कर्ष नहीं देता।')],
    ['03', t(language, 'Verify every decisive value', 'हर निर्णायक मान जाँचें'), t(language, 'The citizen edits and confirms the facts. A changed value immediately invalidates any prior result.', 'नागरिक तथ्यों को सुधारता और पुष्ट करता है। कोई मान बदलते ही पिछला नतीजा तुरंत रद्द हो जाता है।')],
    ['04', t(language, 'Run the deterministic comparison', 'निश्चित नियमों से तुलना चलाएँ'), t(language, 'Versioned TypeScript rules compare the three sources, test counter-explanations and choose a supported, refused or no-ground state.', 'संस्करण-बद्ध TypeScript नियम तीनों स्रोतों की तुलना करते हैं, विपरीत व्याख्याएँ जाँचते हैं और प्रमाणित, इनकार या कोई-आधार-नहीं में से एक स्थिति चुनते हैं।')],
    ['05', t(language, 'Prepare a citizen packet', 'नागरिक पैकेट तैयार करें'), t(language, 'Only supported, confirmed claims enter the PDF, JSON manifest or share-safe text brief. The app then names the three official routes — grievance, Virtual Court, Lok Adalat — and you open each one yourself.', 'सिर्फ़ प्रमाणित और पुष्ट दावे ही PDF, JSON मेनिफ़ेस्ट या साझा करने योग्य सार में जाते हैं। इसके बाद ऐप तीन आधिकारिक रास्ते बताता है — शिकायत, वर्चुअल कोर्ट, लोक अदालत — और हर एक आप ख़ुद खोलते हैं।')],
  ];

  const scamCards: Array<[string, string]> = [
    [t(language, 'Detect high-risk patterns', 'उच्च जोखिम पैटर्न पहचानें'), t(language, 'Flags APK installation, OTP/PIN requests, remote access, urgency, direct-payment pressure, short links and lookalike domains.', 'APK इंस्टॉल, OTP/PIN की माँग, रिमोट एक्सेस, जल्दबाज़ी, सीधे भुगतान का दबाव, छोटे लिंक और नकली पते चिह्नित करता है।')],
    [t(language, 'Never label a message safe', 'किसी संदेश को सुरक्षित नहीं बताता'), t(language, 'The lowest-risk result is “No obvious red flag.” The sender still must be verified independently.', 'सबसे कम जोखिम वाला नतीजा है “कोई स्पष्ट ख़तरे का निशान नहीं”। भेजने वाले की जाँच फिर भी अलग से ज़रूरी है।')],
    [t(language, 'Match the response to the exposure', 'घटना के हिसाब से जवाब'), t(language, 'Opened, downloaded, installed, dangerous-permission, credential and payment states each receive a different ordered response.', 'लिंक खोलने, डाउनलोड, इंस्टॉल, ख़तरनाक अनुमति, गोपनीय जानकारी और भुगतान — हर स्थिति के लिए अलग क्रमवार कार्रवाई मिलती है।')],
    [t(language, 'Separate attempt from loss', 'कोशिश और नुक़सान में फ़र्क़'), t(language, 'Suspicious calls, SMS and WhatsApp can go to Chakshu; suspect identifiers can go to I4C. Payment or credential exposure routes to 1930 and the cybercrime portal.', 'संदिग्ध कॉल, SMS और WhatsApp की शिकायत Chakshu पर और संदिग्ध पहचान की शिकायत I4C पर की जा सकती है। पैसा जाने या जानकारी साझा होने पर 1930 और साइबर अपराध पोर्टल का रास्ता मिलता है।')],
    [t(language, 'Use a clean escape route', 'सुरक्षित रास्ता ही खुलता है'), t(language, 'The only clickable destinations are hard-coded government services. User-supplied links remain inert.', 'सिर्फ़ पहले से तय सरकारी सेवाएँ ही क्लिक हो सकती हैं। उपयोगकर्ता के दिए लिंक निष्क्रिय रहते हैं।')],
  ];

  const guardrails: Array<[string, string]> = [
    [t(language, 'Model extracts; code decides', 'मॉडल निकालता है; कोड तय करता है'), t(language, 'The model cannot call a challan invalid or predict a grievance outcome.', 'मॉडल किसी चालान को अमान्य नहीं कह सकता और न शिकायत का नतीजा बता सकता है।')],
    [t(language, 'Uncertainty stops the claim', 'अनिश्चितता दावे को रोक देती है'), t(language, 'Confusable plate characters or an unreadable vehicle class produce “Unable to assess.”', 'भ्रम पैदा करने वाले अक्षर या न पढ़ा जा सकने वाला वाहन प्रकार “आकलन संभव नहीं” देता है।')],
    [t(language, 'Original files stay immutable', 'मूल फ़ाइलें अछूती रहती हैं'), t(language, 'Annotations and user edits are overlays; source files are never rewritten.', 'चिह्न और बदलाव सिर्फ़ ऊपरी परत हैं; मूल फ़ाइलें कभी नहीं बदली जातीं।')],
    [t(language, 'No government impersonation', 'सरकारी नक़ल नहीं'), t(language, 'No logos, seals, official case numbers or simulated submission success.', 'कोई लोगो, मुहर, सरकारी केस नंबर या नकली “जमा हो गया” संदेश नहीं।')],
    [t(language, 'No credential collection', 'कोई गोपनीय जानकारी नहीं ली जाती'), t(language, 'The official portal opens separately. Challan Jaanch never asks for its password or OTP.', 'आधिकारिक पोर्टल अलग से खुलता है। चालान जाँच उसका पासवर्ड या OTP कभी नहीं माँगता।')],
    [t(language, 'No unsafe-link navigation', 'असुरक्षित लिंक नहीं खुलते'), t(language, 'Pasted URLs are inspected as text. Only hard-coded official government destinations are clickable.', 'चिपकाए गए पते सिर्फ़ पाठ के रूप में जाँचे जाते हैं। सिर्फ़ पहले से तय सरकारी पते क्लिक होते हैं।')],
    [t(language, 'Local path before transmission', 'भेजने से पहले स्थानीय रास्ता'), t(language, 'Manual entry keeps file bytes on-device. Optional AI extraction requires a separate, explicit transmission consent.', 'हाथ से भरने पर फ़ाइल के बाइट डिवाइस पर रहते हैं। वैकल्पिक AI निष्कर्षण के लिए अलग और स्पष्ट भेजने की सहमति ज़रूरी है।')],
    [t(language, 'No silent retention', 'चुपचाप कुछ नहीं रखा जाता'), t(language, 'No application database, analytics or persistent document store; reset clears the browser session.', 'कोई ऐप डेटाबेस, विश्लेषण या स्थायी दस्तावेज़ भंडार नहीं; रीसेट करते ही ब्राउज़र सत्र साफ़ हो जाता है।')],
  ];

  const stack: Array<[string, string]> = [
    ['React 19 + TypeScript', t(language, 'Client state machine, accessible interactions and strict evidence models.', 'क्लाइंट स्टेट मशीन, सुलभ इंटरैक्शन और सख़्त साक्ष्य मॉडल।')],
    ['Vinext + Vite', t(language, 'Fast Next-compatible application build with Cloudflare Worker output.', 'तेज़ Next-संगत बिल्ड, Cloudflare Worker आउटपुट के साथ।')],
    ['Tailwind CSS 4', t(language, 'Responsive layout, design tokens, reduced-motion support and touch-friendly components.', 'रेस्पॉन्सिव लेआउट, डिज़ाइन टोकन, कम-गति सहायता और छूने में आसान घटक।')],
    [t(language, 'OpenAI Responses API', 'OpenAI Responses API'), t(language, 'Optional, consented image/PDF extraction with structured JSON and store:false. OpenAI API data controls still apply.', 'वैकल्पिक, सहमति-आधारित छवि/PDF निष्कर्षण, संरचित JSON और store:false के साथ। OpenAI API डेटा नियंत्रण फिर भी लागू होते हैं।')],
    [t(language, 'Codex-assisted engineering', 'Codex से बनी इंजीनियरिंग'), t(language, 'Rules, tests, accessibility passes and this bilingual layer were built with Codex in the loop; see docs/HOW_WE_BUILT_IT.md.', 'नियम, टेस्ट, सुलभता सुधार और यह द्विभाषी परत Codex के साथ बनाई गई; देखें docs/HOW_WE_BUILT_IT.md।')],
    [t(language, 'Deterministic TypeScript rules', 'निश्चित TypeScript नियम'), t(language, 'Plate, broad vehicle-family and exact-duplicate comparisons; calendar-date deadline logic.', 'नंबर, वाहन के मोटे प्रकार और हूबहू दोहराव की तुलना; कैलेंडर-तारीख़ की समय-सीमा गणना।')],
    [t(language, 'Local scam-triage rules', 'स्थानीय ठगी-छँटाई नियम'), t(language, 'URL parsing, exact-host allowlisting and current advisory patterns without opening or transmitting pasted links.', 'पते की जाँच, असली होस्ट की सूची और मौजूदा सलाह-पैटर्न — चिपकाए लिंक खोले या भेजे बिना।')],
    ['jsPDF + Web APIs', t(language, 'In-browser PDF/JSON downloads, share-safe briefing, file hashing, object URLs and speech guidance.', 'ब्राउज़र में ही PDF/JSON डाउनलोड, सुरक्षित साझा सार, फ़ाइल हैशिंग, ऑब्जेक्ट URL और आवाज़ मार्गदर्शन।')],
    [t(language, 'No database by design', 'डेटाबेस जानबूझकर नहीं'), t(language, 'No D1, R2, auth or application-owned document persistence in this MVP.', 'इस MVP में कोई D1, R2, लॉगिन या ऐप-स्वामित्व वाला दस्तावेज़ भंडार नहीं।')],
  ];

  const scaleRows: Array<[string, string, string]> = [
    [
      t(language, 'Today', 'आज'),
      t(language, 'Stateless edge worker', 'बिना-स्थिति एज वर्कर'),
      t(language, 'Every comparison runs in the browser. The stateless server route is used only after explicit AI consent; store:false disables retrievable response storage, while OpenAI API data controls may still include abuse-monitoring retention.', 'हर तुलना ब्राउज़र में चलती है। बिना-स्थिति सर्वर रास्ता सिर्फ़ स्पष्ट AI सहमति के बाद चलता है; store:false जवाब को बाद में पाने वाला भंडारण बंद करता है, जबकि OpenAI API डेटा नियंत्रण में दुरुपयोग-निगरानी रख-रखाव फिर भी हो सकता है।'),
    ],
    [
      t(language, 'Mocked', 'नकली'),
      t(language, 'Challan and vehicle records', 'चालान और वाहन रिकॉर्ड'),
      t(language, 'All three demo cases are synthetic fixtures. There is no connection to any government system, and none is attempted.', 'तीनों डेमो केस नकली हैं। किसी सरकारी सिस्टम से कोई जुड़ाव नहीं है, और न ही कोशिश की जाती है।'),
    ],
    [
      t(language, 'Next', 'आगे'),
      t(language, 'Authorised record lookup', 'अधिकृत रिकॉर्ड जाँच'),
      t(language, 'A production version would read the citizen’s own challan and vehicle record through a consented, authorised API rather than uploaded scans — removing the weakest link, which is manual transcription.', 'उत्पादन संस्करण नागरिक का अपना चालान और वाहन रिकॉर्ड सहमति-आधारित अधिकृत API से पढ़ेगा, न कि अपलोड की गई स्कैन से — इससे सबसे कमज़ोर कड़ी, यानी हाथ से नक़ल, हट जाती है।'),
    ],
    [
      t(language, 'Next', 'आगे'),
      t(language, 'Rule packs with versions', 'संस्करण वाले नियम-पैक'),
      t(language, 'Deadline and offence rules differ by state and change by gazette. Each rule pack carries its source, effective date and version so an outdated rule fails closed instead of guessing.', 'समय-सीमा और अपराध के नियम हर राज्य में अलग हैं और राजपत्र से बदलते हैं। हर नियम-पैक अपना स्रोत, प्रभावी तारीख़ और संस्करण रखता है, ताकि पुराना नियम अनुमान लगाने के बजाय रुक जाए।'),
    ],
    [
      t(language, 'Next', 'आगे'),
      t(language, 'Measure without surveillance', 'निगरानी के बिना मापन'),
      t(language, 'Operating this at scale needs aggregate counts — refusal rate, rule hit rate, packet completion — never document content. Those counters can be kept without a citizen-level record.', 'बड़े पैमाने पर चलाने के लिए कुल गिनती चाहिए — इनकार दर, नियम-हिट दर, पैकेट पूर्णता — दस्तावेज़ की सामग्री कभी नहीं। ये गिनती नागरिक-स्तर के रिकॉर्ड के बिना रखी जा सकती है।'),
    ],
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-end bg-[#112629]/65 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guide-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-t-[18px] bg-[#f3f1ec] p-5 shadow-2xl sm:h-full sm:rounded-none sm:p-8">
        <header className="flex items-start justify-between gap-5 border-b border-[#d4cec3] pb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'System guide', 'सिस्टम गाइड')}</p>
            <h2 id="guide-title" className="mt-2 text-4xl font-black tracking-[-0.05em]">{t(language, 'How Challan Jaanch works.', 'चालान जाँच कैसे काम करता है।')}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#66736f]">{t(language, 'A transparent evidence preflight between receiving a confusing challan and using the official grievance process.', 'उलझन भरा चालान मिलने और आधिकारिक शिकायत प्रक्रिया के बीच एक पारदर्शी साक्ष्य जाँच।')}</p>
          </div>
          <button autoFocus onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#bdb7ac] bg-white text-lg font-black" aria-label={t(language, 'Close how it works', 'गाइड बंद करें')}>×</button>
        </header>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#d2ccc1] bg-[#ebe6dc] p-1" role="tablist">
          {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={classes('whitespace-nowrap rounded-md px-4 py-2.5 text-xs font-black transition', tab === id ? 'bg-[#172a33] text-white' : 'text-[#61706d] hover:bg-white')}>{label}</button>)}
        </div>

        {tab === 'journey' && (
          <div className="mt-7 space-y-3">
            {journeySteps.map(([number, title, body]) => <article key={number} className="grid gap-4 rounded-xl border border-[#d4cec3] bg-[#fbfaf7] p-5 sm:grid-cols-[46px_1fr]"><span className="grid h-11 w-11 place-items-center rounded-md bg-[#172a33] text-xs font-black text-white">{number}</span><div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></div></article>)}
          </div>
        )}

        {tab === 'scams' && (
          <div className="mt-7 space-y-5">
            <div className="rounded-xl border border-[#c5d3d8] bg-[#eaf0f2] p-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f3827]">{t(language, 'Parallel safety lane', 'समानांतर सुरक्षा रास्ता')}</p><h3 className="mt-3 text-2xl font-black tracking-[-0.04em]">{t(language, 'Inspect the lure without taking its route.', 'जाल को जाँचें, पर उसके रास्ते पर न जाएँ।')}</h3><p className="mt-3 text-sm leading-6 text-[#5e6e69]">{t(language, 'The pasted message stays in browser memory. Suspicious URLs are parsed as inert text and are never rendered as links.', 'चिपकाया गया संदेश ब्राउज़र की मेमोरी में ही रहता है। संदिग्ध पते सिर्फ़ निष्क्रिय पाठ की तरह पढ़े जाते हैं, लिंक की तरह कभी नहीं दिखाए जाते।')}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {scamCards.map(([title, body]) => <article key={title} className="rounded-xl border border-[#d4cec3] bg-[#fbfaf7] p-5"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></article>)}
            </div>
            <p className="text-xs leading-5 text-[#6a7774]">{t(language, 'Government basis: MoRTH’s eChallan impersonation warning, CERT-In’s March 2026 RTO/eChallan malware advisory, I4C reporting routes, and DoT Chakshu. Sources were rechecked on 28 August 2026.', 'सरकारी आधार: MoRTH की ई-चालान नक़ल चेतावनी, CERT-In की मार्च 2026 RTO/ई-चालान मालवेयर सलाह, I4C शिकायत रास्ते और DoT Chakshu। स्रोत 28 अगस्त 2026 को दोबारा जाँचे गए।')}</p>
          </div>
        )}

        {tab === 'guardrails' && (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {guardrails.map(([title, body], index) => <article key={title} className="rounded-xl border border-[#d4cec3] bg-[#fbfaf7] p-5"><span className={classes('inline-flex rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]', index % 2 ? 'border-[#d6c28d] bg-[#faf5e7] text-[#735814]' : 'border-[#b8d1c4] bg-[#edf5f0] text-[#246344]')}>{index % 2 ? t(language, 'Check', 'जाँच') : t(language, 'Control', 'नियंत्रण')}</span><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></article>)}
          </div>
        )}

        {tab === 'stack' && (
          <div className="mt-7 space-y-5">
            <div className="rounded-xl bg-[#172a33] p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b8d4e1]">{t(language, 'Architecture principle', 'वास्तुकला सिद्धांत')}</p><p className="mt-3 text-2xl font-black tracking-[-0.04em]">{t(language, 'Artifact in → verified facts → deterministic finding → portable packet.', 'दस्तावेज़ → पुष्ट तथ्य → निश्चित निष्कर्ष → ले जाने योग्य पैकेट।')}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stack.map(([title, body]) => <article key={title} className="rounded-xl border border-[#d4cec3] bg-[#fbfaf7] p-5"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></article>)}
            </div>
          </div>
        )}

        {tab === 'scale' && (
          <div className="mt-7 space-y-5">
            <div className="rounded-xl bg-[#172a33] p-6 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b8d4e1]">{t(language, 'Honest status', 'ईमानदार स्थिति')}</p>
              <p className="mt-3 text-2xl font-black tracking-[-0.04em]">{t(language, 'What works today, what is mocked, and what a real deployment needs.', 'आज क्या काम करता है, क्या नकली है, और असली तैनाती के लिए क्या चाहिए।')}</p>
            </div>
            <div className="space-y-3">
              {scaleRows.map(([badge, title, body]) => (
                <article key={title} className="rounded-xl border border-[#d4cec3] bg-[#fbfaf7] p-5">
                  <span className={classes('inline-flex rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]', badge === t(language, 'Today', 'आज') ? 'border-[#b8d1c4] bg-[#edf5f0] text-[#246344]' : badge === t(language, 'Mocked', 'नकली') ? 'border-[#d6c28d] bg-[#faf5e7] text-[#735814]' : 'border-[#b9ced8] bg-[#eef4f7] text-[#315f78]')}>{badge}</span>
                  <h3 className="mt-4 font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p>
                </article>
              ))}
            </div>
            <p className="text-xs leading-5 text-[#6a7774]">{t(language, 'Challan Jaanch is an independent citizen-side prototype. Adoption by any authority is not claimed, implied or required for it to be useful.', 'चालान जाँच एक स्वतंत्र, नागरिक-पक्ष का प्रोटोटाइप है। किसी विभाग द्वारा अपनाए जाने का दावा नहीं है, न ही उपयोगी होने के लिए वह ज़रूरी है।')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
