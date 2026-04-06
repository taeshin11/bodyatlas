# BodyAtlas 인수인계 문서

> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** 모든 atlas orientation 버그 수정 + spine-xray 탭 제거 완료. Vercel 배포 중.
- **다음:** 없음 (모든 major 수정 완료)

## 📝 최근 결정사항 (WHY)

- **Atlas 방향 수정 (Session 8):**
  - 모든 atlas (head-ct, chest-ct, brain-mri)에 `np.flipud(slice.T)` 적용
  - NIfTI RAS 데이터를 PNG로 저장 시 LR이 세로로 나오는 버그 수정 (90° 회전)
  - PNG 이미지와 contour annotation 모두 동일한 transform 적용 → 매칭 정확
  - head-ct: Z-crop 수정 (200→130 voxels), Z[301:431]만 사용 → 가슴이 아닌 머리/목 표시
  - brain-mri: T1 windowing 수정 (center=50→160, width=100→200, 0-255 range 맞춤)
  - spine-xray 탭 제거 (BodyRegion type + BODY_REGIONS array에서 삭제)

- **OpenMAP-T1 적용 (Session 7):**
  - OpenMAP-T1 v2.1.3 코드 + mixed V2/V3 weights로 inference 성공
  - 275 brain regions (Level5 parcellation) on MNI152 T1 template
  - 문제 해결: SSNet V2 weights (1ch), CNet V3 weights (3ch) → 각각 패치

- **VISTA3D 적용 (Session 6):**
  - MONAI VISTA3D (127-class) + TotalSegmentator merged
  - head-ct 66, chest-ct 122 structures

## 🚧 미해결 블로커

- `.env.local` 미확인 (Vercel 배포는 정상)
- VISTA3D weights: NVIDIA NCLS v1 (non-commercial) — 유료 전환 시 재라이선싱 필요
- OpenMAP-T1 weights: JHU + CC BY-NC, 학술/비상업용

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

# VISTA3D 환경:
conda create -n vista3d python=3.10 -y
conda activate vista3d
pip install "monai[all]" nibabel torch torchvision --index-url https://download.pytorch.org/whl/cu124

# OpenMAP-T1 환경:
conda create -n openmap python=3.10 -y
conda activate openmap
pip install "numpy<2" torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install nibabel pandas scipy SimpleITK tqdm
```

## 📚 핵심 파일 가이드

- `src/components/AtlasViewer.tsx` — 뷰어 (opacity 0.22 + always-on stroke)
- `src/components/RegionSelector.tsx` — 5개 탭 (spine-xray 제거됨)
- `scripts/run_vista3d.py` — VISTA3D inference (vista3d env 필요)
- `scripts/gen_head_ct_atlas.py` — head-ct 빌더 (Z-crop 130vox, flipud+T fix)
- `scripts/gen_full_ct_atlas.py` — chest-ct 빌더 (full body, flipud+T fix)
- `scripts/gen_brain_mri_atlas.py` — brain-mri 빌더 (OpenMAP-T1, windowing+orientation fix)
- `scripts/smooth_labels.py` — JSON 라벨 smoother
- `data_pipeline/vista3d_bundle/` — VISTA3D MONAI bundle + weights
- `data_pipeline/vista3d_seg/` — VISTA3D 83 structures (flat .nii.gz)
- `data_pipeline/openmap_t1/` — OpenMAP-T1 v2.1.3 코드 (patched)
- `data_pipeline/openmap_weights/` — Mixed V2/V3 weights (CNet V3, others V2)
- `data_pipeline/openmap_output/` — OpenMAP-T1 Level5 parcellation output
- `public/data/head-ct/` — 66 structures, 130/311/311 slices (Z[301:431])
- `public/data/chest-ct/` — 122 structures, 431/311/311 slices
- `public/data/brain-mri/` — 275 structures (OpenMAP-T1), 189/197/233 slices

## 🗂 데이터 소스

- **CT**: D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/s0011/ct.nii.gz
- **Brain MRI**: MNI152 T1 template (nilearn) → OpenMAP-T1 Level5

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-06 (Session 8)_
