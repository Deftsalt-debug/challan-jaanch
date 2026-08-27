# Architecture

## Product contract

Challan Jaanch sits between receiving a confusing eChallan and using the official grievance process. It does not replace the official portal. Its only decision is whether user-confirmed records support a narrow, observable contradiction under a versioned rule.

```text
Synthetic fixture or citizen files
                 │
                 ▼
Optional observable-field extraction ── failure ──► Manual entry
                 │                                  │
                 └──────────────┬───────────────────┘
                                ▼
                    Editable evidence map
                                │
                       Human confirmation gate
                                │
                                ▼
                  Deterministic comparison rules
                    │             │             │
                    ▼             ▼             ▼
                Supported       Refused      No ground
                    │
                    ▼
          Citizen PDF + JSON manifest
                    │
                    ▼
        Separate official-portal handoff
```

Scam Shield is a parallel, browser-only trust lane:

```text
Pasted message text
        │
        ▼
Inert URL parsing + advisory-pattern rules
        │
        ├──► Verify independently on exact official hostname
        ├──► Report attempted impersonation to I4C
        └──► If exposed: 1930 + bank/provider + NCRP
```

## Trust boundaries

### Extraction boundary

`app/api/analyze/route.ts` can send up to three selected images or PDFs to the OpenAI Responses API, using `gpt-5.6-terra` by default and honouring an `OPENAI_MODEL` override. The request uses structured JSON output and `store: false`. The model is instructed to return only observable fields and may not decide validity, guilt, fraud, cloning, appeal eligibility, or likely outcome. See [HOW_WE_BUILT_IT.md](HOW_WE_BUILT_IT.md) for the full extraction contract.

The boundary rejects oversized, malformed, unsupported, or excess documents; applies an upstream timeout; and validates the structured result and calendar date again before returning it to the browser.

If the API key is absent, the endpoint returns an honest `503 LIVE_EXTRACTION_NOT_CONFIGURED`. The interface continues with manual verification. No synthetic demo depends on the route.

### Human boundary

Every decisive value must be confirmed. Editing a value removes its confirmation immediately. Until all decisive values are confirmed, `assessCase` returns a `review` state and produces no finding.

### Decision boundary

`lib/cases.ts` is the only decision layer. It currently implements:

- registration-mark conflict across challan, photo, and vehicle record;
- broad vehicle-family conflict;
- exact duplicate-event matching across distinct challan numbers;
- safe refusal for low-confidence or materially ambiguous plate characters;
- a 45-calendar-day Rule 167 safety-date calculation for the current rule pack.

Rules emit neutral claims, evidence anchor IDs, limitations, and packet eligibility. They never call a challan invalid.

### Persistence boundary

The MVP has no database, R2 bucket, analytics, account system, or application-owned document store. Selected files live in the current browser session. The generated packet excludes original uploads. A reset drops all application state; normal browser garbage collection releases object URLs.

The API route necessarily transmits selected files to OpenAI only when the user chooses live extraction and a server-side key is configured. Production deployments should add an explicit consent receipt, retention verification, rate limits, and abuse controls before accepting real documents.

### Onward-navigation boundary

`lib/routes.ts` names where a disputed challan can be taken: the MoRTH grievance form, the Virtual Court, and a Lok Adalat. Every destination is a hard-coded `.gov.in` host over HTTPS, opened by the citizen in a new tab; the app submits nothing and transfers nothing.

The module deliberately does not claim to know which forum currently holds a given challan or how long a transfer takes. Those differ by state and by the age of the record, and the prototype has no authorised way to read a real challan's live status, so it says so instead of guessing. Routes are shown whatever the outcome — somebody with no supported finding may still have grounds the rules cannot see — and only the framing changes.

Tests assert that every destination is an official HTTPS `.gov.in` host and that the prose never predicts an outcome or implies a submission.

### Language boundary

Both languages are written as source. Interface copy uses `t(language, english, hindi)`; the rule layer returns `Bilingual` `{ en, hi }` values that components resolve with `pick()`. No translation happens at runtime, so a language switch cannot degrade safety advice into an approximate rendering, and four tests fail the build if any rule-layer string loses its Hindi.

Canonical values compared by the rules — vehicle family, colour — stay in English and are translated for display only. Registration marks, challan numbers and capture identifiers are identifiers and are never altered. See [LOCALISATION.md](LOCALISATION.md).

### Scam-navigation boundary

`lib/scam-shield.ts` parses pasted text locally and never performs a fetch. User-supplied destinations are rendered as inert text. Only source-controlled official destinations are clickable. The checker can label a known exact host, a lookalike, or an unverified destination; it never labels a sender or message safe.

Exposure is modelled separately from message risk. Opening a link, downloading a file, installing an APK, granting SMS/Accessibility/VPN permissions, sharing credentials, and sending money are distinct states. That prevents a download from being described as an installation while still escalating an installed app or dangerous permission to an offline-device/clean-device containment plan. A local report-ready brief carries only selected exposure facts, signal names, inert hostnames, ordered recovery steps, and official routes; it deliberately omits the pasted lure.

## UI state machine

`home → upload → processing → review → result → packet`

Parallel lane: `home → scam → verify | report-attempt | emergency`

- **Home:** synthetic cases, product evidence, and interactive outcome preview.
- **Upload:** drag/drop or file selection with local preview and size/type guidance.
- **Processing:** transparent extraction steps; no simulated official progress.
- **Review:** source inspector, character-level diff, rule clock, editing, and confirmation.
- **Result:** finding trace, adversarial counter-checks, deadline context, and refusal path.
- **Packet:** redacted/official-handoff views, attestation, PDF/JSON exports, a bilingual share-safe brief, and a separate official link.
- **Scam:** local message triage, inert URL inspection, exposure-aware response plan, and hard-coded official escape routes.

## Main technology choices

- React 19 and TypeScript for a typed client workflow.
- Vinext/Vite for Next-compatible routes and Cloudflare output.
- Tailwind CSS 4 plus a small global motion layer.
- OpenAI Responses API (`gpt-5.6-terra`) for optional multimodal extraction.
- Hand-written English and Hindi source strings, with `useSyncExternalStore` for a persisted, tab-synchronised language choice.
- Pure TypeScript scam rules for advisory patterns, URL classification, exposure-specific containment, and a privacy-safe safety brief.
- jsPDF, Web Crypto, object URLs, and Web Speech APIs for local capabilities.
- OpenAI Sites for versioned hosting, with public access treated as a separate release decision.
- Next-compatible response headers, install metadata, bilingual skip navigation, and controlled error/404 recovery for production resilience.

## Response headers

Security headers are declared in `next.config.ts`, which is what the current host honours, and mirrored in `public/_headers` for a static host that reads that file instead. They were once out of step — `_headers` lacked `Cross-Origin-Resource-Policy` and `Strict-Transport-Security` — which meant whichever layer a platform happened to honour silently decided the security posture. A test now fails the build if the two disagree.

Assets under `/_next/static` carry a content hash in the filename, so they are served `immutable` for a year. The deployed site was previously revalidating them on every visit, which is a real cost on the slow connections this product is meant for.

## Production-hardening backlog

Before handling real citizen records at scale:

1. Commission an Indian privacy and legal review.
2. Add explicit consent and verifiable deletion semantics.
3. Add document malware scanning, per-user rate limits, and abuse monitoring.
4. Version rule packs by jurisdiction and effective date.
5. Validate official handoff requirements state by state.
6. Run accessibility testing with screen readers and Indian-language users.
7. Add fixture-based regression tests for every rule version.
