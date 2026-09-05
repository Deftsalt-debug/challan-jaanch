# Challan Jaanch — Complete System Guide

This document explains what Challan Jaanch does, why it exists, how every program in the repository works with the others, how information moves through the system, how to run it locally, what is real or mocked, and why the current prototype deliberately has no application database.

## 1. The system in one sentence

Challan Jaanch is an independent trust preflight that helps a citizen determine whether an eChallan communication is suspicious and whether supplied records support a narrow, objective contradiction before the citizen uses an official government process.

It is not a government service, legal adviser, automated appeal writer, or decision-maker.

## 2. The problem it solves

An eChallan grievance form may accept a complaint, but the citizen still has to answer several difficult questions:

- What exactly is wrong in the supplied record?
- Is the apparent mismatch clear, or is it only an uncertain OCR reading?
- Which source supports each statement?
- What evidence should be included?
- What should be redacted before sharing?
- Is there a time window that requires immediate attention?
- How can the citizen explain the problem without accidentally alleging fraud, cloning, or government error?
- Is the challan message itself genuine, or is it a payment, phishing, or malicious-app lure?
- If the citizen already clicked, installed, shared a secret, or paid, what should happen first?

Challan Jaanch turns those questions into a guided evidence workflow.

## 3. What the hackathon builder guide actually requires

The supplied builder guide requires a prototype to:

- solve one clearly defined public-service problem;
- provide a complete citizen journey rather than a static design;
- be simpler and clearer than the existing experience;
- work for mobile users and people with limited digital experience;
- use mock or synthetic data where personal information, OTPs, payments, or government systems would otherwise be involved;
- disclose what is working, what is mocked, and what remains limited;
- demonstrate backend, infrastructure, process, and safe-scaling thinking;
- avoid live-government-system testing, private APIs, sensitive real data, and government impersonation;
- provide a public browser link that does not request access for the final submission.

### Does the builder guide require no database?

No.

The builder guide neither requires nor forbids a database. “No application database or persistent document store” is a design decision made for this prototype, not a quoted hackathon requirement.

The guide does require safe handling of personal information and asks how the product could scale safely. The stateless architecture is our answer for the present demonstration: it minimizes what the prototype can retain while still completing the citizen journey.

The guide also scores end-to-end thinking. Therefore, this document explains both why persistence is excluded now and where limited persistence could be introduced in a production system.

## 4. Product boundary

### The system may

- read observable fields from supplied records;
- show the source of each field;
- let the citizen correct and confirm a field;
- normalize plate formatting without guessing characters;
- compare confirmed values using narrow rules;
- report a visible contradiction;
- abstain when decisive evidence is ambiguous;
- calculate a dated, rule-based safety date;
- generate a citizen-prepared PDF and JSON manifest;
- open the official eChallan portal separately.
- inspect pasted message text and URLs locally without opening them;
- flag current advisory patterns such as APK installation, OTP/PIN requests, remote access, artificial urgency, and lookalike challan destinations;
- route a suspected attempt to I4C's Report Suspect facility;
- route financial loss or credential/device exposure to 1930 and the National Cyber Crime Reporting Portal.

### The system may not

- declare a challan legally valid or invalid;
- determine guilt or liability;
- predict the outcome of a grievance;
- infer fraud, cloning, corruption, or authority error;
- silently convert visually similar characters such as `O` and `0`;
- collect a government password, OTP, Aadhaar number, PAN, or payment detail;
- perform an official submission;
- represent itself as a government product.
- authenticate a sender or certify a message as safe;
- visit, redirect through, or make a clickable link from a user-supplied suspicious destination;
- scan, execute, upload, or sandbox a suspicious APK.

## 5. Citizen journey

The evidence application is a state machine with these stages:

```text
Home → Documents → Processing → Verification → Result → Packet
```

Scam Shield is a separate parallel lane:

```text
Home → Scam Shield → local signal check → Verify / Report attempt / Emergency response
```

The scam lane does not create an evidence case, does not call the extraction API, and does not share state with the challan-comparison journey.

### Stage 1: Home

The citizen can:

- run the 90-second synthetic mismatch case;
- open an insufficient-evidence case;
- open an exact-duplicate-event case;
- choose their own documents;
- inspect an interactive preview of the three possible outcome styles;
- open the in-product system guide;
- use English or Hindi interface labels;
- listen to a short stage-specific audio explanation on supported devices.
- open Scam Shield from the main navigation or the dedicated home-page safety panel.

The demo fixtures are visibly fictional. They use impossible-looking registration values and explicit “synthetic” labels.

### Stage 2: Documents

The citizen first chooses what they are comparing:

1. **The photo shows a different vehicle** — plate and broad vehicle family across the challan, its photograph, and the registration record.
2. **Two challans for the same event** — two challan numbers that share one capture identifier, time, camera, and amount.

Files are optional. A citizen with a paper challan in front of them can continue straight to typing the fields. If they have files, they may add:

1. the challan and its evidence bundle (or, for a duplicate case, the first challan);
2. the vehicle record (or the second challan);
3. an optional enforcement image or other supporting record.

Accepted formats are JPG, PNG, and PDF, up to 10 MB per file. Added files stay in the browser, appear beside the fields for checking, and receive a locally computed SHA-256 fingerprint for the packet manifest.

The interface supports the file picker and drag-and-drop. Image files receive a local preview. Selecting a file does not by itself call the extraction endpoint. AI extraction is offered only for the vehicle comparison, and only when both primary files are present and transmission consent is given.

