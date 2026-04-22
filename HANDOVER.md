# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 📋 세션 의무 규칙

1. **세션 종료 시 이 HANDOVER.md 덮어쓰기** (현재 상태 스냅샷)
2. **`claude-progress.txt`에 Session 추가** (append-only)
3. **기능 추가/변경 시 반드시 같은 커밋에서 `FEATURES.md` 수정** — `.githooks/commit-msg` 가 feature 코드 변경 + FEATURES.md 미갱신을 차단함 (escape hatch: 커밋 메시지에 `[skip-features-check]`)
4. **git commit + push**

---

## 🅿️ Vercel prod 상태 (R20 declaration: 자동 복구 공식 포기)

`bodyatlas-ten.vercel.app` 여전히 404 (Session 15 발견 이후 미복구). R20 공식 선언으로 **자동 헬스 체크 / 복구 시도 중단** — 자격증명·URL·도메인 결정이 사용자 영역이라 loop iter마다 측정만 하면 시그널 노이즈만 누적. 사용자가 명시적으로 "새 Vercel 프로젝트 만들었다, URL은 X" 하면 그때 재진입.

**남아있는 사용자 결정 옵션 (변화 없음):**
- (a) 새 Vercel 프로젝트 생성 — `npx vercel deploy --prod` (`.vercel/project.json` 먼저 삭제)
- (b) 다른 호스팅 (Cloudflare Pages, Netlify) 마이그레이션
- (c) 커스텀 도메인 구매 후 연결 (장기 방향)

**URL centralization (R16) 동작:** `src/lib/site-config.ts`가 모든 baked URL의 단일 소스. 새 URL 확정 시 `.env.local` + Vercel env에 `NEXT_PUBLIC_SITE_URL=https://<new>` 세팅 → rebuild → 28+ 지점 자동 반영.

## 🏃 지금 바로 할 일 (R34 세션 종료 시점)

**현재 상태 요약:** 9 atlas (head-ct, chest-ct, our-head-ct, our-ct, brain-mri-commercial, our-lumbar-mri, our-xray, our-hand-xray, our-foot-xray). Quiz Mode (Easy/Hard, 7 locale i18n, binary atlas 자동 토글 숨김 + 자동 disable). PWA offline (sw.js cache-first `/data/` + auto_model_monitor가 atlas 갱신 시 CACHE_NAME 자동 bump). Accessibility 스택 (skip-link, mobile 햄버거 aria, dynamic html lang). Region localStorage 영속화. Atlas integrity check (`npm run check-atlases` + .githooks/pre-commit). README + .env.example + HANDOVER 모두 갱신. 모든 변경 GitHub master 도달, **prod는 Vercel 미복구로 미반영** (R20 declaration: 자동 복구 공식 포기).

**세션 시작 시 매번:**
1. `python scripts/auto_model_monitor.py` 실행 (매 세션 규칙). atlas 갱신 시 sw.js CACHE_NAME 자동 bump 포함 (R27).
2. 좀비 점검: `tasklist //FI "IMAGENAME eq node.exe"`
3. (선택) 신규 SPINAI 모델 진행 확인
4. (개발 시작 전) `bash scripts/install-hooks.sh` — `.githooks/` 활성화 (commit-msg + pre-commit)

**상시 사용자 결정 대기:**
- Vercel 새 프로젝트 (위 🅿️ 블록) — 결정 시 `NEXT_PUBLIC_SITE_URL` 세팅으로 28+ baked URL 자동 반영
- Task Scheduler 등록 (`scripts/setup_scheduler.bat` 관리자 권한)
- 검색 포털 인증코드 (Google/Naver/Bing/Baidu/Yandex) → `.env.local`
- 커스텀 도메인 (장기 방향)

**Loop discipline 메모 (`.claude/.../memory/feedback_drift_declarations.md`):** 다음 /loop 라운드들은 (a) 번들 사이즈 변동 보고 금지 (R11 floor), (b) Vercel prod 헬스 체크 금지 (R20 포기), (c) 같은 모듈 영역 3 iter 연속 회피 권장.

## 📝 Session 17 (2026-04-22) 주요 결정사항

