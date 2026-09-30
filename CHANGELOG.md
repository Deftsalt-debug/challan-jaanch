# Changelog

## 2026-09-30 — Upload and extraction fixes

- Removing a file and choosing the same one again now works. Cancelling the file picker keeps the current selection, and the native inputs have contextual accessible labels.
- Non-object JSON from the extraction service now produces the existing manual-entry fallback response instead of throwing an unhandled error.
- Added a regression test covering null, array, string and number upstream responses. It mocks the service and sends no real documents or paid API requests.

Validation on Node 26.10.0: `npm run verify` passed — lint, typecheck, **54 tests**, and production build. Existing styling, comparison rules, consent behavior and Hindi/English content were preserved. The build emits a Node deprecation notice and Vinext's existing route-classification note. Live OpenAI extraction was not tested.

## 2026-09-05 — Payment follow-up and interface refinement

### Added

- A bilingual **Already paid?** helper on the home screen and after case findings.
- Twenty service/symptom combinations covering missing receipts, pending payment status and possible double payments.
- Separate guidance for NextGen eChallan, national eChallan, Virtual Courts, Google Pay challan bill payments and unknown services.
- A locally copied follow-up checklist with a manual-copy fallback; no financial identifiers are collected.
- Primary-source research notes and seven payment-focused regression tests.

### Improved

- Restrained navy/slate styling, clearer heading spacing, wrapping navigation, calmer action hierarchy and visible disclosure focus.
- UPI-address detection now asks for independent verification without asserting personal ownership or fraud.
- Homepage privacy copy distinguishes local checks from optional consent-based AI transmission.
- Repository navigation, reproducible local setup and contribution guidance.

### Preserved

- Manual entry without uploads, explicit evidence confirmation, safe abstention, Hindi/English coverage and local PDF/JSON exports.
- Existing scam-exposure recovery steps and official next-step routes.
- No new dependencies, application database or persistent document storage.

Validation of the application release: 53 tests passed, lint and type checks passed, production build completed, and the production-dependency audit reported no known vulnerabilities at the time of the check. This is a dated result, not a guarantee about future advisories or third-party services.
