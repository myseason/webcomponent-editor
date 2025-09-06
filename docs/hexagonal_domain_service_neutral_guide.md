
# Hexagonal + Domain Service Architecture (Neutral Guide)

> A vendor- and framework-agnostic guide to designing UI editors and similar interactive applications with a **Hexagonal Architecture** combined with **Domain Services** and a clear **View ↔ Controller ↔ Engine (Facade) ↔ Store** separation. This document is intentionally neutral and does **not** assume any specific project codebase.

---

## 1) Purpose & Scope

- Provide a **neutral reference** for teams adopting a hexagonal design with domain services.
- Define **roles, boundaries, and contracts** so UI, application logic, and domain logic evolve independently.
- Offer **evaluation criteria** to judge fitness (pros/cons, trade‑offs, risks, migration options).

### When to Use
- Complex interactive apps (page builders, diagram editors, design tools, low‑code editors).
- Multi‑domain products (pages, layers/nodes, actions/flows, policies/visibility, data binding, history).
- Teams seeking **testability**, **extensibility**, and **parallel development**.

---

## 2) Architectural Overview

### 2.1 High-Level Layers (Hexagonal)
```
[UI / View]  ←→  [Controllers (Application Layer)]  ←→  [Engine (Facade)]
                                               ↑
                                  [Ports / Adapters (Inbound/Outbound)]
                                               ↓
                                     [Domain Services / Entities]
                                               ↓
                                    [Store / Persistence / I/O]
```

- **View (UI)**: Renders state and delegates user intent. Stateless except for local UI state.
- **Controllers (Application Layer)**: Orchestrate use cases; expose **Reader/Writer** interfaces.
- **Engine (Facade)**: The *single entry point* to state and domain operations; encapsulates store and dispatch.
- **Ports/Adapters**: Contracts for external world (e.g., persistence, policy sources, telemetry, plugins).
- **Domain Services**: Pure domain logic (binding, validation, policy evaluation, versioning, history).
- **Store**: State implementation (in‑memory store, state machines, or a DB). Hidden behind the Engine.

### 2.2 Data Flow (Typical)
1. **View** triggers intent → calls **Controller.Writer**.
2. **Writer** validates intent → calls **Engine** operations (domain & store updates).
3. **Engine** commits changes → notifies subscribers via **version/token** or **event bus**.
4. **View** re-renders via **Controller.Reader** (selective subscription to minimal slices).

### 2.3 Why Hexagonal
- Stable boundaries; the core domain is independent from delivery mechanisms and infrastructure.
- Ports define *what* is needed; Adapters implement *how*. You can swap implementation without touching core.

---

## 3) Core Building Blocks

### 3.1 Controllers with Reader/Writer
- **Reader**: Exposes read-only queries and **subscription hooks** to minimal state slices.
- **Writer**: Exposes **imperative use cases** (set/append/update/remove/toggle/move/run) with validation.
- **Naming**: `get*/use*/is*/*Token` for Reader, `set*/append*/update*/remove*/toggle*/move*/run*` for Writer.
- **Facade Controllers** (optional): Combine multiple domain controllers into one port for a given View.
- **Contract**: Controllers depend **only** on Engine (not on the Store).

### 3.2 Engine (Facade)
- **Responsibilities**: Single entry to application state & domain ops, versioning, subscriptions, transactions.
- **API** (neutral sketch):
  - `getState(): StateSnapshot` (read-only, stable shape)
  - `update(mutator): void` (transactional write)
  - `subscribe(listener): Unsubscribe`
  - `getVersionToken(): Token` (monotonic version or hash)
  - Domain sub-APIs (examples): `pages`, `nodes`, `actions`, `binding`, `policy`, `ui`, `history`

### 3.3 Domain Services
- **Binding Service**: Resolves/compiles expressions, applies to nodes/props, sandboxing & security.
- **Policy/Visibility Service**: Evaluates rules (styles/tags/role-based) and answers “allowed?”.
- **Validation Service**: Input/graph validation, rule sets, diagnostics.
- **History/Undo Service**: Command journaling, reversible operations, time‑travel.
- **Data Schema Service**: Manages schema, defaults, migration between versions.
- Pure functions when possible; stateful where necessary behind ports.

### 3.4 Ports / Adapters
- **Inbound Ports**: Controller contracts, Engine contracts (interfaces).
- **Outbound Ports**: Persistence, telemetry, remote execution, plugin registration, asset loading.
- Adapters implement concrete integrations (e.g., REST, IndexedDB, file system).

### 3.5 Store
- Replaceable by design: in‑memory state, state machine, Redux/Zustand/RxJS, CRDT for real‑time, etc.
- The Engine encapsulates the Store (UI never imports it).

---

## 4) Interaction Patterns

### 4.1 Selective Subscription
- Reader exposes `useXxx(id)` and `useXxxFlags(id)` for minimal re‑renders.
- Global “version bump” is a fallback only; prefer **fine‑grained** selectors.

### 4.2 Validation & Guards
- Writers enforce **preconditions**: existence, permissions, schema validation.
- Failure path returns domain errors (typed), surfaced to UI via notification/affordance rules.

### 4.3 Concurrency & Undo
- Engine updates are **atomic**; multi‑step actions grouped as a single transaction when needed.
- History service records commands and inverse ops for undo/redo.

