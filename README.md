# Challan Jaanch

![Challan Jaanch social card](public/og-release.png)

Understand the evidence, check suspicious messages, and find the next step after a payment problem. Challan Jaanch is an independent, bilingual companion to Indian eChallan services—not a government portal, payment processor, or automated legal decision-maker.

- **[Open the live application](https://challan-jaanch.deftsalt.chatgpt.site)** — no login, API key, or personal documents needed for the demo.
- **[Submission pack](SUBMISSION.md)** · **[System guide](SYSTEM_GUIDE.md)** · **[Architecture](docs/ARCHITECTURE.md)** · **[Latest changes](CHANGELOG.md)**

## Start here

| Your task | Where to begin |
| --- | --- |
| Try the product | Open the live app and select **See a 90-second demo** |
| Check a suspicious message | Select **Check a message**; pasted links are never opened |
| Resolve a payment mismatch | Expand **Already paid?** and select the original service and symptom |
| Run or extend the code | [Local setup below](#run-locally), then [contribution guidelines](CONTRIBUTING.md) |
| Understand the design decisions | [System guide](SYSTEM_GUIDE.md) and [payment research](docs/PAYMENT_RESEARCH.md) |

## What makes it different

Three clear boundaries: **humans confirm the evidence; code compares it; official services make the decision.** Optional AI only extracts observable fields. The default paths work locally without a database.

<details>
<summary>Explore the capabilities and safeguards</summary>


- **Source-linked findings:** every claim points back to the exact confirmed fields that produced it.
- **A real refusal path:** ambiguous plate characters or unreadable vehicle classes stop the finding instead of becoming an allegation.
- **Model/code separation:** optional multimodal AI extracts observable fields; deterministic TypeScript rules choose the outcome.
- **Human verification gates:** each decisive field is reviewed individually; there is no bulk-confirm shortcut. Citizen fields start with unreviewed source clarity, including AI-extracted values. Editing a citizen field resets both its clarity review and confirmation.
- **A complete no-key, no-file path:** a citizen with a paper challan in front of them can type the fields directly. Files are optional; manual entry includes explicit source-clarity controls, closed vehicle-family choices, a challan-number and issue-date panel that drives the Rule 167 clock, and an abstention when the original is unclear. A blank field cannot be confirmed.
- **Both comparison types for real cases:** the citizen chooses between “the photo shows a different vehicle” and “two challans for the same event” before entering fields, so the exact-duplicate rule is reachable outside the synthetic fixture. Typed identifiers are compared after trimming and case-folding, never after guessing characters.
- **Privacy choice before processing:** the default local path computes file fingerprints and opens manual entry without transmitting file bytes. Optional AI extraction is a separate action gated by explicit consent, uses source-role filenames, and describes `store: false` without claiming zero provider retention.
- **Portable evidence packet:** supported claims can be downloaded as a citizen-prepared PDF plus a machine-readable JSON manifest.
- **Truthful integrity metadata:** citizen files are hashed locally by source role; synthetic references carry a null hash instead of a fabricated checksum.
- **Share-safe briefing:** after attestation, a redacted or official-handoff case brief can be copied in the active language with the same source anchors and non-government boundary. Redacted mode masks every challan/registration identifier and citizen filename across the screen, PDF, manifest, and copied brief.
- **Complete Hindi and English:** the language toggle switches the entire journey — workbench, findings, refusals, packet and Scam Shield — and tests fail if any rule-layer string lacks Hindi.
- **Scam Shield:** pasted messages and URLs are inspected locally with deterministic rules; suspicious destinations remain inert and are never opened. Its exposure ladder distinguishes a link opened, a file downloaded, an APK installed, dangerous permissions granted, credentials shared, and money sent.
- **Real state portals are not called scams:** a hostname that genuinely ends in `.gov.in` or `.nic.in` over HTTPS is labelled a government domain, not a lookalike, even when it contains the word “challan”. Only the registrable suffix counts, so `echallan.parivahan.gov.in.example` is still a lookalike, and any `http://` link still fails.
- **UPI handles are a signal, not a verdict:** an address such as `something@ybl` prompts independent verification, not an assertion that the owner is an individual or a scammer. Legitimate challan bill-payment services can use UPI. Handles are not mis-parsed as websites.
- **Already-paid follow-up:** a bilingual helper covers missing receipts, debited-but-unconfirmed payments, pending status despite a receipt, and possible double payments. It distinguishes NextGen, national eChallan, Virtual Courts, Google Pay bill payments, and other/unknown services. Copy a follow-up checklist without entering financial details. It does not verify a payment, submit a dispute, or promise a refund.
- **Hinglish and Devanagari triage:** scam patterns match the way these messages actually arrive in India, not only their English translations.
- **Names the route out:** after a finding, the app names the three official destinations a challan can actually be taken to — the MoRTH grievance form, the Virtual Court and a Lok Adalat — without claiming to know where a given challan currently sits.
- **Incident-aware routing:** suspicious calls, SMS, and WhatsApp can go to DoT Chakshu; suspect identifiers can go to I4C; payments, credential exposure, APK installation, or dangerous permissions route to a clean-device containment plan, 1930, and the National Cyber Crime Reporting Portal.
- **Report-ready safety brief:** Scam Shield produces a privacy-safe local summary of the selected exposure, detected signals, inert hostnames, ordered recovery steps, and verified official destinations without copying the original lure.
- **No government impersonation:** the app never asks for portal credentials, submits a grievance, or claims a government decision.

</details>

## Guided experience

1. Open one of three visibly synthetic cases immediately, or check your own challan. Choose the comparison type; files are optional.
2. Inspect the sources in the evidence workbench, and for your own case add the challan number and issue date.
3. Compare plate characters and review the Rule 167 clock.
4. Confirm each decisive fact and, for citizen files, mark whether the original source is actually clear.
5. Run the deterministic comparison.
6. Inspect the finding map and adversarial counter-checks.
7. Build a redacted or official-handoff packet.
8. Continue separately on the official eChallan portal.

Source clarity is an explicit review state, not a model confidence score. Real file work has a simple busy message; synthetic cases have no simulated processing or artificial wait. Leaving during processing cancels the pending operation.

The synthetic evidence demo and Scam Shield are complete without an API key. Citizen documents also have a fully usable local-only path. Live file extraction is optional, requires explicit transmission consent, and fails safely into manual verification when it is not configured.

## Technology

| Layer | Choice | Role |
| --- | --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS 4 | Responsive state-machine journey and accessible interactions |
| Language | Hand-written English and Hindi source strings | Complete bilingual journey; no runtime machine translation |
| App framework | Vinext, Vite 8, Next-compatible routing | Fast development and Cloudflare Worker output |
| Extraction | OpenAI Responses API (`gpt-5.6-terra`), optional | Structured multimodal field extraction with `store: false` |
| Decision layer | Deterministic TypeScript | Plate, vehicle-family, duplicate-event, and deadline rules |
| Scam triage | Deterministic TypeScript | Exact-host allowlisting, inert URL parsing, advisory-pattern detection, exposure-specific containment, and a local safety brief |
| Exports | jsPDF and browser Web APIs | Client-side PDF, JSON manifest, bilingual share brief, SHA-256 hashes, audio guidance |
| Hosting | OpenAI Sites | Versioned deployment; public access is a separate release decision |
| Persistence | None by design | No application database, analytics, or persistent document store |

The production artifact also carries restrictive framing, referrer, MIME-sniffing, browser-permission, resource-isolation, opener-isolation, and strict-transport headers, and serves content-hashed assets as immutable so repeat visits on a slow connection do not re-fetch them. Those headers are declared in `next.config.ts` and mirrored in `public/_headers`; a test fails the build if the two disagree. It includes install metadata, a branded browser icon, bilingual keyboard skip navigation, and controlled error/404 recovery.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
git clone https://github.com/Deftsalt-debug/challan-jaanch.git
cd challan-jaanch
npm ci
npm run dev
```

Open `http://localhost:3000`.

Already have the project folder? Skip the clone and directory-change commands. Use `npm ci` to install the exact dependency versions in the lockfile.

For optional live extraction:

```bash
cp .env.example .env.local
```

Add `OPENAI_API_KEY` to `.env.local`. Never commit that file. The demo does not need it.

## Verify before pushing

```bash
npm run verify
```

This runs linting, TypeScript checks, deterministic-rule tests, submission-limit checks, and the production build. The release suite also guards the India-local Rule 167 day boundary, the gazetted date from which the clock applies, official-route wording, security-header parity, truthful packet-integrity metadata, citizen-entered cases of both comparison types, government-domain classification, and UPI-handle detection.

The same gate runs in GitHub Actions on every push to `main` and every pull request; see `.github/workflows/verify.yml`. It needs no secrets.

For the full release gate, including the npm production-dependency advisory check:

```bash
npm run release:check
```

## Repository map

```text
app/page.tsx                       Citizen journey and state machine
app/api/analyze/route.ts           Optional structured extraction endpoint
app/error.tsx                      Bilingual safe-recovery boundary
app/not-found.tsx                  Privacy-aware unknown-route recovery
app/manifest.ts                    Install and browser presentation metadata
components/EvidenceWorkbench.tsx  Source inspector, character diff, rule clock
components/ProductGuide.tsx       Audio guide and in-product architecture drawer
components/NextSteps.tsx          Official next-step routes after a finding
components/PaymentHelp.tsx        Accessible payment follow-up disclosure and local checklist copy
components/ScamShield.tsx         Local scam triage, recovery plan, and official routing
lib/cases.ts                       Typed fixtures, comparison rules, date logic
lib/scam-shield.ts                 Pure scam signals, URL classification, and response tracks
lib/i18n.ts                        Bilingual primitives shared by rules and interface
lib/routes.ts                      Official next-step destinations and their ordering
lib/payment-help.ts                Bilingual payment plans with fixed, source-backed destinations
tests/payment-help.test.mjs        Payment routing, privacy and bilingual regression tests
docs/PAYMENT_RESEARCH.md           Research evidence, limitations and feature decisions
lib/use-language.ts                Persisted, tab-synchronised language selection
tests/rules.test.mjs               Deterministic rule, API-boundary, and bilingual-completeness tests
.github/workflows/verify.yml       Continuous integration: the full verify gate on push and pull request
docs/ARCHITECTURE.md               Trust boundaries and data flow
docs/HOW_WE_BUILT_IT.md            Where the OpenAI model runs and how the build was produced
docs/LOCALISATION.md               Bilingual design and the tests that protect it
docs/LOCAL_DEVELOPMENT.md          Setup and troubleshooting
docs/DEMO_SCRIPT.md                Timed two-minute submission walkthrough
docs/VIDEO_NARRATION.txt           Caption-track note for the silent submission video
```

## Product boundary

Challan Jaanch reports conflicts visible in supplied records and risk patterns in pasted communications. It does not declare a challan invalid, authenticate a sender, certify a message as safe, infer fraud or cloning, predict grievance success, provide legal advice, or perform an official submission. The Rule 167 and cyber-advisory source packs are dated and must be rechecked before production use.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete design,
[docs/HOW_WE_BUILT_IT.md](docs/HOW_WE_BUILT_IT.md) for where the OpenAI model runs and what it is
forbidden from deciding, and [docs/LOCALISATION.md](docs/LOCALISATION.md) for the bilingual contract.

For a full, explanatory walkthrough of every stage, program, data boundary, rule, deployment mode, and the no-database decision, read [SYSTEM_GUIDE.md](SYSTEM_GUIDE.md).
