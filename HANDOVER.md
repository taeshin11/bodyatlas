# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** X-ray + MRI atlas 자동 파이프라인 구현 완료. 자동 모니터가 3개 모달리티 (CT/MRI/X-ray) 전부 관리. 이번 세션 commit `df7b59a2` Vercel 자동 배포됨.
- **다음 세션 첫 작업:**
  1. **Frontend 통합** (가장 시급): our-xray atlas 생성되었지만 UI에 미연결 — SpineXrayViewer는 dead code
  2. **MRI orientation fix**: SPIDER는 sagittal 저장, 모델은 axial 기대 → 현재 26 classes 중 7개만 검출
  3. **head-ct / brain-mri 비상업 라이선스 정리**

## 📝 최근 결정사항 (WHY)

- **Session 12 (2026-04-18) — 3-modality 자동화 완성:**
  - `gen_our_xray_atlas.py` 신규: unet_xray_c34 → our-xray/ (AP 10, Lat 10, 21 structures)
  - `gen_our_lumbar_mri_atlas.py` 신규: unet_mri_c26 → our-lumbar-mri/ (7 structures, orientation 이슈)
  - `auto_model_monitor.py` 확장: MODEL_ATLAS_MAP에 mri + xray 추가, 자동 rebuild 핸들러 구현
  - commit `df7b59a2`: 자동 모니터가 mri+xray atlas 생성 후 push 성공

- **chest-ct 라이선스 재검증 (Session 12):**
  - 레거시 HANDOVER 주장: "VISTA3D (NVIDIA NCLS 비상업) 포함"
  - 실측 결과: 108 structures 전부 TotalSegmentator 출처, VISTA3D 실제로 머지되지 않음
  - **결론: chest-ct는 이미 Apache 2.0 compliant**

- **MRI 모델 자동 달성 (Session 11→12 사이 학습):**
  - Session 11 말: `unet_mri_c26_20260409_140851` Dice 0.5191 (기준 미달)
  - Session 12 시작: `unet_mri_c26_20260417_212345` Dice 0.7016 (기준 통과)
  - 사용자가 별도로 재학습 실행 → 자동 모니터가 감지하고 atlas 생성

- **CT atlas 자체 모델 전환 (Session 11):**
  - unet_ct_c65 EfficientUNet (Best Dice 0.8515) → public/data/our-ct/ Apache 2.0

## 🚧 미해결 블로커

- **MRI atlas orientation mismatch** (신규 이슈):
  - unet_mri_c26은 axial slice 단위 학습
  - SPIDER_lumbar는 sagittal 저장 (shape 448x50x578, slice-thickness 3.32mm)
  - 결과: 26 classes 중 disc_L1L2, disc_L5S1, liver, spleen, kidney_lt, aorta, sacrum 7개만 검출
  - 해결책 후보: axial-reformatted MRI 소스 (AMOS2022 등), SPIDER volume permutation, sagittal-trained 모델 별도 학습
- **Frontend 미통합**:
  - `public/data/our-xray/` 데이터 존재 but UI 미연결 (SpineXrayViewer dead code)
  - `public/data/our-lumbar-mri/` 데이터 존재 but RegionSelector.lumbar_mri는 여전히 `/data/lumbar-mri` (SPIDER 라이선스 TBD)
- **head-ct academic license**: `brain_structures` 서브태스크 학술 라이선스 (aca_JH13N7GGTG1VK7) 상업 배포 리스크
- **brain-mri (Original)**: OpenMAP-T1 (CC BY-NC) 여전히 사용 중 — brain-mri-commercial로 전환 필요
- **커스텀 도메인 미구매** — `.vercel.app`로 SEO 장기 불리
- **`.env.local` 포털 인증코드 미입력** — Naver/Bing/Yandex/Baidu 인증 안 됨

## 🔑 필요한 환경변수 (.env.local)

