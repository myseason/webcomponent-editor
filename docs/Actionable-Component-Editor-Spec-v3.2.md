# Actionable Component Editor — 아키텍처 보완 & 기능 정의서 (V3.2)

> 목표: **Actionable 컴포넌트 기반**의 코드리스 웹서비스 빌더.  
> 범위: **컴포넌트 개발** · **웹페이지 개발** · **페이지 Flow 개발**(이벤트→액션으로 다른 페이지/웹 조각 호출).  
> 기술 스택: **Next.js + React + TypeScript + Tailwind + Zustand(필수)**

---

## [중요] 개발 원칙 (합의 반영)
- **타입 우선(SSOT)**: 모든 타입은 `src/figmaV3/core/types.ts`에서만 정의/수출  
- **훅 규율**: React 훅은 조건 없이 최상위에서만 호출(ESLint `react-hooks/*` 강제)  
- **불변 업데이트**: 스토어 `update()`는 **얕은 복사(shallow copy)** 로 갱신(Immer **미사용**)  
- **표준 패치 시그니처**: `patchNode / updateNodeProps / updateNodeStyles` 통일  
- **레이아웃 가드**: display/position 제약에 따른 비활성/배지(Inspector 정책 레이어)  
- **SSR 주의**: 하이드레이션 미스매치 방지(랜덤/시간 의존 분리, 훅 위치 고정, 조건부 렌더링 시 가드)  
- **any 타입 사용 금지**: ESLint `@typescript-eslint/no-explicit-any: error` / TS `"noImplicitAny": true`

---

## 1) 시스템 아키텍처 (V3 확정안)
```
src/figmaV3/
  core/          # 타입(SSOT)/레지스트리
  runtime/       # 바인딩(머스태시), 액션 실행기, 플로우 러너
  store/         # Zustand 기반 editStore (얕은 복사 업데이트)
  editor/
    components/        # Box/Button/Text/Image (+ autoRegister)
    leftPanel/         # Palette, Layers
    centerPanel/       # Canvas(렌더/선택 윤곽/드롭)
    rightPanel/        # Inspector(Props 자동 UI + 스타일 섹션 + 레이아웃 가드)
    bottomPanel/       # Dock: Actions, Data, Flows
```
- **Actionable Component**: 이벤트 → 액션 실행기 연결, `{{ }}` 데이터 바인딩(Props에만)
- **Flow**: 이벤트 유발 → `FlowEdge`에 따라 `Navigate / OpenFragment / CloseFragment` 수행
- **Store**: 얕은 복사 기반 업데이트 / 루트 가드 / 표준 패치 시그니처

---

## 2) 데이터 모델 (요약 — SSOT)
- `Node / Page / Fragment / Project / EditorUI`
- `SupportedEvent / ActionStep(Alert/SetData/SetProps/Http/Navigate/Open/Close)`
- `FlowEdge(from: nodeId+event, when?: expr, to: 전이)`
- `BindingScope(data/node/project)`
- `ComponentDefinition<P,S>`: `defaults / propsSchema` 중심 (Render 시그니처는 UI 레이어에서 결합)

> **참고**: SSOT 타입은 `src/figmaV3/core/types.ts`에 포함. 본 문서는 요약이며 실제 타입은 파일을 기준으로 합니다.

---

## 3) 런타임 규약
1) **바인딩**: 머스태시(`{{ }}`)는 안전 파서로만 평가(키패스 접근), **props만** 적용  
2) **액션 실행기**: 스텝 단위 try/catch 격리, Alert 1회, Http/Navigate/SetData/SetProps/Emit/Fragment 제어 지원  
3) **Flow 러너**: 이벤트 발생 시 `node.props.__actions[evt]` 실행 후, 매칭되는 `FlowEdge` 평가/전이  
4) **SSR/프리뷰**: 프리뷰는 store 기반 전환, 배포물은 Next Router-slug 매핑

---

## 4) 에디터 UX
- **Left**: Palette/Layers (루트 보호/락/이동)
- **Center**: Canvas(폭 640, 루트 오프셋 40px) + 드롭 인디케이터
- **Right**: Inspector — `propsSchema` 자동 UI + **레이아웃 가드**(display/position 정책)
- **Bottom**: Actions/Data/**Flows**(FlowEdge CRUD + 테스트)

---

## 5) 스토어 API (Zustand + 얕은 복사)
- `subscribe/getState/update/select/getParentOf`
- `addByDef/addByDefAt/patchNode/updateNodeProps/updateNodeStyles`
- `selectPage/addPage/removePage/addFragment/removeFragment`
- `addFlowEdge/updateFlowEdge/removeFlowEdge`
- `setData/setSetting`
> 모든 변경은 **얕은 복사**로 처리해 구독자 갱신을 안전하게 유지합니다.

---

## 6) 품질/보안/테스트
- **ESLint**: `react-hooks/*`, `@typescript-eslint/no-explicit-any`, import/order  
- **보안**: 바인딩/조건은 안전 파서만, 외부 URL 화이트리스트 옵션  
- **테스트**: E2E(Playwright) + 단위 테스트(바인딩/액션/플로우/루트 가드)

---

## 7) 진행 체크리스트 (오늘 기준 상태)
### A. 설정
- [x] 스펙/정의서 작성 및 원칙 반영 (본 문서 V3.2)
- [x] 설정 보완안 준비(아래 *Proposed* 파일 제공)
- [ ] Tailwind content 경로 적용(`src/figmaV3/**/*.{ts,tsx}`)
- [ ] PostCSS `autoprefixer` 적용
- [ ] Prettier(`prettier-plugin-tailwindcss`) 설정
- [ ] TS 옵션 강화(`noUncheckedIndexedAccess` 등)
- [ ] ESLint 규칙 강화(`react-hooks/*`, `no-explicit-any`)

### B. Core/Runtime/Store 스캐폴딩
- [x] **SSOT 타입** 초안 파일 제공 (`core/types.ts`)
- [x] **Zustand store(얕은 복사)** 스켈레톤 제공 (`store/editStore.ts`)
- [x] **binding/actions/flow** 스켈레톤 제공 (`runtime/*`)
- [ ] Editor UI 골격 (`ComponentEditor`/패널) 생성

### C. 기능
- [ ] PropsSchema→Inspector 자동 UI(+레이아웃 가드)
- [ ] FlowEdge CRUD & 실행(FlowsPanel/flow.ts 연동)
- [ ] 기본 컴포넌트 4종(Box/Button/Text/Image)

> 체크 완료 항목은 *파일 제공* 기준입니다. 레포에 병합되면 다음 단계로 진행합니다.