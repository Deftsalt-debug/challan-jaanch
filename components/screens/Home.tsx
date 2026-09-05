'use client';

import { cases } from '../../lib/cases';
import { Language, pick, t } from '../../lib/i18n';
import { Chip, cx } from '../ui';

interface HomeProps {
  language: Language;
  onStartCase: (id: string) => void;
  onUpload: () => void;
  onScam: () => void;
}

/**
 * The home page gives the two citizen paths equal weight. A wrong challan and
 * a fake challan are different problems with different first steps, and the
 * page says which is which before anything else.
 */
export function Home({ language, onStartCase, onUpload, onScam }: HomeProps) {
  const steps: Array<[string, string]> = [
    [t(language, 'Enter what the records say', 'रिकॉर्ड में जो लिखा है वह भरें'), t(language, 'Type the plate, vehicle type and challan details you can read, or add files that stay in this browser.', 'जो नंबर, वाहन प्रकार और चालान विवरण पढ़ पा रहे हैं वह लिखें, या ऐसी फ़ाइलें जोड़ें जो इसी ब्राउज़र में रहती हैं।')],
    [t(language, 'Confirm each decisive fact', 'हर निर्णायक तथ्य पुष्ट करें'), t(language, 'You check every value against the original and say whether the source is actually clear. Nothing is guessed for you.', 'आप हर मान मूल से मिलाते हैं और बताते हैं कि स्रोत वाक़ई साफ़ है या नहीं। आपके लिए कुछ अनुमान नहीं लगाया जाता।')],
    [t(language, 'Get a finding, or an honest refusal', 'निष्कर्ष पाएँ, या ईमानदार इनकार'), t(language, 'Fixed rules report a contradiction with its sources, or say the evidence is not clear enough to claim one.', 'तय नियम स्रोतों के साथ विरोधाभास बताते हैं, या कहते हैं कि सबूत दावे के लिए पर्याप्त साफ़ नहीं है।')],
  ];
  const wontDo = [
    t(language, 'Declare a challan invalid or predict what an authority will decide.', 'किसी चालान को अमान्य घोषित करना या यह बताना कि विभाग क्या तय करेगा।'),
    t(language, 'Ask for a portal password, OTP or payment, or submit anything on your behalf.', 'पोर्टल का पासवर्ड, OTP या भुगतान माँगना, या आपकी ओर से कुछ जमा करना।'),
    t(language, 'Open a suspicious link, or label any message or sender as safe.', 'संदिग्ध लिंक खोलना, या किसी संदेश या भेजने वाले को सुरक्षित बताना।'),
    t(language, 'Keep your documents. There is no database, account or analytics.', 'आपके दस्तावेज़ रखना। न कोई डेटाबेस है, न खाता, न विश्लेषण।'),
  ];

  return (
    <>
      <section className="container-x pb-14 pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <Chip tone="accent">{t(language, 'Private · works without an account or any upload', 'निजी · बिना खाते या अपलोड के चलता है')}</Chip>
          <h1 className="h1 mt-5 max-w-2xl">{t(language, 'Check an eChallan before you pay it or contest it.', 'ई-चालान भरने या आपत्ति करने से पहले उसे जाँचें।')}</h1>
          <p className="lede mt-4 max-w-2xl">{t(language, 'Challan Jaanch compares what your challan, its photo and your vehicle record actually say, and checks whether a challan message is a scam. Everything runs in your browser.', 'चालान जाँच देखता है कि आपका चालान, उसकी फोटो और आपका वाहन रिकॉर्ड असल में क्या कहते हैं, और यह भी कि कोई चालान संदेश ठगी है या नहीं। सब कुछ आपके ब्राउज़र में चलता है।')}</p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          <article className="card flex flex-col p-6 sm:p-7">
            <p className="eyebrow">{t(language, 'I think my challan is wrong', 'मुझे लगता है मेरा चालान ग़लत है')}</p>
            <h2 className="h2 mt-2">{t(language, 'Check the evidence', 'सबूत जाँचें')}</h2>
            <ul className="mt-4 space-y-2 text-[15px] text-ink-2">
              <li className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{t(language, 'Compare the plate and vehicle type across three records', 'तीन रिकॉर्ड में नंबर और वाहन प्रकार मिलाएँ')}</li>
              <li className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{t(language, 'See the 45-day pay-or-contest date for your issue date', 'अपनी जारी तारीख़ के लिए 45 दिन की भुगतान-या-आपत्ति तारीख़ देखें')}</li>
              <li className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{t(language, 'Download a packet you can take to the official grievance route', 'ऐसा पैकेट डाउनलोड करें जो आधिकारिक शिकायत रास्ते पर ले जाया जा सके')}</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button onClick={onUpload} className="btn btn-primary btn-lg">{t(language, 'Check my challan', 'मेरा चालान जाँचें')}</button>
              <button onClick={() => onStartCase('wrong-vehicle')} className="btn btn-ghost btn-lg">{t(language, 'See a 90-second demo', '90 सेकंड का डेमो देखें')}</button>
            </div>
          </article>

          <article className="card flex flex-col border-bad-line p-6 sm:p-7">
            <p className="eyebrow text-bad">{t(language, 'I got a message about a challan', 'मुझे चालान का संदेश मिला है')}</p>
            <h2 className="h2 mt-2">{t(language, 'Check if it is a scam', 'जाँचें कि यह ठगी है या नहीं')}</h2>
            <ul className="mt-4 space-y-2 text-[15px] text-ink-2">
              <li className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{t(language, 'Paste the SMS, WhatsApp or link; it is never opened', 'SMS, WhatsApp या लिंक चिपकाएँ; वह कभी खोला नहीं जाता')}</li>
              <li className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{t(language, 'Spot APK lures, OTP requests, UPI handles and lookalike sites', 'APK जाल, OTP माँग, UPI पते और नकली साइटें पहचानें')}</li>
              <li className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{t(language, 'Get the right steps for what already happened, including 1930', 'जो हो चुका है उसके लिए सही क़दम पाएँ, 1930 सहित')}</li>
            </ul>
            <div className="mt-6">
              <button onClick={onScam} className="btn btn-danger btn-lg">{t(language, 'Check a message', 'संदेश जाँचें')}</button>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-x py-14">
          <p className="eyebrow">{t(language, 'How it works', 'यह कैसे काम करता है')}</p>
          <h2 className="h2 mt-2 max-w-2xl">{t(language, 'You confirm the facts. Fixed rules do the comparing.', 'तथ्य आप पुष्ट करते हैं। तुलना तय नियम करते हैं।')}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="step-number">{index + 1}</span>
                <div>
                  <h3 className="h3">{title}</h3>
                  <p className="help mt-1.5">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{t(language, 'Try it with synthetic records', 'नकली रिकॉर्ड से आज़माएँ')}</p>
            <h2 className="h2 mt-2">{t(language, 'Three cases, three different honest answers.', 'तीन केस, तीन अलग ईमानदार जवाब।')}</h2>
          </div>
          <p className="help max-w-md">{t(language, 'Nothing here is a real challan. Registration marks use ZZ, which is not an Indian state code.', 'यहाँ कुछ भी असली चालान नहीं है। पंजीकरण नंबर ZZ से शुरू होते हैं, जो किसी भारतीय राज्य का कोड नहीं है।')}</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {Object.values(cases).map((fixture) => (
            <button key={fixture.id} onClick={() => onStartCase(fixture.kind)} className="card-flat group flex flex-col p-5 text-left transition hover:border-accent hover:shadow-[var(--shadow)]">
              <Chip tone={fixture.kind === 'ambiguous-photo' ? 'warn' : 'good'}>{fixture.kind === 'ambiguous-photo' ? t(language, 'Refuses to decide', 'फ़ैसला देने से इनकार') : t(language, 'Finds a contradiction', 'विरोधाभास मिलता है')}</Chip>
              <h3 className="h3 mt-4">{pick(language, fixture.shortTitle)}</h3>
              <p className="help mt-2 flex-1">{pick(language, fixture.story)}</p>
              <span className="mt-5 font-semibold text-accent">{t(language, 'Open case', 'केस खोलें')} <span className={cx('inline-block transition group-hover:translate-x-1')} aria-hidden>→</span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-x grid gap-8 py-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">{t(language, 'Why this exists', 'यह क्यों बना')}</p>
            <h2 className="h2 mt-2">{t(language, 'A lot of challans. A real complaints queue. A short clock.', 'बहुत सारे चालान। शिकायतों की असली क़तार। छोटी समय-सीमा।')}</h2>
            <dl className="mt-6 grid grid-cols-3 gap-4">
              <div><dt className="text-2xl font-bold tracking-tight">{t(language, '3.93 cr', '3.93 करोड़')}</dt><dd className="help mt-1">{t(language, 'challans reported for 2025', '2025 में दर्ज चालान')}</dd></div>
              <div><dt className="text-2xl font-bold tracking-tight">{t(language, '3.07 lakh', '3.07 लाख')}</dt><dd className="help mt-1">{t(language, 'eChallan complaints in 2025', '2025 में ई-चालान शिकायतें')}</dd></div>
              <div><dt className="text-2xl font-bold tracking-tight">{t(language, '45 days', '45 दिन')}</dt><dd className="help mt-1">{t(language, 'to pay or contest, under the 2026 rule', '2026 के नियम के तहत भुगतान या आपत्ति के लिए')}</dd></div>
            </dl>
            <a href="https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars" target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-accent underline underline-offset-4">{t(language, 'Source: Rajya Sabha answer, 25 March 2026 ↗', 'स्रोत: राज्यसभा उत्तर, 25 मार्च 2026 ↗')}</a>
          </div>
          <div className="card-soft p-6">
            <h3 className="h3">{t(language, 'What this tool will not do', 'यह टूल क्या नहीं करेगा')}</h3>
            <ul className="mt-4 space-y-3">
              {wontDo.map((item) => <li key={item} className="flex gap-3 text-[15px] text-ink-2"><span className="mt-0.5 text-bad" aria-hidden>✕</span>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
