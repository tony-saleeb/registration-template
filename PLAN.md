# Event Registration Template — Complete Build Plan

Turn `ticket-reg-10century` into a **standalone, sellable template** you configure and deploy onto each customer's own Firebase + Vercel accounts.

**No OCR. No Gemini. No cron. No Upstash.**

This file is self-contained. With it and `.cursor/rules/project.mdc` you need nothing else.

- **28 tasks across 8 phases.** Every task = one prompt + one verification gate.
- **Do not start the next task until the current gate passes.**
- Source repo reviewed at commit `359a0a2` (28 Jul 2026).

---

## Contents

| Phase | What | Time |
|---|---|---|
| **Pre-flight** | Decisions and accounts (human only) | 30 min |
| **0** | Create the template repo + Cursor setup | ½ day |
| **1** | Remove OCR, add self-reported payment details | 1–2 days |
| **2** | Security — mandatory before selling | ~1 week |
| **3** | Theming — 656 colours → CSS variables | 2–3 days |
| **4** | Copy — 2,209 Arabic strings → dictionary | ~2 days |
| **5** | Config layer | 1 day |
| **6** | Generator + documentation | 1 day |
| **7** | Customer #1 | 1 day |

**~3 weeks focused.** Phases 3 and 4 are the bulk and are mechanical.

---

## Model routing

| Use | Model in Cursor | Why |
|---|---|---|
| Auth, crypto, Firestore rules, API design, migrations, architecture | **Strongest reasoning model available** (Claude Opus tier) | A subtle mistake here *is* the vulnerability |
| Bulk edits, asset work, lint, docs, string extraction, config | **Fastest model available** (Haiku/Flash tier) | High volume, clearly specified |

Marked per task as **[REASONING]** or **[FAST]**. Rule of thumb: if getting it wrong creates a security hole, use the reasoning model.

---

# PRE-FLIGHT

Human tasks. Nothing below works without them.

### 1. Settle repo ownership

The source repo is on your colleague's account. If you intend to sell instances of this, agree the terms in writing first — revenue share, attribution, or a clean code handoff. Five-minute conversation now, ugly one later.

### 2. Decide the customer credential flow

**Never ask a customer for their Gmail password.** 2FA breaks it, it violates Google's ToS, and it makes you liable for any leak with no defence.

The correct flow, which takes them 10 minutes:

1. Customer creates their own Firebase project and Vercel account.
2. Firebase Console → Project Settings → Users and permissions → add your email as **Editor**.
3. Vercel → Project → Settings → Members → add you as **Member**.
4. You do all setup from your own logged-in account.
5. At handover they remove your access with one click.

Phase 6 turns this into a customer-facing document.

### 3. Pick a repo name

`event-reg-template` — alternatives: `regkit`, `eventkit`, `event-registration-starter`.

### 4. Verify your toolchain

```bash
node --version     # 20+
npm --version
git --version
npx vercel --version    # npm i -g vercel
npx firebase --version  # npm i -g firebase-tools
```

---

# PHASE 0 — Repo and Cursor setup

## T0-1 · Create the template repo

**Human task — run these yourself.**

```bash
# 1. Clone the source with full history
git clone https://github.com/tony-saleeb/ticket-reg-10century.git event-reg-template
cd event-reg-template
git log -1 --oneline

# 2. Create the EMPTY repo on GitHub first:
#    github.com/new → event-reg-template → Private
#    → do NOT add a readme, .gitignore, or licence

# 3. Re-point the remote
git remote rename origin source
git remote add origin git@github.com:<ACCOUNT>/event-reg-template.git
git remote -v          # expect: origin (new) + source (original)

# 4. Push
git push -u origin main

# 5. Working branch
git checkout -b template/phase-1

# 6. Verify it still builds
npm install
npx next build
```

**Keep the history.** No secrets were ever committed to this repo — `.gitignore` covered `.env*` from the first commit and the history is clean. History gives you `git blame` for non-obvious decisions, like why the WhatsApp message uses `✓` rather than an emoji.

Leave the `source` remote in place so you can still pull upstream fixes.

### Do NOT use GitHub's "Use this template" button for customer repos

It creates repos with **no shared git history**, which permanently breaks `git merge upstream/main`. That is how one bug becomes eight hand-patches. Customer repos are created by clone + remote-rename (Phase 6).

**GATE T0-1**
```bash
git remote -v            # origin = new repo, source = original
npx next build           # succeeds
```

---

## T0-2 · Cursor setup

**Human task.**

```bash
mkdir -p .cursor/rules
# save the provided project.mdc as .cursor/rules/project.mdc
git add .cursor && git commit -m "T0-2: Cursor project rules"
```

The rules file has `alwaysApply: true`, so it loads into every request without pasting.

**Cursor settings for this work:**

- **Agent mode**, not Ask — these tasks write files.
- **Disable auto-apply and auto-run** for Phases 1 and 2. Read every security diff yourself.
- **Enable checkpoints** so you can roll back a bad task.

**The habit that matters most in Cursor:** `@`-mention only the files named in the task. Cursor will happily search the whole repo, and on a security task a broad context makes it "helpfully" refactor code you did not ask about. For T2-1 you attach `src/lib/qr/hmac.ts` and nothing else.

When a gate fails, **read the failure yourself before prompting again.** Asking the agent to "make the test pass" is exactly how a test gets weakened instead of a bug fixed.

---

## T0-3 · Strip project identity

**[FAST]**

```
This repo is being converted from a single-event app into a reusable template.
Remove the identity of the original project. This is a naming and deletion pass
only — do not restructure code.

1. package.json — set "name": "event-reg-template", "version": "0.1.0". Remove any
   description referencing the original conference.

2. Delete these files (they belong to the original engagement):
   - ticket-reg-10century-fix-plan.md
   - PREFLIGHT.md
   - event-registration-system-build-prompt.md
   - scripts/preflight-audit.js
   List anything else in the repo root that is audit- or engagement-specific before
   deleting it.

3. public/assets/ contains ~4.4 MB of unreferenced images left from an earlier
   optimisation pass. Only mockup.png is referenced (by PaymentInstructionsModal).
   Verify each file with grep, then delete every unreferenced one.

4. Replace README.md with a placeholder titled "Event Registration Template" — one
   paragraph on what it is. The real README comes in Phase 6.

5. Add LICENSE with a proprietary notice:
   "Copyright (c) 2026 <NAME>. All rights reserved. Unauthorized copying,
   distribution, or resale is prohibited."

Do not touch src/ in this task.
```

**GATE T0-3**
```bash
du -sh public/           # target: < 300 KB (from 4.8 MB)
ls *.md                  # only README.md
npx next build
git commit -am "T0-3: strip project identity"
```

---

# PHASE 1 — Remove OCR

OCR touches 12 files. Removing it eliminates the Gemini dependency, the cron job, and one env var each customer would otherwise have to obtain. **It also removes the Vercel Hobby daily-cron constraint entirely** — no cron, no limit.

## T1-1 · Delete the OCR pipeline

**[REASONING]** — it touches shared types and the reconciliation path

**Attach:** `src/lib/types.ts`, `src/app/api/admin/reconcile/route.ts`, `src/app/register/page.tsx`, `src/app/admin/review/page.tsx`, `src/app/admin/registrants/page.tsx`, `src/lib/env.ts`, `vercel.json`

```
Remove the OCR subsystem completely. It is being replaced by self-reported payment
details in the next task, so reconciliation must SURVIVE — delete only its OCR input,
not its matching logic.

DELETE these files entirely:
  src/lib/ocr/gemini.ts
  src/lib/ocr/processor.ts
  src/app/api/cron/ocr/route.ts
  src/app/api/cron/ocr/route.test.ts
  the now-empty src/lib/ocr/ and src/app/api/cron/ directories

REMOVE from configuration:
  - vercel.json: delete the entire "crons" block. If the file is then empty except
    for braces, delete vercel.json.
  - src/lib/env.ts: delete getGeminiApiKey() AND getCronSecret() — there is no cron
    any more, so CRON_SECRET is dead too.
  - Remove GEMINI_API_KEY, GEMINI_MODEL, CRON_SECRET from any env template.

REMOVE from src/lib/types.ts:
  - the OcrStatus and OcrConfidence type aliases
  - the OcrExtractionResult interface
  - these Registrant fields: ocrStatus, ocrExtractedReference, ocrExtractedAmount,
    ocrExtractedSenderName, ocrConfidence

FIX the resulting compile errors. There are 13 references:
  src/app/register/page.tsx           (5) — drop ocrStatus:'queued' and the four null
                                            OCR fields from the transaction write
  src/app/admin/review/page.tsx       (7) — remove OCR display blocks and confidence badges
  src/app/admin/registrants/page.tsx  (1)
  src/app/api/admin/reconcile/route.ts     — see below

RECONCILIATION — rewire, do not delete. It currently reads:
    const extractedRef = regData.ocrExtractedReference;
    regData.ocrExtractedAmount
Leave the matching algorithm, AMOUNT_TOLERANCE, duplicate-reference detection, and
batch-write logic exactly as they are. Change ONLY those two field reads to
`selfReportedReference` and `selfReportedAmount`, added in the next task. Update the
adminNotes string so it no longer says "OCR=".

Also update src/app/api/public/status/[registrantId]/route.test.ts if it references a
removed field.

Do NOT remove: the payment screenshot upload, the screenshot display in admin review,
or the manual_review status. The screenshot stays as evidence for the admin — we are
only removing automated reading of it.
```

