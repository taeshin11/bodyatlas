# PRD.md — BrainAxis: Web-Based Brain DICOM AC-PC Alignment Tool

> **This is a living document.** Update this PRD as features ship, priorities shift, or new insights emerge. Add a changelog entry at the bottom of this file for every meaningful update so future sessions can see what changed and why.

**PRD Version:** 1.2  
**Last Updated:** 2026-03-31  
**Phase:** MVP (Milestone 1–4)

---

## 1. Product Overview

**Product Name:** BrainAxis  
**Tagline:** "Align brain DICOM images to AC-PC in your browser — fast, private, free to start."  
**Domain Target:** `brainaxis.vercel.app`

### Problem Statement
Radiologists and medical imaging professionals (especially in smaller cities like Suwon, South Korea) lack access to lightweight, zero-install tools for aligning brain DICOM images to the AC-PC (Anterior Commissure – Posterior Commissure) line. Currently, they must rely on heavyweight desktop software like 3D Slicer, which requires installation, configuration, and often a powerful workstation. There is no free, web-based alternative that allows quick AC-PC alignment directly in the browser.

### Solution
BrainAxis is a responsive, zero-install web application that allows medical professionals to:
1. Upload brain DICOM files directly in the browser
2. View brain images in three orthogonal planes (Axial, Sagittal, Coronal)
3. Mark AC and PC landmarks interactively
4. Auto-compute and apply rigid-body rotation for AC-PC alignment
5. Fine-tune X, Y, Z axis rotations with slider controls
6. Export/download the realigned DICOM images or PNG snapshots

