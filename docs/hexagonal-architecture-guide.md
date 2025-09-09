
# Hexagonal + Domain Services 도입 가이드 (webcomponent-editor)

> 대상 브랜치: `feature/v1.3.1`  
> 범위: `src/figmaV3/*` 전반 — Engine 파사드, Controllers(도메인별), Selectors(순수 파생계층), View(UI)

---

## 1) 목표와 원칙

### 목표
- View <-> Controller <-> Engine(파사드) 레이어를 명확히 분리
- 읽기/쓰기 분리: 읽기는 Reader 훅, 쓰기는 Writer로만
- 파생값(derived data)은 순수 selector 계층에 집중
- 엔진 내부 저장소(editStore)는 파사드 뒤로 은닉

### 전환 원칙
1. 호환 우선: 기존 API 유지, 신규 API(Reader/Writer/Selectors) 병행 도입
2. 명시적 폐기: 기존 API에 @deprecated + 대체 API 명시
3. 읽기/쓰기 분리 준수: View는 Controller만 사용(직접 store 접근 금지)
4. 검출 가능성: @deprecated 사용시 ESLint/CI 경고(또는 fail)
5. 코드모드 가능성: 일괄 치환 가능하도록 네이밍/시그니처 일관 유지

---

## 2) 레이어 정의(최종 구조)

```
[UI / View]  <->  [Controller (Application Layer)]  <->  [Engine (Facade)]
                                                ^
                                   [Ports / Adapters (In/Out)]
                                                v
                                    [Domain Services / Entities]
                                                v
                               [Store / Persistence / I/O (editStore)]
```

- View: 오직 Controller에 의존. `const { reader, writer } = useXxxController()`
- Controller
  - Reader 훅: 정밀 구독(내부에서 Engine.subscribe 사용), selector 호출/래핑
  - Writer: `EditorEngine.update(...)`를 통한 상태 변경 + 도메인 서비스 호출
- Engine(Facade): `getState / update / subscribe` + 도메인 오퍼레이션
- Selectors: `State -> Result` 순수 함수(읽기 전용 파생값)
- Ports/Adapters: 외부 I/O(HTTP, 파일, 통신) 경계
- Domain Services: 도메인 규칙/유효성/명령 처리(Writer에서 호출)

---

## 3) 디렉터리 구성 제안

```
src/figmaV3/
  engine/
    EditorEngine.ts
    selectors/
      common/
        equality.ts
        memo.ts
      domain/
        nodes.ts
        pages.ts
        fragments.ts
        ui.ts
        styles.ts
      cross/
        selection.ts     // 타겟/선택 컨텍스트
        outline.ts       // 레이어/경로/트리
        rendering.ts     // 렌더링용 합성 스타일
        actions.ts       // 액션/이벤트 뷰모델
        validation.ts    // 배치/이동 유효성
        search.ts        // 검색/필터
      index.ts
  controllers/
    adapters/
      createReader.ts    // Controller 내부 전용 정밀구독 유틸
    nodes/
      NodesController.ts
    pages/
      PagesController.ts
      PagesFacadeController.ts (호환용)
    layers/
      LayersController.ts
    inspector/
      InspectorController.ts
    actions/
      ActionsController.ts
      ActionsFacadeController.ts (호환용)
    ui/
      UiController.ts
    hooks.ts             // (현행 유지, 단계적 축소/정리)
  editor/
    ...                  // View — Controller만 의존
  store/
    EditorStore.ts         // 내부 구현 (외부 직접 접근 차단 지향)
```

---

## 4) 네이밍 규칙

### Selectors
- 파일 스코프: `engine/selectors/domain/*`(단일 도메인), `engine/selectors/cross/*`(복수 도메인)
- 함수명: `select<산출물><From/For/Of><컨텍스트>`
  - 예) `selectTargetNode`, `selectNodeBreadcrumbs`, `selectRenderableStyleForNode`
- 팩토리형: `makeSelectXxx(id)` -> `(s: State) => R` (구독 최적화에 유용)
- 토큰형: `nodesToken(s)`, `pagesToken(s)` … (Controller 내부 최적화용, View 노출 금지)

### Controller
- 훅: `use<Domain>Controller()`
- Reader: `reader.useXxx()` (정밀 구독 반환 훅)
- Writer: `writer.xxx()` (상태 변경/도메인 오퍼레이션)

### Deprecated
- `useEditor()` (통짜 상태 훅) -> `@deprecated`
- `editorStore` 직접 import -> `@deprecated`
- `facadeToken()` -> `token()` 으로 명확화 (alias 유지 후 폐기)