**GATE T1-1**
```bash
grep -rin "ocr\|gemini\|CRON_SECRET" src/ vercel.json 2>/dev/null   # NOTHING
test ! -d src/lib/ocr && test ! -d src/app/api/cron && echo "REMOVED"
npx tsc --noEmit && npx vitest run && npx next build
```
Manual: complete a registration. The document should have no OCR fields and sit at `pending_verification`. Admin review still shows the screenshot.

```bash
git commit -am "T1-1: remove OCR pipeline"
```

---

## T1-2 · Self-reported reference and amount

**[REASONING]** — this is now the input to auto-approval; a mistake here approves the wrong people

**Attach:** `src/lib/types.ts`, `src/lib/validation.ts`, `src/app/register/page.tsx`, `src/app/admin/review/page.tsx`, `src/app/admin/registrants/page.tsx`, `firestore.rules`

```
Replace OCR with self-reported payment details. The registrant types their transfer
reference number and amount into the form; reconciliation matches those against the
uploaded bank statement exactly as it did with OCR-extracted values.

This is MORE accurate than OCR, not less: the registrant reads their own confirmation
screen, so there is no blur, glare, crop, or unusual-layout failure. A wrong number
simply fails to match and drops to manual_review — the existing safety net.

1. src/lib/types.ts — add to Registrant:
     selfReportedReference: string | null;
     selfReportedAmount: number | null;

2. src/lib/validation.ts — add:
     isValidTransferReference(ref: string): boolean
       trimmed; 4–40 chars; alphanumeric plus dash, underscore, slash only
   Add to VALIDATION_MESSAGES:
     referenceRequired: 'يرجى إدخال رقم العملية'
     referenceInvalid:  'رقم العملية غير صحيح'
     amountRequired:    'يرجى إدخال المبلغ المحوَّل'
     amountInvalid:     'المبلغ غير صحيح'

3. src/app/register/page.tsx — add two fields to the payment step (step 3), placed
   ABOVE the screenshot upload so the user reads them off the confirmation screen
   before switching apps to screenshot it:
     - رقم العملية      → text input, inputMode="text"
     - المبلغ المحوَّل  → number input, inputMode="decimal", EGP suffix
   Both required. Validate before the step can advance, using the existing error
   display pattern. Normalize the reference: trim and uppercase. Write both into the
   Firestore transaction.

   Use the EXISTING form-input styling and error markup. Do not introduce a new
   visual pattern for these two fields.

4. Add an Arabic helper line under the reference field:
   'رقم العملية موجود في رسالة التأكيد بعد التحويل'

5. src/app/admin/review/page.tsx and src/app/admin/registrants/page.tsx — display
   selfReportedReference and selfReportedAmount next to the screenshot so the admin
   can compare them to the image at a glance. Reuse the existing detail-row markup.

6. firestore.rules — the registrants create rule must additionally require:
     request.resource.data.selfReportedReference is string
     request.resource.data.selfReportedAmount is number

7. Add tests to src/lib/validation.test.ts for isValidTransferReference: valid
   alphanumeric; too short (3 chars); too long (41); rejects spaces; rejects Arabic
   characters; accepts dash and slash.
```

**GATE T1-2**
```bash
npx vitest run && npx tsc --noEmit && npx next build
```

Manual, in order:
1. Register with reference `TEST12345`, amount `400` → succeeds, both fields in Firestore.
2. Import a bank CSV containing `TEST12345` / `400`.
3. Run reconcile → auto-approves, ticket issued.
4. **Repeat with amount `500` against a `400` transaction → must drop to `manual_review` with a mismatch note.**

**Step 4 is the one that matters.** If a mismatched amount auto-approves, the tolerance check is broken and you would be issuing free tickets.

```bash
git commit -am "T1-2: self-reported reference and amount"
```

---

## T1-3 · Drop dead dependencies

**[FAST]**

```
1. html5-qrcode (~2 MB) is in dependencies but NEVER imported — the scanner uses jsQR
   plus the native BarcodeDetector. Verify with grep, then: npm uninstall html5-qrcode
2. src/app/globals.css has orphaned rules targeting #qr-reader inside the
   @media (max-width: 640px) block. That DOM id belongs to html5-qrcode and no
   component renders it. Confirm with grep, then delete those rules.
3. whatsapp-web.js, express, and qrcode-terminal are used only by
   scripts/whatsapp-bot.js, which cannot run on Vercel — but they sit in
   `dependencies`, so Vercel installs Puppeteer on every production build for code
   that never executes there. Move all three to devDependencies.
4. Run `npm audit fix` and report what remains, with a one-line justification for
   anything that needs a breaking major bump.
```

**GATE T1-3**
```bash
grep -rn "html5-qrcode\|qr-reader" src/    # nothing
npx next build                              # and note it got faster
git commit -am "T1-3: drop dead dependencies"
git push -u origin template/phase-1
```

---

# PHASE 2 — Security

**Mandatory before you sell a single instance.** `allow read: if true` on payment receipts shipped ten times is the same breach sold ten times, to people paying you who reasonably assume you knew.

Fixed in the template, every customer inherits it. Fixed later, you patch eight repos.

```bash
git checkout -b template/phase-2-security
```

## Current state (verified at commit 359a0a2)

Already done in the source repo — do **not** redo:

| | Status |
|---|---|
| HMAC signature verification (fixed length, `timingSafeEqual`, no raw-ID fallback) | ✅ correct |
| Scan route enforces `isSigned` + 512-char input guard | ✅ |
| `/api/upload` (unauthenticated file host) deleted | ✅ |
| Usher passcode: `102030` default removed, constant-time compare | ✅ |
| Public server routes for `/status` and `/ticket` with field allowlists | ✅ |
| Security headers + `safeImageSrc` URL validation | ✅ |
| Assets compressed (bg 76 KB, favicon 2.4 KB) | ✅ |

Outstanding — the tasks below.

---

## T2-1 · Replace Upstash with Firestore rate limiting

**[REASONING]** · **Do this first** — later tasks touch the same file

**Attach:** `src/lib/ratelimit.ts`, `src/lib/ratelimit.test.ts`, `src/app/api/scan/route.ts`, `src/app/api/scan/verify-passcode/route.ts`, `src/app/api/public/lookup/route.ts`, `src/app/api/public/status/[registrantId]/route.ts`, `src/app/api/public/ticket/[registrantId]/route.ts`, `firestore.rules`

