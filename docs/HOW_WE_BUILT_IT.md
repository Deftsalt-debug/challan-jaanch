# How this was built

The hackathon brief asks for a prototype built with Codex or powered by an OpenAI
model, and asks that the model be a meaningful part of the build rather than a
label added at submission time. This document records exactly where an OpenAI
model runs, exactly what it is allowed to do, and how the codebase was produced.

## 1. Where an OpenAI model runs in the product

There is exactly one model call in the entire application:
[`app/api/analyze/route.ts`](../app/api/analyze/route.ts).

| Property | Value |
| --- | --- |
| API | OpenAI Responses API (`POST /v1/responses`) |
| Default model | `gpt-5.6-terra`, overridable with `OPENAI_MODEL` |
| Input | Up to three citizen-selected JPG, PNG or PDF files |
| Output | A strict JSON schema, `challan_evidence_extraction` |
| Retention | `store: false` — the request is not retained upstream |
| Timeout | 45 seconds, then a clean failure into manual entry |

The model reads observable fields — the registration mark printed on the challan,
the registration mark visible in the enforcement photograph, the registration
mark on the vehicle record, the broad vehicle family, the issue date, the
location, the offence text and the amount. That is all.

## 2. What the model is explicitly forbidden from doing

The system instruction is short and negative on purpose:

- It may not decide validity, guilt, appeal eligibility, fraud, cloning, or any
  legal outcome.
- It may not silently correct a visually confusable plate character. When a
  character is unclear it must return `null`.

Those two sentences are the reason the architecture works. A language model is
good at reading a smudged document and bad at being accountable for a legal
allegation, so it is used for the first job and structurally prevented from the
second.

Three layers enforce that boundary, and they are independent of the model:

1. **Schema.** `strict: true` structured output with a closed enum for vehicle
   family. A free-text verdict has nowhere to go.
2. **Server-side revalidation.** `validatedExtraction()` re-checks every field
   after the model returns — length caps, a real-calendar date check, and
   membership in the vehicle-family enum. An impossible date such as
   `2026-02-30` is rejected rather than rendered. This is covered by the test
   *live extraction endpoint rejects structurally invalid model output*.
3. **The human confirmation gate.** Nothing the model returns can produce a
   finding until the citizen has confirmed each decisive field by hand, and
   editing a field immediately withdraws its confirmation. In the manual path,
   the citizen must also mark whether the original source is clear; uncertainty
   creates an abstention rather than a hidden confidence upgrade.

The decision itself is made by ordinary, versioned TypeScript in
[`lib/cases.ts`](../lib/cases.ts) — never by the model.

## 3. Failing honestly when the model is unavailable

The extraction path is optional, and the whole guided demo works without it. The
endpoint distinguishes eight failure states — no API key, wrong media type,
oversized payload, unreadable body, too few or too many documents, an
unreachable upstream, an unreadable upstream response, and a structurally
invalid extraction — and every one of them returns the citizen to manual entry
with an explanation rather than to a blank screen or a fabricated field.

The public demo deployment intentionally runs **without** an API key, so the live
link never sends a reviewer's uploaded document anywhere. Reviewers see the
service report `LIVE_EXTRACTION_NOT_CONFIGURED` and continue through the
deterministic synthetic journey, which is the path the submission is built
around.

## 4. How the codebase was produced

This project was written with an AI coding agent in the loop throughout, not as
a one-shot generation. The working pattern that produced the code in this
repository:

- **Rules first, prose second.** Each comparison rule was specified as a test in
  [`tests/rules.test.mjs`](../tests/rules.test.mjs) before the interface used
  it. The suite covers the supported, refused and no-ground outcomes, the
  calendar arithmetic, the API failure modes, and the scam-triage signals.
- **A verification gate on every change.** `npm run verify` runs lint,
  TypeScript, the deterministic tests and a production build. No change is
  considered done until it passes.
- **Adversarial passes over the agent's own output.** The refusal path, the
  Devanagari and Hinglish scam patterns, and the bilingual-completeness tests all
  came from deliberately looking for ways the product could mislead somebody,
  rather than from the happy path.
- **Guardrails encoded as tests, not intentions.** The rule "a language switch
  must never leave a citizen on an English screen" is enforced by tests that walk
  every fixture, assessment and scam signal and assert real Devanagari on each
  one. See [LOCALISATION.md](LOCALISATION.md).

### Builder's note on Codex

Codex was the primary implementation partner for this project. I used it to turn
the initial problem choice into the evidence workbench, deterministic rule
layer, refusal path, packet builder, Scam Shield, bilingual interface, tests,
documentation and deployment. The work happened as an iterative repository
conversation: inspect the current code, research the relevant public-service
flow, propose a narrow change, implement it, then make the same agent challenge
the result and run the release gate.

The most useful Codex contributions were not visual generation. They were the
adversarial passes that found places where a polished interface could still
mislead a citizen: an ambiguous `Z`/`2` plate read, a model output with an
impossible date, a message with no obvious scam signal, a downloaded APK being
mistaken for an installed one, an outdated NALSA route, a Rule 167 clock that
crossed the day at UTC rather than midnight in India, invented-looking hashes
for synthetic filenames, and wording that implied government endorsement or
automatic submission. Each became either a refusal, a clearer boundary, or an
automated test.

I retained the product decision and release authority: Challan Jaanch would be
an independent preflight, not a challan-validity oracle or unofficial filing
service. Public deployment and every external write were made only after that
boundary was visible and the complete local gate passed.

## 5. What was deliberately not automated

- The product boundary — what the tool refuses to claim — is a human judgement,
  written out in [ARCHITECTURE.md](ARCHITECTURE.md) and enforced in code.
- The legal and cyber source pack (CMVR Rule 167, G.S.R. 48(E), the Rajya Sabha
  figures, MoRTH, CERT-In, DoT Chakshu and I4C) was chosen, dated and linked in
  source, and the interface states when it was last rechecked.
- Every Hindi string is written and reviewed as source, not machine-translated at
  runtime, so a language switch cannot degrade into an approximate rendering of
  safety advice.

## 6. Reproducing the build

```bash
npm install
npm run verify
```

To exercise the model path locally, copy `.env.example` to `.env.local` and add
an `OPENAI_API_KEY`. The demo does not need one.
