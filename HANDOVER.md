# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** CT v2 학습 완료 (Best Dice 0.8515), **자동 모니터가 our-ct atlas를 자체 UNet으로 교체 완료** (commit `7d852d25`). Vercel 자동 배포됨.
- **다음 세션 첫 작업:**
  1. SPINAI 모델 상태 체크 (`scripts/auto_model_monitor.py` 실행만 하면 됨 — 아무 변화 없으면 "up to date" 출력)
  2. MRI 모델 개선 방안 수립 (Dice 0.5191 → 0.70 목표)
  3. X-ray atlas 자동 재생성 파이프라인 구현 (모델 준비됐으나 atlas builder 없음)
  4. chest-ct / brain-mri / head-ct 비상업 라이선스 모델 교체 전략

## 📝 최근 결정사항 (WHY)

- **CT atlas 자체 모델 전환 (Session 11 — 2026-04-17):**
  - `unet_ct_c65_20260415_064501` (EfficientUNet 20M, Best Dice 0.8515) → public/data/our-ct/
  - 자동 모니터가 inference + rebuild + commit + push 모두 처리 (12초 + 25초)
  - commit: `7d852d25 auto: update ct atlas from SPINAI models`
  - **VISTA3D (비상업) 의존성 제거 완료** — our-ct는 완전 Apache 2.0
  - 동일 Dice 0.8515 모델 2개 더 있음: `093321`, `093403` (기존 모델 유지)

- **자동화 시스템 구축 (Session 10):**
  - `scripts/auto_model_monitor.py` — 매일 모델 체크 + atlas 교체 + push
  - 기준: CT≥0.85, MRI≥0.70, X-ray≥0.90
  - Windows cp949 대응 UTF-8 강제, 이모지 제거 완료
  - `scripts/setup_scheduler.bat` — 사용자가 관리자 권한으로 실행 필요

- **Kaggle API 연동 (Session 10):**
  - KAGGLE_API_TOKEN Windows 전역 환경변수 영구 설정
  - **정책: 다운로드 전용, 업로드 금지** (의료 데이터 유출 방지)
  - 학습은 전부 D:\ImageLabelAPI_SPINAI\ 로컬 RTX 4090

- **SEO 다국어 대응 (Session 10):**
  - robots.ts 크롤러 허용 확인 (Naver Yeti, Baidu, Yandex, Daum, Seznam)
  - layout.tsx 인증 메타태그 env 변수 대응 완료 — 사용자 수작업: 포털 등록 → 인증코드 → `.env.local`

## 🚧 미해결 블로커

- **MRI 모델 Dice 0.5191** — 기준 0.70에 한참 못 미침. 데이터 보강 or 아키텍처 변경 필요
- **chest-ct**: VISTA3D (NVIDIA NCLS 비상업) 아직 사용 중 — CT v2로 대체 가능성 검토 (CT65 클래스가 chest/abdomen 커버 가능)
- **brain-mri (Original)**: OpenMAP-T1 (CC BY-NC) 아직 사용 중 — our-brain-mri는 이미 FastSurfer로 교체
- **head-ct brain_structures**: TotalSegmentator 학술 라이선스
- **X-ray atlas 자동 재생성 미구현** — auto_model_monitor.py의 MODEL_ATLAS_MAP에 xray 미정의
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

# OpenMAP-T1 환경 (레거시 brain-mri용):
conda create -n openmap python=3.10 -y
conda activate openmap
pip install "numpy<2" torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install nibabel pandas scipy SimpleITK tqdm

# Kaggle API (데이터 다운로드용):
setx KAGGLE_API_TOKEN "KGAT_81eb6c5998fb707e8313e7f6fc9487b6"
pip install kaggle