### Stage 3: Processing

For a synthetic fixture, the app loads the fixture and builds the evidence map entirely in the browser.

For citizen-supplied files, the app first presents two separate paths:

- **Local manual entry (recommended):** computes local SHA-256 fingerprints, transmits no file bytes, and opens an empty evidence map for the citizen to complete.
- **AI-assisted extraction (optional):** remains disabled until the citizen explicitly consents to transmit the selected files to OpenAI. The client replaces original filenames with source-role names before sending.

Across those paths, the app:

1. validates required files and the client-side size limit;
2. computes a SHA-256 hash for each selected file and keeps it under the source role, so identical filenames cannot overwrite one another;
3. creates an editable evidence map directly for local entry; or, after consent, converts selected files into data URLs and calls the optional `/api/analyze` route;
4. receives structured observable fields or a safe fallback response on the AI path;
5. creates the same editable, human-confirmed evidence map in either case.

Synthetic cases open directly into review. Actual file preparation and optional AI extraction show a simple busy message, with no invented progress percentages or minimum waiting time. Leaving or clearing the case cancels pending processing.

### Stage 4: Verification

This is the core product surface.

The evidence workbench has three views:

- **Source lens:** opens the challan, enforcement evidence, or vehicle record in a source inspector.
- **Character diff:** aligns three normalized registration reads character by character.
- **Rule clock:** explains the issue date and calculated safety date on a timeline.

Every consequential field is editable. Any edit removes the field's confirmation. Blank values cannot be confirmed. In a citizen-supplied case, each decisive field also exposes a source-clarity choice; marking a source unclear forces a safe abstention where that fact would be required. Broad vehicle families use a closed list so spelling variants cannot manufacture a mismatch. The comparison remains locked until all decisive fields are confirmed.

This prevents an OCR guess from silently becoming an allegation.

### Stage 5: Result

The result can be one of four typed states:

| State | Meaning |
| --- | --- |
| `review` | Required fields are still unconfirmed, so the comparison has not run. |
| `supported` | One or more narrow objective contradictions are supported. |
| `unable` | Decisive evidence is too ambiguous; the system abstains. |
| `none` | Confirmed fields do not trigger a supported rule. This does not prove the challan is valid. |

The result screen contains:

- a decision trace showing extraction, confirmation, comparison, and reporting;
- a finding map with source-anchor buttons;
- a sceptic mode with expandable counter-explanations;
- the Rule 167 clock;
- a recommended next-evidence action for refusal cases;
- packet preparation only when a supported finding exists.

### Stage 6: Packet

For a supported outcome, the citizen can preview:

- **Redacted share:** masks every challan and registration identifier in displayed claims and replaces citizen filenames with source-role names. The same transformation is used by the screen, PDF, JSON manifest, and copied brief.
- **Official handoff:** shows confirmed identifiers for the citizen's own use.

The packet contains:

- a clear “not government-issued” label;
- case and schema identifiers;
- confirmed challan metadata;
- supported neutral claims;
- evidence anchor IDs;
- rule-clock context;
- processing and privacy limitations;
- an explicit non-legal disclaimer.

A final attestation is required before downloads are enabled.

The system generates:

- a citizen-prepared PDF;
- a JSON manifest containing claims, anchor IDs, source-role hashes, privacy declarations, and limitations;
- a bilingual share-safe brief for a redacted or official handoff.

Original uploaded files are not embedded in either export. Citizen-selected files carry their locally computed SHA-256; synthetic fixture filenames carry a null hash because the browser has no source bytes to hash.

### Parallel lane: Scam Shield

Scam Shield addresses fake challan messages and impersonation attempts without pretending that software can prove a sender is genuine.

The citizen can:

1. choose whether the communication arrived through WhatsApp, SMS, a call, email, or another channel;
2. paste the wording or URL as plain text;
3. indicate whether they opened a link, downloaded a file, installed an app/APK, granted SMS/Accessibility/VPN access, sent money, or shared an OTP, PIN, or password;
4. receive a live deterministic risk explanation;
5. inspect extracted destinations as inert text;
6. copy a privacy-safe, report-ready brief containing exposure choices, detected signals, inert hostnames, and ordered recovery steps without copying the original lure;
7. continue only through hard-coded official destinations: eChallan for verification, DoT Chakshu for suspicious calls/SMS/WhatsApp, I4C for suspect identifiers, and NCRP/1930 after exposure or loss.

The checker looks for:

- `.apk` files and app-install instructions;
- OTP, UPI PIN, CVV, password, or screen-sharing requests;
- remote-access software such as AnyDesk or TeamViewer;
- immediate payment instructions and QR/UPI pressure;
- threats of arrest, vehicle seizure, or licence cancellation;
- HTTP rather than HTTPS;
- bare domains that omit `https://`;
- URL shorteners;
- raw IP-address destinations;
- internationalised/punycode hostnames;
- transport or challan wording on a hostname that is not one of the exact recognised official transport-service hosts.

The allowlist is intentionally narrow. Only the exact HTTPS hostnames `echallan.parivahan.gov.in` and `mparivahan.parivahan.gov.in` receive the “Exact official host” label. A hostname that genuinely ends in `.gov.in` or `.nic.in` over HTTPS receives a distinct “Government domain” label: those names are issued only through the National Informatics Centre, so a state traffic portal such as `mahatrafficechallan.gov.in` is never reported as a lookalike merely because it contains the word “challan”. The citizen is still told to type the address rather than tap the link, because the checker does not maintain an exhaustive registry of every state service. The suffix check is on the registrable domain, so `echallan.parivahan.gov.in.example` remains a lookalike, and any `http://` link keeps its unencrypted-link warning.

