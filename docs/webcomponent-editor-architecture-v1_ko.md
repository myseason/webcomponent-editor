
# 웹컴포넌트 에디터 아키텍처 상세 설계서 (v1)
- 작성일: 2025-09-04 11:36 KST
- 대상: **온라인 서비스형 에디터** (다중 사용자 접속, 개별 편집 / 인증·권한·저장 포함, *실시간 공동 편집 제외*)
- 범위: 프런트엔드(브라우저) 아키텍처 중심, 서버 연동 지점·API·저장 전략·운영 고려사항 포함
- 원칙: **중앙집중 로직(Engine/Controller/Policy)**, **단일 변경 경로(CommandBus)**, **UI는 Dumb View**,
  **점진 이행**, **테스트 용이성**, **성능·안정성·보안**

---

## 0. 용어
- **Engine(파사드)**: UI에서 호출하는 *단일 진입점*으로 상태 조회/명령 실행을 캡슐화
- **Controller**: 특정 도메인(Inspector)의 *ViewModel*을 조립하는 계층
- **PolicyEngine**: 가시성(visible), 제약(constraints), 프리셋(presets) 규칙을 일괄 적용
- **CommandBus**: 모든 변경을 커맨드로 실행/기록/undo/redo
- **Selector**: 파생 상태를 계산하는 순수 함수(메모이즈)
- **Adapter**: 외부 저장/네트워크 연동 포트의 구현체(Local/HTTP)
- **Registry**: 컴포넌트 정의(Props 스키마/스타일 허용치 등) 저장소
- **Project**: 페이지/노드 그래프/스타일/데이터 바인딩 등 편집 대상 전체

---

## 1. 설계 목표 (Goals)
1. **중앙집중 판단** — 선택/정의/정책을 한 곳에서 계산하여 *모든 섹션이 일관된 대상*을 보도록 함
2. **낮은 결합도** — UI 섹션은 입력/표시만 담당(Dumb View), 로직은 Controller/Engine으로 이전
3. **단일 변경 경로** — 모든 변경은 CommandBus 경유(undo/redo 가능), 나중에 서버 영속화와 결합 쉬움
4. **정책 일관성** — PolicyEngine 파이프라인(Visibility→Constraints→Presets)으로 일괄 적용
5. **확장성** — Adapter로 저장소 전환(Local→HTTP), 새로운 정책/컴포넌트/섹션을 Controller/Policy에만 추가
6. **성능/안정성** — 셀렉터 메모이즈, 섹션 가상화, 오류 격리, 디바운스 저장, 진단 가능 로깅
7. **점진 이행** — 현 레포 구조·스타일을 보존하며 작은 PR로 단계적 교체

---

## 2. 상위 구조 (High-Level Overview)

```
UI(React)
  └─ Inspector.* (Dumb View)
       ▲ useInspectorViewModel()
       │
Controllers (Domain)
  └─ InspectorController
       │        ▲
       ▼        │ 정책 파이프라인
Engine(Facade) ─┴─► Selectors(파생데이터) ◄─ PolicyEngine
  └─ EditorEngine                (메모이즈)    (Visibility→Constraints→Presets)
     ├─ CommandBus(Undo/Redo)
     └─ Adapters(Persistence): Local / HTTP
                                   ▲
                                   │ REST/GraphQL
                                   │ 인증/권한 헤더
                               Server(BFF/API)
                               ├─ Auth(로그인/권한)
                               ├─ Project 저장/로드
                               ├─ Policy 배포(버전/해시)
                               └─ Asset 업로드/관리
```

핵심은 **EditorEngine**(파사드)과 **InspectorController**(도메인 컨트롤러)입니다.  
- Engine은 상태 조회/명령의 단일 창구 — 내부에 Store/Adapter/CommandBus를 숨김
- Controller는 ViewModel을 조립 — UI는 ViewModel만 렌더
- PolicyEngine은 중앙에서 일괄 적용 — 섹션 내 조건분기 제거

---

## 3. 폴더 구조 (Proposed)

```
src/figmaV3/
  engine/
    EditorEngine.ts
    CommandBus.ts
    selectors/
      inspector.ts
      graph.ts
    adapters/
      LocalPersistence.ts
      HttpPersistence.ts
  controllers/
    InspectorController.ts
    hooks.ts
  policy/
    PolicyEngine.ts
    globalTagPolicy.ts       // 기존
    globalStylePolicy.ts     // 기존
  core/
    registry.ts              // 기존
    types.ts                 // 기존
```

---

## 4. 데이터 모델 개요

### 4.1 Project
```ts
type Project = {
  id: string;
  name: string;
  rootId: NodeId;
  nodes: Record<NodeId, Node<any, any>>;
  fragments?: Array<{ id: string; rootId: NodeId; title: string }>;
  meta?: Record<string, unknown>;
};
```

### 4.2 Node
```ts
type Node<P, S> = {
  id: NodeId;
  componentId: string;     // 정의 키
  children: NodeId[];      // 부모 포인터 X, children 트리
  props: P;
  styles: S;
};
```

### 4.3 Registry / Definition
```ts
type ComponentDef = {
  id: string;
  title: string;
  defaultTag: string;
  allowedTags: string[];
  propsSchema: Array<{ key: string; type: string; required?: boolean; /* … */ }>;
  styleSchema?: any; // 그룹/키/타입/옵션
};
```