```
Remove the Upstash Redis dependency and reimplement rate limiting on Firestore, which
this app already has credentials for. Rationale: one less vendor account per customer,
one less thing to explain, one less thing that breaks. Traffic here is hundreds of
users per event, not millions.

STEP 1 — narrow the surface. Rate limiters are currently on five endpoints. Keep two.

  KEEP  verify-passcode  → brute-force protection. Low volume.
  KEEP  public/lookup    → phone-number enumeration. Low volume.

  REMOVE from api/scan/route.ts — the endpoint is already authenticated by passcode or
    Firebase token, and the 60/min-per-IP limit actively breaks the gate: every usher
    on venue WiFi shares one public IP, so the whole door shared a single 60/min
    ceiling. Delete the limiter and its import from this file.

  REMOVE from public/status and public/ticket — both require a specific UUID, return
    no PII, and set no-store. A per-ID route is not enumerable the way a collection
    read is, so UUID-as-secret is acceptable here (it was NOT acceptable as a
    collection read rule, which is a different thing). Excess polling is addressed in
    T2-8 instead.

STEP 2 — rewrite src/lib/ratelimit.ts on Firestore. Keep the exported signatures
IDENTICAL so callers do not change and Upstash stays swappable later:

    export function getLimiter(name: string, requests: number, windowMs: number): Limiter
    export async function limitByIp(request: NextRequest, limiter: Limiter): Promise<Response | null>
    export async function limitByKey(key: string, limiter: Limiter): Promise<Response | null>

  Note the third parameter changes from a duration string ('15 m') to windowMs
  (number). Update both call sites.

  Implementation:
  - Collection `rateLimits`. Document ID: `${name}__${sanitizedKey}__${bucket}`
    where bucket = Math.floor(Date.now() / windowMs).
    CRITICAL: bucket the key by time window. Writing to one document per IP would hit
    Firestore's ~1 write/second per-document soft limit under load; a fresh document
    each window spreads the writes and self-expires.
  - sanitizedKey: strip anything outside [A-Za-z0-9.:_-] and cap at 100 chars.
    Firestore document IDs cannot contain / and must stay under 1500 bytes.
  - Use a transaction: get the doc, read `count`, and either create it with count 1
    or update with count + 1. Return { success, remaining, reset }.
  - Also write `expiresAt` = Timestamp of (bucket + 1) * windowMs + 60s, for TTL.
  - limitByIp derives the IP from the x-forwarded-for header (first entry), falling
    back to 'unknown'.
  - On limit exceeded return a 429 NextResponse with
    { error: 'Too many requests', messageAr: 'محاولات كثيرة، برجاء المحاولة بعد قليل' }
    and a Retry-After header in seconds.
  - FAIL CLOSED on a Firestore error: log it and return the 429. A rate limiter that
    silently disables itself when the database hiccups is worse than none, because you
    will not notice.

STEP 3 — firestore.rules: add
    match /rateLimits/{docId} { allow read, write: if false; }
  Server-side Admin SDK bypasses rules; this blocks all client access.

STEP 4 — tighten the lookup limits. They currently ship far looser than intended:
    lookupIpLimiter    30 per 15 min  →  3 per 15 min
    lookupPhoneLimiter 15 per 15 min  →  3 per 60 min
  30 per 15 min is ~2,880 enumeration probes per day per IP, and IPs are cheap.

STEP 5 — remove the dependency:
    npm uninstall @upstash/ratelimit @upstash/redis
  Remove UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from every env template.

STEP 6 — rewrite src/lib/ratelimit.test.ts against a mocked Firestore:
  - first request under the limit → allowed, null returned
  - request at exactly the limit → allowed
  - request one over the limit → 429 with a Retry-After header
  - a different IP is tracked independently
  - a different bucket (time advanced past the window) resets the count
  - a Firestore throw → 429, not a pass-through
  - key sanitization strips a / from an IPv6-ish or spoofed header value
```

**GATE T2-1**
```bash
grep -rn "upstash\|UPSTASH" src/ package.json    # NOTHING
npx vitest run && npx tsc --noEmit && npx next build
```
Manual, with the dev server running:
```bash
# 4th lookup within 15 minutes:
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "%{http_code} " -X POST localhost:3000/api/public/lookup \
    -H 'Content-Type: application/json' -d '{"phone":"01000000001"}'
done; echo
# EXPECT: 404 404 404 429   (or 200 200 200 429 once T2-2 lands)

# 6th passcode attempt:
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code} " -X POST localhost:3000/api/scan/verify-passcode \
    -H 'Content-Type: application/json' -d '{"passcode":"WRONG"}'
done; echo
# EXPECT: 401 401 401 401 401 429
```
Then in Firebase Console → Firestore → check the `rateLimits` collection has documents with bucketed IDs and an `expiresAt` field.

**Afterwards, set a TTL policy** (Firestore → TTL → collection `rateLimits`, field `expiresAt`) so old documents self-delete. Without it they accumulate forever. This is a console setting, not code.

```bash
git commit -am "T2-1: Firestore rate limiting, remove Upstash"
```

---

## T2-2 · Fix lookup enumeration

**[REASONING]**

**Attach:** `src/app/api/public/lookup/route.ts`, `src/app/api/public/lookup/route.test.ts`, `src/app/ticket/lookup/page.tsx`

```
The lookup route declares an anti-enumeration constant on line ~19 and never uses it:

    const ANTI_ENUMERATION_MESSAGE = 'لو الرقم مسجّل عندنا، هيوصلك رابط التذكرة على الواتساب خلال دقائق.';

Actual behaviour:
    unregistered phone → 404 + 'عفواً، هذا الرقم غير مسجّل لدينا...'
    registered phone   → 200 + registrantId + 'تم العثور على حسابك بنجاح!'

That is a membership oracle. Egyptian mobiles are 01[0125] + 8 digits, so the space is
enumerable. Worse, the 200 response RETURNS registrantId, which is the key to reading
that person's full record.

1. Return an IDENTICAL response in both cases: HTTP 200, byte-for-byte the same JSON
   body, using ANTI_ENUMERATION_MESSAGE. Do NOT include registrantId, success, or any
   field that differs between the two paths. Do not vary on the WhatsApp send result
   either — a send failure must still return the same body.

2. Log the found/not-found outcome server-side only (console.log is fine).

3. Keep the WhatsApp send for the registered case, wrapped in try/catch so a provider
   failure cannot change the response.

4. src/app/ticket/lookup/page.tsx — the UI must now show the same confirmation message
   regardless. Remove any branch that renders a "not registered" state. Keep the
   client-side format validation for UX.

5. The two existing tests currently ASSERT the leak:
       'returns 404 when phone is not registered'
       'returns 200 and registrantId when phone exists'
   Invert them. The replacement test must assert that the two responses are identical:
   compare status codes AND the serialized bodies.

Note in a comment that OTP verification is the stronger long-term control; sending the
link to the registered WhatsApp number removes the direct leak by requiring possession
of the phone.
```

**GATE T2-2**
```bash
npx vitest run
# Registered vs unregistered must be indistinguishable:
curl -s -X POST localhost:3000/api/public/lookup -H 'Content-Type: application/json' \
  -d '{"phone":"<REGISTERED>"}' > /tmp/a.json
curl -s -X POST localhost:3000/api/public/lookup -H 'Content-Type: application/json' \
  -d '{"phone":"01000000000"}' > /tmp/b.json
diff /tmp/a.json /tmp/b.json && echo "IDENTICAL ✓"
```
Plus: the WhatsApp message must actually arrive for the registered number.

```bash
git commit -am "T2-2: lookup anti-enumeration"
```

---

## T2-3 · Server-side registration

**[REASONING]** · Required before rules can be locked

**Attach:** `src/app/register/page.tsx`, `src/lib/validation.ts`, `src/lib/types.ts`, `firestore.rules`, `src/lib/firebase/storage.ts`

```
Registration writes straight from the browser to Firestore. All validation runs only
in the browser, so anyone with the public Firebase config — which necessarily ships in
every bundle — can POST arbitrary registrant documents, bypassing every UI check.

Move the write behind a validated, rate-limited API route.

1. npm i zod

2. Create src/lib/schemas/registration.ts:
   registrationSchema with fullName (2–100, trimmed), church (2–120, trimmed),
   phoneNumber and whatsappNumber (both refined with isValidEgyptianPhone after
   normalizePhone), selfReportedReference (isValidTransferReference),
   selfReportedAmount (positive number). Export the inferred type and reuse it on the
   client so validation stays in sync.

3. Create src/app/api/register/route.ts (POST, multipart/form-data):
   - Rate limit: 3 registrations per hour per IP via limitByIp.
   - Parse and validate with registrationSchema. On failure return 400 with the
     matching Arabic message from VALIDATION_MESSAGES — reuse the existing constants,
     do not write new copy.
   - Validate the uploaded file: max 5 MB, and SNIFF THE MAGIC BYTES to confirm a real
     JPEG/PNG/WebP. Never trust the client-supplied Content-Type.
        JPEG FF D8 FF · PNG 89 50 4E 47 · WebP "RIFF"…"WEBP"
   - Generate registrantId server-side with crypto.randomUUID(). Ignore any
     client-supplied id.
   - Run the registrant + phoneIndex write in ONE Admin SDK transaction, mirroring the
     current duplicate-phone semantics (throw DUPLICATE_PHONE → 409 with
     VALIDATION_MESSAGES.duplicatePhone).
   - Force server-side: status 'pending_verification', adminNotes null, verifiedAt
     null, createdAt serverTimestamp. Never accept these from the client.
   - Return { registrantId }.

4. Rewrite handleSubmit in src/app/register/page.tsx:
   - Build FormData and POST to /api/register.
   - Remove the runTransaction / doc / serverTimestamp / uuid imports.
   - Keep the upload progress UX working — use XMLHttpRequest's upload.onprogress, or
     show an indeterminate state. Do not silently drop the progress bar.
   - Preserve every Arabic string, the 4-step wizard, and the DUPLICATE_PHONE →
     "jump back to step 2" behaviour.

5. firestore.rules:
     registrants: allow create: if false;
     phoneIndex:  allow create: if false;
   Both are now server-write-only. This also closes the denial-of-registration hole
   where anyone could pre-create phoneIndex/{number} to permanently block a specific
   person from registering.
```

**GATE T2-3**
```bash
npx tsc --noEmit && npx next build
curl -s -X POST localhost:3000/api/register -F 'phoneNumber=123' -F 'fullName=x' | head -c 200
# EXPECT 400 with the Arabic phone message
```
Manual: a full browser registration still succeeds end to end. Then in the browser console, attempt a direct client-SDK write to `registrants` → `permission-denied`.