A UPI handle such as `trafficfine.rto@ybl` is a caution signal requiring independent verification, not proof of personal ownership or fraud. Legitimate challan bill-payment services can also use UPI. The handle is recognised against a closed list of payment-service suffixes so an ordinary e-mail address cannot trigger it, and it is excluded from website parsing.

There are three outcomes:

| Outcome | Meaning |
| --- | --- |
| `danger` | A critical pattern or multiple combined signals were found. The citizen is told to stop. |
| `suspicious` | One or more caution signals were found. The citizen is told to verify independently. |
| `unverified` | No obvious pattern was found. This is explicitly not a “safe” or “genuine” verdict. |

There are also three response tracks:

| Track | Trigger | Route |
| --- | --- | --- |
| `verify` | No obvious signal or a known official hostname | Independently open the official eChallan service. |
| `report-attempt` | Suspicious or high-risk lure without known compromise | Preserve the message; use Chakshu for the communication and I4C Report Suspect for identifiers. A downloaded-but-not-installed file remains on this track. |
| `emergency` | Money sent, credentials shared, a suspicious app installed, or dangerous device permissions granted | Keep the affected device offline; use a clean device, call 1930, contact the financial provider, preserve evidence, remove the app and permissions, scan/update the phone, and report at cybercrime.gov.in. |

The application does not display a user-supplied address as a link. The only clickable safety destinations are constants controlled in source code.

### Parallel lane: Already-paid follow-up

The home screen and the next-steps panel both offer a collapsed **Already paid?** helper. It does not alter a case finding: a payment problem and a contradictory evidence record are different questions.

Choose the original payment service and one of four problems: money deducted without a receipt, a missing receipt copy, a receipt with a still-pending status, or possible double payment. `lib/payment-help.ts` maps these choices to bilingual instructions and a fixed destination. `components/PaymentHelp.tsx` renders the plan with native labelled selectors and a keyboard-operable disclosure. A local copy button exports the selected checklist; a selectable text fallback remains available if clipboard access fails.

The supported service paths are NextGen eChallan, national eChallan, Virtual Courts, Google Pay's dedicated challan bill-payment flow, and other/unknown services. The unknown path explicitly says that the national portal is not a universal lookup. An ordinary UPI transfer made from Google Pay is not the same as its challan bill-payment service. Suspicious payment requests belong in Scam Shield.

No transaction number, account number, receipt, bank access or payment status is collected by this helper. It does not contact an authority, create a refund request, or change a deadline. The user checks the original service and keeps supporting records privately. No dependency, backend endpoint, account, or database was added. Research and limitations are documented in [docs/PAYMENT_RESEARCH.md](docs/PAYMENT_RESEARCH.md).

The September interface refinement uses shared navy/slate tokens, restrained borders and corners, clearer heading spacing, wrapping header controls, and visible disclosure focus. Red is reserved for actual danger states instead of the unassessed message-check action. The homepage distinguishes browser-only comparison from optional consent-based AI transmission.

## 6. The deterministic rules

Rules live in `lib/cases.ts`. They operate only on the current case object and the set of confirmed field keys.

### Registration-mark conflict

A finding is created only when:

- challan registration, visible-photo registration, and vehicle-record registration are confirmed;
- challan and vehicle record agree;
- the visible photo differs;
- all three sources have explicitly clear source status.

Normalization performs only Unicode normalization, uppercase conversion, and removal of spaces or hyphens. It deliberately does not transform `O` into `0`, `I` into `1`, or similar characters.

### Broad vehicle-family conflict

A finding is created only when:

- the photo family and record family are confirmed;
- neither value is `Unknown`;
- both sources have explicitly clear source status;
- the broad families differ.

The rule compares categories such as two-wheeler and passenger car. It does not infer make, model, or exact vehicle identity.

### Exact duplicate event

A finding is created only when:

- two distinct challan numbers are confirmed;
- capture identifiers match exactly;
- event fingerprints match exactly.

The finding still carries a limitation: only the issuing authority can decide whether separate statutory offences were intentionally charged.

### Safe abstention

The system returns `unable` when:

- any registration source is marked unclear, or a competing photo-plate reading remains;
- vehicle-family evidence is unclear and no independent plate conflict supports a finding.

Source clarity is `unreviewed`, `clear`, or `unclear`; there are no numerical confidence thresholds. Every citizen field, including a populated AI extraction, starts `unreviewed`. The citizen must review each source and confirm each value individually. Unreviewed or blank decisive fields keep the comparison pending; they cannot produce findings even if a stale confirmation key is supplied. Editing a citizen value resets both its clarity and confirmation.

The refusal fixture demonstrates `Z` versus `2`. No packet can be built from this state.

### Deadline calculation

For the current rule pack, the app adds 45 calendar days to a confirmed issue date. Calendar arithmetic is performed in UTC to avoid browser timezone drift.

The output is labelled a “rule-based safety date,” not an official portal deadline. State procedure and the official portal remain authoritative.

## 7. Architecture overview