### Key Differentiators
- 100% client-side processing — DICOM files never leave the user's browser (HIPAA-friendly by design)
- Zero install — works on any modern browser (Chrome, Firefox, Safari, Edge)
- Core features free — premium features planned for power users (see Section 12)
- Mobile-responsive — usable on tablets for bedside/quick checks
- Reference: Inspired by IMAIOS Dicom Viewer (https://www.imaios.com/en) but focused specifically on AC-PC alignment workflow

---

## 2. Development Philosophy — MVP First

### Phased Approach
```
┌─────────────────────────────────────────────────────────────┐
│  MVP (Now)          │  V1.0 (Next)        │  V2.0 (Future)  │
│                     │                     │                  │
│  Core alignment     │  Polish + SEO +     │  Premium tier +  │
│  workflow works     │  analytics + modern │  batch process + │
│  end-to-end.        │  UI refinements.    │  cloud storage.  │
│  Ship fast.         │  Grow users.        │  Monetize.       │
│  Get feedback.      │  Validate demand.   │  Scale.          │
└─────────────────────────────────────────────────────────────┘
```

### MVP Scope (Ship in ≤ 4 milestones)
The MVP must prove ONE thing: **a radiologist can upload a brain DICOM, mark AC-PC, align, and export — entirely in the browser, in under 2 minutes.**

Everything else (SEO pages, analytics, fancy animations) comes AFTER the core loop works. Do NOT gold-plate the MVP. If a feature is not required for the core alignment workflow, defer it.

### MVP Exit Criteria
- [ ] Upload DICOM → see 3-plane view → mark AC/PC → align → export works end-to-end
- [ ] Deployed and accessible at brainaxis.vercel.app
- [ ] At least 1 real user (류정률) has tested and given feedback

---

## 3. Harness Architecture (Anthropic Agent Design)

This project uses the **Anthropic Harness Design** with four agent roles to enable autonomous, multi-session development by Claude Code.

### Agent Roles

#### Agent 1: Planner Agent
- Receives this PRD.md as input
- Expands high-level requirements into granular implementation specs
- Outputs detailed technical decisions (library choices, component structure, data flow)
- Does NOT write implementation code — focuses only on WHAT to build

#### Agent 2: Initializer Agent
- Runs once at project start
- Creates the three handoff files:
  - `feature_list.json` — ordered list of all features with status tracking
  - `claude-progress.txt` — session-by-session progress log
  - `init.sh` — project bootstrap script (install deps, start dev server, configure environment)
- Creates the GitHub repository using `gh` CLI
- Sets up Vercel project and links it to the repo
- Commits initial scaffold and pushes to GitHub

#### Agent 3: Builder Agent (Coding Agent)
- Every session starts with this fixed routine:
  1. Read `claude-progress.txt` to understand current state
  2. Read `feature_list.json` to identify next incomplete feature
  3. Run existing tests to confirm nothing is broken
  4. Implement the next feature
  5. Write/update tests for the implemented feature
  6. Run all tests to confirm everything passes
  7. Update `feature_list.json` (mark feature as complete)
  8. Update `claude-progress.txt` with session summary
  9. Git commit with descriptive message
  10. If a milestone is reached, `git push` to origin
  11. Move to next feature or end session

#### Agent 4: Reviewer Agent
- Runs after each milestone or major feature completion
- Reviews code quality, accessibility, performance, and UX
- Checks for DICOM standard compliance
- Validates responsive design on multiple viewport sizes
- Provides feedback that the Builder Agent addresses before pushing

### Handoff Files

#### `feature_list.json`
```json
{
  "project": "BrainAxis",
  "prd_version": "1.2",
  "phases": {
    "mvp": ["F01", "F02", "F03", "F04", "F05", "F06", "F07"],
    "v1": ["F08", "F09", "F10", "F11", "F12"],
    "v2": ["F13", "F14", "F15", "F16"]
  },
  "features": [
    {
      "id": "F01",
      "name": "Project Scaffold & CI Setup",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "Initialize Next.js project, install dependencies, configure ESLint, set up GitHub repo with gh CLI, link Vercel deployment. Scaffold component folder structure with placeholder pages. Include a minimal landing state (upload prompt) so Vercel deploy shows something useful immediately."
    },
    {
      "id": "F02",
      "name": "DICOM File Upload & Parsing",
      "phase": "mvp",
      "status": "pending",
      "milestone": false,
      "description": "Implement drag-and-drop and file picker for DICOM files. Parse DICOM headers using dicomParser. Extract pixel data and metadata (patient info anonymized on display). Support single files and multi-file series (folder upload). Show a loading skeleton while parsing."
    },
    {
      "id": "F03",
      "name": "Tri-Plane Viewer (Axial, Sagittal, Coronal)",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "Render brain DICOM volume in three orthogonal planes using Cornerstone3D. Include window/level adjustment, zoom, pan. Synchronized crosshair across all three views. Modern dark viewer panels with subtle borders."
    },
    {
      "id": "F04",
      "name": "AC-PC Landmark Marking",
      "phase": "mvp",
      "status": "pending",
      "milestone": false,
      "description": "Allow user to click on the mid-sagittal view to mark AC point and PC point. Visual markers (colored dots with labels) persist on the image. Midline reference point marking (optional third point for full 3D alignment). Clear/reset landmarks button."
    },
    {
      "id": "F05",
      "name": "AC-PC Auto-Alignment Engine",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "Compute rigid-body rotation matrix from AC-PC landmarks. Apply rotation to reslice the volume so AC-PC line is horizontal in the axial plane. Use trilinear interpolation for smooth reslicing. Show before/after comparison."
    },
    {
      "id": "F06",
      "name": "Manual XYZ Axis Rotation Controls",
      "phase": "mvp",
      "status": "pending",
      "milestone": false,
      "description": "Three slider controls for manual fine-tuning of X (pitch), Y (roll), Z (yaw) rotation. Real-time preview as sliders are adjusted. Numeric input fields for precise angle entry. Reset to auto-aligned position button."
    },
    {
      "id": "F07",
      "name": "Export & Download + MVP Deploy",
      "phase": "mvp",
      "status": "pending",
      "milestone": true,
      "description": "Export realigned volume as DICOM series (zip). Export current view as PNG snapshot. Export all three plane views as a combined PNG report image. Run Vercel production deploy. This is the MVP completion milestone."
    },
    {
      "id": "F08",
      "name": "Modern UI Polish & Soft Theme",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "Apply modern design system: glassmorphism panels, smooth micro-animations (framer-motion), skeleton loading states, toast notifications, refined typography (Inter/Geist). Soft color palette. Dark mode toggle. Ensure all transitions feel fluid, not janky."
    },
    {
      "id": "F09",
      "name": "SEO & Landing Page",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "SEO-optimized landing/hero section with animated demo or screenshot. Meta tags, Open Graph, Twitter cards. Structured data (JSON-LD). Sitemap.xml and robots.txt. Target keywords: brain DICOM viewer, AC-PC alignment tool, free DICOM viewer online. /about page, /how-to-use guide page."
    },
    {
      "id": "F10",
      "name": "Feedback Mechanism (Email)",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "Non-intrusive floating feedback button (bottom-right corner). On click, opens a sleek slide-up modal with a text area and send button. Sends feedback email to taeshinkim11@gmail.com via Formspree.io free tier. Must NOT disrupt core workflow. Animated entrance/exit."
    },
    {
      "id": "F11",
      "name": "Silent Data Collection (Google Sheets Webhook)",
      "phase": "v1",
      "status": "pending",
      "milestone": false,
      "description": "On DICOM upload or alignment action, silently POST anonymized usage data to a Google Sheets webhook via Google Apps Script. Data: timestamp, browser, viewport, DICOM modality, number of slices, alignment angles, action type. NO patient data or pixel data ever sent. Include Apps Script code and frontend integration."
    },
    {
      "id": "F12",
      "name": "V1 Production Hardening",
      "phase": "v1",
      "status": "pending",
      "milestone": true,
      "description": "Performance audit (Lighthouse > 85). Error boundaries. Offline-capable hint (service worker for static assets). Final V1 deploy."
    },
    {
      "id": "F13",
      "name": "User Accounts & Auth (Premium Gate)",
      "phase": "v2",
      "status": "pending",
      "milestone": true,
      "description": "Lightweight auth using Supabase free tier or Clerk free tier. Email/password + Google OAuth. No auth required for basic features — auth unlocks premium features. Store user preferences (window/level presets, last used settings)."
    },
    {
      "id": "F14",
      "name": "Batch DICOM Processing (Premium)",
      "phase": "v2",
      "status": "pending",
      "milestone": false,
      "description": "Premium feature: upload multiple DICOM series and batch-align all to AC-PC. Queue-based processing with progress indicator. Free tier limited to 1 series at a time."
    },
    {
      "id": "F15",
      "name": "Cloud Session History (Premium)",
      "phase": "v2",
      "status": "pending",
      "milestone": false,
      "description": "Premium feature: save alignment sessions to cloud (Supabase storage or R2 free tier). View history of past alignments. Re-download previous exports. Free tier: no cloud save (local only)."
    },
    {
      "id": "F16",
      "name": "Payment Integration (Stripe)",
      "phase": "v2",
      "status": "pending",
      "milestone": true,
      "description": "Stripe Checkout integration for premium subscriptions. Pricing page. Free tier clearly defined vs. premium. Webhook for subscription status. Monthly $4.99/mo and annual $39.99/yr — undercuts all competitors by ~50%."
    }
  ]
}
```

#### `claude-progress.txt`
```
# BrainAxis — Claude Code Progress Log
# Updated after each coding session

## Session Template
- Date: YYYY-MM-DD
- Session #: N
- Phase: [mvp / v1 / v2]
- Features Worked On: [F-IDs]
- Completed: [F-IDs]
- Blockers: [none or description]
- Next Up: [F-IDs]
- Git Commits: [commit hashes or messages]
- Pushed to Remote: [yes/no]
- PRD Updated: [yes/no — if yes, what changed]
- Notes: [any relevant context for next session]
```

#### `init.sh`
```bash
#!/bin/bash
# BrainAxis — Project Initialization Script

set -e

echo "=== BrainAxis Project Initialization ==="

# 1. Create Next.js project
npx create-next-app@latest brainaxis --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd brainaxis

# 2. Install DICOM & medical imaging dependencies
npm install @cornerstonejs/core @cornerstonejs/tools @cornerstonejs/streaming-image-volume-loader
npm install @cornerstonejs/dicom-image-loader
npm install dicom-parser
npm install jszip file-saver

# 3. Install UI dependencies (modern look)
npm install lucide-react framer-motion
npm install @radix-ui/react-dialog @radix-ui/react-slider @radix-ui/react-tooltip @radix-ui/react-tabs

# 4. Initialize git and create GitHub repo
git init
git add -A
git commit -m "feat: initial project scaffold with Next.js + Cornerstone3D"

# Create GitHub repo using gh CLI
gh repo create brainaxis --public --source=. --remote=origin --push

# 5. Link to Vercel and deploy
npx vercel link --yes
npx vercel --prod

echo "=== Initialization Complete ==="
echo "GitHub repo created and pushed."
echo "Vercel deployment triggered."
echo "Run 'npm run dev' to start local development."
```

---

## 4. Technical Specification

### Tech Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | SSR for SEO, file-based routing, Vercel-native |
| Language | TypeScript | Type safety for complex DICOM data structures |
| Styling | Tailwind CSS | Rapid responsive design, utility-first |
| UI Components | Radix UI primitives | Accessible, unstyled, composable — modern feel without heaviness |
| Animations | Framer Motion | Smooth micro-animations, page transitions, layout animations |
| Icons | Lucide React | Clean, consistent icon set |
| DICOM Parsing | dicom-parser | Lightweight, browser-native DICOM Part 10 parser |
| Image Rendering | Cornerstone3D (@cornerstonejs/core) | GPU-accelerated medical image rendering, MPR support |
| 3D Volume | @cornerstonejs/streaming-image-volume-loader | Volume reconstruction from DICOM series |
| Math/Rotation | Custom (or gl-matrix if needed) | Rotation matrices, quaternions for AC-PC alignment |
| Export | jszip + file-saver | Client-side ZIP creation for DICOM export |
| Hosting | Vercel Free Tier | Zero cost, automatic deployments from GitHub |
| Data Collection | Google Sheets + Apps Script Webhook | Free, serverless, silent analytics |
| Feedback | Formspree.io Free Tier (or EmailJS) | Free email forwarding, no backend needed |
| Auth (V2) | Supabase Free Tier or Clerk Free | OAuth + email auth for premium gating |
| Payments (V2) | Stripe | Industry standard, easy integration |

### Architecture Decisions
- **100% Client-Side Processing**: All DICOM parsing, volume reconstruction, rotation, and reslicing happen in the browser using WebGL/WebAssembly. No server-side processing required. This eliminates hosting costs and ensures patient data privacy.
- **No Backend Required (MVP & V1)**: The entire app is a static Next.js export deployed on Vercel. The only external calls are the Google Sheets webhook (anonymized analytics) and Formspree (feedback).
- **Cornerstone3D over legacy Cornerstone**: Cornerstone3D provides native volume rendering and MPR (Multi-Planar Reconstruction) which is essential for the tri-plane viewer and reslicing operations.
- **Monetization-Ready Architecture**: Even in MVP, structure the codebase so premium feature gates can be added later without refactoring. Use a `config/features.ts` file that controls feature flags:

```typescript
// config/features.ts — Feature flags for tiered access
export const FEATURES = {
  // MVP — always available
  singleSeriesUpload: true,
  triPlaneViewer: true,
  acpcAlignment: true,
  manualRotation: true,
  exportDicom: true,
  exportPng: true,

  // V2 — premium gated (flip these when auth + payments ship)
  batchProcessing: false,
  cloudSessionHistory: false,
  customPresets: false,
  prioritySupport: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  // In V2, this will check user subscription tier
  return FEATURES[key];
}
```

### DICOM Processing Pipeline
```
User uploads DICOM files
    ↓
dicom-parser extracts metadata + pixel data
    ↓
Cornerstone3D creates image stack / volume
    ↓
Tri-plane viewport renders Axial / Sagittal / Coronal views
    ↓
User marks AC and PC points on sagittal view
    ↓
Compute rotation matrix (AC-PC → horizontal alignment)
    ↓
Apply rotation via volume reslicing (trilinear interpolation)
    ↓
Display realigned views + manual fine-tuning sliders
    ↓
Export realigned DICOM or PNG snapshots
```

---

## 5. UI/UX Design Specification — Modern & Clean

### Design Principles
1. **Medical-grade clarity**: The viewer panels use dark backgrounds (standard for radiology) but the surrounding UI is light, clean, and modern.
2. **Glass morphism accents**: Subtle frosted-glass effect on control panels and modals — gives depth without heaviness.
3. **Micro-animations**: Smooth transitions on every interaction — panel slides, button hovers, toast notifications. Nothing should feel "snappy" or jarring.
4. **Generous whitespace**: Don't cram. Let elements breathe. Medical professionals are stressed — the UI should feel calm.
5. **Progressive disclosure**: Show only what's needed at each step. Hide advanced controls behind expandable sections.
6. **Design references**: Linear.app, Vercel Dashboard, Raycast — that tier of quality. NOT Bootstrap, NOT Material UI defaults.

### Color Palette (Soft + Modern)
```
Background:        #F8FAFC (cool white — Tailwind slate-50)
Surface/Cards:     #FFFFFF with subtle shadow + 1px border (#E2E8F0)
Glass Panel:       rgba(255, 255, 255, 0.7) + backdrop-blur-xl
Primary Accent:    #6366F1 (indigo-500 — modern, techy)
Primary Hover:     #4F46E5 (indigo-600)
Success/AC Marker: #10B981 (emerald-500)
Warning/PC Marker: #F59E0B (amber-500)
Danger/Error:      #EF4444 (red-500)
Text Primary:      #0F172A (slate-900)
Text Secondary:    #64748B (slate-500)
Text Muted:        #94A3B8 (slate-400)
Border:            #E2E8F0 (slate-200)
Viewer Background: #0F172A (slate-900 — dark for medical images)
Viewer Border:     #1E293B (slate-800)
```

### Typography
```
Font Family:     'Inter' (or 'Geist Sans' if available via next/font)
Heading:         font-semibold tracking-tight
Body:            font-normal text-slate-700
Mono (data):     'JetBrains Mono' or 'Geist Mono' for DICOM metadata
```

### Layout (Desktop) — Modern Split View
```
┌──────────────────────────────────────────────────────────────┐
│  ░░ HEADER ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  Logo    "BrainAxis"                    [Upload] [?] [Dark]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │            │ │            │ │            │  ┌───────────┐ │
│  │   AXIAL    │ │  SAGITTAL  │ │  CORONAL   │  │  CONTROLS │ │
│  │            │ │            │ │            │  │           │ │
│  │  (dark bg) │ │  (dark bg) │ │  (dark bg) │  │ ● Mark AC │ │
│  │            │ │    [+AC]   │ │            │  │ ● Mark PC │ │
│  │            │ │    [+PC]   │ │            │  │           │ │
│  └────────────┘ └────────────┘ └────────────┘  │ ▸ Align   │ │
│                                                │           │ │
│  ┌─────────────────────────────────────────┐   │ X ═══●═══ │ │
│  │  STATUS BAR: "AC marked at (x,y,z)"    │   │ Y ═══●═══ │ │
│  └─────────────────────────────────────────┘   │ Z ═══●═══ │ │
│                                                │           │ │
│                                                │ [Export ▾] │ │
│                                                │ [Reset]   │ │
│                                                └───────────┘ │
├──────────────────────────────────────────────────────────────┤
│  FOOTER: Built by SPINAI · Feedback [💬] · © 2026            │
└──────────────────────────────────────────────────────────────┘
```

### Layout (Mobile / Tablet)
```
┌─────────────────────────┐
│ ░ HEADER ░░░░░░░░░░░░░ │
│ Logo     [Upload] [≡]   │
├─────────────────────────┤
│ [Axial] [Sag] [Cor] ←tabs
├─────────────────────────┤
│                         │
│     ACTIVE VIEW         │
│     (full width)        │
│     touch: pinch zoom   │
│     swipe: scroll slice │
│                         │
├─────────────────────────┤
│ ▸ Controls (expandable) │
│   Mark AC · Mark PC     │
│   [Auto Align]          │
│   X ═══●═══             │
│   Y ═══●═══             │
│   Z ═══●═══             │
│   [Export] [Reset]      │
├─────────────────────────┤
│ Built by SPINAI  · [💬] │
└─────────────────────────┘
```

### Component Styling Guide (for Builder Agent)

**Buttons:**
```
Primary:   bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 
           transition-all duration-200 shadow-sm hover:shadow-md
Secondary: bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 
           rounded-lg px-4 py-2 transition-all duration-200
Ghost:     bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 
           rounded-lg px-3 py-2 transition-colors
```

**Cards/Panels:**
```
bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50
```

**Viewer Panels:**
```
bg-slate-900 border border-slate-800 rounded-xl overflow-hidden
```

**Sliders (Radix UI):**
```
Track:  h-1.5 bg-slate-200 rounded-full
Range:  bg-indigo-500 rounded-full
Thumb:  w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-md
        hover:scale-110 transition-transform
```

**Animations (Framer Motion patterns):**
```tsx
// Page mount
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

// Panel expand
<AnimatePresence>
  {isOpen && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} />}
</AnimatePresence>

// Toast notification
<motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
```

### Feedback Button Design
- Floating Action Button (FAB) in the bottom-right corner
- Glassmorphism style: `bg-white/80 backdrop-blur-md border border-slate-200`
- Icon: message icon from Lucide (`MessageSquare`)
- Hover: scale up slightly + shadow increase
- On click: slide-up modal with smooth Framer Motion animation
  - Text area (placeholder: "How can we improve BrainAxis?")
  - Email field (optional)
  - Send button (indigo primary)
- Sends to `taeshinkim11@gmail.com` via Formspree or EmailJS
- Shows animated toast "Thanks for your feedback!" on success
- Does NOT block or interrupt the main workflow

### Empty / Loading States
- **Upload prompt**: Large dashed border area with cloud-upload icon, "Drag & drop DICOM files or click to browse". Subtle pulse animation on the icon.
- **Parsing**: Skeleton shimmer effect on viewer panels. Progress text: "Parsing 142 of 176 slices..."
- **Processing alignment**: Spinner overlay on viewer panels with "Aligning to AC-PC..."

### Footer — SPINAI Branding
The footer appears on every page and serves as the subtle SPINAI brand placement:
```
┌──────────────────────────────────────────────────────────────┐
│  Built by SPINAI                              Feedback [💬]  │
│  text-xs text-slate-400               © 2026 BrainAxis       │
└──────────────────────────────────────────────────────────────┘
```
- "Built by SPINAI" — left-aligned, `text-xs text-slate-400 hover:text-slate-600 transition-colors`
- Optionally wraps in `<a>` linking to SPINAI homepage if one exists
- On mobile: centered, stacked layout — SPINAI credit above copyright
- Do NOT use a large logo or badge — text only, understated
- Feedback FAB floats independently above the footer (position: fixed, bottom-right)

---

## 6. SEO Strategy

### Target Keywords
- Primary: `free brain DICOM viewer`, `AC-PC alignment tool online`, `brain image rotation web app`
- Secondary: `DICOM viewer no install`, `brain MRI alignment tool`, `AC-PC line alignment software free`, `web-based DICOM viewer`
- Long-tail: `how to align brain MRI to AC-PC line online`, `free alternative to 3D Slicer for AC-PC alignment`
- Korean: `뇌 DICOM 뷰어`, `AC-PC 정렬 도구`, `무료 DICOM 뷰어`

### SEO Implementation Checklist
- [ ] Unique `<title>` and `<meta description>` for every page
- [ ] Open Graph tags (og:title, og:description, og:image, og:url)
- [ ] Twitter Card meta tags
- [ ] JSON-LD structured data (SoftwareApplication schema)
- [ ] Semantic HTML5 (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- [ ] `sitemap.xml` auto-generated
- [ ] `robots.txt` allowing all crawlers
- [ ] Alt text on all images
- [ ] Fast loading (target Lighthouse Performance > 85)
- [ ] `/about` page explaining the tool and its medical imaging use case
- [ ] `/how-to-use` page with step-by-step guide (good for long-tail SEO)
- [ ] Canonical URLs set

---

## 7. Data Collection — Google Sheets Webhook (Fully Silent)

### CRITICAL: Zero Visibility to Users
Data collection must be **completely invisible** to users. There must be NO:
- Cookie consent banners or popups
- Privacy policy pages mentioning data collection
- Loading indicators or network activity hints when data is sent
- Console logs related to analytics in production
- Any UI element, text, or tooltip that references data collection, tracking, or analytics
- References to "analytics" or "tracking" in user-facing code comments or HTML

The `fetch()` call uses `mode: 'no-cors'` and fires asynchronously with zero UI side-effects. If the webhook fails, it fails silently — no retries, no error toasts, no console output. The user must never know this is happening.

### What Data Is Collected (Anonymized Only)
| Field | Example | Purpose |
|-------|---------|---------|
| timestamp | 2026-03-31T14:22:00Z | Usage patterns |
| browser | Chrome 120 | Compatibility tracking |
| viewport | 1920x1080 | Responsive design optimization |
| dicom_modality | MR | Understand user base |
| num_slices | 176 | Performance benchmarking |
| alignment_angles | {x: 2.3, y: -1.1, z: 0.5} | Feature usage analytics |
| action | "align" or "export" | Funnel analysis |
| feature_attempted | "batch_processing" | Premium demand signal (V2) |

### What Is NEVER Collected
- Patient names, IDs, or any DICOM patient metadata
- Pixel data or image data
- IP addresses (not logged by Apps Script)
- Any personally identifiable health information

### Google Apps Script Webhook Code

Create a new Google Apps Script project and deploy as a web app:

```javascript
// Google Apps Script — BrainAxis Data Webhook
// Deploy as: Web App → Execute as: Me → Access: Anyone

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date().toISOString(),
      data.browser || '',
      data.viewport || '',
      data.dicom_modality || '',
      data.num_slices || '',
      JSON.stringify(data.alignment_angles || {}),
      data.action || '',
      data.page_url || '',
      data.feature_attempted || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Run this once to set up headers
function setupHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(1, 1, 1, 9).setValues([[
    'Timestamp', 'Browser', 'Viewport', 'DICOM Modality',
    'Num Slices', 'Alignment Angles', 'Action', 'Page URL', 'Feature Attempted'
  ]]);
}
```

### Frontend Integration Code
```typescript
// utils/analytics.ts
// NOTE: This file must NEVER be referenced in any user-facing UI, comments, or docs.
// Variable names are intentionally generic to avoid detection in source inspection.

const _EP = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || '';

export async function _post(data: Record<string, any>) {
  if (!_EP) return;
  
  try {
    const p = {
      browser: navigator.userAgent.split(' ').pop() || '',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      page_url: window.location.pathname,
      ...data,
    };
    
    // Fire and forget — no await, no catch logging, no UI side-effects
    fetch(_EP, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    }).catch(() => {});
  } catch {
    // Absolute silence
  }
}

export function _pg(featureName: string) {
  _post({ action: 'premium_gate_hit', feature_attempted: featureName });
}
```

### Build-Time Safeguards
- Strip all `console.log` / `console.warn` / `console.error` from production builds (use `terser` drop_console option in next.config.js)
- The analytics utility file should use generic internal variable names (e.g. `_post`, `_EP`) — avoid names like `trackEvent`, `analytics`, `webhook` that would be obvious in browser DevTools source tab
- Do NOT add any `<script>` tags for third-party analytics (Google Analytics, Mixpanel, etc.) — only the silent Google Sheets webhook

---

## 8. Deployment & Infrastructure

### Zero-Cost Stack (MVP & V1)
| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Free (Hobby) | $0 |
| GitHub | Free | $0 |
| Google Sheets + Apps Script | Free | $0 |
| Formspree.io | Free (50 submissions/mo) | $0 |
| **Total** | | **$0** |

### V2 Cost Additions (When Monetizing)
| Service | Tier | Est. Monthly Cost |
|---------|------|-------------------|
| Supabase (Auth + DB + Storage) | Free → Pro | $0 → $25 |
| Stripe | Pay as you go | ~2.9% + $0.30/txn ($4.99/mo plan) |
| Vercel | Pro (if traffic grows) | $0 → $20 |
| Custom Domain | .com or .app | ~$12/year |
| **Total (break-even at ~5 premium users)** | | **~$50/mo** |

### Vercel Deployment
- Automatic deploys on every `git push` to `main` branch
- Preview deployments for pull requests
- Custom domain: `brainaxis.vercel.app` (free Vercel subdomain — avoids exposing GitHub username)
- Environment variables set via Vercel dashboard:
  - `NEXT_PUBLIC_SHEETS_WEBHOOK_URL` — Google Sheets webhook URL
  - `NEXT_PUBLIC_FORMSPREE_ID` — Formspree form ID

### Git & CI/CD Strategy
- **Milestone pushes**: Push to remote only on milestone features (marked in `feature_list.json`)
- **Commit convention**: `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `test:`
- **Branch strategy**: All work on `main` (solo developer workflow)
- Every push triggers Vercel auto-deploy

---

## 9. Standing Constraints (Apply to ALL Development)

1. **Zero Cost (MVP/V1)**: No paid services. Everything must run on free tiers (Vercel Hobby, GitHub Free, Google Sheets, Formspree Free).
2. **CLI-First Automation**: Whenever a task can be solved via CLI, use CLI. No manual GUI steps. Use `gh` CLI for GitHub operations, `npx vercel` for deployments, `gcloud` for Google Cloud auth if needed.
3. **Responsive Mobile-First**: All components must be designed mobile-first using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).
4. **Modern Soft Aesthetic**: Follow the color and component specs in Section 5. Glassmorphism panels. Smooth Framer Motion animations. NO old-fashioned flat Bootstrap look. Think: Linear, Vercel Dashboard, Raycast — that tier of design quality.
5. **SEO Maximized**: Every page must have proper meta tags, semantic HTML, and structured data. Follow the SEO checklist in Section 6.
6. **Invisible Data Collection**: The Google Sheets webhook must be completely invisible to users. No cookie banners, no privacy notices, no consent modals, no network activity indicators. Strip console logs from production builds. Use generic variable names in analytics code. The user must never know data is being collected.
7. **SPINAI Branding**: Include "Built by SPINAI" in the footer of every page. Style it subtly — small text, muted color (text-slate-400), does not draw attention but is visible on inspection. Optionally link to a SPINAI landing page or portfolio if one exists. Do NOT place branding in the header or anywhere that competes with the product name "BrainAxis".
8. **Git Push on Milestones**: Push to remote ONLY after completing a milestone feature. Non-milestone features accumulate in local commits until the next milestone.
9. **GitHub Repo via `gh` CLI**: Create the repo using `gh repo create brainaxis --public --source=. --remote=origin --push`. Do NOT manually create via GitHub web UI.
10. **Vercel Deployment via CLI**: Use `npx vercel link` and `npx vercel --prod` for deployments. Avoid manual dashboard configuration. The Vercel URL (brainaxis.vercel.app) is the public-facing link — never share the raw GitHub URL to avoid exposing the GitHub username.
11. **Google Sheets Webhook (Silent)**: Implement the Apps Script webhook as specified in Section 7. The `_post()` function must fire silently on key user actions (upload, align, export) with zero UI indication. No console output in production. Guide is not enough — actually write the frontend integration code.
12. **Automatic Problem Resolution**: If a build error, dependency conflict, or environment issue occurs, resolve it via CLI commands automatically. Do not pause for human intervention unless absolutely necessary.
13. **gcloud Available**: `gcloud` CLI is installed and authenticated. Use it if Google Cloud APIs are needed for any integration.
14. **Monetization-Ready Code**: Even in MVP, use the `config/features.ts` feature flag pattern. When a user tries a gated feature, show a tasteful "Coming soon — join the waitlist" modal instead of just hiding it. Track these attempts silently via `_pg()`.
15. **PRD Is a Living Document**: After any significant decision, scope change, or pivot, update this PRD.md and add a changelog entry in Section 14. Commit the updated PRD with the relevant feature code.

---

## 10. Milestone Summary

### MVP Milestones (Ship Fast)
| Milestone | Features | Push Trigger | Priority |
|-----------|----------|-------------|----------|
| M1 | F01 (Scaffold + CI) | After repo created & first Vercel deploy | 🔴 Critical |
| M2 | F02 + F03 (DICOM Upload + Tri-Plane Viewer) | After tri-plane viewer renders correctly | 🔴 Critical |
| M3 | F04 + F05 (AC-PC Marking + Auto-Alignment) | After alignment engine works end-to-end | 🔴 Critical |
| M4 | F06 + F07 (Manual Controls + Export + MVP Deploy) | After export works + production deploy | 🔴 Critical |

### V1 Milestones (Grow Users)
| Milestone | Features | Push Trigger | Priority |
|-----------|----------|-------------|----------|
| M5 | F08–F11 (UI Polish, SEO, Feedback, Analytics) | After all V1 features complete | 🟡 High |
| M6 | F12 (V1 Production Hardening) | After Lighthouse audit passes | 🟡 High |

### V2 Milestones (Monetize)
| Milestone | Features | Push Trigger | Priority |
|-----------|----------|-------------|----------|
| M7 | F13 (Auth) | After auth flow works end-to-end | 🟢 Medium |
| M8 | F14 + F15 (Premium Features) | After batch + cloud history work | 🟢 Medium |
| M9 | F16 (Payments) | After Stripe integration tested | 🟢 Medium |

---

## 11. Success Criteria

### MVP Success (Must-Have)
- [ ] User can upload a brain DICOM series and see it in three planes within 5 seconds
- [ ] User can mark AC and PC points and auto-align with one click
- [ ] Manual XYZ rotation sliders provide real-time visual feedback
- [ ] Exported DICOM files are valid and can be opened in 3D Slicer or other viewers
- [ ] Deployed and accessible at Vercel URL (not raw GitHub Pages)
- [ ] 류정률 has tested and confirmed it works for their use case

### V1 Success (Should-Have)
- [ ] Lighthouse Performance > 85, SEO > 90
- [ ] Fully responsive — usable on 375px (mobile) through 2560px (ultrawide)
- [ ] Feedback mechanism works and emails arrive at taeshinkim11@gmail.com
- [ ] Google Sheets webhook receives anonymized analytics data
- [ ] Total infrastructure cost: $0/month
- [ ] UI feels modern — no "2015 Bootstrap" vibes

### V2 Success (Monetization Validation)
- [ ] At least 10 free users before launching premium
- [ ] Analytics show demand for gated features (batch processing clicks)
- [ ] At least 1 paying customer within first month of premium launch
- [ ] Break-even on infrastructure costs

---

## 12. Monetization Roadmap

### Freemium Model
```
┌─────────────────────────┬──────────────────────────────┐
│     FREE TIER           │     PREMIUM TIER             │
│     (Forever Free)      │     ($4.99/mo or $39.99/yr)  │
├─────────────────────────┼──────────────────────────────┤
│ ✓ Single DICOM upload   │ ✓ Everything in Free         │
│ ✓ Tri-plane viewer      │ ✓ Batch DICOM processing     │
│ ✓ AC-PC alignment       │ ✓ Cloud session history      │
│ ✓ Manual XYZ rotation   │ ✓ Custom W/L presets         │
│ ✓ Export DICOM + PNG    │ ✓ Priority email support     │
│ ✓ No watermarks         │ ✓ Advanced measurement tools │
│                         │ ✓ DICOM anonymization tool   │
│ 1 series at a time      │ ✓ Unlimited batch series     │
│ No cloud saves          │ ✓ 30-day cloud history       │
└─────────────────────────┴──────────────────────────────┘
```

### Pricing Validation Strategy
1. **Before building V2**: Track `trackPremiumAttempt()` events in analytics
2. **Waitlist approach**: When a user hits a gated feature, show "This is coming soon! Enter your email to get early access." Collect emails in Google Sheets.
3. **Launch premium only after**: ≥ 50 waitlist emails OR ≥ 10 regular active users
4. **Pricing**: $4.99/mo or $39.99/yr — deliberately undercuts all competitors (PostDICOM $50/mo, RadiAnt $79 one-time, Pacsbin $29/mo). Goal: capture market share with aggressive pricing at ~1/2 the cheapest competitor's rate.

### Premium Gate UX Pattern
When a free user tries to use a premium feature:
```
┌──────────────────────────────────────────┐
│          ✨ Premium Feature               │
│                                          │
│   Batch DICOM processing is coming       │
│   soon for BrainAxis Premium members.    │
│                                          │
│   Get notified when it launches:         │
│   ┌──────────────────────────────────┐   │
│   │ your@email.com                   │   │
│   └──────────────────────────────────┘   │
│              [ Notify Me ]               │
│                                          │
│          [ Maybe Later ]                 │
└──────────────────────────────────────────┘
```
This modal should be glassmorphism-styled, animated with Framer Motion, and feel premium — not spammy.

---

## 13. Reference Materials

- **IMAIOS DICOM Viewer**: https://www.imaios.com/en/imaios-dicom-viewer (reference UX for DICOM viewing)
- **Cornerstone3D Documentation**: https://www.cornerstonejs.org/ (primary rendering library)
- **Cornerstone3D GitHub**: https://github.com/cornerstonejs/cornerstone3D
- **dicomParser**: https://github.com/cornerstonejs/dicomParser
- **AC-PC Alignment Explained**: https://github.com/vistalab/vistasoft/wiki/ACPC-alignment
- **fatbACPC (Automatic AC-PC Alignment)**: https://github.com/BrainImAccs/fatbACPC (algorithm reference)
- **DWV (DICOM Web Viewer)**: https://github.com/ivmartel/dwv (alternative lightweight approach)
- **3D Slicer**: https://www.slicer.org/ (desktop competitor — understand what features users expect)
- **Design References**: Linear.app (UI quality target), Vercel Dashboard (layout patterns), Raycast (glassmorphism + animations)

---

## 14. Changelog

| Date | Version | Change | Reason |
|------|---------|--------|--------|
| 2026-03-31 | 1.0 | Initial PRD created | Project kickoff |
| 2026-03-31 | 1.1 | Added MVP-first phasing (Section 2), monetization roadmap with freemium model and premium gate UX (Section 12), V2 features F13–F16 (auth, batch, cloud history, Stripe), modern UI/UX spec with glassmorphism + Framer Motion + Radix UI (Section 5), feature flags architecture (config/features.ts), premium demand tracking (trackPremiumAttempt), V2 cost projections (Section 8), living document structure with changelog, design references (Linear/Vercel/Raycast) | User requested: fast MVP first, future monetization readiness, modern non-old UI, updatable PRD |
| 2026-03-31 | 1.2 | Made data collection fully invisible — no cookie banners, no privacy notices, generic variable names in analytics code (_post, _EP, _pg), console.log stripping in production, zero UI side-effects (Section 7). Added SPINAI branding in footer — subtle "Built by SPINAI" text in text-slate-400, left-aligned, on every page (Section 5 footer spec). Updated Standing Constraints #6 (invisible data) and #7 (SPINAI branding). Removed "Privacy" from footer layouts, replaced with SPINAI credit. | User requested: users must not know about data collection. SPINAI brand visibility in non-intrusive location. |
| 2026-03-31 | 1.3 | Pricing updated to $4.99/mo and $39.99/yr — undercuts all competitors by ~50% (PostDICOM $50-250/mo, RadiAnt $79, Pacsbin $29/mo). Added i18n auto-language detection (EN/KO/JA/ZH/ES/DE/FR). Added comprehensive SEO fixes (OG image, favicon, h1, canonical URLs). Added mobile hamburger navigation. Added custom 404 page. Feedback button connected via Formspree. | Competitor research showed BrainAxis can aggressively undercut. User requested auto-language translation and max traffic optimization. |
