# BodyAtlas 인수인계 문서

> 다른 컴퓨터/세션에서 작업을 이어받을 때 제일 먼저 읽는 파일.
> 매 세션 종료 시 이 파일을 **덮어쓰기** — 항상 "지금의 상태"만 유지.

---

## 🏃 지금 바로 할 일

- **현재 상태:** 커밋되지 않은 WIP 변경사항 존재 → Session 2 기록과 함께 커밋/푸시 완료
- **다음 세션 시작 시:** `claude-progress.txt` 읽고 최신 Session 로그 확인
- **미완료 WIP 내역** (Session 2에서 작업한 것):
  - `src/config/features.ts` — DICOM 관련 플래그 제거, BodyAtlas 중심 플래그로 재구성 (atlasViewer, labelOverlay, structureSearch, multiLanguage, pwaOffline 등)
  - `src/lib/i18n.ts` — 7개 언어에 `header.download` 키 추가
  - `src/components/` — AtlasViewer, StructurePanel, AuthGate, Header 수정 (atlas viewer UI 개선 추정)
  - `src/app/page.tsx` — 메인 페이지 업데이트
  - `PRD.md` — 업데이트
  - `public/data/chest-ct/labels/axial/*.json` — 라벨 데이터 재생성 (856개 파일)

## 📝 최근 결정사항 (WHY)

- **BrainAxis → BodyAtlas 피벗:** DICOM AC-PC 정렬 툴에서 인터랙티브 해부학 아틀라스로 전환 (Session 1 기록 참조)
- **GitHub 리포 이름 변경:** `brainaxis` → `bodyatlas` (Session 2, 2026-04-06) — 혼동 방지용
- **Feature flags 재구성:** DICOM 업로드/AC-PC 정렬 관련 플래그 전부 off, 아틀라스 중심으로 피벗

## 🚧 미해결 블로커

- 없음 (알려진 것 기준)

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

- `PRD.md` — 제품 요구사항 (현재 v1.3)
- `claude-progress.txt` — 세션 누적 로그
- `feature_list.json` — 기능 목록 원본
- `src/config/features.ts` — 활성화된 기능 플래그
- `src/components/AtlasViewer.tsx` — 메인 뷰어 컴포넌트
- `public/data/chest-ct/` — CT 아틀라스 데이터 (108 structures, 1053 slices, 1.5mm)
- `data_pipeline/` — 데이터 전처리 스크립트 (TotalSegmentator)
- `supabase/` — Supabase 설정

## 🌐 배포

- 프로덕션: brainaxis.vercel.app (도메인 교체 예정일 수 있음)
- GitHub: github.com/taeshin11/bodyatlas

---

_마지막 업데이트: 2026-04-06 (Session 2)_
