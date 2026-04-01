# PRD.md — BodyAtlas: Free Interactive Cross-Sectional Anatomy Atlas

> **This is a living document.** Update this PRD as features ship, priorities shift, or new insights emerge. Add a changelog entry at the bottom of this file for every meaningful update so future sessions can see what changed and why.

**PRD Version:** 2.0  
**Last Updated:** 2026-04-01  
**Phase:** MVP (Milestone 1–3)

---

## 1. Product Overview

**Product Name:** BodyAtlas  
**Tagline:** "The free anatomy atlas for medical professionals — interactive, web-based, zero cost."  
**Domain Target:** `bodyatlas.vercel.app`

### Problem Statement
Medical students, residents, and radiologists frequently need to reference cross-sectional anatomy (CT/MRI) to identify anatomical structures. The market leader, IMAIOS e-Anatomy, charges **$22/month ($132/year)** — a significant cost for students and trainees in smaller hospitals. There is no free, high-quality, interactive cross-sectional anatomy atlas available on the web.

### Solution
BodyAtlas is a free, zero-install, web-based interactive anatomy atlas that allows medical professionals to:
1. Browse high-quality cross-sectional anatomy images (CT/MRI) in three planes (Axial, Sagittal, Coronal)
2. Hover/click on structures to see anatomical labels with descriptions
3. Search for any anatomical structure by name and jump to the exact slice + highlight
4. View labeled anatomy overlays (color-coded regions) toggled on/off
5. Browse by body region (Head, Chest, Abdomen, Pelvis, Extremities)

### Key Differentiators
- **100% Free** — No subscription, no paywall, no trial period. Core features free forever.
- **Zero install** — Works on any modern browser, mobile + desktop
- **PWA** — Installable as app on phone/desktop for quick access
- **Modern UI** — Clean, fast, IMAIOS-level quality but free
- **Open Data** — Built on public domain datasets (Visible Human Project, TotalSegmentator labels)
- **Multilingual** — EN, KO, JA, ZH, ES, DE, FR (reuse from BrainAxis)

### Competitor Analysis
| Feature | IMAIOS e-Anatomy | sectional-anatomy.org | BodyAtlas (Ours) |
|---------|------------------|-----------------------|------------------|
| Price | $22/mo | Free | **Free** |
| UI Quality | Excellent | Dated/basic | **Modern** |
| Interactive Labels | Yes (hover) | Limited | **Yes** |
| Search | Yes | No | **Yes** |
| Mobile | App ($22/mo) | Responsive | **PWA (free)** |
| 3-Plane View | Yes | Limited | **Yes** |
| Modalities | CT, MRI, X-ray | CT, MRI | CT (MVP), MRI (V1) |
| Languages | Multi | EN | **7 languages** |
| Offline | App only | No | **PWA offline** |

### Origin — Pivot from BrainAxis
This project pivots from BrainAxis (brain DICOM AC-PC alignment tool). User feedback from a radiologist (류정률) revealed:
1. AC-PC alignment is already built into hospital PACS/workstation software
2. Hospitals resist web-based DICOM tools for security reasons
3. What doctors actually want is an **anatomy reference atlas** — specifically, interactive cross-sectional anatomy labels like IMAIOS, but free
4. The exact use case: "right upper paratracheal space가 대체 어느정도 영역인지" — knowing where anatomical structures are on cross-sectional images

BrainAxis code (DICOM viewer, tri-plane viewer, i18n, PWA) is reused as infrastructure.

---

## 2. Development Philosophy — MVP First

### Phased Approach
```
┌─────────────────────────────────────────────────────────────┐
│  MVP (Now)          │  V1.0 (Next)        │  V2.0 (Future)  │
│                     │                     │                  │
│  One body region    │  Full body atlas +  │  User uploads +  │
│  (Chest CT) with    │  MRI modality +     │  AI auto-label + │
│  104 labeled        │  quiz mode +        │  premium tier    │
│  structures.        │  bookmarks.         │                  │
│  Ship fast.         │  Grow users.        │  Monetize.       │
└─────────────────────────────────────────────────────────────┘
```

### MVP Scope
The MVP must prove ONE thing: **a medical student can search "paratracheal space", see it highlighted on the correct CT slice, and understand its boundaries — for free, in under 5 seconds.**

### MVP Exit Criteria
- [ ] Browse chest CT with labeled anatomy in 3-plane view
- [ ] Hover/click on image → show structure name
- [ ] Search structure by name → jump to slice + highlight
- [ ] Deployed and accessible at bodyatlas.vercel.app
- [ ] 류정률 has tested and confirmed it's useful

