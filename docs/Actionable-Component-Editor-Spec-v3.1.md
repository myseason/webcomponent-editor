# Actionable Component Editor — 아키텍처 보완 & 기능 정의서 (V3.1)

> 목표: **Actionable 컴포넌트 기반**의 코드리스 웹서비스 빌더.  
> 범위: **컴포넌트 개발** · **웹페이지 개발** · **페이지 Flow 개발**(이벤트→액션으로 다른 페이지/웹 조각 호출).  
> 기술 스택: **Next.js + React + TypeScript + Tailwind + Zustand(필수)**

---

## 0) 비전 & 목표
- 비개발자도 **드래그앤드롭 + 속성 편집 + 액션 플로우 구성**만으로 동작하는 UI/페이지 개발
- 개발자는 재사용 가능한 **Actionable 컴포넌트**를 정의/등록하여 팀 생산성 극대화
- 결과물은 **페이지 단위 저장/복원**, (차후) **Export/Deploy** 확장

---

## 1) 시스템 전반 아키텍처 (V3 확정안)

```
src/figmaV3/
  core/          # 타입(SSOT)/레지스트리
  runtime/       # 바인딩(머스태시), 액션 실행기, 플로우 러너
  store/         # Zustand 기반 editStore (트리/선택/패치/추가/이동/페이지/플로우)
  editor/
    components/        # Box/Button/Text/Image (+ autoRegister)
    leftPanel/         # Palette, Layers
    centerPanel/       # Canvas(렌더/선택 윤곽/드롭)
    rightPanel/        # Inspector(Props 자동 UI + 스타일 섹션)
    bottomPanel/       # Dock: Actions, Data, **Flows(신설)**
    useEditor.ts       # getEditorStore + useSyncExternalStore
    bootstrap.ts       # 컴포넌트 자동 등록, 초기 프로젝트 로드
```

### 1.1 핵심 개념
- **Actionable Component**: 이벤트(onClick, onChange…) → 액션 실행기 연결, {{ }} 데이터 바인딩, 필요 시 내부 상태/애니메이션 포함
- **Flow**: 이벤트→액션 중 **Navigate/OpenFragment/CloseFragment** 등 **페이지 그래프 전환**을 선언적으로 정의
- **SSOT 타입**: `core/types.ts` 단일 출처. Node/Project/Page/Fragment/FlowEdge/ActionStep/BindingScope/ComponentDefinition 등

### 1.2 런타임 서브시스템
- **binding.ts**: `getBoundProps(props, scope)` — 안전한 머스태시(`{{data.foo}}`, `{{node.props.value}}` …). *정책: props에만 바인딩 적용*
- **actions.ts**: `getSteps(node, evt)`, `runActions(node, evt)` — 아래 스텝 유니온 실행
- **flow.ts (신설)**: 페이지 그래프/프래그먼트 스택을 관리하고, Navigate/OpenFragment/CloseFragment 실행

### 1.3 Zustand 기반 Store
- 기본 API(구독/선택/추가/패치/스타일 패치/가드)를 유지하면서 **페이지/플로우** 액션을 추가
- (선택) devtools/immer 연동, (선택) undo/redo

---

## 2) 데이터 모델 (요약)

### 2.1 Node / Project / UI
```ts
type NodeId = string;

interface CSSDict extends Record<string, unknown> {} // React.CSSProperties 유사

interface StyleBase { element?: CSSDict }

interface Node<P extends Record<string, unknown> = Record<string, unknown>, S extends StyleBase = StyleBase> {
  id: NodeId;
  componentId: string;
  props: P;
  styles: S;
  children: NodeId[];
  locked?: boolean;
}

interface Page { id: string; name: string; rootId: NodeId; slug?: string }     // slug는 프리뷰/배포 시 라우팅 힌트
interface Fragment { id: string; name: string; rootId: NodeId }                // 모달/오버레이 등

interface Project {
  pages: Page[];
  fragments: Fragment[];
  nodes: Record<NodeId, Node>;
  rootId: NodeId;               // 현재 표시 중인 페이지 rootId
}

interface EditorUI {
  selectedId: NodeId | null;
  canvasWidth: number;          // 기본 640
}
```