```bash
git commit -am "T2-3: server-side registration"
```

---

## T2-4 · Receipts to Storage

**[REASONING]**

**Attach:** `src/lib/firebase/storage.ts`, `src/app/api/register/route.ts`, `src/lib/types.ts`, `src/app/admin/review/page.tsx`, `src/app/admin/registrants/page.tsx`, `storage.rules`

```
src/lib/firebase/storage.ts compresses the receipt client-side and returns a base64
data URI stored INSIDE the registrant document. Costs: +33% payload from base64; a
hard 1 MiB Firestore document ceiling; ~2 MB per admin list page; ~80 KB read on every
status poll; and Firestore billed as a blob store.

1. In src/app/api/register/route.ts, upload the validated image buffer to Firebase
   Storage at `screenshots/{registrantId}/{timestamp}.{ext}` via the Admin SDK. Store
   only the PATH in a new field `paymentScreenshotPath`. Do NOT call makePublic().

2. Keep the client-side compression in storage.ts — it saves upload bandwidth — but
   return a Blob/File instead of a data URL. FIX the fallback: if
   canvas.getContext('2d') returns null, REJECT with the Arabic error rather than
   resolving the raw uncompressed file (which would blow the document limit).

3. Create src/app/api/admin/receipt/[registrantId]/route.ts (GET, requireAdmin):
   returns a 15-minute signed URL via getSignedUrl.

4. Update the admin render sites to fetch the signed URL from that route. Keep
   safeImageSrc applied to the result.

5. storage.rules — screenshots/ and tickets/ readable only by
   request.auth.token.role in ['admin','usher']; writes false (server only).

6. Create scripts/migrate-receipts.js (--dry-run by default, --commit to write):
   page through registrants where paymentScreenshotUrl starts with 'data:', decode,
   upload to Storage, set paymentScreenshotPath, null out paymentScreenshotUrl.
   Per-document error isolation. Idempotent. Print scanned/migrated/failed.

7. src/lib/types.ts: add paymentScreenshotPath: string | null; mark
   paymentScreenshotUrl deprecated-legacy.
```

**GATE T2-4**
```bash
npx next build
node --env-file=.env.local scripts/migrate-receipts.js            # dry run
node --env-file=.env.local scripts/migrate-receipts.js --commit
```
Manual: a new registration produces a document with `paymentScreenshotPath` and **no `data:` blob**. Admin review displays both a migrated and a new receipt.

```bash
git commit -am "T2-4: receipts to Storage"
```

---

## T2-5 · Admin privilege escalation

**[REASONING]**

**Attach:** `src/app/api/admin/admins/route.ts`, `src/lib/auth/guards.ts`, `src/lib/auth/context.tsx`

```
src/app/api/admin/admins/route.ts line ~94 lets any admin overwrite the password of an
EXISTING Firebase Auth user, including the primary admin:
    await auth.updateUser(uid, { password });
The DELETE handler protects PRIMARY_ADMIN_EMAIL (line ~147); POST does not.

1. POST — never set a password on a pre-existing account:
   - If getUserByEmail succeeds, set the custom claim ONLY. If a password was
     supplied, ignore it and instead return a link from
     auth.generatePasswordResetLink(email) for the admin to forward.
   - Keep the create-new-user path (createUser + password) for accounts that do not
     exist, but raise the minimum password length to 12.
   - Reject any POST where normalizedEmail === PRIMARY_ADMIN_EMAIL with 403 and
     'لا يمكن تعديل حساب الأدمن الرئيسي من هنا'.
   - Reject self-targeting (normalizedEmail === authResult.email) with 403.

2. DELETE — after clearing claims, call auth.revokeRefreshTokens(user.uid). Without
   it, a removed admin's ID token stays valid for up to an hour.

3. Move PRIMARY_ADMIN_EMAIL out of source. It is currently hardcoded in two places:
       src/lib/auth/guards.ts:5    export const PRIMARY_ADMIN_EMAIL = '...'
       src/lib/auth/context.tsx:46 if (email === '...') return 'admin'
   guards.ts reads process.env.PRIMARY_ADMIN_EMAIL (throw if unset).
   context.tsx reads process.env.NEXT_PUBLIC_PRIMARY_ADMIN_EMAIL.
   This is REQUIRED for the template — a hardcoded personal email cannot ship to
   customers.

4. Replace the empty catch {} in isEmailAdmin (guards.ts) so Firestore failures are
   logged rather than silently returning false.
```

**GATE T2-5**
```bash
grep -rn "@gmail.com\|@hotmail\|@outlook" src/    # NOTHING — no personal emails in source
npx next build
# As a secondary admin:
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/admin/admins \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"<PRIMARY_ADMIN_EMAIL>","password":"hijacked12345"}'   # EXPECT 403
```
Adding a genuinely new admin must still work.

```bash
git commit -am "T2-5: admin privilege escalation"
```

---

## T2-6 · WhatsApp bot auth and timeouts

**[FAST]**

**Attach:** `scripts/whatsapp-bot.js`, `src/lib/whatsapp/api.ts`

```
scripts/whatsapp-bot.js exposes POST /send-ticket with no authentication, no CORS
policy, and no rate limit, bound to all interfaces. Anyone who reaches the host can
send arbitrary WhatsApp messages from the customer's own account — a phishing platform
with a trusted sender, and a fast route to a WhatsApp ban.

1. scripts/whatsapp-bot.js:
   - Require `Authorization: Bearer ${process.env.WHATSAPP_BOT_TOKEN}` on /send-ticket.
     EXIT AT STARTUP with a clear error if WHATSAPP_BOT_TOKEN is unset — never start
     an unprotected server.
   - Compare with crypto.timingSafeEqual (length-guard first).
   - Bind to process.env.BIND_HOST || '127.0.0.1' instead of all interfaces.
   - In-memory rate limiter: 20 sends/minute globally, 3/hour per destination number.
     In-memory is correct here — this is a single long-lived process, unlike the
     serverless routes.
   - Validate `phone` matches ^20[0-9]{10}$ after normalisation; reject otherwise.
   - Cap `message` at 1000 characters.

2. src/lib/whatsapp/api.ts — the generic webhook branch must send:
     'Authorization': `Bearer ${process.env.WHATSAPP_BOT_TOKEN}`

3. Add a 10-second AbortController timeout to ALL THREE fetch calls in
   src/lib/whatsapp/api.ts (Green API, UltraMsg, webhook). An unreachable provider
   currently hangs the approve request indefinitely.
```

**GATE T2-6**
```bash
node scripts/whatsapp-bot.js          # with token unset → must refuse to start
# with it set, from another shell:
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3001/send-ticket \
  -H 'Content-Type: application/json' -d '{"phone":"201000000000","message":"t"}'   # 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3001/send-ticket \
  -H "Authorization: Bearer $WHATSAPP_BOT_TOKEN" \
  -H 'Content-Type: application/json' -d '{"phone":"<YOURS>","message":"t"}'        # 200
grep -c "AbortController" src/lib/whatsapp/api.ts    # expect 3
git commit -am "T2-6: WhatsApp bot auth and timeouts"
```

---

## T2-7 · Firebase App Check

**[REASONING]**

**Attach:** `src/lib/firebase/client.ts`, `src/app/layout.tsx`

```
There is no bot protection. Add App Check with reCAPTCHA v3.

1. In src/lib/firebase/client.ts, after initializeApp and INSIDE the
   isFirebaseConfigured branch, initialise App Check with ReCaptchaV3Provider using
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY, isTokenAutoRefreshEnabled: true.
   - Guard with `typeof window !== 'undefined'` — App Check must not run during SSR or
     the build's static generation pass, or the build fails.
   - If NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing, log a clear console warning and
     SKIP initialisation rather than throwing, so local dev without a key still runs.
   - Debug token: when NEXT_PUBLIC_APPCHECK_DEBUG === 'true', set
     self.FIREBASE_APPCHECK_DEBUG_TOKEN = true BEFORE initialisation.

2. In src/app/api/register/route.ts, verify the App Check token from the
   X-Firebase-AppCheck header using getAppCheck().verifyToken() from
   firebase-admin/app-check. Reject with 401 on failure. Skip the check when
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY is unset so local dev works.
   Send the token from the client in the registration fetch.
```

**GATE T2-7**
```bash
npx next build     # must not fail during static generation — proves the window guard
git commit -am "T2-7: Firebase App Check"
```

**Deployment order is load-bearing.** Deploy this client change to production **first**, confirm App Check metrics show verified requests, and only **then** switch Firestore and Storage to *Enforced* in the console. Enforce before the client change is live and every browser's Firestore call fails at once — it presents as a total outage, not a config error.

---

## T2-8 · Lock Firestore and Storage rules

**[REASONING]** · **Highest blast radius in the plan** · Depends on T2-1 → T2-7