### 4.4 Plugin & Capability Model
- Capabilities advertise feature support (e.g., `canHaveChildren`, `isContainer`, `supportsBinding`).
- Plugins register components, policies, guards, bindings, and actions through well-defined ports.

---

## 5) Extensibility & Flexibility

### 5.1 Extending Features
- Add a **new Controller** (Reader/Writer), backed by Engine domain APIs.
- Add a **new Domain Service** behind a port, inject into Engine, expose via Controller as use cases.
- Add a **new Plugin** (component types, actions, policies) using registration ports.

### 5.2 Swapping Infrastructure
- Replace Store implementation (e.g., local → remote) without touching View/Domain.
- Replace Policy or Binding engines independently via outbound adapter change.

### 5.3 Cross‑Cutting Concerns
- Logging, telemetry, and feature flags are **adapters** on outbound ports.
- Error mapping centralized at the Controller boundary for consistent UX.

---

## 6) Pros & Cons (Trade‑offs)

### 6.1 Strengths
- **Separation of concerns** → UI stability despite domain/infrastructure changes.
- **Testability** → Controllers/Services mockable; deterministic domain logic.
- **Extensibility** → New features via Controllers/Services/Plugins; minimal ripple.
- **Scalability** → Team can work in parallel within clear boundaries.

### 6.2 Costs
- **Initial overhead**: More interfaces, adapters, boilerplate.
- **Skill requirement**: Team alignment on contracts; discipline to avoid “shortcut” imports.
- **Latency risks**: Excessive global subscriptions; must implement fine‑grained selectors.
- **Facade bloat risk**: Engine API must be modular to avoid a “god object”.

### 6.3 Typical Failure Modes
- **Leaky Abstractions**: Views touching Store or domain details directly.
- **Over‑facading**: Everything goes through a single mega‑Facade; split by domain modules.
- **Anemic Controllers**: Pushing validation into Views; move checks back to Writer.
- **Type Drift**: Duplicate domain types across layers; establish a **single source of truth**.

---

## 7) Evaluation Checklist

### Architecture Fitness
- [ ] Engine encapsulates Store; UI never imports Store.
- [ ] Controllers depend only on Engine; Views depend only on Controllers.
- [ ] Reader exposes minimal, typed selectors (+ hooks). Writer enforces validation/guards.
- [ ] Domain Services are pure/testable or isolated behind ports.
- [ ] Ports/Adapters are versioned; policy/binding/validation are swappable.

### Performance & UX
- [ ] Fine‑grained subscriptions (avoid global rerenders).
- [ ] Undo/redo bounded and fast.
- [ ] Long‑running actions surfaced via progress/notifications.

### Maintainability
- [ ] Naming consistency (`get*/use*` vs `set*/append*/update*/remove*/toggle*/move*/run*`).
- [ ] Single source for domain types.
- [ ] Plugin registration and capability discovery documented.

---

## 8) Migration Strategies

- **Strangler Fig** (Incremental): Wrap legacy store with a temporary Engine; move features domain by domain.
- **Big‑Bang**: Risky; validate with “compat layers” and comprehensive regression tests.
- **Hybrid**: Start with high‑churn domains (e.g., Actions, Policy), keep UI intact, then expand.

**Rules of Thumb**
1. UI/UX must remain unchanged during refactors (feature flags optional).
2. Replace read paths first (Reader), then write paths (Writer).
3. Kill direct Store access as early as possible; keep only through Engine.

---

## 9) Minimal Interfaces (Illustrative)

```ts
// Engine (facade)
interface Engine {
  getState(): Readonly<State>;
  update(mutator: (draft: State) => void, bump?: boolean): void;
  subscribe(cb: () => void): () => void;
  getVersionToken(): string;
  pages: PagesAPI;
  nodes: NodesAPI;
  actions: ActionsAPI;
  policy: PolicyAPI;
  binding: BindingAPI;
  ui: UIAPI;
}

// Controller pattern
interface Reader<TQueries> { /* get*/ /* use*/ /* is*/ /* *Token*/ }
interface Writer<TCommands> { /* set*/ /* append*/ /* update*/ /* remove*/ /* toggle*/ /* move*/ /* run*/ }
interface Controller<R, W> { reader(): R; writer(): W; }
```

> The exact shapes of `State`, `PagesAPI`, `NodesAPI`, etc., are project-specific, but the **pattern** remains the same.

---

## 10) Glossary

- **Hexagonal Architecture**: Ports/Adapters architecture that decouples domain from delivery and infrastructure.
- **Domain Service**: Stateless or stateful service that embodies domain logic and rules.
- **Facade**: A unified interface providing a simplified entry to a complex subsystem.
- **Reader/Writer**: Split read and write APIs for clarity, validation, and performance.
- **Capability**: Feature flags or component capabilities that drive behavior (e.g., `canHaveChildren`).

---

## 11) Summary

This guide defines a **neutral, enforceable** blueprint:
- UI is stable and dumb; Controllers own orchestration and validation.
- An Engine (Facade) mediates every interaction with state and domain logic.
- Domain services remain pure and testable, swapped via ports/adapters.
- Subscriptions are **fine‑grained**; actions are **validated** at writers.
- The result is a system that is **extensible**, **maintainable**, and **resilient to change**—
  fit for complex interactive editors and similar applications.