- **라이브 테스트:** 9 라우트 전수 200 (`/`, `/about`, `/download`, `/how-to-use`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`, `/opengraph-image`). 좀비 node 없음 — dev 서버 3-proc chain은 정상 활성.
- **Hot-path perf (`AtlasViewer.tsx` / `SpineXrayViewer.tsx`):**
  - `structures.find(s => s.id === label.id)` 루프 안에서 선형 탐색 → `useMemo`로 `structuresById` / `structuresByName` Map 구성, O(1) lookup.
  - brain-mri 275 구조 × 라벨/contour 반복당 호출되던 find 제거 → 마우스 hover 프레임에서 체감 개선 기대.
- **`next.config.js` 강화:** `poweredByHeader: false`, `compress: true`, `productionBrowserSourceMaps: false`, `compiler.removeConsole` (prod에서 `error`/`warn` 외 console 스트립).
- **Round 2 — `src/app/page.tsx` 초기 번들 다이어트 (lazy-load):**
  - `SpineXrayViewer` (3개 X-ray 리전에서만 사용), `AuthGate` (locked region 클릭 시만), `FeedbackButton` / `InstallPrompt` (defer) → `next/dynamic({ ssr: false })`.
  - `BODY_REGIONS.find()` → `useMemo`로 `regionsById` Map 교체.
  - **빌드 결과:** `/` 15.8 → **12.5 kB** (−21 %), First Load JS 212 → **209 kB**. 조건부/지연 컴포넌트는 on-demand chunk.
  - **Incident:** `next build` + dev 동시 실행 → `.next` 공유 충돌로 dev 500 마비, 복구에 proc kill + `.next` 삭제 필요. 교훈 메모리 저장(`feedback_no_build_during_dev.md`).
- **Round 3 — hit-test bbox + slice prefetch:**
  - `AtlasViewer` / `SpineXrayViewer`: contour bbox를 `useMemo`로 precompute → hover handler에서 `isPointInPolygon` 전 bbox 조기 기각.
  - `AtlasViewer`: `requestIdleCallback`로 ±1 slice image + label prefetch, 스크럽 체감 개선.
  - 검증: `tsc --noEmit` clean, HMR 라이브 200. `next build`는 R2 교훈으로 생략.

## 📝 Session 14 (2026-04-22) 주요 결정사항

- **라이브 테스트 & 좀비 정리:**
  - dev 서버 재기동 → 6 라우트 + 9 atlas 전부 200
  - `next dev` 좀비 프로세스 6개 종료 (PID 42296/48116/22008/26264/47488/16272 — 2026-04-06, 2026-04-18부터 점유)
  - SPINAI Python 프로세스(uvicorn, pseudo-label)는 활성 작업 → 유지

- **X-ray Case Navigator (product-improvement):**
  - 발견: `SpineXrayViewer`가 `0000.png` 하드코딩 — 10 케이스 중 1개만 노출 (3 modality × 약 15 슬롯 = 30개 사각지대)
  - 해결: `caseIndex` + `caseCount` state, `info.planes[view].slices` 최솟값으로 자동 감지
  - UI: `← Case N / N →` pill (`caseCount > 1`만 표시), hover info strip에 힌트
  - 키보드: ← / → 전역 리스너 (input/textarea focus 시 무시, wrap-around)
  - `caseIndex` 변경 시 이미지 + 라벨 재로드 (0-padded 4-digit)
  - `dataPath` 전환 시 `setCaseIndex(0)` 자동 reset

- **빌드 & 타입 검증:**
  - `.next/types` 캐시 제거 후 `npx tsc --noEmit` clean
  - `npx next build` 성공 (11 static pages, 212 kB First Load JS 동일)

## 📝 Session 13 (2026-04-21) 주요 결정사항

- **신규 모달리티 2종 추가 (hand / foot X-ray):**
  - `gen_our_joint_xray_atlas.py` 신규 — 2-class binary X-ray builder (`--modality hand|foot`)
  - 소스: `D:/ImageLabelAPI_SPINAI/data/anon/{rsna_hand_train, foot_fracatlas_leg, foot_unifesp}/`
  - Output: `/data/our-hand-xray/`, `/data/our-foot-xray/` (ap single-view, 10 cases each)
  - 모델: `unet_hand_ANON_v3_c2` (0.9682), `unet_foot_ANON_v2_c2` (0.9341)

- **`auto_model_monitor.py` 확장:**
  - THRESHOLDS + MODEL_ATLAS_MAP에 hand/foot 추가
  - modality 추론에 `_hand_`, `_foot_` 패턴 추가
  - **`training_history.json` fallback 추가** — train.log 없는 신규 모델도 dice 추출 가능
  - `run_joint_xray_rebuild(info, modality)` 공통 핸들러

- **`SpineXrayViewer.tsx` 동적 view 지원:**
  - `info.json`의 planes 키로 available views 자동 결정
  - Single-view (hand/foot)일 때 grid-cols-1, dual-view (spine)일 때 grid-cols-2

- **`RegionSelector.tsx`:** `our_hand_xray` + `our_foot_xray` 추가, `BodyRegion` 타입 확장

## 📝 Session 12 (2026-04-18) 주요 결정사항

- **3-modality 자동화 완성:**
  - `gen_our_xray_atlas.py` 신규: unet_xray_c34 → our-xray/ (AP 10, Lat 10, 21 structures, Apache 2.0)
  - `gen_our_lumbar_mri_atlas.py` 신규: unet_mri_c26 → our-lumbar-mri/ (17 structures, sagittal orientation 수정)
  - `auto_model_monitor.py` 확장: ct/mri/xray 모두 자동 rebuild + git push
  - MRI orientation fix: SPIDER는 sagittal 획득 — `np.transpose((1,2,0))`로 올바른 축 정렬 (7→17 classes)

- **라이선스 정리 (전부 Apache 2.0):**
  - `public/data/brain-mri/` 삭제 (OpenMAP-T1 CC BY-NC)
  - `public/data/lumbar-mri/` 삭제 (SPIDER mask 직접 사용, 라이선스 TBD)
  - `public/data/head-ct/`: 학술 라이선스 6개 구조 필터링 — 19→13 structures, 2029개 label entry 제거

## 🚧 미해결 블로커

- **head-ct 소스 라이선스 완전 검증 필요**: 현재 13 structures (학술 제외) — 모두 TotalSegmentator Apache 2.0일 것으로 예상
- **커스텀 도메인 미구매** — `.vercel.app`로 SEO 장기 불리
- **`.env.local` 포털 인증코드 미입력** — Naver/Bing/Yandex/Baidu 인증 안 됨
- **Task Scheduler 미등록** — 자동 모니터를 수동으로만 실행 가능

## 🔑 필요한 환경변수 (.env.local)

```
NEXT_PUBLIC_SITE_URL=             # 배포 URL, 미설정 시 bodyatlas-ten.vercel.app fallback
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FORMSPREE_ID=
NEXT_PUBLIC_SHEETS_WEBHOOK_URL=
NEXT_PUBLIC_NAVER_VERIFICATION=
NEXT_PUBLIC_BING_VERIFICATION=
NEXT_PUBLIC_YANDEX_VERIFICATION=
NEXT_PUBLIC_BAIDU_VERIFICATION=
```

## 🛠 다른 컴퓨터 세팅 순서

```bash
git clone https://github.com/taeshin11/bodyatlas.git BodyAtlas
cd BodyAtlas && npm install

# SPINAI 모델 inference (auto_model_monitor.py 의존성):
# 기본 Anaconda python에 torch + nibabel + SimpleITK + cv2 + SPINAI src 접근 필요
# D:\ImageLabelAPI_SPINAI\src\ 가 sys.path에 추가됨

# Kaggle API (데이터 다운로드용):
setx KAGGLE_API_TOKEN "KGAT_..."
pip install kaggle
```

## 📚 핵심 파일 가이드

### 자동화
- `scripts/auto_model_monitor.py` — **5-modality 자동 모니터 (CT/MRI/Spine-XR/Hand-XR/Foot-XR)**
- `scripts/auto_monitor.bat` — Task Scheduler용 wrapper
- `scripts/setup_scheduler.bat` — Windows 스케줄러 등록 (관리자 권한)
- `scripts/monitor_status.json` — 모델별 적용 상태 (auto 갱신)

### Atlas 빌더
- `scripts/gen_our_ct_atlas.py` — SPINAI CT atlas (65 classes)
- `scripts/gen_our_xray_atlas.py` — SPINAI X-ray atlas (34 classes)
- `scripts/gen_our_lumbar_mri_atlas.py` — SPINAI lumbar MRI atlas (26 classes)
- `scripts/gen_our_joint_xray_atlas.py` — hand/foot X-ray atlas (2-class binary)
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더 (TotalSegmentator only)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더 (학술 구조는 후필터링)
- `scripts/gen_brain_mri_hybrid.py` — brain-mri-commercial (FastSurfer+MedSAM Apache)

### Frontend
- `src/components/AtlasViewer.tsx` — 3D CT/MRI 뷰어 (main)
- `src/components/SpineXrayViewer.tsx` — 2D X-ray 뷰어 (dataPath prop, 동적 view, case navigator)
- `src/components/RegionSelector.tsx` — 2행 구조 (Original 4개 / SPINAI 7개)
- `src/app/page.tsx` — `isXray` 분기로 SpineXrayViewer/AtlasViewer 토글

## 🗂 데이터 소스 & 학습 환경

- **학습 프로젝트:** `D:\ImageLabelAPI_SPINAI\` (로컬 RTX 4090)
- **CT 소스:** `.../TotalSegmentator_v2/s0174/ct.nii.gz`
- **MRI 소스:** `.../SPIDER_lumbar/images/1_t2.mha` (sagittal-acquired, 50 sagittal slices)
- **Spine X-ray 소스:** `.../cat_A_ap_xray/0006_scoliosis_labeled/`, `.../cat_B_lat_xray/Lat_labeled/...`
- **Hand/Foot X-ray 소스:** `.../rsna_hand_train/`, `.../foot_fracatlas_leg/`, `.../foot_unifesp/`

## 🤖 SPINAI 모델 현황 (2026-04-22)

| 모델 | Dice | 기준 | 상태 | Atlas 적용 |
|------|------|------|------|-----------|
| unet_ct_c65 (064501) | **0.8515** | 0.85 | ✅ | ✅ our-ct |
| unet_xray_c34 (154159) | **0.9042** | 0.90 | ✅ | ✅ our-xray |
| unet_mri_c26 (212345) | **0.7016** | 0.70 | ✅ | ✅ our-lumbar-mri (17 classes) |
| unet_hand_ANON_v3_c2 (20260421) | **0.9682** | 0.90 | ✅ | ✅ our-hand-xray |
| unet_foot_ANON_v2_c2 (20260421) | **0.9341** | 0.90 | ✅ | ✅ our-foot-xray |
| unet_xray_ANON_v1_c34 (학습중) | 0.7840 | 0.90 | 진행 | - |
| unet_chest_c3 | (history 비어있음) | 0.90 | ? | - |

## 📊 Atlas 라이선스 현황 (전부 Apache 2.0 또는 BSD)

| Atlas | 소스 | 라이선스 | 상업 OK? |
|-------|------|---------|---------|
| head-ct (13 structures) | TotalSegmentator base | **Apache 2.0** | ✅ |
| chest-ct | TotalSegmentator v2 | **Apache 2.0** | ✅ |
| our-head/chest/abdomen/pelvis CT | TotalSegmentator v2 | Apache 2.0 | ✅ |
| our-ct | unet_ct_c65 EfficientUNet | **Apache 2.0** | ✅ |
| our-brain-mri | FastSurfer + MedSAM | Apache 2.0 | ✅ |
| our-xray | unet_xray_c34 | **Apache 2.0** | ✅ |
| our-lumbar-mri | unet_mri_c26 | **Apache 2.0** | ✅ |
| our-hand-xray | unet_hand_ANON_v3_c2 | **Apache 2.0** | ✅ |
| our-foot-xray | unet_foot_ANON_v2_c2 | **Apache 2.0** | ✅ |

## 🌐 배포

- **프로덕션: ⚠ 유실 상태** — 위 "긴급" 블록 참고
- GitHub: github.com/taeshin11/bodyatlas (정상, commit은 계속 도달)

---

_마지막 업데이트: 2026-04-22 (R34 세션 종료 — PRD v2.2 changelog 반영 + HANDOVER R34 state refresh; prod는 R20 declaration대로 사용자 결정 대기)_