> ### ⛔ MANDATORY PRE-STEP — do this before running the prompt
>
> The primary admin is admin *by hardcoded email* and probably has **no `role` custom claim**. Role-based rules would lock every admin out instantly.
>
> ```bash
> node --env-file=.env.local scripts/set-admin-role.js <your-admin-email> admin
> # repeat for every other admin, and for each usher:
> node --env-file=.env.local scripts/set-admin-role.js <usher-email> usher
> ```
>
> Then **sign out and back in** in the admin UI — custom claims are baked into the ID token at issue time and an existing session keeps the old token for up to an hour.
>
> Verify in the browser console before proceeding:
> ```js
> (await firebase.auth().currentUser.getIdTokenResult()).claims.role   // 'admin'
> ```

**Attach:** `firestore.rules`, `storage.rules`

```
Rewrite firestore.rules and storage.rules to remove all public read access. Public read
paths now go through server routes, and writes go through /api/register, so nothing
legitimate depends on client reads of registrants, tickets, or phoneIndex.

firestore.rules:

  registrants/{id}
    - read: ONLY request.auth != null && request.auth.token.role in ['admin','usher'].
      REMOVE `allow read: if true`. This currently exposes every registrant's name,
      both phone numbers, church, admin notes, and payment receipt to anyone on the
      internet.
    - create, update, delete: false (server-only via /api/register)

  phoneIndex/{phone}
    - read: false   (was `if true` — a phone-number enumeration oracle)
    - create, update, delete: false

  tickets/{id}
    - read: ONLY role in ['admin','usher']. REMOVE `allow read: if true`.
      CRITICAL: the ticket document stores `qrToken` — a VALID SIGNED TOKEN. A public
      read rule means an attacker does not need to forge a signature; they list the
      collection, read a working token, render it as a QR, and walk in. The HMAC
      hardening is worthless until this is closed. The "unguessable UUID" comment is
      wrong for a collection read rule.
    - write: false

  rateLimits/{docId}
    - read, write: false   (from T2-1)

  bankTransactions/{ref}
    - read, write: role == 'admin'   (unchanged)

  staff/{authUid}
    - read: request.auth.uid == authUid; write: false   (unchanged)

  admins/{email}
    - There is currently NO rule, so it defaults to deny — but
      src/lib/auth/context.tsx getUserRole() calls getDoc(db,'admins',email) from the
      client, which therefore ALWAYS fails for non-primary admins. Add:
        allow read: if request.auth != null
                    && request.auth.token.email.lower() == email;
        allow write: if false;
      This fixes a real latent bug where secondary admins could never resolve a role.

storage.rules:
  screenshots/{registrantId}/{fileName}
    - read: role in ['admin','usher'];  write: false   (server-only after T2-4)
  tickets/{registrantId}/{fileName}
    - read: role in ['admin','usher'];  write: false
  Catch-all deny: unchanged.

THEN add rules tests:
  npm i -D @firebase/rules-unit-testing
  Create tests/firestore.rules.test.ts run under vitest against the emulator:
    - anonymous LIST of registrants     → DENIED  (the headline vulnerability)
    - anonymous GET of a registrant     → DENIED
    - anonymous GET of phoneIndex/<p>   → DENIED
    - anonymous LIST of tickets         → DENIED  (the qrToken exposure)
    - anonymous GET of tickets/<id>     → DENIED
    - anonymous CREATE of a registrant  → DENIED  (server-only now)
    - admin-claim LIST of registrants   → ALLOWED
    - usher-claim GET of tickets/<id>   → ALLOWED
    - admin reading admins/<own-email>  → ALLOWED
    - admin reading admins/<other>      → DENIED
  Add "test:rules": "firebase emulators:exec --only firestore 'vitest run tests/'"
```

**GATE T2-8**
```bash
npm run test:rules       # every case passes, especially the anonymous LISTs
firebase deploy --only firestore:rules,storage:rules
```

Then in a **logged-out incognito window**, open the browser console on the deployed site and attempt a raw collection read of `registrants`. It must fail with `permission-denied`.

Then walk every flow — this is where a missing custom claim shows up:

- [ ] `/` loads
- [ ] `/register` completes end to end
- [ ] `/status/<id>` shows status
- [ ] `/ticket/<id>` shows the QR, download works
- [ ] `/ticket/lookup` sends the WhatsApp link
- [ ] `/admin` dashboard counts render ← **claim check**
- [ ] `/admin/review` lists and shows receipts
- [ ] `/admin/registrants` lists and paginates
- [ ] `/admin/scanned` gate attendance board loads
- [ ] `/scan` scans a real ticket successfully

**If the admin dashboard is empty, the claim pre-step was not done. Go back and redo it — do not loosen the rule.**

```bash
git commit -am "T2-8: lock Firestore and Storage rules"
```

---

## T2-9 · Correctness and hygiene

**[FAST]**

**Attach:** `src/app/api/admin/import/route.ts`, `src/app/api/admin/reconcile/route.ts`, `src/app/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/status/[registrantId]/page.tsx`, `src/lib/auth/guards.ts`

```
Six independent fixes.

1. CSV import batch limit — src/app/api/admin/import/route.ts builds ONE db.batch()
   over every row. Firestore's hard limit is 500 operations, so a bank statement with
   501 rows throws and imports NOTHING. Commit in chunks of 450, awaiting each. Apply
   to both the csvText and entries branches. Return
   { importedCount, failedCount, totalRows, errors: [{ row, reason }] }. Cap total rows
   at 5000 with a clear Arabic error above that.

2. Same file, line ~55 — a dead branch:
       transactionDate: transactionDate ? FieldValue.serverTimestamp()
                                        : FieldValue.serverTimestamp()
   Both arms are identical, so the parsed CSV date is discarded and every transaction
   gets the import time. Parse the date string into a real Timestamp (handle
   DD/MM/YYYY and YYYY-MM-DD; fall back to serverTimestamp with a warning in the
   response when unparseable).

3. Reconciliation timeout — src/app/api/admin/reconcile/route.ts runs an unbounded
   .get() then processes sequentially with awaits inside the loop. Add
   `export const maxDuration = 60`, page with .limit(100) + startAfter, process each
   page with bounded concurrency of 5, stop cleanly at 50 seconds and return
   { done: false, cursor } so the caller can resume.

4. AuthProvider placement — src/app/layout.tsx wraps everything in <AuthProvider>,
   which imports firebase/auth and firebase/firestore. That is a ~198 KB gzipped chunk
   on the landing page, which never authenticates. Move <AuthProvider> to
   src/app/admin/layout.tsx. Check whether /scan needs it; if it only uses the
   passcode path, leave it outside. Verify no public page calls useAuth().

5. Status poll interval — src/app/status/[registrantId]/page.tsx line ~147 polls every
   15000 ms. Each poll is a function invocation plus a full registrant document read.
   Change to 60000 ms and PAUSE polling when document.visibilityState !== 'visible',
   resuming on focus. This is a 4x+ reduction in Firestore reads for zero UX loss on a
   page that changes state maybe twice.

6. Redundant Firestore read — src/lib/auth/guards.ts requireRole() computes
   isAdminByEmail BEFORE checking whether the custom claim already answers the
   question, causing a Firestore read on EVERY authenticated API request. Reorder:
   if decodedToken.role satisfies the requirement, return immediately; only fall back
   to isEmailAdmin when the claim is absent.
```

**GATE T2-9**
```bash
python3 -c "
print('reference,amount,sender,date')
for i in range(600): print(f'REF{i:06d},150,Test,2026-07-01')
" > /tmp/big.csv
```
- Import `/tmp/big.csv` → **all 600 rows import**, and `transactionDate` is 2026-07-01, not today.
- `rm -rf .next && npx next build` → the ~198 KB gz Firebase chunk is no longer in the shared/root chunk.
- Load `/` in DevTools → Network → JS: roughly 200 KB gz lower than before.
- Both an admin with a custom claim **and** an admin whose access comes only from the `admins` collection still authenticate.

```bash
git commit -am "T2-9: correctness and hygiene"
```

---

## T2-10 · Lint, tests, CI

**[FAST]**

```
`npx eslint .` reports 61 problems (23 no-require-imports, 12 no-explicit-any,
8 unused-vars, 7 set-state-in-effect, 3 prefer-const, others). npm run lint therefore
exits non-zero, so CI would be red on day one.

1. scripts/*.js are legitimately CommonJS Node scripts. Add a scoped override in
   eslint.config.mjs disabling @typescript-eslint/no-require-imports for
   'scripts/**/*.js' rather than rewriting them to ESM.
2. The 12 no-explicit-any are in newer code (useScannedTickets.ts, admin/scanned).
   Give them real types. Do not add eslint-disable; `strict: true` is a selling point
   of this template.
3. react-hooks/set-state-in-effect — fix at source, do not disable. In
   src/lib/auth/context.tsx the `if (!isFirebaseConfigured) setLoading(false)` should
   be lazy initial state, not an effect. Review each of the 7 individually.
4. prefer-const and unused-vars — `npx eslint . --fix`, then review the diff.
5. no-img-element — the remaining <img> tags are data-URI receipts and QR codes that
   next/image cannot optimise. Add a targeted eslint-disable-next-line WITH a comment
   at each site. Do not blanket-disable.
6. Create .github/workflows/ci.yml: on push and pull_request, Node 20, npm ci, then
   npm run typecheck, npm run lint, npm run test, npx next build. No secrets needed —
   the build tolerates missing env vars.
```