```text
┌──────────────────────────────── Browser ────────────────────────────────┐
│                                                                        │
│ React interface and state machine                                      │
│   │                                                                    │
│   ├─ Synthetic fixtures ──► evidence map                               │
│   │                                                                    │
│   ├─ Selected File objects                                             │
│   │      ├─► local image previews                                      │
│   │      ├─► SHA-256 hashes                                            │
│   │      ├─► local manual map (no byte transmission)                    │
│   │      └─► explicit AI consent ─► data URLs ───────┐                  │
│   │                                                  │                  │
│   ├─ User confirmations                                                │
│   ├─ Deterministic rules                                               │
│   └─ jsPDF / JSON manifest downloads                                   │
│                                                                        │
└─────────────────────────────────────────────────────│──────────────────┘
                                                      │ HTTPS
                                                      ▼
┌──────────────────── Vinext / server route ─────────────────────────────┐
│ POST /api/analyze                                                     │
│   ├─ validate payload                                                  │
│   ├─ enforce file count and encoded-size limits                        │
│   ├─ construct a strict structured-output request                      │
│   └─ call OpenAI Responses API with store: false                       │
└─────────────────────────────────────────────────────│──────────────────┘
                                                      │
                                                      ▼
┌──────────────────── Optional OpenAI processing ────────────────────────┐
│ Extract observable values only                                        │
│ Return strict JSON                                                    │
│ Make no legal or grievance decision                                   │
│ OpenAI API data controls may still include abuse-monitoring retention  │
└────────────────────────────────────────────────────────────────────────┘
```

Scam Shield remains inside the browser boundary:

```text
Pasted message / caller instruction
             │
             ▼
Unicode normalisation + inert URL parsing
             │
             ├──► exact-host comparison
             ├──► advisory-pattern rules
             └──► exposure-state rules
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Verify      Report attempt    Emergency
          │              │              │
          ▼              ▼              ▼
  official eChallan   I4C suspect    1930 + NCRP

No extraction API call · no suspicious-link navigation · no persistence
```

## 8. How the programs work together

### `app/page.tsx`

This is the citizen-journey controller. It owns:

- the current stage;
- selected files;
- the active case;
- field confirmations;
- citizen-supplied source-clarity choices;
- the selected evidence field;
- processing status;
- the current assessment;
- packet mode and attestation;
- PDF and manifest download functions, including source-role integrity metadata and a visible PDF fallback error.

It calls `assessCase` whenever the case or confirmation set changes.

### `components/EvidenceWorkbench.tsx`

This component owns visual evidence inspection:

- source tabs;
- source-document artwork or uploaded-image preview;
- the source-inspector dialog;
- character-level registration comparison;
- the rule-clock timeline.

It never decides a finding.

### `components/ProductGuide.tsx`

This component provides:

- stage-specific browser speech;
- an accessible modal guide;
- citizen-journey, trust-model, and technology explanations.

It is explanatory UI only.

### `components/ScamShield.tsx`

This component owns the interactive anti-scam lane:

- communication-channel selection;
- synthetic scam examples;
- plain-text message input;
- exposure checkboxes;
- live signal and destination explanations;
- ordered incident-response steps;
- clipboard action-plan export;
- hard-coded official verification and reporting links.

It never renders a user-supplied URL as an anchor.

### `lib/cases.ts`

This is the typed domain and rule layer. It contains:

- case, fact, finding, counter-check, and assessment types;
- three synthetic fixtures;
- registration normalization;
- deterministic comparison rules;
- conservative abstention when a required plate or vehicle-family source is unclear;
- date formatting and India-local calendar-day calculation.

This module contains no React code, network calls, or persistence.

### `lib/scam-shield.ts`

This pure deterministic module contains:

- the recognised official eChallan hostname;
- official verification and cybercrime-reporting constants;
- inert URL extraction and classification;
- advisory-pattern rules;
- exposure escalation;
- typed `danger`, `suspicious`, and `unverified` outcomes;
- typed `verify`, `report-attempt`, and `emergency` routes.

It does not fetch a URL, resolve a redirect, query a reputation vendor, or call an AI model.

### `app/api/analyze/route.ts`

This is the optional server-side extraction adapter. It:

- keeps the API key on the server;
- accepts a maximum of three supplied documents;
- rejects missing, malformed, or oversized payloads;
- rejects more than three documents instead of silently truncating them;
- maps PDFs to `input_file` and images to `input_image`;
- requests strict JSON schema output;
- enforces a 45-second upstream timeout and validates the returned structure and calendar date at runtime;
- sets `store: false`, which disables retrievable response storage but is not described as zero provider retention;
- exposes a no-payload capability check so an unconfigured deployment can fall back before any selected document bytes are encoded or sent;
- returns an explicit retention notice alongside a successful extraction;
- returns clean manual-fallback errors if the key or service is unavailable.

The route does not call `assessCase` and cannot generate a finding.

### `app/layout.tsx`

This sets:

- document language;
- Geist fonts;
- page title and description;
- Open Graph and social-card metadata.

### `app/globals.css`

This contains:

- base design tokens;
- the restrained professional color system;
- consistent focus styles;
- short stage and evidence transitions;
- the evidence scan treatment;
- reduced-motion behavior;
- print behavior.

### `tests/rules.test.mjs`

These tests verify:

- the clear case creates two findings;
- ambiguity creates no finding;
- the duplicate rule requires distinct challan numbers;
- unconfirmed facts lock the result;
- normalization does not guess confusable characters;
- the calendar calculation has no local-time drift;
- the extraction endpoint fails honestly when no key exists.
- fake APK and lookalike-host patterns produce a danger state;
- only the exact HTTPS national eChallan and mParivahan hostnames receive the official-host label;
- payment or credential exposure selects the emergency route.
- malformed extraction dates and invalid structured model output are rejected before rendering.

### Build and hosting files

- `package.json` declares scripts and dependencies.
- `vite.config.ts` configures the Vinext/Sites build.
- `next.config.ts` enforces portable production security headers and the legacy favicon redirect.
- `.openai/hosting.json` binds this source tree to its Sites project.
- `dist/` is generated production output and should not be edited manually.

## 9. Data lifecycle

### Synthetic path

```text
Fixture in source code
  → cloned into React memory
  → user confirms fields
  → deterministic assessment
  → optional browser-generated exports
  → reset or tab close clears the session state
```

No document upload or extraction call is involved.

### Citizen-file path

```text
User selects local files
  → browser File objects
  → local preview + SHA-256 hash
  ├─ local manual entry → no file-byte transmission
  └─ explicit AI consent → source-role filenames + data-URL POST to /api/analyze
                         → optional OpenAI extraction with store:false
  → structured fields returned to browser
  → user edits and confirms fields
  → deterministic assessment
  → optional PDF / manifest download or bilingual share-safe brief copy
```

The prototype does not save the original File objects, extracted fields, hashes, findings, or packets in an application-owned database.

### Scam Shield path

```text
Citizen pastes message as plain text
  → React memory
  → local deterministic parsing
  → inert destination labels + risk signals
  → local action plan
  → optional browser clipboard copy
  → clear, route change, reload, or tab close removes application state
```

Scam Shield does not call `/api/analyze`, OpenAI, a URL-reputation service, or a link-expansion service. This is intentional: following a short link or querying an external service with the full destination could expose the citizen's unique tracking token or announce that the lure reached an active device.

## 10. Why there is no application database or persistent document store

### Short answer

The main demonstration does not need persistence to prove the product, and not retaining uploaded legal/identity-related records is the lowest-risk default.

### The reasons

1. **Data minimization**

   Challans and vehicle records may contain names, addresses, registration details, QR payloads, engine or chassis identifiers, and location history. If the product can complete the comparison without storing them, storage creates avoidable responsibility.

2. **Smaller breach surface**

   A database or object store would introduce access control, encryption, deletion, backup, logging, support-access, and incident-response obligations. Removing persistence removes several failure modes from the prototype.

3. **No accounts are needed for the judged journey**

   The hackathon reviews the citizen experience, not an admin panel. Synthetic fixtures and a one-session workflow demonstrate the complete interaction without account creation.

4. **No false sense of a government case record**

   Saving a “case” could make the prototype feel like an official grievance system. Stateless processing reinforces that the packet is citizen prepared and the official handoff is separate.

5. **Honest prototype scope**

   Safe production retention needs explicit policy decisions. It is better to exclude persistence than to simulate secure long-term legal-document storage without implementing its operational controls.

6. **Simpler deletion semantics**

   Resetting the case clears the React state. Closing or reloading the page ends the in-memory session. There is no application backup or server record that the citizen must separately request to delete.

7. **Safer scam triage**

   Suspicious messages often contain phone numbers, unique victim tokens, payment handles, or malicious destinations. Local-only analysis prevents the prototype from becoming a new repository of scam evidence or inadvertently contacting an attacker-controlled server.

### What “no database” does not mean

- It does not mean files never leave the browser. The local manual path keeps file bytes on-device, but if live extraction is configured and the citizen separately consents to it, selected files are transmitted to the application route and then to OpenAI.
- It does not mean `store: false` is a complete privacy policy. It disables retrievable response storage, while [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data) may still include abuse-monitoring retention. It must be paired with a published retention statement, vendor terms, consent, and operational safeguards.
- It does not mean a production service can never use persistence.
- It does not mean browser-generated downloads disappear; the citizen controls files saved by their browser.

### When a database would become justified

Persistence could be justified if users explicitly need:

- saved drafts across devices;
- case status tracking;
- reminders;
- collaborative review;
- a history of consent and deletion requests;
- versioned jurisdiction rule packs managed outside deployments;
- support workflows.

That production design should store structured minimum-necessary data separately from encrypted original documents, use short retention periods, and make deletion visible and verifiable.

## 11. A safe production persistence model

If the project moves beyond a stateless prototype, introduce persistence in stages.

### Suggested data classes

| Class | Example | Default treatment |
| --- | --- | --- |
| Preference | language, accessibility preference | Device-local or account preference |
| Case metadata | internal case ID, rule-pack version, timestamps | Encrypted database, short retention |
| Confirmed facts | normalized plate and broad vehicle class | Minimize, field-encrypt, access-log |
| Original artifacts | challan PDF, photo, vehicle record | Separate encrypted object store, very short retention |
| Generated packet | PDF/manifest | Prefer citizen download; store only by explicit request |
| Consent audit | consent version and timestamp | Append-only minimum record |

### Required controls

- explicit consent before any remote transmission, with a durable receipt when persistence exists;
- clear purpose and retention notice;
- encryption in transit and at rest;
- per-user authorization;
- object-level access controls;
- short automatic deletion windows;
- deletion propagation to backups where feasible;
- malware scanning;
- rate limiting and abuse detection;
- staff access logging;
- incident-response process;
- Indian legal and privacy review;
- vendor and subprocessor review.

