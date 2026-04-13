# Legal Pages v3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all 6 legal pages to v3.0 with full Russian law compliance, create 2 new pages (payment, terms), update footer with subtle legal links, and bump version config.

**Architecture:** Each page is a Next.js server component using the existing `SimpleDoc` + `CatalogChrome` pattern with breadcrumb JSON-LD. All pages share `LEGAL_EFFECTIVE_DATE` and `LEGAL_VERSIONS` from `legal-docs.ts`. Footer gets a new muted link block at the bottom.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-13-legal-pages-v3-redesign.md`

**Note:** All pages use `dangerouslySetInnerHTML` for JSON-LD schema only (static trusted content, no user input) — this is the standard Next.js pattern for structured data and is safe.

---

## Task 1: Update legal-docs config

**Files:**
- Modify: `src/app/lib/legal-docs.ts`

- [ ] **Step 1: Update config**

Replace entire content of `src/app/lib/legal-docs.ts`:

```typescript
export const LEGAL_EFFECTIVE_DATE = "13.04.2026";

export const LEGAL_VERSIONS = {
  privacyPolicy: "3.0",
  consentPersonalData: "3.0",
  cookiePolicy: "3.0",
  publicOffer: "3.0",
  returnsPolicy: "3.0",
  warrantyPolicy: "3.0",
  payment: "3.0",
  terms: "3.0",
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/legal-docs.ts
git commit -m "feat(legal): bump all legal docs to v3.0, add payment and terms keys"
```

---

## Task 2: Rewrite Public Offer (`/supply-agreement`)

**Files:**
- Modify: `src/app/supply-agreement/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page**

Full rewrite with 10 sections: general terms, subject, self-selection vs manager selection, price/payment, delivery/pickup, returns/warranty refs, liability, personal data, disputes, seller details.

Key content per spec:
- Section 3 (Подбор и совместимость): manager selection = seller responsible for compatibility; self-selection = buyer responsible, 7-day return preserved
- Section 5 (Доставка): pickup free, courier by arrangement, TK across Russia; risk transfers on receipt; buyer must inspect on delivery
- Section 7 (Ответственность): seller not liable for buyer's incorrect data, force majeure clause
- Section 9 (Споры): mandatory pretrial procedure, 10 business days

Pattern: same imports as current (Metadata, Link, CatalogChrome, SimpleDoc, LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS, SITE_URL). Breadcrumb JSON-LD. All cross-links use `<Link>` with `className="text-amber-600 hover:underline"`.

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/supply-agreement/page.tsx
git commit -m "feat(legal): rewrite public offer to v3.0 with self-selection and delivery clauses"
```

---

## Task 3: Rewrite Returns Policy (`/returns`)

**Files:**
- Modify: `src/app/returns/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page**

8 sections per spec:
1. General: ст. 26.1 ЗоЗПП, Постановление №2463, non-returnable list does NOT apply to distance sales
2. Proper quality returns: refuse any time before receipt (buyer pays delivery if already shipped to ТК); 7 days after receipt; 3 months if no written return info provided; conditions (unused, original packaging, no oil/scratches)
3. Selection error: manager = full refund + delivery; self-selection = general 7-day rules, buyer pays return shipping
4. Defective goods: ст. 18 ЗоЗПП rights, 2-year default, expert review at seller's expense
5. Numbered aggregates: engine/gearbox/body — 15 days any claim, after only substantial defect
6. Return procedure: contact manager first, document requirements
7. Refund timeline: 10 calendar days, same card, bank processing 3-10 days
8. Where to return: Ekaterinburg only, mail/courier only with prior written consent

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/returns/page.tsx
git commit -m "feat(legal): rewrite returns policy v3.0 — 7-day rule, self-selection, numbered aggregates"
```

---

## Task 4: Rewrite Warranty Policy (`/warranty`)

**Files:**
- Modify: `src/app/warranty/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page**

7 sections per spec:
1. General warranty: tiered table (consumables 30d/1000km, general parts 6mo, aggregates 6mo or manufacturer, electrical 6mo)
2. STO installation requirement: licensed service station, exception for consumables
3. Claim procedure: contact manager, provide docs, 20 calendar days review
4. Exclusions: 11 items (mechanical damage, misuse, wear, bad fluids, DIY install, etc.)
5. Buyer rights on confirmed defect: ст. 18 ЗоЗПП
6. Expert review: seller pays, buyer reimburses if at fault
7. Location: Ekaterinburg only

Use HTML `<table>` with Tailwind classes for warranty periods table.

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/warranty/page.tsx
git commit -m "feat(legal): rewrite warranty policy v3.0 — tiered periods, STO requirement, exclusions"
```

---

## Task 5: Rewrite Privacy Policy (`/privacy`)

**Files:**
- Modify: `src/app/privacy/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page**

9 sections per spec:
1. Operator info
2. Data collected (FIO, phone, email, vehicle, orders, IP/cookies, chat messages; card data NOT stored)
3. Purposes (orders, parts selection, communication, analytics, legal compliance)
4. Legal basis (consent, contract, legal obligations — specific 152-FZ articles)
5. Third parties (delivery, payment, hosting, government)
6. Storage (RF servers, technical measures)
7. Subject rights (access, correction, deletion, withdrawal via Contacts, Roskomnadzor complaint)
8. Cookies (link to cookie policy, Yandex.Metrika mention)
9. Policy changes

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/privacy/page.tsx
git commit -m "feat(legal): rewrite privacy policy v3.0 — 152-FZ 2025 amendments, structured sections"
```

---

## Task 6: Rewrite Consent Page (`/consent-personal-data`)

**Files:**
- Modify: `src/app/consent-personal-data/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page**

Sections per spec: data list, purposes, processing methods, third parties, timestamp fixation (date/time/IP per Sept 2025 requirement), duration, withdrawal procedure (30 days via Contacts), withdrawal consequences.

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/consent-personal-data/page.tsx
git commit -m "feat(legal): rewrite consent page v3.0 — timestamp fixation, withdrawal consequences"
```

---

## Task 7: Rewrite Cookie Policy (`/cookie-policy`)

**Files:**
- Modify: `src/app/cookie-policy/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page**

4 sections per spec:
1. What are cookies
2. Cookie table (HTML table): session/necessary, consent/necessary, favorites/functional, Yandex.Metrika/analytical — with storage periods
3. Management: browser instructions for Chrome/Safari/Firefox/Edge, impact of disabling
4. Policy changes

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/cookie-policy/page.tsx
git commit -m "feat(legal): rewrite cookie policy v3.0 — detailed table, browser instructions"
```

---

## Task 8: Create Payment Page (`/payment`)

**Files:**
- Create: `src/app/payment/page.tsx`

- [ ] **Step 1: Create page**

4 sections per spec:
1. Payment methods: cash (pickup), online (Visa/MC/MIR via gateway), bank transfer (legal entities)
2. Security: PCI DSS certified gateway, seller does not store card data, SSL/TLS
3. When charged: on payment confirmation, payment = acceptance of offer
4. Refunds: same card, 3-10 business days, link to returns page

Same pattern as other legal pages: Metadata, CatalogChrome, SimpleDoc, breadcrumb JSON-LD.

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/payment/page.tsx
git commit -m "feat(legal): add payment page v3.0 — payment methods, security, refund terms"
```

---

## Task 9: Create Terms of Use Page (`/terms`)

**Files:**
- Create: `src/app/terms/page.tsx`

- [ ] **Step 1: Create page**

8 sections per spec:
1. General: site usage = agreement acceptance
2. User obligations: accurate data, no illegal use, no unauthorized access
3. Intellectual property:
   - Photos: ст. 1259 ГК РФ, prohibited actions (copy, repost, commercial use, crop/remove watermarks), ст. 1301 penalty 10K-5M RUB, monitoring + court without notice
   - Other materials: texts, design, logo protected
4. Anti-parsing: no bots/scripts/scrapers, no price monitoring, no catalog copying, seller blocks without notice, unfair competition law, commercial secret
5. Security: bypass attempts = ст. 272 УК РФ (fine 200K or 2yr prison), seller reports to law enforcement with all technical data, logging maintained
6. Liability limitation: as-is, no uptime guarantee, not liable for third parties
7. Related documents: links to all 6 other legal pages
8. Agreement changes: unilateral updates, continued use = acceptance

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/terms/page.tsx
git commit -m "feat(legal): add terms of use v3.0 — IP protection, anti-parsing, security clause"
```

---

## Task 10: Update Footer

**Files:**
- Modify: `src/app/components/Footer.tsx`

- [ ] **Step 1: Replace legal links block**

Replace lines 35-48 (the current `div` with 4 links) with the new subtle two-row layout:

```tsx
<div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
  <p className="flex flex-wrap gap-x-1">
    <Link href="/supply-agreement" className="hover:text-slate-300 transition">Оферта</Link>
    <span>·</span>
    <Link href="/returns" className="hover:text-slate-300 transition">Возврат</Link>
    <span>·</span>
    <Link href="/warranty" className="hover:text-slate-300 transition">Гарантия</Link>
    <span>·</span>
    <Link href="/payment" className="hover:text-slate-300 transition">Оплата</Link>
  </p>
  <p className="mt-1 flex flex-wrap gap-x-1">
    <Link href="/privacy" className="hover:text-slate-300 transition">Конфиденциальность</Link>
    <span>·</span>
    <Link href="/consent-personal-data" className="hover:text-slate-300 transition">Согласие на ПДн</Link>
    <span>·</span>
    <Link href="/cookie-policy" className="hover:text-slate-300 transition">Cookies</Link>
    <span>·</span>
    <Link href="/terms" className="hover:text-slate-300 transition">Пользовательское соглашение</Link>
  </p>
</div>
```

This replaces the old `flex-wrap gap-x-4 gap-y-1` block. Keep all other footer content unchanged.

- [ ] **Step 2: Build check and commit**

```bash
npx next build --no-lint 2>&1 | tail -5
git add src/app/components/Footer.tsx
git commit -m "feat(legal): update footer — subtle two-row legal links, muted style"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full build**

```bash
npx next build --no-lint 2>&1 | tail -20
```

- [ ] **Step 2: Verify all 8 page files exist**

```bash
ls src/app/supply-agreement/page.tsx src/app/returns/page.tsx src/app/warranty/page.tsx src/app/privacy/page.tsx src/app/consent-personal-data/page.tsx src/app/cookie-policy/page.tsx src/app/payment/page.tsx src/app/terms/page.tsx
```

- [ ] **Step 3: Verify config**

```bash
grep -c "3.0" src/app/lib/legal-docs.ts
```

Expected: 8

- [ ] **Step 4: Verify footer links**

```bash
grep -c 'href="/' src/app/components/Footer.tsx
```

Expected: at least 10