**GATE T2-10**
```bash
npx eslint .        # 0 errors, 0 warnings
npx tsc --noEmit && npx vitest run && npx next build
git push            # GitHub Actions must go green
```

---

## 🚦 PHASE 2 EXIT GATE

```bash
npx tsc --noEmit && npx eslint . && npx vitest run && npm run test:rules && npx next build
grep -rn "allow read: if true\|allow create: if true" firestore.rules storage.rules   # NOTHING
grep -rn "upstash\|UPSTASH\|ocr\|gemini" src/ package.json                            # NOTHING
grep -rn "@gmail.com" src/                                                            # NOTHING
```

**Adversarial checks — try to break it yourself:**

| # | Attack | Expected |
|---|---|---|
| 1 | Logged out, client-SDK list of `registrants` | `permission-denied` |
| 2 | Logged out, client-SDK list of `tickets` | `permission-denied` |
| 3 | Scan a QR containing a bare registrant UUID | `tampered` |
| 4 | Scan a QR with a 1-char signature (`<id>.a`) | `tampered` |
| 5 | Direct client write to `registrants` | `permission-denied` |
| 6 | `POST /api/register` with `phoneNumber: "123"` | 400, Arabic message |
| 7 | 4 lookups in 15 min | 4th → 429 |
| 8 | Lookup registered vs unregistered | byte-identical responses |
| 9 | Secondary admin POSTs the primary admin's email | 403 |
| 10 | `POST /send-ticket` with no bearer token | 401 |

Then re-run the 10-flow walkthrough from T2-8.

```bash
git tag phase-2-secure && git push --tags
```

---

# PHASE 3 — Theming

Measured in the current codebase:

| | Count |
|---|---|
| Hardcoded colours | **656** |
| Inline `style={{}}` objects | **494** |

**Inline styles cannot be themed by CSS variables.** Every one of those colours must become `var(--token)` or there is no palette switching at all. This is the central task of the whole conversion.

```bash
git checkout -b template/phase-3-theming
```

## T3-1 · Theme config and CSS variable layer

**[REASONING]** — establishes the pattern everything else follows

**Attach:** `src/app/globals.css`, `src/app/layout.tsx`

```
Build the theming foundation. Do not convert components yet.

1. Create config/themes/gold-dark.ts:

   export const theme = {
     brandPrimary:   '#c9a227',   // gold — buttons, accents, highlights
     brandSecondary: '#1f6f4a',
     surfaceDark:    '#130c05',
     surfaceGlass:   'rgba(255,255,255,0.06)',
     borderSubtle:   'rgba(255,255,255,0.12)',
     textPrimary:    '#f7f0e4',
     textSecondary:  'rgba(255,255,255,0.78)',
     textMuted:      'rgba(255,255,255,0.72)',  // WCAG AA floor — never below 0.70
     danger:         '#e05252',
     success:        '#3fa877',
     bgOverlay:      0.70,        // background image dimming
     radius:         '1rem',
     fontFamily:     'Cairo',
   } as const;

   export type Theme = typeof theme;

   Derive the actual values from the CURRENT design so gold-dark reproduces today's
   look exactly. Read globals.css and the components to find the real values in use.

2. Create three more presets with the same shape and key set:
   config/themes/emerald.ts, royal-blue.ts, burgundy.ts

3. Create config/theme.config.ts that re-exports the selected preset:
     export { theme } from './themes/gold-dark';
     export type { Theme } from './themes/gold-dark';

4. In src/app/layout.tsx (a server component, so this is a static string with no
   client JS cost), inject the variables once on :root:
     <style dangerouslySetInnerHTML={{ __html: `:root{
       --brand-primary:${theme.brandPrimary};
       ... one line per token ...
       --bg-overlay:${theme.bgOverlay};
     }` }} />

5. Update src/app/globals.css:
   - the @theme block references var(--*) instead of literals
   - body background overlay uses var(--bg-overlay):
       linear-gradient(rgba(19,12,5,var(--bg-overlay)), rgba(19,12,5,var(--bg-overlay))), url('/bg.webp')
   - .glass-card, .form-input, .btn-* use the variables

6. Prove it: set brandPrimary to '#ff0000' and confirm every CSS-class-driven element
   turns red. Inline-styled elements will NOT change — that is expected and is what
   T3-2 fixes. Report which elements did not change.
```

**GATE T3-1**
```bash
npx next build
```
Manual: switch `theme.config.ts` between all four presets. CSS-class-driven elements must change. Screenshot each at 375px.

## T3-2 · Convert inline styles, file by file

**[FAST]** · **one file per commit**

Repeat this prompt for each file, replacing `<FILE>`:

```
Convert hardcoded colours in <FILE> to CSS variables from config/theme.config.ts.

Rules:
- Every colour literal (#hex, rgb, rgba) representing a THEME colour becomes
  var(--token). Map to the closest existing token; if none fits, ADD a token to all
  four presets rather than hardcoding.
- Leave alone: pure black/white overlays used for shadows.
- CANVAS CODE IS DIFFERENT. Canvas cannot read CSS variables. In files that draw to
  canvas, import the theme object directly and use theme.brandPrimary etc.
- Where an inline style is pure layout (flex, padding, gap), leave it. Only colours
  move in this task.
- Preserve the exact visual result.
- Do not touch Arabic strings — that is Phase 4.
```

Order — smallest first to establish the pattern:

1. `src/components/Header.tsx`
2. `src/app/page.tsx`
3. `src/components/PaymentInstructionsModal.tsx`
4. `src/components/ui/ImageLightboxModal.tsx`
5. `src/app/register/page.tsx`
6. `src/app/admin/layout.tsx` — 322 lines, mostly styling
7. `src/app/admin/review/page.tsx`
8. `src/app/admin/registrants/page.tsx`
9. `src/app/admin/scanned/page.tsx`
10. `src/app/admin/page.tsx`
11. `src/app/scan/page.tsx`
12. `src/app/ticket/[registrantId]/page.tsx` — **canvas ticket rendering: import the theme object**
13. `src/app/status/[registrantId]/page.tsx`
14. `src/app/ticket/lookup/page.tsx`
15. `src/app/admin/login/page.tsx`, `src/app/admin/admins/page.tsx`, `src/app/admin/import/page.tsx`

**GATE T3-2 (per file)**
```bash
grep -cE "#[0-9a-fA-F]{6}|rgba?\([0-9]" <file>   # trending to 0
npx next build
```
Visual check at 375px and 1440px after each file, then switch to a different preset and confirm that file changes with it.

Track globally:
```bash
grep -rohE "#[0-9a-fA-F]{6}|rgba?\([0-9]+," src/ | wc -l   # from 656 → near 0
```

## T3-3 · Accessibility and rendering polish

**[FAST]**

```
1. src/app/layout.tsx viewport sets maximumScale: 1, disabling pinch-zoom on iOS — a
   WCAG 2.1 SC 1.4.4 failure. This matters concretely: the audience includes older
   attendees and the app displays QR codes and small Arabic text. Inputs are already
   17px so the usual justification does not apply. DELETE maximumScale.

2. Muted text contrast: rgba(255,255,255,0.45) appears 8 times, 0.5 five times, 0.4
   four times, 0.3 twice — often at 13px. Against the glass-card backdrop, 0.45 is
   roughly 3.9:1, below the 4.5:1 AA minimum. After T3-2 these are tokens, so simply
   ensure textMuted is at least 0.70 in all four presets and that no component uses a
   lower alpha for TEXT (borders and fills are fine).

3. Raise .form-input::placeholder from 0.4 to 0.65.

4. Add a prefers-reduced-motion block disabling .bg-orb animations and .fade-in /
   .page-enter transitions.

5. body { background-attachment: fixed } is a scroll-jank source on mobile Safari and
   is ignored on iOS. Scope it to @media (min-width: 768px) and (hover: hover).

6. .glass-card uses backdrop-filter: blur(16px), a GPU pass per card per frame; the
   admin lists stack dozens. Reduce to blur(8px) and add a @media (max-width: 640px)
   override dropping backdrop-filter for a slightly more opaque solid background.

7. Validation errors are plain <p>. Add role="alert". Link inputs to errors with
   aria-invalid and aria-describedby.

8. Scanner results: wrap the result panel in aria-live="assertive" aria-atomic="true"
   so ushers using assistive tech hear scan outcomes. Admin toasts: aria-live="polite".

9. Add a manual code-entry fallback to /scan — a text input submitting the same token
   to /api/scan. Needed when camera permission is denied at the door.
```

