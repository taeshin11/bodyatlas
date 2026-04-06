# BodyAtlas 인수인계 문서

> 다른 컴퓨터/세션에서 작업을 이어받을 때 제일 먼저 읽는 파일.
> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** Annotation smoothing 완료 + push. Vercel 자동 배포 중.
- **다음 세션 시작 시:** `npm run dev` → 모든 탭 annotation 품질 확인
  - Head & Neck: 80 structures, 매끄러운 contour
  - Chest: 106 structures, smoothed
  - Brain MRI: 92 structures, smoothed
  - Spine X-ray: 15 structures (polygon, 변경 없음)
- **잔여 작업:** Task Manager에서 메모리 큰 Python 프로세스 종료 (PID 32136, 44660, 16320)

## 📝 최근 결정사항 (WHY)

- **Annotation 품질 개선 (Session 5):**
  - mask_to_contours: binary_fill_holes + binary_closing + spline smoothing
  - brain-mri + chest-ct: JSON 라벨 post-process smoothing
  - head-ct: 완전 rebuild (80 structures, smoothed)
  - Multi-atlas: ANTs registration 없으면 의미 없음 → 단독 케이스 유지

- **Brain PET 탭 제거 (Session 5):**
  - PET는 해부학적 annotation 불가 → 제거

- **Head CT Atlas v2 (Session 4):**
  - s0011 (1.5mm, head crop 300mm = 200 slices, 80 active structures)

- **Spine X-ray Atlas (Session 3):**
  - SBJ_LLXR 데이터, Lateral/AP 2-panel, 15 vertebrae

## 🚧 미해결 블로커

- `.env.local` 아직 미확인 (유저가 수동 이동 예정)
- Multi-atlas: ANTs registration 도구 설치 필요 (향후)
- TotalSegmentator brain_structures/craniofacial_structures: 유료 라이선스

## 🔑 필요한 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FORMSPREE_ID=
NEXT_PUBLIC_SHEETS_WEBHOOK_URL=   # (선택)
```

## 🛠 다른 컴퓨터 세팅 순서

```bash
git clone https://github.com/taeshin11/bodyatlas.git BodyAtlas
cd BodyAtlas
npm install
# .env.local 파일 수동으로 옮기기
npm run dev
```

## 📚 핵심 파일 가이드

- `PRD.md` — 제품 요구사항 (현재 v2.0)
- `claude-progress.txt` — 세션 누적 로그
- `src/components/RegionSelector.tsx` — 바디 리전 탭 (6개: Head&Neck, Chest, Abdomen, Pelvis, Brain MRI, Spine X-ray)
- `src/components/AtlasViewer.tsx` — CT/MRI 뷰어
- `src/components/SpineXrayViewer.tsx` — Spine X-ray 뷰어
- `scripts/gen_head_ct_atlas.py` — Head CT 빌더 (spline smoothing 포함)
- `scripts/smooth_labels.py` — JSON 라벨 post-process smoother
- `scripts/gen_multi_atlas_head.py` — Multi-atlas 빌더 (ANTs 필요 시 사용)
- `public/data/head-ct/` — 80 structures, 200/311/311 slices
- `public/data/chest-ct/` — 106 structures, 431/311/311 slices
- `public/data/brain-mri/` — 92 structures, 182/182/218 slices
- `public/data/spine-xray/` — 15 structures, Lateral+AP

## 🗂 데이터 소스

- **TotalSegmentator v2 full dataset:** D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/
- **Spine X-ray labels:** D:/ImageLabelAPI_SPINAI/SBJ_LLXR/
- **연구 기록:** research_history/ (001~006)

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-06 (Session 5)_
