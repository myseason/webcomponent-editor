# 목표 아키텍처: 헥사고날 + 도메인 서비스 (설계 문서 & 정책서 · 중립 초안 v0.1)
- 작성일: 2025-09-04 15:30 KST
- 적용 브랜치: `feature/v1.4` (Big-Bang Refactoring)
- 범위: 온라인 서비스형 웹 컴포넌트 에디터(프런트엔드 중심), 서버 연동 지점·저장 전략·운영 고려 포함

---

## 1) 배경과 목표
- 컴포넌트에 로직이 산재하고, 정책 일관성/확장성/R&R이 불명확한 문제를 해결.
- UI는 Dumb View, 로직은 Controller/Engine/Policy로 집중.
- 중앙 판단은 **정책 파이프라인(Visibility→Constraints→Presets)** 으로 일관 적용, 도메인 로직은 **도메인 서비스(플러그인)** 로 분리.

## 2) 상위 구조 (High-level Hexagonal)

```
UI (React)
  └─ Inbound Adapter: Channel Hook (useChan)
      ▲ Commands / Queries
      │
Application Core (Engine Bus)
  ├─ CommandBus / EventBus
  ├─ Selector Registry (Query Port)
  ├─ PolicyEngine (Visibility → Constraints → Presets)
  └─ Domain Service Plug-ins (Ports)
      ├─ CanvasService
      ├─ InspectorService
      ├─ DataflowService
      ├─ FragmentService
      ├─ AssetService
      └─ PersistenceService (outbound)
          ▼
Outbound Adapters
  ├─ LocalPersistence
  └─ HttpPersistence (Auth/권한)
```

- Core는 얇은 버스/계약만 유지(명령/조회/정책 파이프), 도메인 지식은 각 서비스가 담당.

## 3) 핵심 컴포넌트 및 책임

### 3.1 Engine Bus (Application Core)
- **CommandBus/EventBus**: 모든 쓰기를 커맨드로 래핑(undo/redo/로그/롤백)
- **Selector Registry**: 서비스가 등록한 셀렉터를 통합 관리(메모이즈/부분 구독)
- **PolicyEngine**: 중앙 정책 파이프라인(가시성→제약→프리셋)

### 3.2 Domain Services (플러그인)
- **CanvasService**: 배치/히트테스트/스냅/가이드
- **InspectorService**: ViewModel 조립, PolicyEngine 호출(가시성/제약 적용)
- **DataflowService**: 데이터 바인딩/표현식/상태머신
- **FragmentService**: 템플릿/컴포넌트화/인스턴싱
- **AssetService**: 업로드/최적화/메타관리
- **PersistenceService**: 저장/로드/버전·권한(Outbound Adapter로 구현 교체)

### 3.3 Ports & Adapters
- **Inbound**: React `useChan(selector?)` → 명령·조회 단일 채널
- **Outbound**: `LocalPersistence`(브라우저 저장), `HttpPersistence`(API; 인증/권한)

## 4) 공용 인터페이스 (요지)

```ts
// Command/Query Port
type Command<T=any> = {{ type: string; payload: T; apply(project: Project): void; undo(project: Project): void; }};
type Selector<T> = (state: {{ ui: UIState; project: Project }}) => T;

interface EngineBus {{ 
  execute(cmd: Command): void; undo(): void; redo(): void; 
  addSelector<T>(id: string, sel: Selector<T>): void;
  select<T>(sel: Selector<T>, onChange: (next:T, prev:T)=>void): () => void;
}}

// 도메인 플러그인 계약
interface DomainPlugin {{ register(bus: EngineBus): void; }}

// UI 채널 훅
function useChan<T>(selector?: Selector<T>): [T|undefined, Actions];
```

- **정책 우선순위**: `Component > Tag > Global`

## 5) 정책 파이프라인 (PolicyEngine)
1) **Visibility**: 표시 여부 결정(G1~G5). 예: Image인데 tag≠img → `src/alt` 숨김  
2) **Constraints**: 값 제약·허용 소스(토큰/원시/css-var) 적용, 위험 키 전역 차단(예: `content`)  
3) **Presets**: 기본값/토큰 치환 등 초기값 주입

## 6) 데이터 모델(요지)
- **Project**: 페이지/노드 그래프, 스타일, 바인딩, 프래그먼트 등
- **Node**: `componentId`, `props`, `styles`, `children` (부모 포인터 없음)
- **Registry/Definition**: 컴포넌트 스키마/허용 태그/스타일 스키마
- **UIState**: 선택/모드/패널 상태 등

## 7) 주요 플로우 (요약)
- **로드/저장**: `useChan()[1].execute(loadProject)` → PersistenceService → 상태 반영 → Selector 업데이트  
- **선택/편집**: 선택 → Selector 파생 → InspectorService VM → PolicyEngine 적용 → 렌더  
- **속성/스타일 변경**: 입력 → Command 실행 → 스택 기록 → Selector 재계산 → 저장 디바운스

## 8) 성능·안정성·보안
- **성능**: 선택자 기반 부분 구독(메모이즈), 섹션 가상화, 저장 디바운스  
- **안정성**: 커맨드 실패 롤백/재시도, 거부 사유 노출(정책/권한)  
- **보안/권한**: JWT/OAuth, 프로젝트 권한(owner/editor/viewer)

## 9) 테스트 전략 (필수 케이스)
- **정책**: G1~G5, 태그별 허용/금지, 글로벌 스타일 deny/constraints  
- **커맨드**: 합치기/undo/redo/충돌/롤백  
- **퍼시스턴스**: 네트워크 실패/권한 오류/병합  
- **E2E**: 로드→선택→편집→저장→재로드(정책 유지)

## 10) 마이그레이션/브랜치 정책 (Big-Bang · feature/v1.4)
- **원칙**: 기존 코드는 **참고**만 하고, 새 구조로 **재개발**하되 필요한 유틸만 이식
- **브랜치**: `feature/v1.4` 에서 전체 아키텍처 스캐폴딩 생성 후, 기존 파일은 제거/이관
- **금지**: 뷰에서 `useEditor()` 직접 접근 금지(ESLint), 엔진 외 직접 setState 금지
- **단계**: 
  1) EngineBus/CommandBus/PolicyEngine 스켈레톤 구축  
  2) InspectorService → CanvasService → DataflowService 순으로 플러그인화  
  3) Local→HTTP Persistence 전환(권한 연동)  
  4) 테스트/회귀/성능 검증 후 통합

## 11) 변경 관리(거버넌스)
- 정책 변경(PR)에 영향 영역/테스트 케이스 포함  
- 커맨드 추가 시 undo/redo/권한/텔레메트리 체크리스트
- 디렉터리·네이밍·버전 규칙 준수

---

## 부록 A) 용어
- **Visibility/Constraints/Presets**: 정책 파이프라인 3단계
- **SOT**: Single Source of Truth (정책·정의 단일 출처)
- **Selector**: 파생 상태 순수 함수 (메모이즈·부분 구독)

## 부록 B) 브랜치 운영 스니펫
```bash
git fetch origin
git checkout -b feature/v1.4 origin/feature/v1.3
# 아키텍처 스캐폴딩 추가/기존 파일 제거·이관
git add -A && git commit -m "feat(arch): hexagonal + domain services scaffold (big-bang v1.4)"
```