**GATE T3-3**
```bash
grep -rn "maximumScale" src/     # nothing
npx next build
```
- Lighthouse Accessibility ≥ 95 on `/`, `/register`, `/admin/review`
- Pinch-zoom works on a real iPhone
- Full keyboard pass through registration

```bash
git commit -am "T3-3: accessibility and rendering polish"
```

---

# PHASE 4 — Editable copy

**2,209 hardcoded Arabic strings.**

```bash
git checkout -b template/phase-4-copy
```

## T4-1 · Copy dictionary

**[REASONING]** for the structure, **[FAST]** for the extraction

```
1. Create config/copy.ar.ts — a nested const object grouping every user-facing string:

     export const copy = {
       common:   { next, back, submit, loading, error, close, confirm, cancel },
       home:     { heroTitle, heroSubtitle, ctaRegister, ... },
       register: { step1Title, fullNameLabel, phoneLabel, ... },
       payment:  { instructionsTitle, methodInstapay, referenceLabel, ... },
       status:   { pending, manualReview, approved, rejected, ... },
       ticket:   { downloadButton, notApprovedYet, lookupPrompt, ... },
       scan:     { ready, success, alreadyUsed, tampered, unauthorized, ... },
       admin:    { navReview, navRegistrants, navScanned, ... },
       whatsapp: { ticketMessage },
       errors:   { ... },
     } as const;

2. Import VALIDATION_MESSAGES from src/lib/validation.ts into copy.ar.ts under
   `errors` so a customer edits text in ONE place. Keep validation.ts exporting the
   same names so nothing breaks.

3. Extract file by file, same order as T3-2, replacing literals with
   copy.<area>.<key>. ONE FILE PER COMMIT.

4. Strings containing values become functions — never inline a number:
     ticketPrice: (amount: number) => `سعر التذكرة ${amount} جنيه`

5. PRESERVE EXACTLY: the ✓ character in the WhatsApp message template (chosen
   deliberately to avoid a WhatsApp symbol-corruption bug), and all RTL punctuation.

6. Do NOT translate anything or "improve" any wording. Move strings verbatim.
```

**GATE T4-1**
```bash
grep -rohE "'[^']*[\u0600-\u06FF][^']*'" src/ | wc -l   # from 2,209 → near 0
npx next build
```
Manual: walk every page and confirm the Arabic is character-for-character unchanged. Approve a registrant and check the WhatsApp message, `✓` included.

---

# PHASE 5 — Config layer

```bash
git checkout -b template/phase-5-config
```

## T5-1 · Event, fields, and feature config

**[REASONING]**

**Attach:** `src/components/PaymentInstructionsModal.tsx`, `src/lib/types.ts`, `src/app/api/admin/reconcile/route.ts`, `src/app/register/page.tsx`

```
Create the remaining config files so everything a customer changes lives in /config.

1. config/event.config.ts:
     name, nameEn, organizer, startsAt, venue,
     ticketPrice, currency,
     payment: { method: 'instapay'|'vodafone-cash'|'bank'|'manual',
                phoneNumber, accountName, instapayLink, amountToleranceEgp },
     ticketUrlBase

   Replace the hardcoded literals currently at:
     - PaymentInstructionsModal.tsx: '01222572676' (~line 32), '400' (~201),
       the event name (~139), the displayed number (~290)
     - reconcile/route.ts: AMOUNT_TOLERANCE = 5
     - anywhere else the event name or price appears

2. config/fields.config.ts:
     groupLabel: string          // 'الكنيسة' → customer may use 'المدرسة'/'القسم'
     groupOptions: string[]      // replaces the placeholder list in types.ts
     requireTripleName: boolean  // currently hardcoded to require 3 words
     extraFields: [{ key, label, type: 'text'|'number'|'select', required, options? }]

   Render extraFields dynamically in the registration form and display them in admin
   review. Store them under a `custom` map on the registrant document so the schema
   stays stable. Validate them in registrationSchema.

   Remove the `// TODO: Replace with actual church list from the user` comment and its
   10 placeholder names from src/lib/types.ts.

3. config/features.config.ts:
     bankReconciliation, whatsappDelivery, qrCheckIn, gateAttendanceBoard  (booleans)

   Gate the relevant routes, nav items, and UI. When qrCheckIn is false, /scan and
   /admin/scanned must not render AND their API routes must return 404 — not merely
   hide the nav link.

4. Update firestore.rules if extraFields change the accepted document shape.
```

**GATE T5-1**
```bash
grep -rn "01222572676\|القرن العاشر\|AMOUNT_TOLERANCE = " src/    # nothing — all in /config
npx next build
```
Manual: change the event name, price, payment number, and group label in config → all four update everywhere. Set `qrCheckIn: false` → `/scan` 404s and the nav item disappears.

---

# PHASE 6 — Packaging

```bash
git checkout -b template/phase-6-packaging
```

## T6-1 · Customer generator script

**[REASONING]** — it handles credentials

```
Create scripts/new-customer.js — an interactive CLI (Node readline, ZERO dependencies)
that generates a fully configured instance for one customer.

MODES:
  node scripts/new-customer.js                      interactive
  node scripts/new-customer.js --save answers.json  interactive, save answers
  node scripts/new-customer.js --from answers.json  reproducible non-interactive re-run

The answers file contains NO secrets (they are always regenerated), so it is safe to
keep beside the customer repo for rebuilding config later.