### 2.2 Action & Flow
```ts
type SupportedEvent = 'onClick' | 'onChange' | 'onSubmit' | 'onLoad';

type ActionStep =
  | { kind: 'Alert'; message: string }
  | { kind: 'SetData'; path: string; value: unknown }
  | { kind: 'SetProps'; nodeId: NodeId; patch: Record<string, unknown> }
  | { kind: 'Http'; method: 'GET'|'POST'; url: string; body?: unknown; headers?: Record<string,string> }
  | { kind: 'Emit'; topic: string; payload?: unknown }             // 내부 이벤트 버스
  | { kind: 'Navigate'; toPageId: string }                         // Flow 핵심
  | { kind: 'OpenFragment'; fragmentId: string }                   // 모달/오버레이 오픈
  | { kind: 'CloseFragment'; fragmentId?: string }                 // top or 특정 fragment 닫기
;

interface ActionSpec { steps: ActionStep[] }

// 이벤트→전이(탐색) 엣지
interface FlowEdge {
  from: { nodeId: NodeId; event: SupportedEvent };
  when?: { expr: string };             // (선택) 간단한 조건식; 안전 파서 사용
  to:
    | { kind: 'Navigate'; toPageId: string }
    | { kind: 'OpenFragment'; fragmentId: string }
    | { kind: 'CloseFragment'; fragmentId?: string };
}
```

### 2.3 ComponentDefinition
```ts
interface ComponentDefinition<P extends Record<string, unknown> = Record<string, unknown>, S extends StyleBase = StyleBase> {
  id: string;
  title: string;
  defaults: { props: Partial<P>; styles: Partial<S> };
  propsSchema?: Array<
    | { key: keyof P & string; type: 'text'; label?: string; placeholder?: string; default?: unknown; when?: Record<string, unknown> }
    | { key: keyof P & string; type: 'select'; label?: string; options: { label: string; value: unknown }[]; default?: unknown; when?: Record<string, unknown> }
    // 향후: number, toggle, color, image 등
  >;
  Render(args: { node: Node<P,S>; fire?: (evt: SupportedEvent) => void }): React.ReactElement | null;
}
```

---

## 3) 에디터 UX (패널/동작)

- **Left**: Palette(검색/드래그), Layers(선택/이동/삭제/락; 루트 보호)
- **Center**: Canvas — 중앙 흰 보드(기본 폭 640), 루트 Box는 위에서 40px
- **Right**: Inspector — `propsSchema` 기반 자동 UI + 스타일 섹션(Dimensions/Position/Spacing/…)
- **Bottom Dock**:
  - **ActionsPanel**: 이벤트별 스텝 CRUD + “Run Now”
  - **DataPanel**: key/value 편집 → 바인딩 즉시 반영
  - **FlowsPanel(신설)**: `FlowEdge[]` CRUD, 출발점 선택(노드·이벤트), 전이 대상(페이지/프래그먼트) 설정, 테스트

---

## 4) 스토어 (Zustand) — API 초안

```ts
type Store = {
  state: EditorState;
  // 공통
  subscribe: (listener: () => void) => () => void;
  getState: () => EditorState;
  update: (fn: (draft: EditorState) => void) => void;   // immer 권장
  select: (id: NodeId | null) => void;
  getParentOf: (id: NodeId) => NodeId | null;

  // 노드/트리
  addByDef: (defId: string, parentId?: string) => NodeId;
  addByDefAt: (defId: string, parentId: string, index: number) => NodeId;
  patchNode: (id: NodeId, patch: Partial<Node>) => void;
  updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
  updateNodeStyles: (id: NodeId, styles: Record<string, unknown>) => void;

  // 페이지/프래그먼트
  selectPage: (pageId: string) => void;                    // rootId 갱신
  addPage: (name?: string) => string;
  removePage: (pageId: string) => void;
  addFragment: (name?: string) => string;
  removeFragment: (fragmentId: string) => void;

  // 플로우
  addFlowEdge: (edge: FlowEdge) => string;                 // id 반환
  updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
  removeFlowEdge: (edgeId: string) => void;

  // 데이터/설정
  setData: (path: string, value: unknown) => void;
  setSetting: (path: string, value: unknown) => void;
};
```

