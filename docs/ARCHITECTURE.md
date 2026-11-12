# Architecture and trust boundaries

Challan Jaanch compares user-confirmed records for narrow, observable contradictions. It does not decide legal validity or file anything with an official service.

## Application map

| Location | Responsibility |
| --- | --- |
| `app/page.tsx` | Case workflow and navigation |
| `components/screens/` | Home, upload, review, result and packet screens |
| `components/EvidenceWorkbench.tsx` | Source review, edits and confirmation |
| `components/ScamShield.tsx` | Local message inspection and exposure response |
| `components/PaymentHelp.tsx` | Service/symptom checklist |
| `lib/cases.ts` | Typed cases, assessments and rule clock |
| `lib/scam-shield.ts` | Message patterns, destination classes and recovery plans |
| `lib/routes.ts`, `lib/payment-help.ts` | Fixed official routes and payment guidance |
| `app/api/analyze/route.ts` | Optional observable-field extraction |

The case flow is `home → upload → processing → review → result → packet`; synthetic cases go directly to review. Scam checks are a parallel lane.
Processing represents actual work, not simulated progress. Browser history follows case stages; leaving processing cancels pending work.

## Local processing and optional extraction

Manual entry needs no files. Selected local files stay in the browser; a source-role SHA-256 is computed for exports without transmitting bytes.
The AI path requires explicit consent and a no-payload capability preflight before encoding documents. An unavailable service falls back to local entry.

| Extraction property | Current implementation |
| --- | --- |
| API | One server-side OpenAI Responses API call |
| Model | `gpt-5.6-terra` default; `OPENAI_MODEL` override |
| Inputs | At most three selected JPG, PNG or PDF files |
| Output | Strict `challan_evidence_extraction` JSON schema |
| Timeout | 45 seconds |
| Storage flag | `store: false`; not a guarantee of zero provider retention |
| Filenames | Replaced by source-role names before transmission |

The model may extract observable fields but may not decide guilt, fraud, validity, cloning, appeal eligibility or outcome. Unclear characters must not be silently corrected.
OpenAI API data controls still apply; disabling retrievable response storage does not disable all provider retention.
The server rejects malformed, unsupported, excess or oversized documents and revalidates returned fields, enums, lengths and calendar dates.
Without a server key, preflight reports unavailable and direct upload receives `503 LIVE_EXTRACTION_NOT_CONFIGURED`.

## Human review and deterministic decisions

`buildManualCase()` starts all decisive fields as unreviewed, including AI-extracted values. Each requires confirmation; blank values cannot be confirmed.
Citizen evidence also needs source-clarity review. Editing a value or its clarity removes confirmation. Closed vehicle-family choices avoid spelling-based mismatches.

The current rules compare registration marks, broad vehicle families and exact duplicate events with distinct challan numbers.
They abstain on unclear or materially ambiguous decisive sources. Duplicate identifiers are trimmed and case-folded without guessing characters.
The rule pack contains a 45-calendar-day safety-date calculation gated by `RULE_167_EFFECTIVE_FROM`; this describes the code, not a new legal verification.
Deadline status uses the `Asia/Kolkata` calendar date. Issue date and challan number supply packet/clock context, not a finding by themselves.

Assessments carry neutral claims, source anchors, limitations and packet eligibility. A packet also needs final human attestation.
Original uploads are excluded from exports. Synthetic fixtures have no source bytes and use `sha256: null`.
One masking function covers redacted screen, PDF, manifest and copied brief; citizen filenames become source-role names.

## Scam and payment boundaries

Scam Shield parses pasted text locally without fetching its URLs. User destinations are inert text; fixed official destinations are separately clickable.
Exact hosts, government domains, lookalikes and unverified destinations are classifications, not guarantees that a sender is safe.
A UPI handle alone proves neither personal ownership nor fraud. English, Hinglish and Devanagari patterns are covered by tests.
Exposure states distinguish opening, downloading, installation, permissions, credential disclosure and payment; the brief omits the original lure.

The payment helper chooses among five services and four symptoms without collecting financial identifiers or querying settlement.
Its clipboard fallback is selectable text. It cannot issue refunds, change an evidence outcome or submit a complaint.
See [the dated source notes](PAYMENT_RESEARCH.md); official requirements must be rechecked when guidance changes.

## Languages, accessibility and state

Interface copy uses `t(language, english, hindi)`; pure rule output uses `Bilingual` values resolved by `pick()`.
Vehicle-family/colour values remain canonical for comparison and are translated only for display. Identifiers are not translated.
The PDF uses English because the bundled core fonts do not render Devanagari; JSON preserves both claim languages and the selected interface language.
Language/theme preferences use browser storage; language changes update document language and speech/date presentation.
Native modal dialogs manage focus, and stage changes move focus to the current view. Controls preserve keyboard and reduced-motion behavior.

Citizen cases and files remain session state, with no account, application database, analytics or persistent document store.
Reset drops case state. Optional AI consent is recorded locally, not in a durable receipt. Production-scale abuse controls and durable consent are not implemented guarantees.

## Build and deployment files

`vite.config.ts` loads Vinext, Sites, Cloudflare and Tailwind and directly imports `.openai/hosting.json`; the project binding is not a secret.
Vinext reads `next.config.ts` for headers and redirects. Both configurations are active, not alternative unused builds.
`public/_headers` mirrors the security headers for compatible static hosts; tests enforce agreement. Keep the fallback until its retirement is decided.
Hashed `/_next/static` assets receive immutable cache headers. Current and legacy social-image URLs are retained while external use remains unresolved.

## Verification

`npm run verify` runs lint, TypeScript, deterministic tests and a production build without an API key.
Tests cover evidence/refusal paths, bilingual completeness, boundary dates, source masking, route constraints, extraction failures, scam signals and payment guidance.
Automated checks do not replace screen-reader/user testing, jurisdiction review or a live extraction trial with approved data.