---

## 5) 패턴과 예시

### 5.1 Controller-Scoped Reader 훅
```ts
// controllers/adapters/createReader.ts
import { useRef, useState, useSyncExternalStore } from "react";
import { EditorEngine } from "@/figmaV3/engine/EditorEngine";

export type Equals<T> = (a: T, b: T) => boolean;

export function createReader<TSlice>(pickSlice: (root: ReturnType<typeof EditorEngine.getState>) => TSlice) {
  function get(): TSlice {
    return pickSlice(EditorEngine.getState());
  }

  function useSelect<R>(selector: (s: TSlice) => R, equals?: Equals<R>) {
    const getSnapshot = () => selector(get());
    const [val, setVal] = useState(getSnapshot);
    const eq = useRef<Equals<R>>(equals ?? Object.is);

    useSyncExternalStore(
      EditorEngine.subscribe,
      () => {
        const next = getSnapshot();
        if (!eq.current(val, next)) setVal(next);
        return next;
      },
      () => val
    );

    return val;
  }

  return { get, useSelect };
}
```

### 5.2 Selectors 예시

`engine/selectors/cross/selection.ts`
```ts
export function selectTargetNodeId(s: State): string | null {
  return s.ui.hoverNodeId ?? s.ui.selectedNodeId ?? null;
}
export function selectTargetNode(s: State): Node | null {
  const id = selectTargetNodeId(s);
  return id ? s.nodes.byId[id] ?? null : null;
}
```

`engine/selectors/domain/pages.ts`
```ts
export function selectSelectedPageId(s: State): string | null {
  return s.ui.selectedPageId ?? null;
}
export function selectSelectedPage(s: State): Page | null {
  const id = selectSelectedPageId(s);
  return id ? s.pages.byId[id] ?? null : null;
}
```

### 5.3 Controller에서 래핑

`controllers/inspector/InspectorController.ts`
```ts
import { createReader } from "../adapters/createReader";
import { EditorEngine } from "@/figmaV3/engine/EditorEngine";
import { selectTargetNode } from "@/figmaV3/engine/selectors/cross/selection";

const readerBase = createReader(s => s); // 필요 slice로 바꿔도 됨

function useTargetNode() {
  return readerBase.useSelect(state => selectTargetNode(state));
}

export function useInspectorController() {
  return {
    reader: { useTargetNode },
    writer: {
      toggleExpertMode() {
        EditorEngine.update(s => { s.ui.expertMode = !s.ui.expertMode; });
      },
    },
  };
}
```

### 5.4 View는 오직 Controller만 사용
```tsx
const { reader, writer } = useInspectorController();
const node = reader.useTargetNode();
// ...
<button onClick={writer.toggleExpertMode}>Expert</button>
```

---

## 6) ESLint/TS 설정

- `eslint-plugin-deprecation` 도입
- 규칙 예:
  - `no-restricted-imports`: `src/figmaV3/store/editStore` 직접 import 금지
  - `deprecation/deprecation`: @deprecated 사용 시 경고/에러
- CI에서 deprecation 경고를 실패로 처리(마이그레이션 단계별 완화 가능)

---

## 7) 마이그레이션 절차 (개요)

1. Phase 1 (호환 + 기반)
   - `createReader.ts` 추가
   - Selectors 디렉터리 분리(domain/, cross/), 기존 파생 로직 이동
   - `useEditor()`/`editorStore`에 @deprecated 주석 + ESLint 룰
2. Phase 2 (View 전환)
   - 우선순위 화면부터 View -> Controller.Reader/Writer로 치환
   - Inspector, Layers, PageBar, ActionsPanel, Canvas(DnD)
3. Phase 3 (엔진 은닉 + 정리)
   - View의 직접 상태 접근 제거 완료
   - Facade alias 정리(facadeToken -> token)
   - 코드모드로 잔여 deprecated 제거
4. 회귀 방지
   - 간단 계약 테스트: Controller API 스냅샷/Selector 단위 테스트
   - 렌더 프로파일로 과구독 감소 확인

---

## 8) 체크리스트

- [ ] View에서 `editorStore` 직접 import 0건
- [ ] View는 항상 Controller.{reader, writer}만 사용
- [ ] Selector는 순수 함수(부수효과 없음), IO 금지
- [ ] 파생값은 Controller가 아니라 Selector로 이동
- [ ] Actions 실행 경로 1곳 정리(Controller.Writer -> runtime/actions.ts)
- [ ] ESLint deprecation 경고/금지 적용
- [ ] 문서 `/docs/architecture/hexagonal-migration.md` 반영
