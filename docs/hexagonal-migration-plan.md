
# Hexagonal + Domain Services 전환 개발 계획 (feature/v1.3.1)

## 범위
- 기준 소스: 사용자가 제공한 `src/figmaV3/*` 전체
- 영향 영역: Engine 파사드, Controllers(도메인별), Selectors, View

---

## 마일스톤 & 작업 항목

### M1: 기반 정리 (D+1 ~ D+2)
- [ ] `controllers/adapters/createReader.ts` 추가 (정밀 구독 유틸)
- [ ] `engine/selectors/` 구조 분리
  - [ ] `domain/`: nodes.ts, pages.ts, fragments.ts, ui.ts, styles.ts
  - [ ] `cross/`: selection.ts, outline.ts, rendering.ts, actions.ts, validation.ts
- [ ] 기존 Controller 내부 파생 로직을 Selector로 이동
- [ ] `useEditor()` / `editorStore`에 `@deprecated` 주석 추가
- [ ] ESLint:
  - [ ] `eslint-plugin-deprecation` 추가
  - [ ] `no-restricted-imports`로 `store/editStore` 직접 import 금지
  - [ ] CI 경고 레벨 설정

### M2: View -> Controller 전환 (D+3 ~ D+7)
- 우선순위 화면
  - [ ] `rightPanel/Inspector.tsx`
    - [ ] `useInspectorController().reader.useTargetNode()` 적용
    - [ ] update/notification 등 Writer 경유
  - [ ] `leftPanel/Layers.tsx`
    - [ ] 노드 트리 읽기: nodes/pages/ui selectors 사용(Controller Reader 경유)
    - [ ] 이동/추가/삭제: `LayersController.Writer`
  - [ ] `topbar/PageBar.tsx`
    - [ ] `usePagesController()` 또는 `PagesFacadeController`로 일원화
  - [ ] `bottomPanel/ActionsPanel.tsx`
    - [ ] `useActionsController()` 또는 Facade
    - [ ] 실행 경로: `runtime/actions.ts` 단일화
  - [ ] `centerPanel/Canvas.tsx`
    - [ ] DnD 결과 처리: `LayersController.Writer` 경유
- [ ] View 내 `useEditor()` 참조 제거(잔여 alias 허용)

### M3: 은닉/정리 (D+8 ~ D+12)
- [ ] View에서 Store 직접 접근 0건 보장
- [ ] Facade alias 정리(facadeToken -> token)
- [ ] 코드모드(일괄 치환 스크립트)로 잔여 deprecated 제거
- [ ] 간단 테스트
  - [ ] Selector 단위 테스트(순수 함수)
  - [ ] Controller API 스냅샷
- [ ] 성능 확인
  - [ ] 렌더 프로파일에서 리렌더 감소 검증
  - [ ] 큰 selector에만 memo 적용

---

## 산출물
- 문서: `/docs/architecture/hexagonal-migration.md` (본 가이드 기반)
- 코드: adapters/ + controllers/ + engine/selectors/ 구조 반영
- ESLint/CI 설정 변경 PR
- 회귀 방지 테스트(간단)

---

## 리스크 & 대응
- 혼용 기간 증가: @deprecated + ESLint로 검출, 단계별 PR로 병합
- 회귀 가능성: Selector/Controller 최소 테스트, UI 주요 플로우 수동 테스트
- 성능 이슈: 정밀 구독 도입으로 대체로 개선, 필요 시 memo1/eq 커스텀 도입

---

## PR 분할 제안
- PR-1 (Infra/Docs): adapters/createReader.ts, selectors 스켈레톤, ESLint, 문서
- PR-2 (Inspector/Layers/PageBar): View 치환 + Controller Reader/Writer 보강
- PR-3 (Canvas/ActionsPanel): DnD/Action 실행 경로 일원화
- PR-4 (Cleanup): alias 제거, 코드모드 치환, 테스트/문서 보강
