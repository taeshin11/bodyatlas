# BodyAtlas

**Free interactive cross-sectional anatomy atlas** — browse labeled CT and MRI cross-sections with instant structure search, on any device, online or offline. Built for medical students, radiology residents, and anatomy learners.

> No account, no install required. Works in 7 languages. PWA-installable for offline study.

---

## Features

- **9 atlases**: Head CT, Chest/Abdomen/Pelvis CT, Brain MRI, Lumbar MRI, Spine X-ray, Hand X-ray, Foot X-ray
- **Tri-plane viewer**: axial / sagittal / coronal cross-sections with slice scrubber, mouse wheel, and arrow keys
- **Hover-to-name + click-to-pin** over labeled structures with SVG overlay (toggle on/off)
- **Instant structure search** with multi-token AND filter, locale-aware names (EN/KO/JA/ZH/ES/DE/FR)
- **Quiz mode** — randomly drilled structures, Easy (labels visible) or Hard (no labels) difficulty, score + accuracy tracking
- **PWA**: offline atlas browsing after first visit, installable on iOS/Android/desktop
- **Accessibility**: keyboard nav, skip-to-main link, ARIA labels, dynamic `<html lang>`
- **i18n**: 7 locales auto-detected from `navigator.language`

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript
- Tailwind CSS + Framer Motion
- Custom service worker (cache-first for atlas data)
- Atlas data pipeline: TotalSegmentator (Apache 2.0) + custom UNet models trained at SPINAI

## Quick start

```bash
npm install
npm run dev             # dev server on :3000 (or PORT=3500 npm run dev)
npm run build           # production build
npm run start           # serve production build
npm run check-atlases   # verify every BODY_REGIONS atlas has matching public/data/ folder
```

Optional environment variables (`.env.local`):

```bash
NEXT_PUBLIC_SITE_URL=https://your-deploy-url        # baked into canonical/OG/JSON-LD
NEXT_PUBLIC_FORMSPREE_ID=                           # feedback widget endpoint
NEXT_PUBLIC_SHEETS_WEBHOOK_URL=                     # silent analytics sink
NEXT_PUBLIC_GOOGLE_VERIFICATION=                    # Search Console
NEXT_PUBLIC_NAVER_VERIFICATION=                     # Naver Search Advisor
NEXT_PUBLIC_BING_VERIFICATION=                      # Bing Webmaster
NEXT_PUBLIC_BAIDU_VERIFICATION=                     # Baidu
NEXT_PUBLIC_YANDEX_VERIFICATION=                    # Yandex
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages (`/`, `/about`, `/how-to-use`, `/download`, `/privacy`, `/terms`, `sitemap.ts`, `robots.ts`) |
| `src/components/` | `AtlasViewer`, `SpineXrayViewer`, `StructurePanel`, `QuizPanel`, `RegionSelector`, `Header`, `Footer`, `AuthGate`, `FeedbackButton`, `InstallPrompt` |
| `src/lib/` | i18n, auth context, logger, site-config (URL centralization) |
| `public/data/<atlas>/` | Per-atlas `info.json` + `structures.json` + `{plane}/*.png` slices + `labels/{plane}/*.json` polygon contours |
| `scripts/` | Atlas builders (`gen_*_atlas.py`), `auto_model_monitor.py` (SPINAI inference → atlas regen → git push), IndexNow submitter |
| `FEATURES.md` | Living feature inventory (mandatory-update via commit-msg hook) |
| `HANDOVER.md` | Cross-machine handover doc (per-session snapshot) |
| `claude-progress.txt` | Append-only session log |

## Atlas data licenses

All deployed atlases are Apache 2.0 compatible. Sources:

- TotalSegmentator v2 (Apache 2.0) — chest/abdomen/pelvis CT, head CT
- Custom UNet (`unet_ct_c65`, `unet_xray_c34`, `unet_mri_c26`, hand/foot binary) trained at SPINAI on internally-licensed data
- FastSurfer + MedSAM hybrid for `brain-mri-commercial`

Removed during license cleanup (Session 12, R20): OpenMAP-T1 (CC BY-NC), CADS (CC BY-NC-SA), VISTA3D (NCLS non-commercial), CTSpine1K, brain-pet, spine-xray legacy.

## Development workflow

- **Commits** that change feature code (`src/components/`, page routes, `src/lib/{auth-context,i18n,logger}`, atlas `info/structures.json`, atlas builders, `package.json`) require `FEATURES.md` updates in the same commit. The `.githooks/commit-msg` hook enforces this; install via `bash scripts/install-hooks.sh` (or `.bat`).
- Pure refactors can opt out with `[skip-features-check]` in the commit message.
- Don't run `next build` while `next dev` is up — they share `.next/` and the running dev server will serve stale chunks. Kill dev → `rm -rf .next` → build → restart dev.

## Credits

Built by [SPINAI](http://www.spinai.net). Atlas annotation models trained internally; viewer code MIT-licensable on request.

## License

ISC (per `package.json`). Atlas data licensing is per-source — see *Atlas data licenses* above.
