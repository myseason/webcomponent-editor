# Controller / Domain 함수 네이밍 규칙

우리 프로젝트는 **헥사고날 아키텍처 + 도메인 서비스 + 컨트롤러 파사드** 구조를 따릅니다.  
함수 이름만으로도 **읽기/쓰기/토글/프리젠테이션 전용**이 구분되도록 네이밍 규칙을 지킵니다.

---

## 1. Store Slice (저수준 원자 연산)

- **접두어 `_` (언더스코어) 필수**
- 외부에서 직접 호출하지 않고 **도메인 Writer**가 감쌉니다.

예시:
- `_createNode`
- `_deleteNodeCascade`
- `_moveNode`
- `_updateNodeProps`
- `_setCanvasSize`
- `_toggleNodeLock`

---

## 2. Domain Reader (읽기 전용)

- 상태 조회 / 파생 계산
- **절대 상태 변경 없음**
- 접두어: `get`, `list`, `select`, `can`

예시:
- `getNodeById`
- `getCurrentPage`
- `listPages`
- `selectSubtreeIds`
- `canMoveNode`

---

## 3. Domain Writer (쓰기/상태 전이)

- 의도가 드러나는 동사 접두어만 사용
- Undo/Redo 기록 포함
- 금지: `do*`, `process*`, `handle*` 같은 모호한 이름

접두어 & 예시:
- 생성/추가: `createNode`, `addPage`, `insertComponent`
- 삭제: `removeNodeCascade`, `deleteFragment`
- 이동/정렬: `moveNode`, `reorderChild`
- 갱신: `updateNodeProps`, `patchNode`, `setCurrentRoot`
- 토글: `toggleNodeVisibility`, `toggleNodeLock`
- 그룹: `groupSelected`, `ungroupSelected`
- 전환/선택: `selectPage`, `setSelected`
- 실행: `runFlow`, `executeAction`
- 비동기 I/O: `fetchProject`, `loadAssets`, `saveProject`, `exportProject`

---

## 4. Controller (파사드 / UI 친화 계층)

- 도메인 Reader/Writer를 **그대로 pick**해서 노출
- **UI 전용 프리젠테이션 VM**은 `attachReader`/`attachWriter`로 추가
- VM 네이밍: `get*VM`

예시:
- `getInspectorVM`
- `getLayersTreeVM`
- `notifySuccess`, `notifyError`

---

## 5. 네이밍 매트릭스

| 의도         | 접두어           | 예시                              |
|--------------|------------------|-----------------------------------|
| 단일 조회    | `get`            | `getNodeById`, `getCurrentPage`   |
| 목록 조회    | `list`           | `listPages`, `listFragments`      |
| 파생 계산    | `select`         | `selectParentId`, `selectSubtree` |
| 가능 여부    | `can`            | `canMoveNode`, `canDeleteNode`    |
| 생성/추가    | `create`, `add`, `insert` | `createNode`, `addPage`    |
| 삭제         | `remove`, `delete` | `removeNodeCascade`             |
| 이동/정렬    | `move`, `reorder`, `set*Children` | `moveNode`         |
| 갱신         | `update`, `patch`, `set` | `updateNodeProps`        |
| 토글         | `toggle`         | `toggleNodeLock`                 |
| 그룹/해제    | `group`, `ungroup` | `groupSelected`, `ungroupSelected` |
| 선택/전환    | `select`, `set`  | `selectPage`, `setSelected`      |
| 실행         | `run`, `execute` | `runFlow`, `executeAction`       |
| 비동기 I/O   | `fetch`, `load`, `save`, `export`, `import` | `fetchProject`, `saveProject` |
| VM (UI 전용) | `get*VM`         | `getInspectorVM`, `getLayersVM`  |

---

## 6. Lint / 검증 규칙 (선택)

- `store/slices/*` 외부에서 `_` 함수 호출 금지
- `engine/domains/*` Writer 함수명은 위 접두어만 허용
- Controller에는 프리젠테이션 VM(`get*VM`) 외 도메인 로직 금지

---

👉 이 규칙을 **새 함수 추가/리팩터링 시 반드시 준수**해 주세요.
