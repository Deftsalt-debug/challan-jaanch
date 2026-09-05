# Payment follow-up: evidence and product decisions

Research date: 5 September 2026. This is navigation guidance, not legal advice, transaction verification or a service-level guarantee.

## The unmet need

The original product answers whether supplied records contradict one another and whether a message contains warning signs. Neither answers: “I paid, but the challan still looks unpaid.” That situation needs payment reconciliation, not an evidence-dispute packet or an automatic scam accusation.

A [Bengaluru citizen discussion](https://www.reddit.com/r/bangalore/comments/1ucbnp2/traffic_challan_payment_not_getting_updated/) describes a bank debit without a successful portal confirmation and fines remaining active. Replies also describe conflicting third-party status. These are self-reported experiences, not verified prevalence estimates. One reported resolution time is not a general waiting period and was deliberately not built into the application.

## Primary-source checks

- [NextGen eChallan](https://echallan.parivahan.nic.in/) lists receipt and pending-transaction services. Its [pending transaction page](https://echallan.parivahan.nic.in/challan/payment-verification) exposes a challan/vehicle-number check with captcha. The helper sends users to those services; it does not reproduce or bypass them. Some repeat research fetches timed out, so the app makes no uptime claim.
- [Virtual Courts FAQ](https://vcourts.gov.in/virtualcourt/faq.php) describes finding a case and using View/Reprint to retrieve a receipt with verification on that service. Court payments must not be treated as national-portal transactions.
- [Google Pay's own e-challan help](https://support.google.com/pay/india/answer/16376992) confirms a legitimate challan bill-payment flow and provider-specific dispute steps. The product links there and distinguishes that flow from direct UPI transfers. Any timeframe must be checked in the original transaction; no universal refund promise is made.
- The legacy national portal could not be fetched reliably during this research. Its existing official root remains an entry point, with explicit state/NextGen redirection guidance; no new unverified legacy deep link was invented.

## What we implemented

One reusable, collapsed disclosure with two selectors: service and symptom. Twenty combinations are covered by five service choices and four payment problems. The generated checklist includes next steps, records to keep privately, a source-backed destination and an explicit non-submission boundary. Clipboard failure has a manual-copy fallback. All guidance is available in English and Hindi.

The distinction between legitimate UPI services and unsolicited direct transfers also corrected a weak assumption in Scam Shield. A handle alone now produces a caution signal without claiming the owner is personal or fraudulent. Other critical indicators, such as APK lures and credential requests, retain their escalation behavior.

## Deliberately rejected

- Automatic bank/challan verification: requires access we do not have, introduces sensitive data, and cannot be truthfully simulated.
- Universal refund calculator or guaranteed settlement date: provider and court procedures differ.
- Another account, saved payment tracker or transaction upload: unnecessary for a navigation checklist and increases data risk.
- New AI verdicts about guilt, fraud or refund eligibility: the source evidence cannot support them.
- A third large home-screen workflow: a compact disclosure serves the need without obscuring evidence comparison and message triage.

## Validation and maintenance

`tests/payment-help.test.mjs` checks every service/symptom combination, bilingual content, fixed HTTPS destinations, receipt versus transaction routing, unknown-service limits, double-payment language, Google Pay scope and checklist boundaries. The existing UPI regression test now protects against unsupported ownership claims. Rerun `npm run verify` for lint, types, tests and a production build. Recheck the linked primary pages when their interfaces or policies change; the displayed research date is not a live verification timestamp.
