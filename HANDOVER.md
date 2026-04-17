# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** SPINAI 모델 자동 모니터링 체계 구축 완료. CT v2 (EfficientUNet) Dice 0.8505로 기준(0.85) 통과, epoch 78/80 학습 중.
- **다음:** 
  1. CT v2 학습 완료 대기 → 자동 모니터가 VISTA3D 대체 atlas 생성 예정
  2. Windows Task Scheduler 등록 (관리자 권한 수작업 필요): `scripts/setup_scheduler.bat`
  3. 각 포털 사이트 SEO 등록 (사용자 수작업): Google/Naver/Bing/Yandex/Baidu/Daum

## 📝 최근 결정사항 (WHY)

- **SPINAI 모델 자동 모니터링 (Session 10 — 2026-04-17):**
  - `scripts/auto_model_monitor.py` 추가: D:\ImageLabelAPI_SPINAI\outputs\models\ 의 모든 train.log 파싱 → Best Dice 체크 → 기준 초과 시 inference + atlas 재생성 + git push
  - 기준: CT ≥ 0.85, MRI ≥ 0.70, X-ray ≥ 0.90
  - `scripts/setup_scheduler.bat`: 매일 오전 9시 자동 실행 등록
  - `scripts/monitor_status.json`: 모델별 적용 상태 저장
  - `scripts/monitor_log.txt`: 실행 로그

- **Kaggle API 연동 (Session 10):**
  - Kaggle API 토큰 Windows 환경변수 영구 설정 (KAGGLE_API_TOKEN)
  - **정책: 다운로드 전용, 업로드 금지** — 학습 데이터 유출 방지
  - 학습은 전부 D:\ImageLabelAPI_SPINAI\ 로컬 RTX 4090에서만 진행

- **SEO 다국어 포털 대응 (Session 10):**
  - robots.ts에 Naver(Yeti), Daum(Daumoa), Baidu, Yandex, Seznam 크롤러 명시 허용
  - layout.tsx에 naver/baidu/yandex/bing 인증 메타태그 자동 삽입 (env 변수 입력만 필요)
  - sitemap.ts에 7개 언어 hreflang 포함
  - IndexNow 자동 제출 (Bing/Yandex) postbuild 훅 작동 중

- **Atlas 방향 수정 (Session 8):**
  - 모든 atlas에 `np.flipud(slice.T)` 적용 (NIfTI RAS → PNG 90° 회전 버그 수정)
  - head-ct: Z[301:431]만 사용, brain-mri: windowing center=160/width=200

- **OpenMAP-T1 / VISTA3D 적용 (Session 6-7):**
  - head-ct 66, chest-ct 122, brain-mri 275 structures

## 🚧 미해결 블로커

- **CT v2 학습 완료 대기** (epoch 78/80, 예상 완료 오늘 중)
- **VISTA3D weights**: NVIDIA NCLS v1 (non-commercial) — CT v2로 대체 예정
- **OpenMAP-T1 weights**: JHU + CC BY-NC — Brain MRI commercial(FastSurfer+MedSAM)으로 이미 대체됨
- **MRI 모델 성능 부족**: Dice 0.5191 (기준 0.70) — 추가 학습 or 데이터 보강 필요
- **TotalSegmentator head brain_structures**: 학술 라이선스 — 자체 CT 모델로 대체 검토
- **커스텀 도메인 미구매**: `.vercel.app` 도메인으로 SEO 등록 가능하나 장기적으로 불리
- `.env.local` SEO 환경변수 미입력: NEXT_PUBLIC_NAVER_VERIFICATION 등

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

# VISTA3D 환경 (레거시):
conda create -n vista3d python=3.10 -y
conda activate vista3d
pip install "monai[all]" nibabel torch torchvision --index-url https://download.pytorch.org/whl/cu124

# OpenMAP-T1 환경 (레거시):
conda create -n openmap python=3.10 -y
conda activate openmap
pip install "numpy<2" torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install nibabel pandas scipy SimpleITK tqdm

# Kaggle API (데이터 다운로드용):
setx KAGGLE_API_TOKEN "KGAT_..."
pip install kaggle
```

## 📚 핵심 파일 가이드

- `src/components/AtlasViewer.tsx` — 뷰어 (opacity 0.22 + always-on stroke)
- `src/components/RegionSelector.tsx` — 2행 구조 (Original / SPINAI)
- `scripts/auto_model_monitor.py` — **매일 자동 모델 체크 + atlas 재생성 + git push**
- `scripts/auto_monitor.bat` — Task Scheduler용 wrapper
- `scripts/setup_scheduler.bat` — Windows 스케줄러 등록 (관리자 권한)
- `scripts/gen_our_ct_atlas.py` — SPINAI CT atlas (TotalSegmentator 포맷 읽음)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더
- `scripts/gen_brain_mri_atlas.py` — brain-mri 빌더 (OpenMAP-T1)
- `scripts/gen_brain_mri_hybrid.py` — brain-mri-commercial (FastSurfer+MedSAM)
- `src/app/robots.ts` — 다국어 크롤러 허용 (Naver, Baidu, Yandex 등)
- `src/app/sitemap.ts` — 7개 언어 hreflang
- `src/app/layout.tsx` — 포털 인증 메타태그 + JSON-LD

## 🗂 데이터 소스 & 학습 환경

- **학습 프로젝트:** `D:\ImageLabelAPI_SPINAI\` (로컬 RTX 4090)
- **BodyAtlas 역할:** 학습된 모델 소비 + atlas 생성 + 웹 배포만
- **CT**: D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/s0174/ct.nii.gz
- **Brain MRI**: MNI152 T1 template (nilearn) → OpenMAP-T1 Level5 / FastSurfer
- **Kaggle 다운로드**: `D:\ImageLabelAPI_SPINAI\data\kaggle_downloads\`

## 🤖 SPINAI 모델 현황 (2026-04-17)

| 모델 | Dice | 기준 | 상태 |
|------|------|------|------|
| unet_ct_c65_v2 (EfficientUNet 20M) | 0.8505 | 0.85 | 학습 중 epoch 78/80 (PASS) |
| unet_ct_c65 v1 | 0.8083 | 0.85 | 완료 (FAIL) |
| unet_xray_c34 | 0.9042 | 0.90 | 완료 (PASS) |
| unet_mri_c26 | 0.5191 | 0.70 | 완료 (FAIL — 개선 필요) |

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-17 (Session 10)_
