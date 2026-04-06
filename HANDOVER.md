# BodyAtlas 인수인계 문서

> 다른 컴퓨터/세션에서 작업을 이어받을 때 제일 먼저 읽는 파일.
> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** Brain PET 탭 제거 완료. 탭 6개 (Head & Neck / Chest / Abdomen / Pelvis / Brain MRI / Spine X-ray)
- **다음 세션 시작 시:** `.env.local` 확인 후 `npm run dev` → live annotation test (head-ct, chest, brain-mri, spine-xray)

## 📝 최근 결정사항 (WHY)

- **Brain PET 탭 제거 (Session 5):**
  - PET 모달리티는 해부학적 구조 분할 불가 → annotation 0개
  - 유저: "annotation도 안되는데 빼버리자"

- **Head CT Atlas v2 재빌드 (Session 4):**
  - D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/ 데이터 직접 사용
  - s0011 (311×311×431, 1.5mm, head-to-pelvis) — head crop 200 slices (300mm)
  - 85 structures, 200/311/311 slices (axial/sag/cor)

- **Spine X-ray Atlas 추가 (Session 3):**
  - `D:\ImageLabelAPI_SPINAI\SBJ_LLXR` 데이터에서 최적 이미지 2장 선별
  - `SpineXrayViewer.tsx` 신규 컴포넌트 — Lateral/AP 2-panel 동시 표시

## 🚧 미해결 블로커

- `.env.local` 아직 미확인 (유저가 수동 이동 예정)
- CADS brain task (557): 이 CT에서 head detection 실패 — CC BY 4.0 모델 출시 대기
- TotalSegmentator brain_structures/craniofacial_structures: 유료 라이선스 필요

## 🔑 필요한 환경변수 (.env.local)

값은 직접 복사해서 옮겨야 함. Vercel 대시보드에도 이미 세팅되어 있음:

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
- `feature_list.json` — 기능 목록 원본
- `src/config/features.ts` — 활성화된 기능 플래그
- `src/components/AtlasViewer.tsx` — CT/MRI 뷰어 (axial/sagittal/coronal 3-plane)
- `src/components/SpineXrayViewer.tsx` — Spine X-ray 뷰어 (Lateral/AP 2-panel)
- `src/components/RegionSelector.tsx` — 바디 리전 탭 (BodyRegion 타입 포함, 6개 탭)
- `public/data/chest-ct/` — CT 아틀라스 데이터 (108 structures, 1053 slices, 1.5mm)
- `public/data/head-ct/` — Head CT 아틀라스 (85 structures, 200/311/311 slices)
- `public/data/spine-xray/` — Spine X-ray 아틀라스 (15 structures, Lateral+AP)
- `scripts/gen_head_ct_atlas.py` — Head CT 데이터 생성 파이프라인
- `scripts/gen_spine_xray_atlas.py` — Spine X-ray 데이터 생성 스크립트
- `data_pipeline/run_head_upgrade.py` — VRAM 대기 후 head tasks 자동 실행
- `data_pipeline/` — 데이터 전처리 스크립트 (TotalSegmentator)
- `supabase/` — Supabase 설정

## 🗂 데이터 소스

- **TotalSegmentator v2 full dataset:** D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/
- **Spine X-ray labels:** D:/ImageLabelAPI_SPINAI/SBJ_LLXR/
- **연구 기록:** research_history/ (001~006)

## 🌐 배포

- 프로덕션: https://bodyatlas-ten.vercel.app
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-06 (Session 5)_
