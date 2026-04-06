# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** VISTA3D 완료. head-ct 89구조, chest-ct 122구조. 배포 완료.
- **다음:** OpenMAP-T1 brain weights 신청 → brain-mri 280구조로 업그레이드

## 📝 최근 결정사항 (WHY)

- **VISTA3D 적용 (Session 6):**
  - MONAI VISTA3D (127-class, newer architecture than TotalSegmentator)
  - TotalSegmentator + VISTA3D merged → head-ct 89, chest-ct 122 structures
  - Annotation visibility fix: opacity 0.22 + always-on stroke outlines

- **OpenMAP-T1 (Brain MRI 280 regions) - PENDING:**
  - weights 신청 필요: https://forms.office.com/Pages/ResponsePage.aspx?id=OPSkn-axO0eAP4b4rt8N7Iz6VabmlEBIhG4j3FiMk75UQUxBMkVPTzlIQTQ1UEZJSFY1NURDNzRERC4u
  - weights 받으면 `data_pipeline/openmap_weights/` 에 넣고 `python scripts/run_openmap.py`
  - 현재 brain-mri는 1mm isotropic T1 MRI 기반 → 바로 적용 가능

## 🚧 미해결 블로커

- `.env.local` 미확인
- OpenMAP-T1 weights 수동 신청 필요 (JHU + CC BY-NC, 학술/비상업용)
- VISTA3D weights: NVIDIA NCLS v1 (non-commercial) — 유료 전환 시 재라이선싱 필요

## 🔑 필요한 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FORMSPREE_ID=
NEXT_PUBLIC_SHEETS_WEBHOOK_URL=
```

## 🛠 다른 컴퓨터 세팅 순서

```bash
git clone https://github.com/taeshin11/bodyatlas.git BodyAtlas
cd BodyAtlas && npm install
# VISTA3D 환경 재구성:
conda create -n vista3d python=3.10 -y
conda activate vista3d
pip install "monai[all]" nibabel torch torchvision --index-url https://download.pytorch.org/whl/cu124
```

## 📚 핵심 파일 가이드

- `src/components/AtlasViewer.tsx` — 뷰어 (opacity 0.22 + always-on stroke)
- `src/components/RegionSelector.tsx` — 6개 탭
- `scripts/run_vista3d.py` — VISTA3D inference (vista3d env 필요)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더 (spline smoothing)
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더 (full body, wide window)
- `scripts/smooth_labels.py` — JSON 라벨 smoother
- `data_pipeline/vista3d_bundle/` — VISTA3D MONAI bundle + weights
- `data_pipeline/vista3d_seg/` — VISTA3D 83 structures (flat .nii.gz)
- `data_pipeline/head_ct_seg/` — TotalSegmentator + vista3d task dirs
- `public/data/head-ct/` — 89 structures, 200/311/311 slices
- `public/data/chest-ct/` — 122 structures, 431/311/311 slices
- `public/data/brain-mri/` — 92 structures (OpenMAP-T1으로 개선 예정)
- `public/data/spine-xray/` — 15 structures

## 🗂 데이터 소스

- **CT**: D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/s0011/ct.nii.gz
- **TotalSegmentator v2 dataset**: D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/
- **Spine X-ray**: D:/ImageLabelAPI_SPINAI/SBJ_LLXR/

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-06 (Session 6)_