```
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

### 자동화 (Session 12 업데이트)
- `scripts/auto_model_monitor.py` — **3-modality 자동 모니터 (CT/MRI/X-ray)**
- `scripts/auto_monitor.bat` — Task Scheduler용 wrapper
- `scripts/setup_scheduler.bat` — Windows 스케줄러 등록 (관리자 권한)
- `scripts/monitor_status.json` — 모델별 적용 상태 (auto 갱신)
- `scripts/monitor_log.txt` — 실행 로그 (gitignored)

### Atlas 빌더
- `scripts/gen_our_ct_atlas.py` — SPINAI CT atlas (65 classes)
- `scripts/gen_our_xray_atlas.py` — **[신규]** SPINAI X-ray atlas (34 classes)
- `scripts/gen_our_lumbar_mri_atlas.py` — **[신규]** SPINAI lumbar MRI atlas (26 classes, orientation 이슈)
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더 (TotalSegmentator only, VISTA3D 제외 확인됨)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더 (brain_structures는 학술 라이선스)
- `scripts/gen_brain_mri_atlas.py` — brain-mri 빌더 (OpenMAP-T1 CC BY-NC)
- `scripts/gen_brain_mri_hybrid.py` — brain-mri-commercial (FastSurfer+MedSAM Apache)
- `scripts/gen_lumbar_mri_atlas.py` — 레거시 SPIDER 기반 (라이선스 TBD)
- `scripts/gen_spine_xray_atlas.py` — 레거시 polygon label 기반 (spine-xray)

### Frontend
- `src/components/AtlasViewer.tsx` — 3D CT/MRI 뷰어 (main)
- `src/components/SpineXrayViewer.tsx` — 2D X-ray 뷰어 **(dead code, 통합 필요)**
- `src/components/RegionSelector.tsx` — 2행 구조 (Original / SPINAI)
- `src/app/robots.ts` — 다국어 크롤러 허용
- `src/app/sitemap.ts` — 7개 언어 hreflang
- `src/app/layout.tsx` — 포털 인증 메타태그 + JSON-LD

## 🗂 데이터 소스 & 학습 환경

- **학습 프로젝트:** `D:\ImageLabelAPI_SPINAI\` (로컬 RTX 4090)
- **CT 소스:** `.../TotalSegmentator_v2/s0174/ct.nii.gz`
- **MRI 소스:** `.../SPIDER_lumbar/images/1_t2.mha` (sagittal — orientation mismatch)
- **X-ray 소스:** `.../cat_A_ap_xray/0006_scoliosis_labeled/`, `.../cat_B_lat_xray/Lat_labeled/...`

## 🤖 SPINAI 모델 현황 (2026-04-18)

| 모델 | Dice | 기준 | 상태 | Atlas 적용 |
|------|------|------|------|-----------|
| unet_ct_c65 (064501) | **0.8515** | 0.85 | ✅ | ✅ our-ct |
| unet_ct_c65 (093321) | 0.8515 | 0.85 | ✅ | - |
| unet_ct_c65 (093403) | 0.8515 | 0.85 | ✅ | - |
| unet_ct_c65 v1 (122225) | 0.8083 | 0.85 | FAIL | - |
| unet_xray_c34 (154159) | **0.9042** | 0.90 | ✅ | ✅ our-xray (Apache) |
| unet_xray_c34 (084134) | 0.9042 | 0.90 | ✅ | - |
| unet_mri_c26 (212345) | **0.7016** | 0.70 | ✅ | ⚠️ our-lumbar-mri (7/26 classes) |
| unet_mri_c26 (140851) | 0.5191 | 0.70 | FAIL | - |

## 📊 Atlas 라이선스 현황

| Atlas | 소스 | 라이선스 | 상업 OK? |
|-------|------|---------|---------|
| head-ct | TotalSegmentator + CT_Electrodes + **brain_structures 학술** | BSD + Apache + **학술** | ❌ |
| chest-ct | TotalSegmentator (v2) | Apache 2.0 | **✅ (재검증됨)** |
| brain-mri (Original) | **OpenMAP-T1** | **CC BY-NC** | ❌ |
| lumbar-mri (레거시) | SPIDER dataset mask | TBD | 검토 필요 |
| our-head/chest/abdomen/pelvis CT | TotalSegmentator v2 | Apache | ✅ |
| our-ct | unet_ct_c65 EfficientUNet | **Apache 2.0** | ✅ |
| our-brain-mri | FastSurfer + MedSAM | Apache + Apache | ✅ |
| **our-xray (신규)** | **unet_xray_c34** | **Apache 2.0** | ✅ |
| **our-lumbar-mri (신규)** | **unet_mri_c26** | **Apache 2.0** | ✅ |

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-18 (Session 12 종료 시)_
