# Changelog

## 2026-11-10 — Navigation, dark theme and interaction pass

### Added

- Browser history for every stage: Back and Forward (and the Android back gesture) step through a case instead of leaving the site and discarding it.
- Completed progress steps are buttons that return to that step; step names now show on phones.
- A dark theme that follows the system, with an Auto / Light / Dark control in the footer and no light flash on load.
- A confirmation before a citizen-entered case is deleted. Synthetic demo cases still clear immediately.
- Arrow-key, Home and End navigation in every tab list and radio group.

### Fixed

- Component CSS was unlayered and outranked Tailwind utilities, so several intended styles never applied: the “Next action” helper text was dark on a dark panel, the Listen button showed on phones and wrapped the header onto two rows, the upload screen ignored its 760px reading width, and the red “Scam check” and “Remove” labels rendered in the default colour.
- Dialogs (guide drawer, source inspector) now use the native modal dialog: focus is trapped and restored, the page behind is inert and does not scroll.
- Focus moves to the new view on each stage change instead of being lost.
- Leaving Scam Shield returns to a case in progress instead of wiping it.
- Finding chips show the field's name rather than its internal key, and open that field in the evidence view.

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