## 12. Privacy controls in the current prototype

- No D1 database binding.
- No R2 object-store binding.
- No application account system.
- No analytics package.
- No local-storage or session-storage case persistence.
- No government credentials.
- No original document bytes in exports.
- Local manual entry transmits no selected file bytes.
- Separate transmission consent before optional OpenAI extraction.
- Original filenames are replaced with source-role names before AI transmission.
- `store: false` on optional OpenAI requests, without claiming that it disables all OpenAI retention.
- Server-side API key only.
- No official submission.
- Explicit reset control.
- Synthetic default fixtures.
- Scam-message checks run locally and are not sent to the extraction endpoint.
- User-supplied suspicious URLs are never clickable.
- Official escape routes are hard-coded rather than copied from the message.

## 13. Failure behavior

The product is designed to fail into review rather than certainty.

| Failure | Behavior |
| --- | --- |
| API key missing | Return `503 LIVE_EXTRACTION_NOT_CONFIGURED`; continue manually. |
| Extraction service unreachable | Return `502 EXTRACTION_UNREACHABLE`; continue manually. |
| Upstream extraction failure | Return a safe extraction error; continue manually. |
| Invalid structured result | Reject it; continue manually. |
| Invalid or impossible extracted date | Remove it from the case and do not calculate or render a deadline. |
| Missing required files | Keep analysis disabled and show guidance. |
| File above 10 MB | Reject it in the interface. |
| Unconfirmed fact | Lock comparison. |
| Ambiguous decisive character | Return `unable`; create no finding or packet. |
| No supported rule | Return `none`; do not claim the challan is valid. |
| Invalid issue date | Do not calculate a deadline. |
| No obvious scam signal | Return `unverified`, never “safe” or “genuine.” |
| Unknown government-looking hostname | Label it unverified; do not declare it fraudulent. |
| Lookalike/APK/credential pattern | Return a danger or suspicious state and block any user-supplied route. |
| Money, credential, or app exposure | Select the emergency response track with 1930 and NCRP guidance. |

## 14. Local launch

### Requirements

- Node.js 22.13 or newer
- npm
- A modern browser
- An OpenAI API key only for optional live document extraction

### Install

From the project directory:

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Choose **Run the 90-second demo** to use the complete application without an API key.

Choose **Scam check** to use the local anti-scam lane. It also requires no API key and makes no network request with the pasted message.

### Enable optional live extraction

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-5.6-terra
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restart the development server after changing environment values.

Never commit `.env.local`.

### Production-like local build

```bash
npm run build
npm run start
```

### Complete verification

```bash
npm run verify
```

That command runs:

1. ESLint;
2. TypeScript checks;
3. deterministic and boundary tests;
4. the production build.

For the deployment gate, including npm's current production-dependency advisories:

```bash
npm run release:check
```

Individual commands are:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 15. Where a citizen goes next

Finding a contradiction is only half the journey. A disputed challan can sit
with the issuing authority, be listed before a virtual court, or be taken up in
a settlement forum, and each is a different destination with a different action.
A citizen is normally expected to already know this.

`lib/routes.ts` names all three: the ministry's grievance entry on the eChallan
service (with its separate ticket-status page), the Virtual Court, and a Lok
Adalat. The current grievance page may direct a citizen to Delhi Traffic Police
or the NextGen eChallan portal based on the challan state, so the product tells
the citizen to follow only the destination shown by that official page. Lok
Adalat is described as eligibility-dependent, not as an automatic destination.
Each route carries what it is, when it applies, and which authority runs it, in
both languages.

Three deliberate limits:

- **Only official destinations.** Every URL is a hard-coded `.gov.in` host over
  HTTPS, opened by the citizen in a new tab. A test fails the build if any other
  destination appears.
- **No invented timeline.** Which forum holds a challan, and for how long,
  varies by state and by the age of the record. The prototype has no authorised
  way to read a challan's live status, so it says that rather than guessing.
- **Routes are not withheld.** Somebody with no supported finding may still have
  grounds the rules cannot see — an alibi, a sold vehicle. The destinations stay
  the same for every outcome; only the framing changes, and a test pins that.

A further test asserts the prose never predicts an outcome or implies the app
has filed anything.

## 16. Language coverage

The product runs completely in English and Hindi. The toggle switches every
screen — the evidence workbench, the verification checklist, the finding, the
refusal, the counter-checks, the packet builder and the whole of Scam Shield.

Two mechanisms carry it. Interface copy uses `t(language, english, hindi)` so the
English text stays readable at the call site. Everything produced by the rule
layer — findings, counter-checks, assessments, scam signals, the recovery plan —
is returned as a `Bilingual` `{ en, hi }` value and resolved by the component.
Nothing is machine-translated at runtime, so a language switch can never turn
safety advice into an approximation.

Canonical values that the rules compare, such as `Passenger car` or `Blue`, stay
in English and are translated for display only; translating the stored value
would break the comparison. Registration marks and challan numbers are
identifiers and are never altered. The generated PDF stays in English because the
core PDF font set carries no Devanagari, but the JSON manifest records the
interface language and both language forms of every claim.

Scam triage reads Hindi as well as English: the patterns in `lib/scam-shield.ts`
match Hinglish and Devanagari lures, which is how these messages actually arrive.

Four tests walk the rule layer and fail the build if any string is missing Hindi,
is identical to its English form, or is not written in Devanagari. Full detail is
in [docs/LOCALISATION.md](docs/LOCALISATION.md).

