
# 웹컴포넌트 에디터 최종 아키텍처(헥사고날 + 도메인 서비스) v1

본 문서는 대화히스토리와 현재 코드베이스(feature/v1.3.1, v1.4 진행분)를 통합적으로 검토하여,
**View ↔ Controller ↔ EditorEngine(파사드) ↔ Store(zustand)** 흐름을 기준으로 최종 아키텍처와
정책/규칙을 확정합니다. (UI/UX 불변, 내부 아키텍처 교체)

---

## 1) 핵심 목표

- **UI/UX 불변**: 사용자 관점의 화면/동작(마크업/스타일/모션)은 유지
- **R&R 분리**: View는 렌더/이벤트 위임만, 모든 읽기/쓰기 로직은 Controller로 일원화
- **단일 진입점**: 상태 저장소는 오직 `EditorEngine`(파사드)을 통해 접근(직접 store 접근 금지)
- **도메인 경계 명확화**: Pages, Nodes/Layers, Actions, Binding, Policy, UI, History, DataSchema, Validation
- **구독 일관성**: Reader 훅은 **필요 조각만** 구독(미세구독), Writer는 **엔진 update**만 호출
- **확장성/테스트 용이성**: 컨트롤러 단위 모킹/테스트, 엔진은 in-memory/remote 대체 가능

---

## 2) 아키텍처 개요

```
[View (React)]
   ↑ Reader 훅 (useController.reader.*)
   ↓ Writer 호출 (useController.writer.*)
[Controllers (도메인별 Reader/Writer, 필요 시 Facade)]
   ↕ EditorEngine API만 사용 (getState / update / subscribe / domain ops)
[EditorEngine (파사드)]
   ↕ editStore (zustand) — 내부로 캡슐화 (직접 import 금지)
```

- **View**: 마크업/스타일/이벤트 바인딩, 로직 없음(검증/권한/정합성 등은 Controller 책임)
- **Controllers**: 도메인별 **Reader/Writer**. 오직 **EditorEngine API**만 사용
- **EditorEngine**: 단일 창구. `getState()`, `update(mutator)`, `subscribe(listener)`, `getVersionToken()` 및
  도메인 오퍼레이션(`pages.getAll()`, `nodes.move()` 등)을 제공
- **Store(zustand)**: 상태 저장 구현체. 외부 노출 금지(점진 차단, 과도기엔 읽기 전용 호환만 허용)

---

## 3) EditorEngine(파사드) 규약

### 3.1 공통 API
- `static getState(): State`
- `static update(mutator: (draft: State) => void, bumpVersion = true): void`
- `static subscribe(listener: () => void): () => void`
- `static getVersionToken(): string`

### 3.2 도메인 모듈 (예시 시그니처)
- `pages.getAll(): ReadonlyArray<Page>`
- `pages.getSelectedPageId(): string | null`
- `pages.setSelectedPageId(id: string | null): void`
- `pages.create(title: string): string` / `pages.rename(id: string, title: string): void`
- `pages.duplicate(id: string): string | null` / `pages.remove(id: string): void`
- `pages.updateMeta(id: string, patch: Partial<Page>): void`
- `nodes.getNodeById(id: NodeId): Node | undefined`
- `nodes.getNodeChildrenIds(id: NodeId): ReadonlyArray<NodeId>`
- `nodes.setSelectedNodeId(id: NodeId | null): void`
- `nodes.move(nodeId, newParentId, index?): void`
- `actions.getEventKeys(nodeId: string): string[]`
- `actions.getActionBag(nodeId: string): Readonly<Record<string, { steps: ActionStep[] }>>`
- `actions.appendActionStep(nodeId, event, step): void`
- `actions.updateActionStep(nodeId, event, index, patch): void`
- `actions.removeActionStep(nodeId, event, index): void`
- `actions.run(nodeId, event): Promise<void>`
- `policy.getVisibility(ctx): boolean` / `policy.override(scope, patch)`
- `binding.applyBinding(nodeId, propKey, binding)`
- `ui.getEditorMode(): EditorMode` / `ui.getActiveHubTab(): ProjectHubTab | undefined`

---

## 4) Controller 규약 (Reader/Writer)

### 4.1 기본 인터페이스
```ts
export interface XxxReader { ... }
export interface XxxWriter { ... }
export interface XxxController {
  reader(): XxxReader;
  writer(): XxxWriter;
}
export function useXxxController(): XxxController;
```

- **Reader**: `useSyncExternalStore` 기반 미세 구독
- **Writer**: `EditorEngine.update()`만 호출
- **FacadeController(선택)**: View에서 2개 이상의 컨트롤러가 필요할 때만 묶어서 단일 포트 제공

### 4.2 네이밍 정책
- **Reader**: `get*`, `use*`, `is*`, `*Token`
- **Writer**: `set*`, `append*`, `update*`, `remove*`, `toggle*`, `move*`, `run*`
- **선택/포커스**: `setSelectedPageId`, `setSelectedNodeId`
- **select 금지**: 모호한 `select()` 대신 `setSelected*()`

---

## 5) 패널별 적용 가이드

- **Layers**: `useNode`, `useNodeFlags` 훅 제공, `toggleHidden`, `toggleLocked`
- **Pages**: CRUD 및 선택, Facade로 UI 상태 합성 가능
- **Actions**: `getEventKeys`, `getActionBag`, `append/update/remove/run`
- **Policy/Binding**: `policy.override`, `applyBinding`

---

## 6) 마이그레이션 정책

1. **엔진 단일화**: EditorEngine만 남기기
2. **직접 store 접근 금지**: `editorStore.getState()`, `useEditor()` 제거
3. **Reader/Writer 도입**
4. **Facade는 필요할 때만**
5. **지연 반영 해결**: 미세구독 훅
6. **타입 단일화**: core/types 기준

---

## 7) 검증/권한
- Controller Writer에서 처리, View는 로직 없음

---

## 8) 테스트 전략
- Controller 단위 테스트
- 도메인 서비스 단위 테스트
- E2E: 패널 상호작용 시나리오

---

## 9) 파일 구조

```
src/figmaV3/
  engine/EditorEngine.ts
  controllers/
    layers/LayersController.ts
    pages/PagesController.ts
    pages/PagesFacadeController.ts
    actions/ActionsController.ts
    actions/ActionsFacadeController.ts
    policy/ProjectPolicyController.ts
    binding/BindingController.ts
    ui/UiController.ts
  editor/...(View)
  core/registry.ts, types.ts
  domain/... 
```

---

## 10) 규칙 요약
- View는 Controller만 사용
- Controller는 Engine만 사용
- Engine은 상태 변경 시 버전 bump
- Reader 훅은 미세구독
- Writer는 update 1회만 호출
- Facade는 필요할 때만
