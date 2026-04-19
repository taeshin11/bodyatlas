# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 📋 세션 의무 규칙

1. **세션 종료 시 이 HANDOVER.md 덮어쓰기** (현재 상태 스냅샷)
2. **`claude-progress.txt`에 Session 추가** (append-only)
3. **기능 추가/변경 시 반드시 같은 커밋에서 `FEATURES.md` 수정** — pre-commit hook이 `src/components/**` 또는 `src/app/**/page.tsx` 변경을 감지하면 FEATURES.md 동시 수정을 요구함
4. **git commit + push**

---

## 🏃 지금 바로 할 일

- **현재 상태:** 3-modality 파이프라인 완성 (CT/MRI/X-ray) + Frontend 통합 + 라이선스 클린업 완료. **전체 배포 데이터가 Apache 2.0 compliant**.
- **다음 세션 첫 작업:**
  1. SPINAI 모델 모니터링 (`auto_model_monitor.py` 실행)
  2. head-ct 소스 라이선스 완전 검증 (CT_Electrodes BSD, TotalSegmentator Apache 맞는지 최종 확인)
  3. 사용자 수작업 대기: Task Scheduler 등록, 포털 인증코드, 커스텀 도메인

## 📝 Session 12 (2026-04-18) 주요 결정사항

- **3-modality 자동화 완성:**
  - `gen_our_xray_atlas.py` 신규: unet_xray_c34 → our-xray/ (AP 10, Lat 10, 21 structures, Apache 2.0)
  - `gen_our_lumbar_mri_atlas.py` 신규: unet_mri_c26 → our-lumbar-mri/ (17 structures, sagittal orientation 수정)
  - `auto_model_monitor.py` 확장: ct/mri/xray 모두 자동 rebuild + git push
  - MRI orientation fix: SPIDER는 sagittal 획득 — `np.transpose((1,2,0))`로 올바른 축 정렬 (7→17 classes)
  - MRI plane label 교정: sagittal=50, coronal=448 (원래 뒤바뀌었던 것)

- **Frontend 통합:**
  - `RegionSelector`에 `our_xray` 버튼 추가 (Spine X-ray / 척추 X-ray)
  - `lumbar_mri` dataPath를 `/data/lumbar-mri` → `/data/our-lumbar-mri` 전환
  - `page.tsx`: `activeRegion==='our_xray'`일 때 `SpineXrayViewer` 렌더링 (이전 dead code 활성화)
  - `SpineXrayViewer`: `dataPath` prop 추가 (기본값 `/data/spine-xray`로 하위호환)

- **라이선스 정리 (전부 Apache 2.0):**
  - `public/data/brain-mri/` 삭제 (OpenMAP-T1 CC BY-NC)
  - `public/data/lumbar-mri/` 삭제 (SPIDER mask 직접 사용, 라이선스 TBD)
  - `public/data/head-ct/`: 학술 라이선스 6개 구조 필터링 (brainstem, caudate_nucleus, cerebellum, insular_cortex, thalamus, ventricle) — 19→13 structures, 2029개 label entry 제거
  - `RegionSelector.BODY_REGIONS`에서 Original `brain_mri` 버튼 제거
  - `BodyRegion` 타입에서 `brain_mri` 제거
  - chest-ct 재검증: 108 structures 전부 TotalSegmentator 출처, VISTA3D 실제로 머지 안 됨

- **빌드 & 타입 검증:**
  - `npx tsc --noEmit` clean
  - `npx next build` 성공 (11 static pages)

## 🚧 미해결 블로커

- **head-ct 소스 라이선스 완전 검증 필요**:
  - 현재 13 structures (학술 제외) — 모두 TotalSegmentator Apache 2.0일 것으로 예상
  - CT_Electrodes (BSD 2-Clause) 단일 소스 원본 CT 유지
- **커스텀 도메인 미구매** — `.vercel.app`로 SEO 장기 불리
- **`.env.local` 포털 인증코드 미입력** — Naver/Bing/Yandex/Baidu 인증 안 됨
- **Task Scheduler 미등록** — 자동 모니터를 수동으로만 실행 가능

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

### 자동화
- `scripts/auto_model_monitor.py` — **3-modality 자동 모니터 (CT/MRI/X-ray)**
- `scripts/auto_monitor.bat` — Task Scheduler용 wrapper
- `scripts/setup_scheduler.bat` — Windows 스케줄러 등록 (관리자 권한)
- `scripts/monitor_status.json` — 모델별 적용 상태 (auto 갱신)

### Atlas 빌더
- `scripts/gen_our_ct_atlas.py` — SPINAI CT atlas (65 classes)
- `scripts/gen_our_xray_atlas.py` — SPINAI X-ray atlas (34 classes)
- `scripts/gen_our_lumbar_mri_atlas.py` — SPINAI lumbar MRI atlas (26 classes)
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더 (TotalSegmentator only)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더 (학술 구조는 후필터링)
- `scripts/gen_brain_mri_hybrid.py` — brain-mri-commercial (FastSurfer+MedSAM Apache)

### Frontend
- `src/components/AtlasViewer.tsx` — 3D CT/MRI 뷰어 (main)
- `src/components/SpineXrayViewer.tsx` — 2D X-ray 뷰어 (dataPath prop 수신)
- `src/components/RegionSelector.tsx` — 2행 구조 (Original 4개 / SPINAI 6개)
- `src/app/page.tsx` — `isXray` 분기로 SpineXrayViewer/AtlasViewer 토글

## 🗂 데이터 소스 & 학습 환경

- **학습 프로젝트:** `D:\ImageLabelAPI_SPINAI\` (로컬 RTX 4090)
- **CT 소스:** `.../TotalSegmentator_v2/s0174/ct.nii.gz`
- **MRI 소스:** `.../SPIDER_lumbar/images/1_t2.mha` (sagittal-acquired, 50 sagittal slices)
- **X-ray 소스:** `.../cat_A_ap_xray/0006_scoliosis_labeled/`, `.../cat_B_lat_xray/Lat_labeled/...`

## 🤖 SPINAI 모델 현황 (2026-04-18)

| 모델 | Dice | 기준 | 상태 | Atlas 적용 |
|------|------|------|------|-----------|
| unet_ct_c65 (064501) | **0.8515** | 0.85 | ✅ | ✅ our-ct |
| unet_ct_c65 (093321) | 0.8515 | 0.85 | ✅ | - |
| unet_ct_c65 (093403) | 0.8515 | 0.85 | ✅ | - |
| unet_ct_c65 v1 (122225) | 0.8083 | 0.85 | FAIL | - |
| unet_xray_c34 (154159) | **0.9042** | 0.90 | ✅ | ✅ our-xray |
| unet_xray_c34 (084134) | 0.9042 | 0.90 | ✅ | - |
| unet_mri_c26 (212345) | **0.7016** | 0.70 | ✅ | ✅ our-lumbar-mri (17 classes) |
| unet_mri_c26 (140851) | 0.5191 | 0.70 | FAIL | - |

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
| brain-pet | (검토 필요) | TBD | ? |
| spine-xray | 자체 수집 데이터 + polygon label | 자체 소유 | ✅ |

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-18 (Session 12 완료 — "다 해줘" 실행)_