## 17. Repository structure

```text
challan-jaanch/
├── app/
│   ├── api/analyze/route.ts     Optional extraction endpoint
│   ├── error.tsx                Bilingual controlled recovery
│   ├── globals.css              Visual system and motion
│   ├── layout.tsx               Metadata, fonts, document shell
│   ├── manifest.ts              Install and browser presentation metadata
│   ├── not-found.tsx            Privacy-aware unknown-route recovery
│   └── page.tsx                 Complete citizen journey
├── components/
│   ├── EvidenceWorkbench.tsx    Source inspector, plate diff, rule clock
│   ├── NextSteps.tsx            Official next-step routes after a finding
│   ├── ProductGuide.tsx         Help drawer and audio guidance
│   └── ScamShield.tsx           Local scam triage and official safety routing
├── docs/
│   ├── ARCHITECTURE.md          Short architecture reference
│   ├── DEMO_SCRIPT.md           Judge-ready demonstration
│   ├── HOW_WE_BUILT_IT.md       Where the OpenAI model runs and how the build was produced
│   ├── LOCALISATION.md          Bilingual contract and the tests that protect it
│   └── LOCAL_DEVELOPMENT.md     Compact setup guide
├── lib/
│   ├── cases.ts                 Types, fixtures, deterministic evidence rules
│   ├── i18n.ts                  Bilingual primitives shared by rules and interface
│   ├── routes.ts                Official next-step destinations and their ordering
│   ├── scam-shield.ts           Scam patterns, URL classification, response tracks
│   └── use-language.ts          Persisted, tab-synchronised language selection
├── tests/
│   └── rules.test.mjs           Rule, boundary, and bilingual-completeness tests
├── public/
│   ├── _headers                 Security and immutable-asset cache headers
│   ├── favicon.png              Branded browser and install icon
│   ├── og-release.png           Active release social preview
│   └── og.png                   Preserved legacy social preview
├── .env.example                 Optional environment template
├── .openai/hosting.json         Sites project binding
├── CONTRIBUTING.md              Contribution safety rules
├── LICENSE                      MIT license
├── README.md                    Repository overview
└── SYSTEM_GUIDE.md              This complete explanation
```

## 18. Dependencies and their purpose

### Runtime

- `react` and `react-dom`: render the interactive application.
- `next`: supply compatible app-router and metadata types.
- `jspdf`: create the citizen PDF in the browser.

Scam Shield uses only browser and language primitives. It adds no reputation SDK, tracking service, or runtime dependency.

### Build and development

- `vinext`: compile the Next-compatible project for Vite and Cloudflare.
- `vite`: development server and bundler.
- `tailwindcss`: utility-driven responsive styling.
- `typescript`: type checking.
- `eslint` and `eslint-config-next`: code-quality checks.
- `@openai/sites-vite-plugin`: Sites integration.
- Cloudflare packages: Worker-compatible output and deployment tooling.

`next.config.ts` enforces response headers on the rendered application and API route: framing is denied, MIME sniffing is disabled, referrer leakage and sensitive browser permissions are restricted, resources remain same-origin, and the opener context is isolated. `public/_headers` retains equivalent static-host defaults for portability.

## 19. What works today

- Complete synthetic citizen journey.
- Three testable case outcomes.
- File selection and image preview.
- Optional extraction endpoint.
- Safe manual fallback with source-clarity controls and closed vehicle-family choices.
- Field editing and confirmation invalidation.
- Blank-value confirmation prevention.
- Source inspection.
- Character comparison.
- Deterministic rules.
- Counter-checks.
- Rule-based date calculation.
- PDF generation.
- JSON manifest generation with truthful source-role hashes and null hashes for synthetic references.
- Copyable bilingual redacted or official-handoff case brief.
- Branded install metadata and favicon routing.
- Bilingual keyboard skip navigation and controlled error/404 recovery.
- Redacted and official-handoff packet views.
- Responsive mobile and desktop layouts.
- Keyboard focus and reduced-motion handling.
- Local plain-text scam-message triage.
- Four synthetic scam patterns.
- Inert URL extraction and exact-host allowlisting.
- APK, secret-request, remote-access, threat, and payment-pressure signals.
- Separate opened, downloaded, installed, dangerous-permission, credential, and payment exposure states.
- Separate verify, report-attempt, and emergency routes.
- Copyable report-ready safety brief that omits the original lure.
- Direct links to the official eChallan service, DoT Chakshu, I4C Report Suspect, NCRP, CERT-In guidance, and `tel:1930` for exposed users.
- Automated checks that the project summary stays under 250 words and the submission video stays under two minutes.

## 20. What is mocked or limited

- Synthetic cases are not government records.
- No government API is called.
- No grievance is submitted.
- No official case status is read.
- The deadline is a dated rule interpretation, not portal status.
- Live extraction needs a configured server-side key.
- The product covers only narrow mismatch rules.
- English and Hindi cover the complete citizen journey; this is still not a substitute for usability testing with Indian-language users.
- No account, saved draft, sync, reminder, or collaboration exists.
- No production consent, malware-scanning, or support operation exists.
- Scam Shield does not query a live domain-reputation feed, expand short links, inspect message headers, reverse-lookup phone numbers, or scan APK binaries.
- A lack of detected signals does not authenticate the sender or establish that a message is genuine.
- The recognised official-host list is deliberately narrow and is not a complete directory of state traffic portals.
- The current Sites deployment is public and opens without a consumer login; availability still depends on the hosting provider.