---

## 3. Data Pipeline — The Core Challenge

### Reference Dataset: Visible Human Project + TotalSegmentator

**Step 1: Obtain Reference CT**
- Source: [Visible Human Project](https://www.nlm.nih.gov/research/visible/getting_data.html) (NIH, public domain)
- Male dataset: 1871 axial CT slices, 512×512, 1mm spacing
- No license required since July 2019
- Alternative: Use a TotalSegmentator sample from [Zenodo](https://doi.org/10.5281/zenodo.6802613)

**Step 2: Generate Anatomy Labels**
- Tool: [TotalSegmentator](https://github.com/wasserth/TotalSegmentator) (open source, Apache 2.0)
- Input: Reference CT volume
- Output: 104 anatomical structure masks (NIfTI format)
- Runs on CPU (slower, ~30min) — only needs to run ONCE
- Structures include: all major organs, bones, muscles, vessels

**Step 3: Convert to Web Format**
```
CT volume (NIfTI/DICOM)
    ↓
Convert each slice → PNG (8-bit grayscale, windowed)
    ↓
Convert each label mask → compressed JSON or PNG overlay
    ↓
Bundle as static assets → deploy on Vercel/CDN
```

### Label Data Structure
```typescript
interface AnatomyStructure {
  id: number;                    // TotalSegmentator label ID
  name: string;                  // "Right Upper Paratracheal Space"
  nameKo: string;               // "우상 기관주위 공간"
  category: 'organ' | 'bone' | 'muscle' | 'vessel' | 'space';
  color: string;                 // "#FF6B6B" for overlay rendering
  description: string;           // Brief anatomical description
  sliceRange: { axial: [number, number]; sagittal: [number, number]; coronal: [number, number] };
  bestSlice: { axial: number; sagittal: number; coronal: number };  // Most representative slice
}
```

### Slice Data Structure (per slice)
```typescript
interface SliceData {
  index: number;
  imageUrl: string;              // "/data/chest-ct/axial/0450.png"
  labels: {
    structureId: number;
    contour: number[][];         // Polygon points for overlay [[x,y], ...]
    // OR
    maskUrl: string;             // "/data/chest-ct/labels/axial/0450/liver.png"
  }[];
}
```

### Data Size Estimation
- CT slices as PNG: ~50KB each × 500 slices (chest region) = ~25MB
- Label overlays: ~5KB each × 500 × 20 visible structures = ~50MB
- Total: ~75MB — acceptable for lazy loading over CDN
- Optimization: Load only current slice + neighbors, use WebP

---

## 4. Technical Specification

### Tech Stack (Reuse from BrainAxis)
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | SSR for SEO, Vercel-native |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Rapid responsive design |
| UI Components | Radix UI primitives | Accessible, composable |
| Animations | Framer Motion | Smooth micro-animations |
| Icons | Lucide React | Clean icon set |
| Canvas Rendering | HTML5 Canvas | Label overlay rendering |
| Hosting | Vercel Free Tier | $0/month |
| Data | Static JSON + PNG on Vercel/CDN | No backend needed |
| PWA | Service Worker | Offline access |

### Architecture
```
┌─────────────────────────────────────────┐
│  Vercel (Static Hosting)                │
│                                         │
│  /data/chest-ct/                        │
│    /axial/0001.png ... 0500.png         │
│    /sagittal/0001.png ... 0512.png      │
│    /coronal/0001.png ... 0512.png       │
│    /labels/structures.json              │
│    /labels/axial/0001.json ... 0500.json│
│                                         │
│  /app (Next.js)                         │
│    - Atlas viewer (3-plane)             │
│    - Structure search                   │
│    - Label overlay engine               │
│    - Body region selector               │
└─────────────────────────────────────────┘
```

### Key Design Decision: Pre-rendered vs. DICOM
Unlike BrainAxis (which parsed user-uploaded DICOM), BodyAtlas serves **pre-processed reference images**. This means:
- No DICOM parsing needed at runtime
- Images are pre-windowed PNGs
- Labels are pre-computed JSON polygons
- Much faster load times
- Works offline via service worker cache

### Removed from BrainAxis
The following BrainAxis features are **removed** as they're not relevant:
- DICOM file upload & parsing
- AC-PC landmark marking
- Auto-alignment engine
- Manual XYZ rotation controls
- DICOM export
- DICOM tag editor
- Google Sheets analytics webhook

### Kept from BrainAxis
- Tri-plane viewer (refactored for pre-rendered images)
- i18n framework (7 languages)
- PWA support (manifest, service worker, install prompt)
- Modern UI/UX design system (glassmorphism, Framer Motion)
- Feedback mechanism (Formspree)
- SPINAI branding in footer
- Responsive mobile layout

---

## 5. Feature List

```json
{
  "project": "BodyAtlas",
  "prd_version": "2.0",
  "phases": {
    "mvp": ["F01", "F02", "F03", "F04", "F05"],
    "v1": ["F06", "F07", "F08", "F09"],
    "v2": ["F10", "F11", "F12"]
  },
  "features": [
    {
      "id": "F01",
      "name": "Data Pipeline — Reference CT + Labels",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "Download Visible Human CT or TotalSegmentator sample. Run TotalSegmentator on CPU to generate 104 structure masks. Convert CT to windowed PNG slices (axial, sagittal, coronal). Convert masks to JSON polygon contours per slice. Organize as static /data/ directory. Target: chest region (300-500 slices)."
    },
    {
      "id": "F02",
      "name": "Atlas Viewer — 3-Plane Browse + Scroll",
      "phase": "mvp",
      "status": "pending",
      "milestone": false,
      "description": "Refactor BrainAxis tri-plane viewer to load pre-rendered PNG images instead of DICOM volumes. Scroll through slices (mouse wheel, touch swipe). Synchronized crosshair across planes. Lazy loading — only fetch current slice + 5 neighbors. Dark viewer panels."
    },
    {
      "id": "F03",
      "name": "Label Overlay Engine — Hover/Click to Identify",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "Render anatomy label overlays on canvas (semi-transparent colored polygons). On hover: highlight structure + show tooltip with name. On click: select structure, show info panel with name (multi-language), category, description. Toggle overlay visibility on/off. Color-coded by category (organs=red, bones=white, vessels=blue, muscles=brown)."
    },
    {
      "id": "F04",
      "name": "Structure Search",
      "phase": "mvp",
      "status": "pending",
      "milestone": false,
      "description": "Search bar to find any anatomical structure by name. Autocomplete with fuzzy matching. On select: jump to best representative slice in all 3 planes, highlight the structure. Search works in all 7 languages."
    },
    {
      "id": "F05",
      "name": "MVP Deploy + Landing Page",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "SEO-optimized landing page: 'Free Anatomy Atlas — IMAIOS alternative'. Hero section with demo screenshot. Deploy to bodyatlas.vercel.app. Meta tags, OG tags, sitemap, robots.txt. New GitHub repo via gh CLI."
    },
    {
      "id": "F06",
      "name": "Body Region Navigator",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "Visual body region selector (Head/Neck, Chest, Abdomen, Pelvis). Click region → load that section's anatomy data. Expand dataset to cover full body."
    },
    {
      "id": "F07",
      "name": "MRI Modality",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "Add MRI reference images alongside CT. Toggle between CT and MRI views. Brain MRI atlas (T1, T2, FLAIR sequences)."
    },
    {
      "id": "F08",
      "name": "Structure Info Cards + Wikipedia Links",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "When a structure is selected, show detailed info card: anatomical description, clinical significance, related structures, link to Wikipedia/Radiopaedia. Multi-language descriptions."
    },
    {
      "id": "F09",
      "name": "V1 Polish — Quiz Mode + Bookmarks",
      "phase": "v1",
      "status": "pending",
      "milestone": true,
      "description": "Quiz mode: 'Identify this structure' — randomly highlight a region, user types the answer. Track score. Bookmarks: save favorite structures/slices for quick reference. LocalStorage-based, no auth needed."
    },
    {
      "id": "F10",
      "name": "User DICOM Upload + AI Auto-Label",
      "phase": "v2",
      "status": "pending",
      "milestone": true,
      "description": "Premium feature: Upload your own CT/MRI and get automatic anatomy labels via TotalSegmentator API (Hugging Face Spaces backend). Free tier: reference atlas only. Premium: upload + auto-label."
    },
    {
      "id": "F11",
      "name": "User Accounts + Premium Gate",
      "phase": "v2",
      "status": "pending",
      "milestone": false,
      "description": "Supabase auth for premium features. Free tier: full atlas access. Premium: DICOM upload + AI labels + cloud bookmarks."
    },
    {
      "id": "F12",
      "name": "Payment Integration",
      "phase": "v2",
      "status": "pending",
      "milestone": true,
      "description": "Stripe integration. $4.99/mo or $29.99/yr — undercuts IMAIOS ($22/mo) by 77%. Free atlas always free."
    }
  ]
}
```

---

## 6. UI/UX Design Specification

### Design Principles
Same as BrainAxis: medical-grade clarity, glassmorphism accents, micro-animations, generous whitespace, progressive disclosure. Reference: Linear.app, Vercel Dashboard quality.

### Color Palette
Same as BrainAxis (indigo primary, slate backgrounds, dark viewer panels).

### Anatomy Label Colors (by category)
```
Organs:     #EF4444 (red-500) with 30% opacity overlay
Bones:      #F8FAFC (slate-50) with 40% opacity overlay
Vessels:    #3B82F6 (blue-500) with 30% opacity overlay
Muscles:    #D97706 (amber-600) with 25% opacity overlay
Spaces:     #8B5CF6 (violet-500) with 20% opacity overlay
Nerves:     #10B981 (emerald-500) with 30% opacity overlay
```

### Desktop Layout
```
┌──────────────────────────────────────────────────────────────┐
│  ░░ HEADER ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  Logo  "BodyAtlas"    [Search: anatomy...]    [Region ▾] [?] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │            │ │            │ │            │  ┌───────────┐ │
│  │   AXIAL    │ │  SAGITTAL  │ │  CORONAL   │  │ STRUCTURE │ │
│  │            │ │            │ │            │  │  INFO      │ │
│  │ [labeled]  │ │ [labeled]  │ │ [labeled]  │  │           │ │
│  │            │ │            │ │            │  │ Name: ... │ │
│  │            │ │            │ │            │  │ Cat: Organ│ │
│  └────────────┘ └────────────┘ └────────────┘  │ Desc: ... │ │
│                                                │           │ │
│  ┌─────────────────────────────────────────┐   │ [Toggle]  │ │
│  │  STRUCTURE LIST (scrollable)            │   │ Overlay   │ │
│  │  ● Liver  ● Spleen  ● Aorta  ● ...    │   │           │ │
│  └─────────────────────────────────────────┘   └───────────┘ │
├──────────────────────────────────────────────────────────────┤
│  Built by SPINAI                              © 2026         │
└──────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────┐
│ ░ HEADER ░░░░░░░░░░░░░ │
│ Logo     [🔍] [≡]       │
├─────────────────────────┤
│ [Search anatomy...]      │
├─────────────────────────┤
│ [Axial] [Sag] [Cor] ←tabs
├─────────────────────────┤
│                         │
│     ACTIVE VIEW         │
│     (full width)        │
│     hover = tap         │
│                         │
├─────────────────────────┤
│ ▸ Structure Info        │
│ ▸ Structure List        │
├─────────────────────────┤
│ Built by SPINAI  · [💬] │
└─────────────────────────┘
```

---

## 7. SEO Strategy

### Target Keywords
- Primary: `free anatomy atlas`, `free alternative to IMAIOS`, `cross-sectional anatomy online`
- Secondary: `CT anatomy atlas free`, `MRI anatomy labels`, `anatomy atlas no subscription`
- Long-tail: `free e-anatomy alternative`, `IMAIOS free version`, `interactive anatomy atlas web`
- Korean: `무료 해부학 아틀라스`, `단면 해부학`, `IMAIOS 무료 대안`
- Medical: `paratracheal space anatomy`, `cross-sectional anatomy CT`, `radiologic anatomy atlas`

### Landing Page Sections
1. Hero: "Free Interactive Anatomy Atlas" + live demo preview
2. Comparison table: BodyAtlas vs. IMAIOS (price, features)
3. Feature highlights: Search, 3-plane view, labels, offline
4. CTA: "Start Browsing — It's Free"

---

## 8. Deployment & Infrastructure

### Zero-Cost Stack
| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Free (Hobby) | $0 |
| GitHub | Free | $0 |
| Static Data (on Vercel) | Free | $0 |
| Formspree.io | Free | $0 |
| **Total** | | **$0** |

### Data Hosting Strategy
- Reference images as static PNG files in /public/data/
- Vercel serves static files from CDN automatically
- If total data exceeds Vercel free tier limits (~100MB), use Cloudflare R2 (free 10GB/mo)

---

## 9. Standing Constraints

1. **Zero Cost (MVP/V1)**: No paid services. Everything on free tiers.
2. **CLI-First Automation**: Use `gh` CLI, `npx vercel` for deployments.
3. **Responsive Mobile-First**: Tailwind responsive prefixes.
4. **Modern Soft Aesthetic**: Glassmorphism, Framer Motion, Linear/Vercel quality.
5. **SEO Maximized**: Every page has proper meta tags, semantic HTML, structured data.
6. **SPINAI Branding**: "Built by SPINAI" in footer, subtle.
7. **Multilingual**: EN, KO, JA, ZH, ES, DE, FR from day one.
8. **PWA**: Installable, offline-capable.
9. **Open Data Only**: Only use datasets with permissive licenses (public domain, CC BY, Apache 2.0).
10. **PRD Is Living Document**: Update after any significant decision.

---

## 10. Milestone Summary

### MVP Milestones
| Milestone | Features | Push Trigger |
|-----------|----------|-------------|
| M1 | F01 (Data Pipeline) | After reference data processed and organized |
| M2 | F02 + F03 (Viewer + Labels) | After interactive labeled viewer works |
| M3 | F04 + F05 (Search + Deploy) | After search works + production deploy |

### V1 Milestones
| Milestone | Features | Push Trigger |
|-----------|----------|-------------|
| M4 | F06 + F07 (Full Body + MRI) | After all body regions available |
| M5 | F08 + F09 (Info Cards + Quiz) | After quiz mode works |

### V2 Milestones
| Milestone | Features | Push Trigger |
|-----------|----------|-------------|
| M6 | F10 (AI Auto-Label) | After HF Spaces backend works |
| M7 | F11 + F12 (Auth + Payments) | After Stripe integration tested |

---

## 11. Success Criteria

### MVP Success
- [ ] User can browse chest CT anatomy in 3 planes
- [ ] Hover on any structure → see its name
- [ ] Search "paratracheal space" → jump to correct slice + highlight
- [ ] 류정률 confirms: "this is useful"
- [ ] Deployed at bodyatlas.vercel.app
- [ ] Lighthouse Performance > 85, SEO > 90

### V1 Success
- [ ] Full body coverage (head to pelvis)
- [ ] CT + MRI modalities
- [ ] 100+ daily active users (organic via SEO)
- [ ] Top 10 Google result for "free anatomy atlas"

### V2 Success (Monetization)
- [ ] AI auto-label working via free GPU (HF Spaces)
- [ ] At least 1 paying customer in first month
- [ ] Infrastructure cost < $50/mo, break-even at 10 premium users

---

## 12. Monetization Roadmap

### Freemium Model
```
┌─────────────────────────┬──────────────────────────────┐
│     FREE TIER           │     PREMIUM TIER             │
│     (Forever Free)      │     ($4.99/mo or $29.99/yr)  │
├─────────────────────────┼──────────────────────────────┤
│ ✓ Full anatomy atlas    │ ✓ Everything in Free         │
│ ✓ All body regions      │ ✓ Upload own DICOM + AI label│
│ ✓ Search + labels       │ ✓ Cloud bookmarks + history  │
│ ✓ 3-plane view          │ ✓ Quiz mode with progress    │
│ ✓ 7 languages           │ ✓ Offline full dataset       │
│ ✓ PWA install           │ ✓ Priority support           │
│ ✓ No watermarks         │                              │
└─────────────────────────┴──────────────────────────────┘
```

Pricing vs. competitor: IMAIOS $22/mo → BodyAtlas $4.99/mo (**77% cheaper**), with free tier that IMAIOS doesn't offer.

---

## 13. Reference Materials

- **IMAIOS e-Anatomy**: https://www.imaios.com/en/e-anatomy (competitor reference)
- **sectional-anatomy.org**: https://sectional-anatomy.org/en/ (free but dated)
- **TotalSegmentator**: https://github.com/wasserth/TotalSegmentator (label generation)
- **TotalSegmentator Dataset**: https://doi.org/10.5281/zenodo.6802613 (labeled CT data)
- **Visible Human Project**: https://www.nlm.nih.gov/research/visible/getting_data.html (reference CT)
- **Open Anatomy Project**: https://www.openanatomy.org/ (open atlas standards)
- **Radiopaedia**: https://radiopaedia.org/ (anatomy reference content)
- **Design References**: Linear.app, Vercel Dashboard, Raycast

---

## 14. Changelog

| Date | Version | Change | Reason |
|------|---------|--------|--------|
| 2026-03-31 | 1.0–1.3 | BrainAxis: Brain DICOM AC-PC alignment tool MVP through V1 | Original product |
| 2026-04-01 | 2.0 | **FULL PIVOT to BodyAtlas** — Free interactive cross-sectional anatomy atlas. Dropped: AC-PC alignment, DICOM upload/parsing, rotation controls, tag editor. Kept: tri-plane viewer infrastructure, i18n, PWA, UI design system. Reason: User feedback from radiologist (류정률) revealed AC-PC alignment already exists in hospital software; real demand is for free IMAIOS alternative (anatomy atlas with interactive labels). IMAIOS costs $22/mo — we go free. | User validation feedback, market opportunity |