# SPINAI 모델 inference (auto_model_monitor.py 의존성):
# 기본 Anaconda python에 torch + nibabel + SPINAI src 접근 필요
# D:\ImageLabelAPI_SPINAI\src\ 가 sys.path에 추가됨
```

## 📚 핵심 파일 가이드

### 자동화
- `scripts/auto_model_monitor.py` — **매일 자동 모델 체크 + atlas 재생성 + git push**
- `scripts/auto_monitor.bat` — Task Scheduler용 wrapper
- `scripts/setup_scheduler.bat` — Windows 스케줄러 등록 (관리자 권한)
- `scripts/monitor_status.json` — 모델별 적용 상태 (auto 갱신)
- `scripts/monitor_log.txt` — 실행 로그 (gitignored)
- `scripts/_spinai_ct_inference.py` / `_spinai_ct_rebuild.py` — 자동생성 임시 (gitignored)

### Atlas 빌더
- `scripts/gen_our_ct_atlas.py` — SPINAI CT atlas builder (load_segs_from_ts + build_atlas)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더 (Z-crop 130vox)
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더
- `scripts/gen_brain_mri_atlas.py` — brain-mri 빌더 (OpenMAP-T1)
- `scripts/gen_brain_mri_hybrid.py` — brain-mri-commercial (FastSurfer+MedSAM)

### Frontend
- `src/components/AtlasViewer.tsx` — 뷰어 (opacity 0.22 + always-on stroke)
- `src/components/RegionSelector.tsx` — 2행 구조 (Original / SPINAI)
- `src/app/robots.ts` — 다국어 크롤러 허용
- `src/app/sitemap.ts` — 7개 언어 hreflang
- `src/app/layout.tsx` — 포털 인증 메타태그 + JSON-LD

## 🗂 데이터 소스 & 학습 환경

- **학습 프로젝트:** `D:\ImageLabelAPI_SPINAI\` (로컬 RTX 4090)
- **BodyAtlas 역할:** 학습된 모델 소비 + atlas 생성 + 웹 배포
- **our-ct 소스:** `D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/s0174/ct.nii.gz`
- **Brain MRI 소스:** MNI152 T1 template (nilearn)
- **Kaggle 다운로드 위치:** `D:\ImageLabelAPI_SPINAI\data\kaggle_downloads\`

## 🤖 SPINAI 모델 현황 (2026-04-18)

| 모델 | Dice | 기준 | 상태 | Atlas 적용 |
|------|------|------|------|-----------|
| unet_ct_c65 (064501) EfficientUNet | **0.8515** | 0.85 | ✅ 완료 | ✅ our-ct 적용 중 |
| unet_ct_c65 (093321) | 0.8515 | 0.85 | ✅ 완료 | - |
| unet_ct_c65 (093403) | 0.8515 | 0.85 | ✅ 완료 | - |
| unet_ct_c65 v1 (122225) | 0.8083 | 0.85 | FAIL | - |
| unet_xray_c34 (154159) | 0.9042 | 0.90 | ✅ 완료 | ❌ atlas 미구현 |
| unet_xray_c34 (084134) | 0.9042 | 0.90 | ✅ 완료 | - |
| unet_mri_c26 | 0.5191 | 0.70 | ❌ 미달 | - |

## 📊 Atlas 라이선스 현황

| Atlas | 소스 | 라이선스 | 상업 OK? |
|-------|------|---------|---------|
| head-ct | CT_Electrodes + TotalSegmentator + brain_structures | BSD + Apache + **학술** | ❌ |
| chest-ct | TotalSegmentator + **VISTA3D** | Apache + **NVIDIA NCLS 비상업** | ❌ |
| brain-mri (original) | **OpenMAP-T1** | **CC BY-NC** | ❌ |
| our-head / chest / abdomen / pelvis | TotalSegmentator v2 | Apache | ✅ |
| **our-ct (자체 모델)** | **unet_ct_c65 EfficientUNet** | **Apache 2.0** | **✅** |
| our-brain-mri | FastSurfer + MedSAM | Apache + Apache | ✅ |
| lumbar-mri | SPIDER dataset | TBD | 검토 필요 |

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-18 (Session 11 종료 시)_
