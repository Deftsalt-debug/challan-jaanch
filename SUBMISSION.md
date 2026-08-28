# Challan Jaanch — submission pack

## Live project

**Public link:** https://challan-jaanch.deftsalt.chatgpt.site

The app has no consumer login. Reviewers can open it directly and run the complete synthetic evidence journey and Scam Shield without credentials or personal uploads. The language toggle in the header switches the entire journey between English and Hindi.

## Project summary

Challan Jaanch is an independent, privacy-first trust preflight for Indian eChallans. It handles two failures citizens face: a real challan whose evidence may be inconsistent, and a fake challan message designed to steal money or install malware.

A local-only path keeps file bytes on-device; optional AI extraction runs only after explicit transmission consent.

For disputed records, citizens compare the challan, enforcement photo and vehicle record in a source-linked workbench. It highlights plate and vehicle-class conflicts, requires confirmation of consequential fields, applies deterministic rules, exposes counter-explanations, and refuses to decide when evidence is ambiguous. Supported conflicts become a redacted or official-handoff PDF, JSON manifest or share-safe brief; nothing is submitted automatically.

Scam Shield analyses pasted messages and URLs as inert text, identifies APK lures, credential requests, urgency and lookalike domains, then distinguishes a link opened, file downloaded, app installed, dangerous permission granted, credentials shared and money sent. It produces an ordered response and privacy-safe safety brief without retaining the lure.

The app names the official grievance, Virtual Court and Lok Adalat routes without pretending to read live status. For scams, it separates verification, Chakshu communication reporting, I4C suspect reporting and urgent 1930/NCRP containment.

Current portals remain the system of record. Challan Jaanch adds the missing reasoning and safety layer before them: every finding is traceable, uncertainty is visible, ambiguous evidence produces a refusal rather than an allegation, suspicious links are never opened, every screen works in Hindi, and the demo runs without login or personal data.

**Word count:** 245

The release test derives this count from the summary block and fails above 250 words or when the declared count is stale.

## Video

The ready-to-submit cut is [submission/challan-jaanch-submission.mp4](submission/challan-jaanch-submission.mp4): 1 minute 47.5 seconds, 1920×1080 H.264, silent and caption-led. It uses real captures from the public synthetic demo, an animated system-boundary diagram, technical callouts and the complete Scam Shield path. [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) remains the timed editorial companion for the citizen journey and build explanation.

The release test reads the MP4 movie header and fails if the cut exceeds the two-minute limit.

The video’s privacy caption uses “storage disabled” as shorthand for `store: false`: retrievable response storage is disabled. It is not a zero-retention claim; OpenAI API data controls, including possible abuse-monitoring retention, may still apply. The public submission deployment has no API key, so the reviewer journey sends no document to OpenAI.

## How the OpenAI model is used

[docs/HOW_WE_BUILT_IT.md](docs/HOW_WE_BUILT_IT.md) records the single model call in the product, the strict JSON schema it must answer in, the two things it is forbidden from deciding, the three independent layers that enforce that boundary, and the eight failure states that return the citizen to manual entry instead of a fabricated field.

## Accessibility and reach

[docs/LOCALISATION.md](docs/LOCALISATION.md) explains why the Hindi coverage is complete rather than partial, which canonical values stay in English and why, and the four tests that fail the build if any rule-layer string loses its Hindi.

## Against the builder brief's rules

The brief lists eight things not to do. How this build stands against each:

| Rule | How this build stands |
| --- | --- |
| Do not access, test or interfere with a live government system | The only outbound request the product makes is to `api.openai.com`, and only when a citizen supplies their own files and a server key is configured. Every government destination is an `<a target="_blank">` the citizen clicks in their own browser. The scam checker's allowlist compares hostnames as local strings and never fetches them. |
| Do not reverse-engineer private systems or use undocumented APIs | No government or private API is called. The extraction endpoint uses the public, documented OpenAI Responses API. |
| Do not scrape personal or restricted information | Nothing is scraped. There is no crawler, no database, and no analytics. Files a citizen selects stay in browser memory. |
| Do not use real Aadhaar, PAN, passwords, OTPs, payment or health data | All fixtures are synthetic. Registration marks use the prefix `ZZ`, which is not an assigned Indian state code, and challan numbers are `DEMO-` prefixed. The app never asks for a portal password or OTP, and Scam Shield exists partly to tell citizens not to share one. |
| Do not present the prototype as an official government product | Every screen carries an independence line, the packet is stamped "Not government-issued", and the onward-routes section states that the authorities named run those destinations and have no affiliation with this tool. |
| Do not use government logos to suggest approval or partnership | No emblem, seal, tricolour or departmental logo appears anywhere. The mark is an abstract shield and road. |
| Do not submit an old project with only small changes | The public commit history shows the build and its rewrites. |
| Do not include code, assets or data without permission | Dependencies are open-source and listed in `package.json`; the project is MIT-licensed. Images are original to the project. |

The final release gate also checks the India-local Rule 167 day boundary, safe abstention for unclear vehicle sources, official-route hostnames and non-predictive wording, security-header parity, truthful synthetic-file hash metadata, the summary word limit, and the video duration.

Every outbound link in the app was re-checked on 28 August 2026: the eChallan check and grievance pages, grievance ticket status, Virtual Court, NALSA Regular Lok Adalat, DoT Chakshu, I4C/NCRP, CERT-In’s current RTO/eChallan advisory, the controlling Gazette PDF, and the Rajya Sabha answer PDF.

## Submission boundary

- Independent civic-tech prototype; not affiliated with a government authority.
- No login credentials are required.
- Use only the visibly synthetic fixtures in a public demonstration.
- Optional live document extraction requires a server-side API key; the submitted guided demo does not, and the public deployment runs without one so no reviewer's document is ever sent anywhere.
