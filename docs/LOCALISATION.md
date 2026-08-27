# Localisation

Challan Jaanch runs completely in English and Hindi. "Completely" is the load-
bearing word: the language toggle switches the entire citizen journey, including
the evidence workbench, the verification checklist, the result, the counter-
checks, the packet builder and the whole of Scam Shield.

## Why this matters more than usual here

The brief asks for products designed for real Indian users, including people
with limited digital experience. A partial translation is worse than none for
this particular product. Somebody who switches to Hindi is signalling that Hindi
is the language they read safety instructions in. If the interface chrome
translates but the finding, the refusal, or the "you may have been defrauded,
call 1930 from a clean device" recovery plan stays in English, the translation
has failed exactly where the stakes are highest.

## How it is structured

Two mechanisms, chosen for different jobs.

### Interface copy — `t(language, english, hindi)`

Used inline in components. The English string stays visible at the call site, so
a reviewer reading `page.tsx` can still see what a screen says without following
an indirection into a key table, and a missing translation is a visible hole in
the source rather than a silent runtime fallback.

```tsx
<h1>{t(language, 'Verify each decisive field.', 'हर निर्णायक फ़ील्ड जाँचें।')}</h1>
```

### Rule-layer content — `Bilingual` values

Anything produced by the deterministic rules — findings, counter-checks,
assessments, scam signals, the recovery plan — is returned as `{ en, hi }` and
resolved by the component with `pick(language, value)`.

```ts
headline: bi('The decisive character is too ambiguous.', 'निर्णायक अक्षर बहुत अस्पष्ट है।')
```

This keeps `lib/cases.ts` and `lib/scam-shield.ts` pure and free of any interface
import, so both languages are covered by the same deterministic tests.

## What is not translated, and why

Canonical values that the rules compare are stored in English and only
*displayed* in the reader's language:

| Value | Stored | Displayed in Hindi |
| --- | --- | --- |
| Vehicle family | `Passenger car` | कार |
| Colour | `Blue` | नीला |
| Registration mark | `ZZ00CJ0001` | unchanged |

Translating the stored value would break the comparison rules; leaving it
untranslated on screen would strand a Hindi reader. `vehicleFamilyLabel()` and
`colourLabel()` in `lib/cases.ts` resolve that split. Registration marks,
challan numbers, capture identifiers and timestamps are identifiers, not prose,
and are never altered.

The generated PDF packet is produced in English. It is written to be handed to an
authority alongside an official grievance, and the core PDF font set does not
carry Devanagari; a packet that renders as boxes would be worse than one in
English. The manifest records the interface language and carries both the English
and Hindi form of every claim, so the Hindi wording is preserved and auditable.

## Scam detection reads Hindi too

Localisation here is not only presentation. Indian challan scams routinely arrive
in Hinglish or Devanagari, so the triage patterns in `lib/scam-shield.ts` match
both. A message reading *"अंतिम चेतावनी: चालान ₹2,000 बाकी है। तुरंत भुगतान करें
वरना वाहन ज़ब्त होगा। ऐप डाउनलोड करें।"* raises the same APK, threat and
WhatsApp-context signals as its English equivalent. This is covered by the test
*Scam Shield reads Devanagari and Hinglish lures, not only English ones*.

## How regressions are prevented

Four tests in `tests/rules.test.mjs` walk the rule layer's own output and fail if
any string is missing Hindi, is identical to its English form, or is not written
in Devanagari:

- `every fixture field carries real Hindi, not an English fallback`
- `every assessment outcome is presentable in Hindi`
- `every scam signal and destination verdict is presentable in Hindi`
- `recovery plan is ordered containment first and is written in both languages`

Adding a new rule, finding or scam signal without Hindi fails `npm run verify`.

## Accessibility and persistence

- `document.documentElement.lang` follows the toggle, so screen readers and the
  built-in speech guide use `hi-IN` rather than reading Devanagari with English
  phonetics.
- Dates render through `Intl.DateTimeFormat` with the matching locale and the
  `Asia/Kolkata` time zone in both languages.
- The choice is stored in `localStorage` and read through
  `useSyncExternalStore`, so it survives a reload, stays consistent across tabs,
  and degrades to English where a browser blocks site data.

## Adding a third language

The `Language` union in `lib/i18n.ts` is the single place to extend. `t()` and
`Bilingual` would become a record keyed by language; the tests that assert
completeness already describe the contract any new language must meet. The
harder part is not the plumbing — it is that every safety string must be
written by somebody who reads the language, which is why this is two languages
and not ten.