### 4.4 UI State
```ts
type UIState = {
  mode: 'Page' | 'Component';
  selectedId?: NodeId;
  editingFragmentId?: string;
  inspector: { basic: boolean; advanced: boolean; rightPanelWidth: number };
};
```

---

## 5. Engine (Facade)

### 5.1 책임
- UI에서 직접 store 접근 금지 — Engine을 통해 조회/명령
- 슬라이스/스토어/퍼시스턴스/커맨드를 캡슐화

### 5.2 인터페이스 (요약)
```ts
class EditorEngine {
  // 조회
  getSelection(): UIState;
  getProject(): Project;
  getNode(id: NodeId): Node<any, any> | null;
  getComponentDef(id: NodeId): ComponentDef | null;

  // 명령
  updateNodeProps(id: NodeId, patch: Record<string, unknown>): void;
  updateNodeStyles(id: NodeId, patch: Record<string, unknown>): void;
  changeTag(id: NodeId, tag: string): void;

  // 저장/로드
  loadProject(projectId: string): Promise<void>;
  saveProject(): Promise<void>;
}
```

### 5.3 구현 포인트
- 초기엔 `useEditor()` 위임, 외부로는 숨김
- 나중에 `HttpPersistence`로 교체 시 Adapter만 바꿈
- 에러/로깅/성능 측정은 Engine 경유

---

## 6. CommandBus

### 6.1 목적
- 커맨드 실행/undo/redo 통일
- 실패 시 롤백/토스트

### 6.2 시그니처
```ts
type Command = { type: string; payload?: any; apply(): void; undo(): void };

class CommandBus {
  execute(cmd: Command): void;
  undo(): void;
  redo(): void;
}
```

---

## 7. Selectors (파생 상태)

### 7.1 목적
- 순수 함수, 메모이즈, 불필요 렌더 최소화

### 7.2 핵심
```ts
selectInspectorTarget(ui, project)
selectComponentDef(project, registry, nodeId)
```

---

## 8. PolicyEngine (룰 파이프라인)

1) Visibility → 2) Constraints → 3) Presets  
우선순위: Component > Tag > Style > Global

```ts
class PolicyEngine {
  applyAll(ctx: PolicyCtx, vm: InspectorVM): InspectorVM;
  applyVisibility(ctx: PolicyCtx, vm: InspectorVM): InspectorVM;
  applyConstraints(ctx: PolicyCtx, vm: InspectorVM): InspectorVM;
  applyPresets(ctx: PolicyCtx, vm: InspectorVM): InspectorVM;
}
```

---

## 9. InspectorController (ViewModel 조립)

### 9.1 흐름
- 대상/정의 조회 → RawVM → Policy 적용 → Final VM

### 9.2 ViewModel
```ts
type InspectorVM = {
  target: { nodeId: NodeId; componentId: string; tag: string; allowedTags: string[]; propsSchema: any[] };
  sections: { common: SectionVM; props: SectionVM; styles: SectionVM };
};
```

---

## 10. UI(Inspector.*)

- ViewModel만 의존
- 입력→Engine 호출

```tsx
const vm = useInspectorViewModel();
<PropsAutoSection nodeId={vm.target.nodeId} defId={vm.target.componentId} />
```

---

## 11. 서버 연동 (Persistence / Auth)

### 11.1 포트/어댑터
```ts
interface PersistencePort {
  loadProject(id: string): Promise<ProjectDTO>;
  saveProject(id: string, dto: ProjectDTO): Promise<void>;
}
```

### 11.2 인증/권한
- JWT/OAuth → Authorization 헤더
- 프로젝트 권한 owner/editor/viewer

---

## 12. 서비스 플로우

- 로드 → 선택 → 속성 변경 → 저장 → 정책 반영

---

## 13. 에러·로깅·관찰성
- Command 실패 롤백, Adapter 재시도
- Policy 거부 사유 안내

---

## 14. 성능
- 셀렉터 메모이즈
- 섹션 가상화
- 저장 디바운스

---

## 15. 접근성·i18n
- aria-label, 키보드 내비게이션
- 레이블/단축키 i18n

---

## 16. 보안
- JWT 만료/갱신
- 권한 체크
- XSS/주입 방어

---

## 17. 테스트
- 단위(Selectors/Policy/Controller)
- 통합(Engine+Adapters)
- E2E(로드→편집→저장)

---

## 18. 마이그레이션 로드맵
- Phase 1: Engine/Controller/Selectors 도입
- Phase 2: Policy 중앙화, CommandBus 적용
- Phase 3: HTTP Adapter, 인증/권한
- Phase 4: 텔레메트리/성능

---

## 19. 리스크·대응
- 혼합 접근 → Lint/코드리뷰로 차단
- 정책 복잡 → 테스트/버전관리
- 성능 회귀 → 프로파일링/캐시

---

## 20. 스니펫
(예시 코드 블록은 스켈레톤 수준이며 실제 레포 타입/함수명으로 조정하세요.)
```ts
export function useInspectorViewModel() { /* ... */ }
export class EditorEngine { /* ... */ }
export class InspectorController { /* ... */ }
export class PolicyEngine { /* ... */ }
```
