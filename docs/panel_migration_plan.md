
# Panel-by-Panel Migration Plan (Hexagonal + Domain Services)
_Updated: 2025-09-06 03:48_

대상 브랜치: `feature/v1.3.1`  
순서: **Left → Right → Bottom → Top**

---

## 공통 전환 원칙 (재확인)
1) **호환 우선**: 기존 API 유지, 신규 API 추가  
2) **명시적 폐기**: 기존 API에 `@deprecated` + 대체 API 명시  
3) **읽기/쓰기 분리**: View는 Controller만 의존(Reader/Writer)  
4) **일관 시그니처**: 최종 일괄 제거를 위한 이름/형식 통일

공통 인프라:  
- `controllers/adapters/createReader.ts` (정밀 구독 유틸)  
- `engine/selectors/domain/*`, `engine/selectors/cross/*` (순수 파생값)  
- `useEditor()` / `editStore` @deprecated 주석(실제 제거는 나중)

---

## 1) LEFT 패널 (Layers/Palette/Pages/Assets/Components/...)

### 대상 파일
- `editor/leftPanel/LeftSidebar.tsx`
- `editor/leftPanel/Layers.tsx`
- `editor/leftPanel/Palette.tsx`
- `editor/leftPanel/panels/PagesPanel.tsx`
- `editor/leftPanel/panels/AssetsPanel.tsx`
- `editor/leftPanel/panels/ComponentsPanel.tsx`
- `editor/leftPanel/ProjectStylesheets.tsx`
- `editor/leftPanel/TemplatesPanel.tsx`
- 관련 컨트롤러: `controllers/layers/LayersController.ts`, `controllers/pages/PagesController.ts` (또는 `PagesFacadeController.ts`), `controllers/ui/UiController.ts`

### 필요한 셀렉터
- `domain/nodes.ts`: `makeSelectNodeByIdFrom`, `selectChildrenIdsFrom`, `selectIsContainerFrom`
- `domain/pages.ts`: `selectCurrentPageIdFrom`, `selectCurrentPageFrom`
- `domain/ui.ts`: `selectSelectedNodeIdFrom`
- `cross/outline.ts`: `selectPageOutline(s, pageId)` (레이어 트리용), `selectNodeBreadcrumbs(s, nodeId)`

### 작업 순서
1. **Reader 도입(과구독 제거):**
   - `Layers.tsx`: `useLayersController().reader.useOutline()` 추가(내부: `selectPageOutline` 호출)
   - `PagesPanel.tsx`: `usePagesController().reader.usePages()` (현재 페이지/목록 읽기)
   - `Palette.tsx`/`AssetsPanel.tsx`/`ComponentsPanel.tsx`: 필요한 데이터 읽기를 Reader로 통일
2. **Writer 경유(쓰기 일원화):**
   - 드래그/드롭/삽입/삭제/이동 → `LayersController.writer.moveNode/appendChild/removeCascade`
   - 페이지 CRUD/선택 → `PagesController.writer.add/duplicate/remove/setCurrentById`
3. **Deprecated 주석:**
   - View 내 `useEditor()`/`editorStore` 직접 접근 제거(남으면 @deprecated 코멘트와 TODO)
4. **ACC 체크:**
   - 레이어 트리/선택/이동이 기존과 동일 동작
   - 리렌더 횟수 감소(DevTools로 확인)

---

## 2) RIGHT 패널 (Inspector + Sections)