가드 정책(변경 없음): **루트 노드 삭제/락/이동 금지**. 페이지 전환 시 `state.project.rootId`만 교체.

---

## 5) 런타임 규약

1) **바인딩**: 머스태시(`{{ }}`)는 안전 파서(키패스 접근)로만 평가. 임의 코드 실행 금지.  
2) **액션 실행기**: 스텝 단위 try/catch 격리, Alert는 1회, Http/Navigate/SetData/SetProps/Emit/Fragment 제어 지원.  
3) **Flow 러너**: 이벤트 발생 시 우선 `node.props.__actions[evt]` 실행 → 이어서 매칭되는 `FlowEdge` 평가/전이.  
4) **프리뷰/프로덕션 라우팅**: 에디터 프리뷰는 store 기반 페이지 전환, 빌드 산출물은 Next Router에 **slug** 매핑.

---

## 6) 보안/성능/테스트

- **보안**: 바인딩/조건(when/expr)은 안전 파서로만 처리, 외부 URL 화이트리스트(이미지/HTTP) 옵션
- **성능**: `useSyncExternalStore`와 선택자 최적화, Layers 가상 스크롤 권장, DnD에서 드롭 인디케이터 분리
- **테스트**: 샘플 시나리오(E2E/Playwright), 바인딩/액션/플로우 단위 테스트, 루트 가드 테스트

---

## 7) 파일/프로젝트 입출력

- **exportProject() / importProject()**: JSON 스냅샷
- 앞으로 **Export to React/Tailwind** 템플릿, **Deploy(PaaS/Supabase Storage)** 확장 여지

---

## 8) 환경 설정(검토 & 보완 권고)

- **Tailwind content 경로에 `src/figmaV3/**/*.{ts,tsx}` 추가**
- **postcss**: `autoprefixer` 플러그인 추가
- **Prettier**: `prettier-plugin-tailwindcss` 사용 권장(+ 정렬 일관화)
- **tsconfig**: 타입 안정성 향상을 위한 옵션 추가 권장  
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`
- **ESLint**: import/order 설정 유지 + 불필요 pathGroups 중복 제거(선택)
- **패키지 정리**: Next 프로젝트에서 사용하지 않는 `vite`, `@vitejs/plugin-react`, `esbuild` 계열은 **제거 또는 devDependencies로 이동** 권장

아래에 구체 TODO에 수정 예시(diff)를 포함합니다.

---

## 9) 샘플 컴포넌트/플로우 시나리오

- **Button(onClick=Navigate to “상세”) → 상세 페이지**  
- **Text(content="안녕하세요 {{data.user}}")**, DataPanel에 `{ user: "Mina" }` → “안녕하세요 Mina”

```jsonc
{
  "pages": [
    { "id": "home", "name": "Home", "slug": "/", "rootId": "node_root_home" },
    { "id": "detail", "name": "Detail", "slug": "/detail", "rootId": "node_root_detail" }
  ],
  "fragments": [{ "id": "modal1", "name": "InfoModal", "rootId": "frag_root" }],
  "flowEdges": [
    { "from": { "nodeId": "btn_go", "event": "onClick" }, "to": { "kind": "Navigate", "toPageId": "detail" } },
    { "from": { "nodeId": "btn_open", "event": "onClick" }, "to": { "kind": "OpenFragment", "fragmentId": "modal1" } }
  ]
}
```

---

## 10) 실행 로드맵 & 체크리스트 (진행 시 마다 체크)

### A. 부트스트랩 & 설정
- [ ] Tailwind `content`에 `src/figmaV3/**/*.{ts,tsx}` 추가
- [ ] `postcss.config.mjs`에 `autoprefixer` 추가
- [ ] `prettier-plugin-tailwindcss` 설치 및 `.prettierrc` 구성
- [ ] `tsconfig.json`에 제안 옵션 추가
- [ ] 불필요 패키지 정리(`vite`, `@vitejs/plugin-react`, `esbuild*`)

### B. Core 스캐폴딩
- [ ] `core/types.ts` SSOT (Page/Fragment/FlowEdge 포함)
- [ ] `core/registry.ts` register/get/list + autoRegister
- [ ] `runtime/binding.ts` (props 전용, 안전 파서 + 캐시)
- [ ] `runtime/actions.ts` (Alert/SetData/SetProps/Http/Navigate/Open/CloseFragment)
- [ ] `runtime/flow.ts` (FlowEdge 매칭/전이)

### C. Store(Zustand)
- [ ] `store/editStore.ts` 노드 API + 페이지/프래그먼트 + 플로우 API
- [ ] 루트 가드/페이지 전환/데이터 반영 셀렉터

### D. Editor UI
- [ ] `ComponentEditor.tsx` 4분면 레이아웃
- [ ] Left: `Palette/Layers` (+ DnD 하이라이트)
- [ ] Center: `Canvas`(640/오프셋 40, 선택 윤곽, 드롭 인디케이터)
- [ ] Right: `Inspector`(PropsAutoSection + 스타일 섹션)
- [ ] Bottom: `ActionsPanel/DataPanel/FlowsPanel`

### E. 기본 컴포넌트 4종
- [ ] Box / Button / Text / Image (propsSchema + Render)

### F. 샘플 시나리오 자동 테스트
- [ ] DnD 삽입/하이라이트
- [ ] Inspector-Props/Styles 즉시 반영
- [ ] Actions(Alert/Navigate) 동작
- [ ] DataBinding 라이브 반영
- [ ] Layers 루트 가드

> **운영 방식**: 위 체크리스트를 기준으로, 항목 완료 시 제가 문서를 업데이트(체크)하고 **다음 단계 진행 승인**을 요청드리겠습니다.

---

## 11) 설정 보완 예시 (diff)

**postcss.config.mjs**
```diff
 export default {
   plugins: {
     tailwindcss: {},
+    autoprefixer: {},
   },
 };