PROMPTS, in six sections:
  1. Organization: org name, event name (ar), event name (en), organizer, startsAt
     (ISO, validated with Date.parse), venue, public URL (validated https://...)
  2. Payment: ticket price, currency, method (numbered choice of instapay /
     vodafone-cash / bank / manual), receiving phone, account name, InstaPay link,
     amount tolerance
  3. Form: group label, group options (comma-separated OR a path to a .txt file with
     one per line), requireTripleName (y/n)
  4. Look & features: theme preset (numbered choice of the four), then y/n for
     bankReconciliation, whatsappDelivery, qrCheckIn, gateAttendanceBoard
     (gateAttendanceBoard is skipped and forced false when qrCheckIn is false)
  5. Firebase: if serviceAccountKey.json exists in the repo root, PARSE IT for
     project_id / client_email / private_key and say so. Otherwise prompt for the
     three values. Then accept a MULTI-LINE PASTE of the firebaseConfig object
     (terminated by a line containing only ".") and regex out apiKey, authDomain,
     projectId, storageBucket, messagingSenderId, appId. Prompt individually for any
     that failed to parse. CROSS-CHECK the web projectId against the service account
     projectId and print a loud error if they differ — that mismatch produces an app
     where auth works but Admin SDK writes silently go to a different project.
     Then prompt for the reCAPTCHA v3 SITE key (optional).
  6. Admin: customer admin email (validated).

SECRETS — generated every run, never read from the answers file:
  TICKET_SECRET       crypto.randomBytes(32).toString('hex')
  WHATSAPP_BOT_TOKEN  crypto.randomBytes(24).toString('hex'), only if whatsappDelivery
  USHER_PASSCODE      10 chars from ABCDEFGHJKMNPQRSTUVWXYZ23456789, formatted
                      XXXXX-XXXXX. Ushers type this on a phone at a door in a queue —
                      hex is unusable there and ends up on a sticky note. Rate limiting
                      is the real defence. The alphabet excludes 0/O and 1/l/I.

WRITES:
  config/event.config.ts, config/theme.config.ts, config/fields.config.ts,
  config/features.config.ts   — generated TypeScript, properly escaped for quotes and
                                backslashes, valid Arabic preserved
  .env.local                  — every variable, grouped with comments, FIREBASE_PRIVATE_KEY
                                double-quoted with \n escaped
  HANDOVER.md                 — org, event, Firebase project, admin email, a table of
                                the generated secrets, the admin URL, the usher
                                passcode, and enabled features. Include a warning that
                                rotating TICKET_SECRET invalidates every issued QR.

SAFETY:
  - BEFORE writing anything, append .env.local, HANDOVER.md, and serviceAccountKey.json
    to .gitignore if not already present. Do not duplicate existing entries.
  - In interactive mode, ask before overwriting an existing file. In --from mode,
    overwrite silently (it is a deliberate re-run).
  - Never write a secret to a tracked file.

FINALLY print a numbered next-steps checklist:
  1. Drop brand assets into public/brand/
  2. node scripts/optimize-assets.js       # nothing over 200 KB
  3. firebase deploy --only firestore:rules,firestore:indexes,storage:rules
  4. node --env-file=.env.local scripts/set-admin-role.js <adminEmail> admin
  5. npm run dev                            # verify locally
  6. vercel link && node scripts/push-env-to-vercel.js
  7. vercel --prod
  8. Firebase Console → App Check → set Firestore + Storage to Enforced
  9. Firebase Console → Firestore → TTL policy on rateLimits.expiresAt
 10. Smoke test: register → reconcile → approve → WhatsApp → scan
 11. Store HANDOVER.md in a password manager, then delete it
 12. Customer removes your access from Firebase and Vercel
```

**GATE T6-1**
```bash
node scripts/new-customer.js --save answers.json   # run it fully
npx tsc --noEmit                                    # generated config compiles
cat config/event.config.ts                          # Arabic intact, values correct
grep -c "env.local" .gitignore                      # exactly 1
node scripts/new-customer.js --from answers.json    # re-run works, no prompts
grep -c "env.local" .gitignore                      # still exactly 1 — no duplication
```

## T6-2 · Documentation

**[FAST]**

```
Write three documents.

1. README.md (for you) — what the system does in three sentences; an architecture
   diagram (Mermaid or ASCII) covering browser → Next.js on Vercel → Firestore /
   Storage, plus the separate WhatsApp bot host; the registration → reconcile →
   approve → ticket → scan lifecycle with the status enum transitions; a full env var
   table (name, required/optional, purpose, where to obtain); local setup; the /config
   directory reference; how to add a customer; how to push template updates to
   existing customers; and a script reference (new-customer, set-admin-role,
   reissue-tickets, migrate-receipts, optimize-assets, push-env-to-vercel).

2. docs/CUSTOMER-SETUP.md (for the customer, Arabic and English) — numbered steps,
   one action each, written for someone who has never opened a developer console:
   how to create a Firebase project, enable Auth (email/password), Firestore, and
   Storage; how to create a Vercel account; how to add your email as Firebase Editor
   and Vercel Member; and how to remove that access at handover.
   State plainly that you never need and will never ask for their password.

3. docs/DEPLOY-CHECKLIST.md (for you) — the per-customer runbook, matching the
   generator's printed checklist, with a tick box per line and space for the customer
   name and date.
```

## T6-3 · Customer repo procedure

**Human runbook — put it in the README.**

```bash
# Per customer — clone the TEMPLATE. Never use GitHub's "Use this template" button.
git clone git@github.com:<ACCOUNT>/event-reg-template.git customer-stmark
cd customer-stmark

git remote rename origin upstream
git remote add origin git@github.com:<ACCOUNT>/customer-stmark.git
git push -u origin main

node scripts/new-customer.js --save answers.json
# drop brand assets, deploy...
git commit -am "Configure for St Mark 2026"
git push
```

Pushing a template fix to every customer:

```bash
cd customer-stmark
git fetch upstream
git merge upstream/main       # /config and /public/brand rarely conflict
npx next build && git push
```

This works **only** because customer repos share history with the template. It is the single reason not to use the "Use this template" button.

---

# PHASE 7 — Customer #1

Do the first one at cost or free. It is your case study, and it is where you discover which checklist lines are wrong.

**GATE PHASE 7** — full smoke test on the customer's own infrastructure:

1. Register from a real phone on mobile data
2. Bank CSV import → reconcile → auto-approve
3. WhatsApp ticket arrives
4. Scan at the gate → success
5. Scan the same ticket again → already-used
6. Amount mismatch → drops to manual_review
7. Customer signs into admin and sees their own registrants
8. Logged out, anonymous Firestore read → `permission-denied`

```bash
git tag v1.0.0 && git push --tags
```

---

# Progress tracker

| # | Task | Model | Done | Gate ✅ |
|---|---|---|---|---|
| **T0-1** | Create the template repo | human | ☐ | ☐ |
| **T0-2** | Cursor setup | human | ☐ | ☐ |
| **T0-3** | Strip project identity | FAST | ☐ | ☐ |
| **T1-1** | Delete OCR pipeline | **REASONING** | ☐ | ☐ |
| **T1-2** | Self-reported reference + amount | **REASONING** | ☐ | ☐ |
| **T1-3** | Drop dead dependencies | FAST | ☐ | ☐ |
| **T2-1** | Firestore rate limiting, remove Upstash | **REASONING** | ☐ | ☐ |
| **T2-2** | Lookup anti-enumeration | **REASONING** | ☐ | ☐ |
| **T2-3** | Server-side registration | **REASONING** | ☐ | ☐ |
| **T2-4** | Receipts to Storage | **REASONING** | ☐ | ☐ |
| **T2-5** | Admin privilege escalation | **REASONING** | ☐ | ☐ |
| **T2-6** | WhatsApp bot auth + timeouts | FAST | ☐ | ☐ |
| **T2-7** | Firebase App Check | **REASONING** | ☐ | ☐ |
| **T2-8** | Lock Firestore + Storage rules | **REASONING** | ☐ | ☐ |
| **T2-9** | Correctness and hygiene | FAST | ☐ | ☐ |
| **T2-10** | Lint, tests, CI | FAST | ☐ | ☐ |
| | **🚦 PHASE 2 EXIT GATE** | | ☐ | ☐ |
| **T3-1** | Theme config + CSS variables | **REASONING** | ☐ | ☐ |
| **T3-2** | Convert inline styles (17 files) | FAST | ☐ | ☐ |
| **T3-3** | Accessibility + rendering polish | FAST | ☐ | ☐ |
| **T4-1** | Copy dictionary (2,209 strings) | FAST | ☐ | ☐ |
| **T5-1** | Event/fields/features config | **REASONING** | ☐ | ☐ |
| **T6-1** | Customer generator script | **REASONING** | ☐ | ☐ |
| **T6-2** | Documentation | FAST | ☐ | ☐ |
| **T6-3** | Customer repo procedure | human | ☐ | ☐ |
| **PHASE 7** | Customer #1 | human | ☐ | ☐ |

---

# Environment variable reference

After Phase 2 the template needs exactly these. **No `GEMINI_API_KEY`, no `CRON_SECRET`, no `UPSTASH_*`.**

| Variable | Secret? | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | no | Firebase → Project settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | no | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | no | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | no | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | no | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | no | same |
| `FIREBASE_PROJECT_ID` | no | serviceAccountKey.json |
| `FIREBASE_CLIENT_EMAIL` | **yes** | serviceAccountKey.json |
| `FIREBASE_PRIVATE_KEY` | **yes** | serviceAccountKey.json |
| `TICKET_SECRET` | **yes** | generated — rotating invalidates every QR |
| `USHER_PASSCODE` | **yes** | generated — rotate after each event |
| `PRIMARY_ADMIN_EMAIL` | no | the customer's admin email |
| `NEXT_PUBLIC_PRIMARY_ADMIN_EMAIL` | no | same value |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | no | google.com/recaptcha/admin — **site** key |
| `WHATSAPP_BOT_TOKEN` | **yes** | generated — only if whatsappDelivery |
| `WHATSAPP_WEBHOOK_URL` | no | where the bot runs |
| `BIND_HOST` | no | `127.0.0.1` |

The reCAPTCHA **secret** key never appears here — it is pasted into the Firebase App Check console, not into the app.

---

# Working notes

**When a gate fails.** Read the failure yourself before prompting again. On T2-8 and T2-3 especially, a failing gate usually means the model misunderstood the threat, and asking it to "make the test pass" is exactly how a test gets weakened instead of a bug fixed.

**When the model wants to touch files outside the task.** Say no and open a new task. Scope creep across security fixes is how one broken thing becomes three.

**Context per task in Cursor.** `@`-mention only the files listed under **Attach**. Whole-repo context on a 7,300-line project makes the model likelier to "helpfully" refactor something you did not ask about.

**The three tasks most likely to go wrong:**
- **T2-8** (rules lockdown) — blast radius is the entire app. The custom-claim pre-step is not optional.
- **T2-7** (App Check) — enforcing before the client change is deployed breaks everything, and the failure looks like a Firestore outage.
- **T2-3** (server-side registration) — touches the one flow that must never break.

Do those three when you have time to test properly, not late at night.

**Two decisions to make before Phase 6.**

*WhatsApp delivery is your recurring support burden.* `whatsapp-web.js` needs an always-on machine, re-scans its QR periodically, and risks account bans. Per customer that is a recurring "it stopped working" call. In increasing order of professionalism: customer runs it on their own PC (free, fragile), you host a small VPS per customer (~$5/mo, bill it on), or Meta's official WhatsApp Business Cloud API (proper, per-conversation pricing, template approval required). Start with option 1 for customer #1; expect to want option 3 by customer #5, and price accordingly.

*What you are selling.* Write it down or you will get support requests forever. **Included:** deployment on their accounts, branding and copy setup, admin account creation, one smoke-tested handover, 30 days of bug fixes. **Not included:** their Firebase and Vercel bills, ongoing feature changes, WhatsApp uptime after handover, data recovery. **Optional retainer:** event-day standby, post-event support, feature additions. The template is the product; the setup is the service. Price them separately.
