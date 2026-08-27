# Two-minute submission video

Target length: **1:52–1:58**. The first minute is the citizen experience. The second minute explains the build and product decisions.

## Minute one — citizen demo

### 0:00–0:08 — The missing step

**Screen:** Home page.

**Say:** “A confusing eChallan leaves a citizen with two questions: does the evidence actually match my vehicle, and is the message itself even genuine? Challan Jaanch answers both before the citizen pays or files a grievance.”

### 0:08–0:21 — Bring the records together

**Action:** Choose **Run the 90-second demo**.

**Say:** “I’ll use a clearly labelled synthetic case. The workbench places the challan, enforcement photo and vehicle record side by side. Originals stay unchanged, and every extracted fact remains linked to its source.”

### 0:21–0:34 — Show the contradiction

**Action:** Open **Character diff** and select the final plate position.

**Say:** “Here the photograph shows seven, while the challan and vehicle record show one. The vehicle family also conflicts: a two-wheeler in the photo versus a passenger car on record.”

### 0:34–0:46 — Keep the human in control

**Action:** Choose **Confirm all visible values**, then **Run objective comparison**.

**Say:** “The comparison stays locked until I confirm every decisive value. If I edit one, that confirmation and any earlier result are invalidated.”

### 0:46–0:54 — Show the narrow result

**Screen:** Supported result.

**Say:** “The result reports two source-linked contradictions. It does not declare the challan invalid, accuse an authority, or predict whether a grievance will succeed.”

### 0:54–1:00 — Switch to scam protection

**Action:** Open **Scam check**, then choose **Fake APK lure**.

**Say:** “Scam Shield inspects suspicious wording and destinations as inert text, never opening the APK or payment route.”

## Minute two — build and rationale

### 1:00–1:13 — Architecture

**Screen:** **How it works → Technology**.

**Say:** “The interface is React 19 and TypeScript, built with Vinext, Vite and Tailwind for a Cloudflare-compatible deployment. Optional multimodal extraction returns structured observable fields with storage disabled.”

### 1:13–1:27 — Separate observation from judgment

**Screen:** Technology architecture principle.

**Say:** “AI is limited to reading. Deterministic TypeScript rules decide whether confirmed sources conflict. That separation makes every result reproducible, testable and explainable.”

### 1:27–1:39 — Design for uncertainty

**Screen:** **Honest refusal** outcome.

**Say:** “The strongest feature is refusal. When a decisive character could be Z or 2, the system produces no allegation. A safety product should expose uncertainty instead of hiding it behind a confidence score.”

### 1:39–1:50 — Privacy and portability

**Screen:** Finding or packet view.

**Say:** “There is no application database, analytics or persistent document store. The synthetic demo is keyless; PDFs, manifests, hashes and Scam Shield processing happen in the browser.”

### 1:50–1:58 — Close

**Screen:** Scam Shield verdict, then project title.

**Say:** “Current portals remain the system of record. Challan Jaanch is the missing trust preflight: verify the evidence, avoid the scam, and carry a transparent packet into the official process.”

## Recording checklist

- Record at 1280×720 or 1920×1080 in a Chromium browser.
- Keep browser zoom at 100% and notifications hidden.
- Do not exceed two minutes; aim for 1:55.
- Show only synthetic fixtures—never a real registration, phone number or challan.
- Keep the public URL visible briefly at the beginning or end.
- Export as H.264 MP4, 1080p or 720p, with clearly audible narration.