### 대상 파일
- `editor/rightPanel/Inspector.tsx`
- `editor/rightPanel/sections/*` (Common/PropsAuto/Styles/* 그룹 등)
- 관련 컨트롤러: `controllers/InspectorController.ts`, `controllers/policy/ProjectPolicyController.ts`, `controllers/binding/BindingController.ts`, `controllers/ui/UiController.ts`

### 필요한 셀렉터
- `cross/selection.ts`: `selectTargetNodeIdFrom`, `selectTargetNodeFrom`
- `domain/nodes.ts`: 속성/타입/children 등 읽기
- `cross/rendering.ts`: `selectRenderableStyleForNode(s, nodeId)` (읽기 전용 최종 스타일)
- `cross/validation.ts`: 배치/이동/스타일 변경 유효성

### 작업 순서
1. **타깃 결정 단일화:**
   - `InspectorController` 내부에서 `computeInspectorTargetNodeId()`를 `selectTargetNodeIdFrom` 호출로 이관
   - 기존 `computeInspectorTargetNodeId()`는 `@deprecated` 유지
2. **Reader 훅 치환:**
   - `Inspector.tsx`가 필요로 하는 값들을 `useInspectorController().reader.useTargetNode()/useRenderableStyle()`로 교체
3. **Writer 경유:**
   - 스타일/Props 변경/Tag 변경 → `InspectorController.writer.*` (내부에서 Engine.update)
4. **ACC 체크:**
   - 기존 섹션 UI 동작 동일
   - 스타일 변경 시 re-render 최소화

---

## 3) BOTTOM 패널 (Actions/Data/Flows/Fragments)

### 대상 파일
- `editor/bottomPanel/BottomDock.tsx`
- `editor/bottomPanel/panels/ActionsPanel.tsx`
- `editor/bottomPanel/panels/DataPanel.tsx`
- `editor/bottomPanel/panels/FlowsPanel.tsx`
- `editor/bottomPanel/panels/FragmentsPanel.tsx`
- 관련 컨트롤러: `controllers/actions/ActionsController.ts`(+ `ActionsFacadeController.ts`), `controllers/binding/BindingController.ts`, `controllers/ui/UiController.ts`, `controllers/pages/PagesController.ts`

### 필요한 셀렉터
- `cross/actions.ts`: `selectActionStepsForNodeEvent(s, nodeId, event)`
- `domain/ui.ts`: `selectSelectedNodeIdFrom`
- `domain/pages.ts`: 페이지/프래그먼트 관련 선택자
- `cross/selection.ts`: 타겟 노드 재사용

### 작업 순서
1. **Reader 정리:**
   - `ActionsPanel.tsx` → `useActionsController().reader.useEventList(nodeId)` / `useSteps(nodeId, event)`
2. **Writer 일원화:**
   - CRUD/실행 → `ActionsController.writer.append/update/move/remove/run`
   - `run`은 내부에서 `runtime/actions.ts`를 단일 진입점으로 호출
3. **ACC 체크:**
   - 기존 이벤트/스텝 CRUD/실행 흐름 동일
   - 실행 경로 단일화 확인

---

## 4) TOP 패널 (PageBar)

### 대상 파일
- `editor/topbar/PageBar.tsx`
- 관련 컨트롤러: `controllers/pages/PagesController.ts` 또는 `PagesFacadeController.ts`, `controllers/ui/UiController.ts`

### 필요한 셀렉터
- `domain/pages.ts`: `selectCurrentPageIdFrom`, `selectCurrentPageFrom`
- `domain/ui.ts`: UI 허브 탭 등
- (옵션) `cross/outline.ts`: 페이지 전환 시 경로 계산

### 작업 순서
1. **Reader 정리:**
   - 현재 페이지/탭 상태 → `usePagesController().reader.useCurrentPage()/usePages()`
2. **Writer 일원화:**
   - 페이지 전환/추가/복제/삭제/탭 변경 → `PagesController.writer.*`
3. **ACC 체크:**
   - 기존 탭/페이지 동작 동일

---

## 공통 ACC (각 패널 완료 시 점검)
- View에서 `editorStore` 직접 import 0건
- View는 **항상** Controller의 `reader()/writer()`만 사용
- Selector는 순수 함수(부수효과/IO 없음)
- `useEditor()`/기존 API는 동작 보존 + `@deprecated`만 추가
- 렌더 프로파일 상 과구독 감소

---

## PR 분할 제안
- **PR-Left**: Layers/Pages/Palette/Assets/Components (Reader/Writer 치환 + outline selector 추가)
- **PR-Right**: Inspector + Sections (selection/rendering selector + reader 적용)
- **PR-Bottom**: Actions/Data/Flows/Fragments (actions selector + run 경로 일원화)
- **PR-Top**: PageBar (pages selector + reader 적용)
- **PR-Cleanup**: 남은 @deprecated 치환 및 소스 정리

---

## 리스크/완화
- 혼용 기간: @deprecated + ESLint로 검출, 작은 PR로 분할
- 회귀: 핵심 흐름 수동 테스트 + 간단 스냅샷/selector 단위 테스트
- 성능: 정밀 구독 전환으로 개선, 비용 큰 selector만 메모이즈

