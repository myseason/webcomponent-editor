# 헥사고날 + 도메인 서비스 아키텍처 설계 및 Controller 적용 가이드

## 1. 개요
현재 Editor 소스는 UI/UX를 유지하면서 내부 아키텍처를 “헥사고날 + 도메인 서비스”로 전환하는 중이다.
목표는 **UI/UX 불변** 상태에서 **로직·정책·검증·Undo**를 중앙화하고, **Controller(Reader+Writer)** 단일 채널을 통해 상태를 일관되게 다루는 것이다.

## 2. Engine
Engine은 상태 저장소이자 도메인 서비스 주입 지점이다.

- `getState()`: 현재 상태 스냅샷 조회
- `subscribe(listener)`: 상태 구독
- `update(mutator)`: 상태 변경
- 도메인 서비스 DI:
  - `commandBus`
  - `policy`
  - `validation`
  - `undo`
  - `events`

## 3. Controller 구조
모든 Controller는 **단일 채널**로 구성된다.

- `controller.reader()`: 읽기 전용 API
- `controller.writer()`: 쓰기 전용 API

### Reader
- DTO/Readonly 반환
- 정규화/예외 가드 포함
- 뷰는 Reader를 통해 안전하게 상태 조회

### Writer
- 검증 → 정책 → CommandBus → Undo → Event → Engine update
- 뷰는 Writer를 통해 의도만 전달, 검증/정책은 내부에서 처리

## 4. Controller 도메인 목록
- **InspectorController**
- **ActionsController**
- **LayersController**
- **PagesController**
- **PolicyController**
- **BindingController**
- (추가 예정: Flows, Fragments, Data …)

## 5. Controller 예시 (Actions)

```ts
export interface ActionsReader {
  getSteps(nodeId: NodeId, ev: SupportedEvent): Readonly<ActionStep[]>;
}

export interface ActionsWriter {
  setSteps(nodeId: NodeId, ev: SupportedEvent, steps: ActionStep[]): Promise<Result<void, DomainError>>;
  run(nodeId: NodeId, ev: SupportedEvent): Promise<Result<void, DomainError>>;
}

export interface ActionsController {
  reader(): ActionsReader;
  writer(): ActionsWriter;
}
```

내부 Writer 파이프라인:
```
validate → policy.guard → commandBus.dispatch → undo.record → event.publish → engine.update
```

## 6. 확장성/유지보수 포인트
- Reader는 DTO/Readonly만 반환, 필요 시 메모이즈된 셀렉터 사용
- Writer는 모든 검증/정책/Undo/CommandBus/이벤트를 통일된 파이프라인으로 처리
- EventBus로 확장 기능을 플러그인 형태로 주입 가능

## 7. 디렉토리 구조
```
src/figmaV3/
  engine/         ← Engine, CommandBus, UndoService …
  controllers/    ← 각 도메인 Controller (reader+writer)
  domain/         ← Validation, Policy, Binding, History …
  core/           ← types.ts (단일 타입 소스)
```

## 8. 마이그레이션 계획
1. 각 패널에서 `useEditorLike` 직접 호출 제거
2. `useXxxController()`로 치환 (reader/writer)
3. Writer 내부의 `engine.update` → CommandBus/Undo 전환 (점진적)
4. 최종적으로 모든 상태 변경은 Controller Writer 경유