## 21. Cyber-advisory basis for Scam Shield

The anti-scam rules were rechecked on 28 August 2026 against primary government sources:

- [MoRTH national eChallan service](https://echallan.parivahan.gov.in/index/check-challan-status): warns about fraudulent websites and mobile apps and says the service does not request passwords, OTPs, payment details, or sensitive personal information through calls, emails, messages, or links.
- [CERT-In RTO/eChallan malware advisory, 17 March 2026](https://www.cert-in.org.in/s2cMainServlet?CACODE=CICA-2026-3492&pageid=PUBADV01): describes the current multi-stage Android campaign and recommends disconnecting an affected phone, uninstalling suspicious apps, scanning the device, changing passwords/UPI PINs, checking statements, keeping unknown-source installation disabled, and using Play Protect.
- [DoT Chakshu on Sanchar Saathi](https://sancharsaathi.gov.in/sfc/): accepts reports about suspected fraudulent communications received through calls, SMS, or WhatsApp; victims of cybercrime or financial fraud are directed to NCRP/1930 instead.
- [I4C Report Suspect](https://www.cybercrime.gov.in/Webform/cyber_suspect.aspx): accepts reports about suspicious website URLs, WhatsApp or Telegram handles, phone numbers, emails, SMS headers, and social-media URLs.
- [National Cyber Crime Reporting Portal](https://www.cybercrime.gov.in/): directs victims of financial cyber fraud to report immediately and use the national helpline `1930`.

These sources justify the product split between independent challan verification, communication/identifier reporting, downloaded-but-not-installed guidance, and urgent post-installation or post-loss response. They do not justify declaring every unfamiliar URL fraudulent, so the system retains an explicit `unverified` state.

## 22. Deployment and the hackathon public-link requirement

The project is connected to OpenAI Sites and can produce Cloudflare-compatible output.

Production metadata defaults to the existing Sites origin when `NEXT_PUBLIC_SITE_URL` is not configured, preventing social-preview URLs from accidentally pointing to localhost. A different public origin should still set `NEXT_PUBLIC_SITE_URL` explicitly at build time.

The builder guide requires the final submission link to open without requesting access. An owner-only or workspace-gated deployment does not satisfy that rule.

Changing a site from private to public is an external access change. It should be done only with explicit owner approval after confirming that:

- the deployment contains synthetic data only;
- no API key is embedded in client code;
- no private environment value is displayed;
- all links work in a signed-out browser;
- the disclaimer and mocked dependencies remain visible.

## 23. How to push to your own Git repository

Inspect existing remotes:

```bash
git remote -v
```

Add your repository without disturbing an existing Sites remote:

```bash
git remote add personal YOUR_REPOSITORY_URL
git push -u personal main
```

Or replace `origin` if that is intentionally your primary repository:

```bash
git remote set-url origin YOUR_REPOSITORY_URL
git push -u origin main
```

Before pushing:

```bash
npm run verify
git status
```

## 24. Recommended production evolution

### Phase 1: Public synthetic pilot

- Public read-only deployment.
- Synthetic fixtures only.
- No live document upload.
- Accessibility and usability testing.
- Rule-pack review with legal and transport-domain experts.

### Phase 2: Consent-based ephemeral processing

- Explicit upload consent.
- Real extraction with documented vendors.
- Request-level rate limits.
- Malware and document validation.
- No long-term original-file retention.
- Short-lived server processing with verifiable cleanup.

### Phase 3: Optional saved drafts

- User authentication.
- Minimum structured case metadata.
- Separate encrypted object storage.
- User-visible retention and deletion controls.
- Access logs and operational support.

### Phase 4: Jurisdiction-aware rule service

- Versioned state rule packs.
- Effective-date routing.
- Source citations and review ownership.
- Automated regression fixtures for every rule revision.

## 25. Troubleshooting

### The comparison button is disabled

Confirm every field marked **Decisive**. Editing any confirmed field removes its confirmation.

### Live extraction is unavailable

Check `OPENAI_API_KEY` in `.env.local`, restart the development server, and inspect the server output. The synthetic demo remains fully functional.

### A file is rejected

Use JPG, PNG, or PDF below 10 MB. Files are optional for local entry; AI extraction needs both the challan and the vehicle record.

### The app returns “unable to assess”

That is intentional when decisive evidence is ambiguous. Follow the “best next evidence” recommendation rather than forcing a finding.

### Packet download is disabled

Only supported results can reach the packet stage. Complete the final human attestation before downloading.

### The hosted link asks for sign-in

The Site is private. That is acceptable for internal review but not for the hackathon's required public link. The owner must explicitly approve a public access change.

### Scam Shield says “No obvious red flag”

That is not an authentication result. Independently type the official eChallan address and check whether the challan exists. Do not continue through the original message.

### A suspicious APK was already installed

Disconnect the affected device from the internet. Use a different trusted device to call 1930 and contact the bank or payment provider. Preserve the original message, filename, permissions, and transaction alerts before arranging secure device cleanup.

## 26. Final mental model

The easiest way to understand the product is:

```text
AI is a reader.
The citizen is the verifier.
TypeScript rules are the comparator.
Scam Shield is a local risk triage, never a “safe sender” certificate.
The packet is the portable artifact.
The government portal remains the decision and submission system.
```

That separation is the main safety and product-design principle of Challan Jaanch.
