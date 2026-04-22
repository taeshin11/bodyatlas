# BodyAtlas — 기능 인벤토리

> ⚠️ **의무 갱신 규칙 (MANDATORY)**
> 기능을 **추가 / 삭제 / 리네임 / 이동**할 때마다 이 파일을 같은 커밋에서 수정해야 한다.
> 예: 새 region 추가 → 해당 표에 행 추가 / 새 plane 도입 → AtlasViewer 섹션 갱신 / 새 페이지 추가 → "Routes" 섹션에 추가.
> `.githooks/commit-msg` 가 feature 코드 변경 + FEATURES.md 미갱신 커밋을 자동 차단한다.
> 예외: 순수 리팩터링일 때 커밋 메시지에 `[skip-features-check]` 포함.
> 리포 clone 직후 `scripts/install-hooks.bat` (또는 `.sh`) 한 번 실행하여 훅 활성화.
> **기능 코드가 바뀌었는데 FEATURES.md가 안 바뀌었으면 커밋이 누락된 것이다.**

---

## 📖 목차

1. [Routes (페이지)](#1-routes-페이지)
2. [Core 컴포넌트](#2-core-컴포넌트)
3. [Atlas 데이터셋](#3-atlas-데이터셋)
4. [i18n (다국어)](#4-i18n-다국어)
5. [외부 통합](#5-외부-통합)
6. [키보드/마우스 인터랙션 요약](#6-키보드마우스-인터랙션-요약)
7. [상태 관리](#7-상태-관리)
8. [자동화 파이프라인](#8-자동화-파이프라인)

---

## 1. Routes (페이지)

| 경로 | 파일 | 역할 |
|------|------|------|
| `/` | `src/app/page.tsx` | 메인 Atlas 뷰어 페이지 |
| `/about` | `src/app/about/page.tsx` | 소개 + IMAIOS 비교표 + FAQ |
| `/how-to-use` | `src/app/how-to-use/page.tsx` | 3단계 사용법 + Pro Tips + 10-FAQ |
| `/download` | `src/app/download/page.tsx` | PWA 설치 가이드 (플랫폼별) |
| `/privacy` | `src/app/privacy/page.tsx` | 개인정보 11개 섹션 |
| `/terms` | `src/app/terms/page.tsx` | 이용약관 13개 섹션 |
| 404 | `src/app/not-found.tsx` | 404 페이지 |
| `/sitemap.xml` | `src/app/sitemap.ts` | 7개 언어 hreflang |
| `/robots.txt` | `src/app/robots.ts` | 다국어 크롤러 허용 |
| `/opengraph-image` | `src/app/opengraph-image.tsx` | OG 이미지 (dynamic) |

### 1.1 `/` Home (`src/app/page.tsx`)
- **상단 Hero (SEO)**: h1 "Free Interactive Cross-Sectional Anatomy Atlas" + 부제
- **RegionSelector**: 2행 (Original / SPINAI) — [§2.3](#23-regionselectortsx)
- **모드 토글**: Explore (기본) / Quiz — 우측 패널 컴포넌트를 결정
- **뷰어 영역** (`isXray` 분기):
  - `our_xray` 선택 시 → `SpineXrayViewer`
  - 그 외 → `AtlasViewer`
- **우측 패널** (`quizMode` 분기):
  - 기본: `StructurePanel` (검색)
  - Quiz on: `QuizPanel` (랜덤 구조 맞히기, 점수 기록)
- **모달 오버레이**: `AuthGate` (locked region 클릭 시)
- **고정 위치 UI**: `FeedbackButton`(오른쪽 하단), `InstallPrompt`(왼쪽 하단, 30초 후)

### 1.2 `/about`
- IMAIOS 대안 소개 + 비교표 (무료 vs $7/월)
- Key Features 리스트 (Check 아이콘)
- 5단계 사용 가이드
- FAQ (expandable `<details>`)

### 1.3 `/how-to-use`
- 3단계 Getting Started (Choose Region / Navigate / Search)
- Pro Tips (Offline / Shortcuts / Multi-language)
- 10-item FAQ
- CTA 버튼 (→ `/`)
- **JSON-LD**: HowTo + FAQPage 스키마

### 1.4 `/download`
- **플랫폼 자동 감지**: Windows/Mac/Linux/Android/iOS/Chrome OS
- Quick Install 카드 (PWA 지원 브라우저 한정)
- 플랫폼별 설치 가이드 (5개 섹션)
- Why Install (오프라인/즉시실행/자동업데이트)
- FAQ (4 items)

### 1.5 `/privacy`
11 섹션: Intro, Collect, Use, Cookies/3rd-party, Retention, Sharing, Rights, Children, International, Changes, Contact
- Formspree, Google Analytics, AdSense, Vercel 명시

### 1.6 `/terms`
13 섹션: Acceptance, Description, **Medical Disclaimer** (bold), Acceptable use, IP, User content, 3rd-party, Warranty, Liability, Indemnification, Korean law jurisdiction, Severability, Contact

---

## 2. Core 컴포넌트

### 2.1 `AtlasViewer.tsx` — 3D 교차단면 뷰어

**Primary role:** axial/sagittal/coronal plane을 png+json 오버레이로 렌더링.

**Plane tabs** (`info.json`에서 동적 생성):
- axial / sagittal / coronal / (ap) — atlas별로 다름

**Sub-features:**
- 슬라이스 슬라이더 (min=regionAxialRange[0], max=…[1])
- Plane tab 버튼
- **Labels 토글 버튼** (`showOverlay`)
- **Slice 정보 badge** (좌상단 plane 이름, 우상단 현재/최대)
- **SVG overlay**: 구조별 fill/stroke (active 0.4 / idle 0.22 / 선택시 unselected 0.05)
- **Animated tooltip**: 컬러 닷 + EN 이름 + 로컬 이름 + 카테고리
- 키보드/스크롤 hint (모바일 숨김)

**인터랙션:**
- Wheel: ±1 slice (passive: false → 페이지 스크롤 차단)
- Arrow Up/Left: -1, Arrow Down/Right: +1, Esc: 선택 해제
- SVG hover: point-in-polygon → tooltip
- SVG click: `onStructureSelect(structure)`
- 구조 선택 시: 해당 구조의 `bestSlice[plane]`로 자동 이동

**Data flow:**
- `${dataPath}/info.json` → planes & slice count
- `${dataPath}/structures.json` → 구조 메타
- `${dataPath}/{plane}/{slice:0004d}.png` → CT/MRI 이미지
- `${dataPath}/labels/{plane}/{slice}.json` → contour 좌표

**State toggles:** `activeTab`, `sliceIndices`, `showOverlay`, `hoveredStructure`, `selectedStructure`, `tooltipPos`, `imgNatural`, `forceAxial` (외부 리렌더 트리거)

### 2.2 `SpineXrayViewer.tsx` — 동적 view X-ray 뷰어

**Primary role:** `info.json`의 `planes` 키에 따라 1~2 view 동적 렌더링 (Spine=dual, Hand/Foot=single).

**Sub-features:**
- View label 행 (Lateral / AP — i18n), 가용 view만 표시
- **Case 네비게이터** (`caseCount > 1`일 때): `← Case N / N →` 버튼 + 좌/우 화살표 키보드 (wrap-around)
- `caseCount`는 `info.planes[view].slices` 중 최솟값으로 결정
- Info strip: hover 안내 + 케이스 전환 힌트
- Dynamic grid: `grid-cols-1` (single) / `grid-cols-2` (dual)
- **Labels 토글** (showOverlay)
- Canvas 2D rendering (drawImage + polygon fill/stroke)
- 호버 view별 독립 tooltip
- `caseIndex` 변경 시 이미지 + 라벨 재로드 (0-padded 4-digit 파일명)

**Data:** `${dataPath}/structures.json` + `${dataPath}/info.json` + `${dataPath}/{view}/{caseId}.png` + `${dataPath}/labels/{view}/{caseId}.json` (caseId = 0-padded 4 digits)

**인터랙션:** canvas hover → point-in-poly → tooltip / canvas click → select / ←·→ 키 or 버튼 → 케이스 전환

### 2.3 `RegionSelector.tsx` — Body region 스위처

**구조:** 2행 (Original / SPINAI), 각 행은 flex 버튼.

**Body Regions (10개):**

| Group | ID | Label (EN / KO) | Icon | dataPath | axialRange | defaultSlice | free |
|-------|----|------------------|------|----------|-----------|--------------|------|
| Original | `head_neck` | Head & Neck / 머리·목 | 🧠 | `/data/head-ct` | - | 100 | ✓ |
| Original | `chest` | Chest / 흉부 | 🫁 | `/data/chest-ct` | 200–405 | 320 | ✓ |
| Original | `abdomen` | Abdomen / 복부 | 🫀 | `/data/chest-ct` | 80–200 | 160 | ✓ |
| Original | `pelvis` | Pelvis / 골반 | 🦴 | `/data/chest-ct` | 0–80 | 40 | ✓ |
| SPINAI | `our_head` | Head CT / 두부 CT | 🧠 | `/data/our-head-ct` | - | 116 | ✓ |
| SPINAI | `our_chest` | Chest CT / 흉부 CT | 🫁 | `/data/our-ct` | 260–428 | 350 | ✓ |
| SPINAI | `our_abdomen` | Abdomen CT / 복부 CT | 🫀 | `/data/our-ct` | 120–260 | 200 | ✓ |
| SPINAI | `our_pelvis` | Pelvis CT / 골반 CT | 🦴 | `/data/our-ct` | 0–120 | 60 | ✓ |
| SPINAI | `our_brain_mri` | Brain MRI / 뇌 MRI | 🧲 | `/data/brain-mri-commercial` | - | 128 | ✓ |
| SPINAI | `lumbar_mri` | Lumbar MRI / 요추 MRI | 💿 | `/data/our-lumbar-mri` | - | 25 | ✓ |
| SPINAI | `our_xray` | Spine X-ray / 척추 X-ray | 📷 | `/data/our-xray` | - | 0 | ✓ |
| SPINAI | `our_hand_xray` | Hand X-ray / 손 X-ray | ✋ | `/data/our-hand-xray` | - | 0 | ✓ |
| SPINAI | `our_foot_xray` | Foot X-ray / 발 X-ray | 🦶 | `/data/our-foot-xray` | - | 0 | ✓ |

**인터랙션:**
- 버튼 클릭 → `onRegionSelect(id)` (locked 지역은 AuthGate 호출)
- Lock 아이콘 표시 (`!free && !isAuthenticated`)
- `activeRegion === id`이면 indigo 배경
- 그룹 prefix 라벨: "ORIGINAL" (slate), "SPINAI" (indigo)

### 2.4 `StructurePanel.tsx` — 구조 검색·목록

**Sub-features:**
- **검색 입력**: name + displayName(전언어) 대상 multi-token AND 필터
- **카테고리별 그룹화** (i18n): Organs / Bones / Vessels / Muscles / Cavities / Glands / Nerve / Brain / Other
- **카테고리별 개수 표시**
- 리스트 항목: 컬러 닷 + 이름, 클릭 → selectedStructure
- 선택된 구조 상세 카드: 컬러 닷 + EN + 로컬 + 카테고리 + 닫기 버튼
- `regionAxialRange` prop으로 해당 범위의 구조만 필터

**Styling:** glass (bg-white/70 backdrop-blur), maxHeight 80vh overflow-y-auto

### 2.4b `QuizPanel.tsx` — 랜덤 구조 맞히기 (R21 신규)

**Activation:** page.tsx의 모드 토글 → "Quiz" 선택 시 StructurePanel 자리에 렌더 (lazy-loaded `next/dynamic`).

**Sub-features:**
- 현재 atlas의 `structures.json`에서 랜덤 1개 추첨, 로컬 displayName으로 출제
- 사용자가 viewer (Atlas/SpineXray)에서 구조 클릭 → `selectedStructure` 변화로 자동 채점
- 정답: `<Check>` ✓ + emerald 배너 / 오답: `<X>` ✗ + 클릭한 구조 표시
- 점수 표시: `correct/total` + 정확도 %
- "Next question" 버튼: 새 랜덤 구조 (직전 문제 제외)
- "Reset" 버튼: 점수 0으로 초기화
- atlas 변경 시 자동 reset
- 채점은 (target, click) 페어당 1회 (`lastJudgedIdRef`로 이중 채점 방지)

**i18n keys:** `mode.explore`, `mode.quiz`, `quiz.title`, `quiz.findThis`, `quiz.score`, `quiz.correct`, `quiz.wrong`, `quiz.youClicked`, `quiz.next`, `quiz.reset`, `quiz.hint`, `quiz.loading`, `quiz.noStructures` (EN+KO 정의, 나머지 5개 locale은 EN fallback)

### 2.5 `Header.tsx`
- Logo (BookOpen + "BodyAtlas" + 부제)
- Desktop nav: `/download` / `/how-to-use` / `/about`
- Mobile hamburger (AnimatePresence 오버레이)

### 2.6 `Footer.tsx`
- About / How to Use / Privacy / Terms / Contact(mailto)
- SPINAI 크레딧 + 자동 연도

### 2.7 `FeedbackButton.tsx` — 피드백 위젯
- Floating 버튼 (우하단, `scale` 모션)
- 모달: textarea + email + Send
- 전송 경로: Formspree POST → fallback mailto
- 상태: idle / sending / sent (2초 후 자동 닫힘)
- **로그**: `createLogger('feedback')` — POST URL/status/ms + 실패시 body

### 2.8 `InstallPrompt.tsx` — PWA 설치 제안
- `beforeinstallprompt` 이벤트 수신 → 30초 후 표시
- 이미 설치됨 (`display-mode: standalone`) 감지 시 skip
- Install / Dismiss 버튼
- **로그**: `createLogger('install')` — 이벤트/선택/dismiss

### 2.9 `AuthGate.tsx` — 이메일 인증 모달
- 이메일 입력 → `signInWithEmail()` (magic link)
- 상태: idle / sending / emailSent / error
- 닫기 버튼 (optional)

### 2.10 `ErrorBoundary.tsx` — React 에러 경계
- `getDerivedStateFromError` + `componentDidCatch`
- 에러 메시지 + **expandable stack trace** (dev: full, prod: message만)
- componentStack 출력
- Reload 버튼
- **로그**: `createLogger('ErrorBoundary')`

### 2.11 `GlobalErrorListener.tsx` — 전역 에러 핸들러
- `window.onerror` + `unhandledrejection` 등록 (once at layout.tsx)
- **로그**: `createLogger('global')`

### 2.12 `ServiceWorkerRegister.tsx` — PWA SW 등록
- `/sw.js` 등록
- `updatefound` + state change 감지
- **로그**: `createLogger('sw')` — scope/state/update

---

## 3. Atlas 데이터셋

| 폴더 | 소비 Region(s) | planes | 구조 수 | 라이선스 |
|------|----------------|--------|---------|---------|
| `head-ct/` | head_neck | axial/sagittal/coronal | 13 | Apache 2.0 (학술 필터링 후) |
| `chest-ct/` | chest, abdomen, pelvis (axialRange 분할) | 3-plane | 108 | Apache 2.0 |
| `our-head-ct/` | our_head | 3-plane | - | Apache 2.0 |
| `our-ct/` | our_chest, our_abdomen, our_pelvis | 3-plane | 65 | Apache 2.0 (`unet_ct_c65`) |
| `our-lumbar-mri/` | lumbar_mri | 3-plane | 17 | Apache 2.0 (`unet_mri_c26`) |
| `our-xray/` | our_xray | ap, lateral | 21 | Apache 2.0 (`unet_xray_c34`) |
| `our-hand-xray/` | our_hand_xray | ap | 1 (binary) | Apache 2.0 (`unet_hand_ANON_v3_c2`) |
| `our-foot-xray/` | our_foot_xray | ap | 1 (binary) | Apache 2.0 (`unet_foot_ANON_v2_c2`) |
| `brain-mri-commercial/` | our_brain_mri | 3-plane | - | Apache 2.0 (FastSurfer+MedSAM) |

**각 폴더 공통 구조:**
- `info.json`: `{ planes: { <name>: { slices: N } }, window?, voxelSpacing? }`
- `structures.json`: `{ totalStructures, structures: [{ id, name, displayName:{en,ko,ja,zh,es,de,fr}, category, color, bestSlice, sliceRange }] }`
- `{plane}/*.png` (4-digit zero-pad)
- `labels/{plane}/*.json`: `[{ id, name, contours: [[[x,y],...]] }]`

---

## 4. i18n (다국어)

**지원 locale:** `en, ko, ja, zh, es, de, fr`

**String 카테고리** (`src/lib/i18n.ts`):
- `header.*` — about, download
- `footer.*` — builtBy
- `feedback.*` — title, placeholder, email, send, sending, thanks
- `install.*` — title, desc, button
- `error.*` — title, message, refresh
- `notfound.*` — title, message, back

**구조 displayName은 atlas의 `structures.json`에 언어별로 저장** (7-language inline).

---

## 5. 외부 통합

| 서비스 | 용도 | 코드 위치 |
|--------|------|-----------|
| **Formspree** | 피드백 전송 (fallback: mailto) | `FeedbackButton.tsx` |
| **Supabase** | 이메일 매직링크 auth | `src/lib/supabase.ts`, `auth-context.tsx` |
| **Google Analytics** | 사용 통계 | `layout.tsx` |
| **Google AdSense** | 광고 (pub: ca-pub-7098271335538021) | `layout.tsx` head |
| **Vercel** | 호스팅 / CDN / 자동 배포 | - |
| **IndexNow** | 배포시 검색엔진 ping (Bing/Yandex/IndexNow) | `scripts/submit-indexnow.mjs` (postbuild) |
| **Service Worker** | 오프라인 캐싱 | `/sw.js`, `ServiceWorkerRegister.tsx` |
| **Kaggle API** | 데이터셋 다운로드 전용 (업로드 금지) | `scripts/` (수동) |

**포털 검증 메타태그** (`.env.local` 의존):
- `NEXT_PUBLIC_NAVER_VERIFICATION`
- `NEXT_PUBLIC_BING_VERIFICATION`
- `NEXT_PUBLIC_YANDEX_VERIFICATION`
- `NEXT_PUBLIC_BAIDU_VERIFICATION`

**사이트 URL centralization** (`src/lib/site-config.ts`):
- `SITE_URL` = `process.env.NEXT_PUBLIC_SITE_URL` || `'https://bodyatlas-ten.vercel.app'` (fallback)
- `SITE_HOST` = URL.host (표시용, 예: "bodyatlas-ten.vercel.app")
- `OG_IMAGE` = `${SITE_URL}/opengraph-image`
- `siteUrl('/path')` 헬퍼
- 사용처: `layout.tsx`(metadataBase/canonical/og/twitter/JSON-LD), `sitemap.ts`, `robots.ts`, 각 `page.tsx`의 metadata, `DownloadContent.tsx`·`privacy/page.tsx`·`terms/page.tsx`의 도메인 표시, `scripts/submit-indexnow.mjs`
- 배포 URL 변경 시 `.env.local` (local) + Vercel env (prod)에 `NEXT_PUBLIC_SITE_URL`만 세팅하면 전파

---

## 6. 키보드/마우스 인터랙션 요약

| 입력 | 동작 | 컴포넌트 |
|------|------|----------|
| ↑ / ← | 이전 slice | AtlasViewer |
| ↓ / → | 다음 slice | AtlasViewer |
| ← / → | 이전/다음 케이스 (wrap-around, `caseCount > 1`일 때만) | SpineXrayViewer |
| Esc | 구조 선택 해제 | AtlasViewer |
| Mouse wheel | ±1 slice (페이지 스크롤 차단) | AtlasViewer |
| SVG/Canvas hover | point-in-polygon → tooltip | AtlasViewer, SpineXrayViewer |
| SVG/Canvas click | 구조 선택 | AtlasViewer, SpineXrayViewer |
| Slider drag | slice 직접 이동 | AtlasViewer |
| ← Case N / N → 버튼 | 케이스 네비게이션 | SpineXrayViewer |
| Labels 버튼 | overlay on/off | AtlasViewer, SpineXrayViewer |
| Plane tab | axial/sagittal/coronal 전환 | AtlasViewer |
| Region 버튼 | region 전환 (locked → AuthGate) | RegionSelector |
| 검색 input | multi-token AND 필터 | StructurePanel |
| Feedback 버튼 | 모달 토글 | FeedbackButton |

---

## 7. 상태 관리

- **글로벌**: React Context (I18nProvider, AuthProvider)
- **Redux/Zustand 없음**: 최상위 state는 `page.tsx`에서 들어올림
- **localStorage**: `bodyatlas_trial_used` (trial flag)
- **Supabase auth state**: `onAuthStateChange` 구독

---

## 8. 자동화 파이프라인

### 8.1 SPINAI 모델 → Atlas 자동 교체
**`scripts/auto_model_monitor.py`** (Windows Task Scheduler, 일일 실행)
- 1/4 scan models: `D:/ImageLabelAPI_SPINAI/outputs/models/` train.log 파싱
- 2/4 evaluate: 기준 통과 + 새 모델 감지 (ct≥0.85, mri≥0.70, xray≥0.90)
- 3/4 rebuild atlas: 모달리티별 핸들러 호출
- 4/4 git commit + push

**모달리티별 빌더:**
- `gen_our_ct_atlas.py` — CT 65-class → `/data/our-ct`
- `gen_our_lumbar_mri_atlas.py` — MRI 26-class → `/data/our-lumbar-mri`
- `gen_our_xray_atlas.py` — X-ray 34-class → `/data/our-xray`
- `gen_our_joint_xray_atlas.py` — 2-class hand/foot binary X-ray → `/data/our-hand-xray`, `/data/our-foot-xray` (`--modality hand|foot`)
- `gen_full_ct_atlas.py` — chest-ct (TotalSegmentator)
- `gen_head_ct_atlas.py` — head-ct (TotalSegmentator, 학술 필터링)
- `gen_brain_mri_hybrid.py` — `/data/brain-mri-commercial` (FastSurfer+MedSAM)

### 8.2 배포
- `npm run build` → `next build` → `scripts/submit-indexnow.mjs` (postbuild)
- IndexNow: api.indexnow.org + Bing + Yandex POST
- `scripts/build_and_push.py` — 통합 5-stage (git status / tsc / build / commit / push)

### 8.3 로깅
- **Python**: `scripts/_log_utils.py` — `Logger` + `Stage` + `install_excepthook`
- **Frontend**: `src/lib/logger.ts` — `createLogger(namespace)` + `loggedFetch` + `installGlobalErrorHandlers`
- 모든 subprocess/fetch/localStorage 쓰기 로깅됨

### 8.4 Batch entry
- `scripts/auto_monitor.bat` — Task Scheduler에서 호출, `[BAT]` 태그로 shell 레벨 이벤트 기록

---

_마지막 업데이트: 2026-04-21 — 기능 추가/변경 시 이 파일을 반드시 같은 커밋에서 수정할 것._