```

**tailwind.config.ts (content 경로 보강)**
```diff
 export default {
   darkMode: ["class"],
   content: [
     "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
     "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
     "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
     "./src/domains/**/*.{js,ts,jsx,tsx,mdx}",
+    "./src/figmaV3/**/*.{ts,tsx}",         // 🔹 Editor/Runtime 포함
   ],
   theme: { /* ... */ }
 }
```

**.prettierrc (권장)**
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**tsconfig.json (권장 옵션)**
```diff
 {
   "compilerOptions": {
     "strict": true,
+    "noUncheckedIndexedAccess": true,
+    "exactOptionalPropertyTypes": true,
+    "noImplicitOverride": true,
+    "verbatimModuleSyntax": true,
     "paths": { "@/*": ["./src/*"] }
   }
 }
```

**package.json (정리 제안)**  
- `"vite"`, `"@vitejs/plugin-react"`, `"esbuild*"` → 사용 계획이 없다면 제거 또는 devDependencies로 이동

---

## 12) 부록: Button 예시 정의(요약)

```tsx
export const ButtonDef: ComponentDefinition<{ as?: string; content?: string; href?: string }> = {
  id: 'button',
  title: 'Button',
  defaults: {
    props: { as: 'button', content: 'Button' },
    styles: { element: { padding: '8px 12px' } },
  },
  propsSchema: [
    { key: 'as', type: 'select', label: 'As', default: 'button',
      options: [{ label: 'button', value: 'button' }, { label: 'a', value: 'a' }, { label: 'div', value: 'div' }, { label: 'span', value: 'span' }] },
    { key: 'content', type: 'text', label: 'Text', placeholder: 'Button', default: 'Button' },
    { key: 'href', type: 'text', label: 'Href', placeholder: 'https://', when: { as: 'a' } },
  ],
  Render({ node, fire }) {
    const p = node.props;
    const s = (node.styles.element ?? {}) as React.CSSProperties;
    const Tag = (p.as ?? 'button') as keyof JSX.IntrinsicElements;
    const onClick = fire ? () => fire('onClick') : undefined;
    return <Tag style={s} onClick={onClick} href={p.as === 'a' ? String(p.href ?? '') : undefined}>{String(p.content ?? '')}</Tag>;
  },
};
```

---

### 끝.