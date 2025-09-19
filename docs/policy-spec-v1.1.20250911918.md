
# Inspector 정책/스타일 시스템 사양서 (v1.1, Draft)

본 문서는 **TagPolicy, StylePolicy, ComponentPolicy, ComponentDefinition(propsSchema, capabilities)**의 정의와
상호 관계, 적용 우선순위, 평가 파이프라인, Inspector/StyleGraph 반영 규칙을 **일관된 스키마**로 규정합니다.

---

## 0) 목표 및 원칙

- **단일 사실 소스(SSOT)**: `globalTagPolicy`(HTML 태그 상한), `globalStylePolicy`(CSS 메타/의존성/토큰)가 최상위.
- **컴포넌트 정의는 도메인 지식**: `capabilities`(기본/허용 tag, 컨테이너 성격), `propsSchema`(속성 에디팅 스펙).
- **운영 제약은 얇게**: `ComponentPolicy`는 Inspector의 표시/편집 가능 여부만 제어(값 강제는 기본값/설정이 담당).
- **평가 파이프라인은 순수 함수**: 동일 입력에 동일 출력(메모 가능).
- **UI/UX 불변**: 기존 Inspector 레이아웃/상세 패널/Lock 아이콘 동작을 유지.

**적용 우선순위(고정):**  
`PropsSchema  >  ComponentPolicy  >  Capabilities  >  TagPolicy(Global)  >  Defaults`

---

## 1) 공통 타입: FieldSpec

속성(Attributes)과 이벤트(Events)를 **동일한 스키마**로 기술합니다. CommonInspector는 이 스펙만으로
렌더/검증/바인딩이 가능합니다.

```ts
export type FieldType =
  | 'string' | 'number' | 'boolean'
  | 'enum'   | 'color'  | 'url' | 'expr';

export interface FieldWhen { [key: string]: any }  // 예: { __tag: 'a' }

export interface FieldValidation {
  required?: boolean;
  pattern?: string;     // RegExp string
  min?: number; max?: number; step?: number; // number용
}

export interface FieldControl {
  control?: 'input'|'textarea'|'select'|'toggle'|'color'|'token';
  placeholder?: string;
  hint?: string;
}

export interface FieldSpec {
  key: string;                     // 'href', 'target', ...
  type: FieldType;
  label?: string;
  default?: any;
  enum?: string[];                 // type === 'enum'
  when?: FieldWhen;                // 조건부 노출
  bindable?: boolean;              // 데이터 바인딩 허용
  control?: FieldControl;          // UI 힌트
  validate?: FieldValidation;

  // 선택: 값 변환기 (Inspector 값 ↔ Node.props)
  serialize?: (v:any)=>any;
  deserialize?: (v:any)=>any;
}
```

---

## 2) TagPolicy (Global, HTML 태그 상한)

**역할**: 태그별로 허용 가능한 Attribute/Event/Style 그룹의 **상한**을 정의합니다.
PropsSchema는 TagPolicy 범위 안에서만 유효합니다.

```ts
export interface TagPolicy {
  tag: string;

  attributes?: {
    specs?: Record<string, FieldSpec>;  // 허용되는 속성의 세부 정의
    deny?: string[];                    // 보안/제약상 금지(deny 우선)
    groups?: Record<string, string[]>;  // Inspector 그룹(정렬/묶음 힌트)
  };

  events?: {
    specs?: Record<string, FieldSpec>;
    deny?: string[];
    groups?: Record<string, string[]>;
  };

  styles?: {
    allow?: string[];                   // 허용 CSS 키(개별)
    deny?: string[];
    groups?: Record<string, string[]>;  // Layout/Spacing/... 섹션 구성
  };
}
```
- 예: `<a>`의 `href/target/rel`, `<img>`의 `src/alt` 등은 `attributes.specs`로 정의.
- `styles.groups`는 Inspector 섹션의 기본 골격을 제공(없으면 StylePolicy 메타 기반 폴백 그룹핑).

---

## 3) StylePolicy (Global, CSS 메타/의존성/토큰)

**역할**: CSS 속성의 **메타데이터(타입/단위/제약)·컨트롤·의존성·토큰 매핑**의 SSOT.
TagPolicy가 허용한 키에 대해 어떤 컨트롤로 어떻게 보여줄지, 어떤 조건에서 노출/비활성화할지 지정합니다.

```ts
export interface StyleMeta {
  type: 'number'|'length'|'color'|'string'|'enum'|'ratio';
  unit?: string[]; enum?: string[];
  min?: number; max?: number; step?: number;
}

export interface StyleDependency {
  // 선언형 조건 DSL
  all?: StyleDependency[];     // 모두 만족
  any?: StyleDependency[];     // 하나 이상 만족
  key?: string; op?: '=='|'!='|'in'|'notin'|'truthy'|'falsy';
  value?: any;
}

export interface StyleControl {
  control: 'slider'|'select'|'input'|'color'|'toggle'|'token'|'shadow'|'border'|'background';
  label?: string;
  showWhen?: StyleDependency;   // 섹션/필드 노출 조건
  enableWhen?: StyleDependency; // 활성 조건(미충족 시 disabled + reason)
  detailGroup?: string;         // 상세 패널 연결 키(예: 'Border')
}

export interface TokenBinding {
  map?: Record<string, string | null>;   // cssKey → tokenKey (예: 'font-weight'→'typo.weight')
  tokens?: Record<string, { values: (string|number)[]; default?: string|number }>; // 토큰 사전
}

export interface GlobalStylePolicy {
  version: '1.1';
  deny?: string[];                        // 위험/보안 상 금지
  allow?: string[];                       // 전역 허용
  byTag?: Record<string, { allow?: string[]; deny?: string[] }>; // 태그별 보정
  meta: Record<string, StyleMeta>;
  control: Record<string, StyleControl>;
  deps?: Record<string, StyleDependency>;
  binding: TokenBinding;
}
```

**중요 포인트**
- **Dependency**: 예) `position !== 'static'`일 때만 `top/right/bottom/left` 활성, `display !== 'inline'`일 때만 `width/height` 노출.
- **Token**: 토큰 선택 시 저장은 (a) StyleGraph에 실제값, (b) 별도 바인딩 메타로 “토큰 사용 중” 표기(권장).

---

## 4) ComponentDefinition (컴포넌트 설계자의 정의)

```ts
export interface Capabilities {
  defaultTag?: string;                 // 기본 태그
  allowedTags?: string[];              // 교체 가능한 태그들
  canHaveChildren?: boolean;
  containerRole?: 'none'|'flex'|'grid';
}

export interface PropsSchema {
  fields: FieldSpec[];                 // TagPolicy와 동일 스키마
}

export interface ComponentDefinition {
  id: string; name: string;
  capabilities?: Capabilities;
  propsSchema?: PropsSchema;           // TagPolicy 범위 내에서 우선권
  defaults?: {
    props?: Record<string, any>;
    styles?: { element?: { base?: CSSDict; [vpOrState: string]: CSSDict | undefined } };
  };
  renderer: (ctx: { node: Node; fire: (evt:any)=>void }) => React.ReactElement | undefined;
}
```

**관계**
- **capabilities**는 TagPolicy보다 우선하여 **Tag 후보**를 결정. 단, 선택된 태그의 속성/스타일 편집은 여전히 TagPolicy/StylePolicy의 범위를 따름.
- **propsSchema**는 TagPolicy 사전(specs)을 **오버라이드**(라벨/컨트롤/기본값/검증/when)하되, **새 키 추가는 불가**(상한 유지).

---

## 5) ComponentPolicy (운영 제약)

```ts
export interface ComponentPolicy {
  inspector?: {
    groups?:   Record<string, { visible?: boolean; locked?: boolean }>; // 섹션 단위
    controls?: Record<string, { visible?: boolean; locked?: boolean }>; // 스타일 키 단위
    props?:    Record<string, { visible?: boolean; locked?: boolean }>; // 속성 키 단위
  };
}
```

- **Page 모드**: `visible:false`는 **완전 숨김**. `locked`는 무의미.
- **Component 모드**: **Lock 아이콘 표시**. `locked:true`면 **편집 불가**(표시는 유지).
- **Expert 모드**: 운영 제약을 **무시하고 표시**할 수 있으나, 편집 가능 여부는 제품 정책에 따름.

---

## 6) 평가 파이프라인(순수 함수)

```ts
// 입력: project, nodeId, UI context(Mode/Expert/ParentDisplay/ViewportMode ...)
// 출력: CommonPolicy (Inspector/Renderer 공통 스펙)

// 1) 태그 후보 및 확정
resolveTagCandidates(node, def) -> { candidates, currentTag }

// 2) Attribute/Event 스펙
//  - 후보: TagPolicy.attributes.specs - deny - when 불일치 제거
//  - PropsSchema 오버라이드(동일 key만)
//  - ComponentPolicy 적용(visible/locked)
//  - 결과: FieldSpec & { visible, locked }[]
resolveAttributeSpec(tag, def.propsSchema, tagPolicy, compPolicy, ctx)

// 3) Style 스펙
//  - allowed 집합: GlobalStylePolicy.allow/deny + byTag + TagPolicy.styles.allow/deny
//  - groups: TagPolicy.styles.groups or 메타 기반 폴백
//  - ComponentPolicy.controls.visible=false → (Expert OFF)에서 제외
//  - deps/control/meta/tokens 그대로 전달
resolveStyleSpec(tag, globalStyle, tagPolicy, compPolicy, ctx)

// 4) CommonPolicy 생성
buildCommonPolicy(project, nodeId, ctx) -> { tag, tagCandidates, props, styles }
```

**의존성 평가기**  
`showWhen/enableWhen`/`deps`는 동일한 평가기로 처리. `__parentDisplay`는 selectors에서 값 주입.

---

## 7) Inspector 반영 규칙

- **그룹 노출**: `isGroupAllowed(allowed, group.repKeys)` (대표 키 중 1개라도 허용)
- **필드 노출**: `allowed.has(cssKey)` ∧ `control[key].showWhen` 만족
- **비활성**: `enableWhen` 미충족 ∨ `locked:true`(Component 모드)
- **UI 유지**: Row 3:7 그리드, 우측 9:1 상세 버튼, Lock 아이콘 위치 불변
- **Tag 변경**: `buildCommonPolicy` 재호출 → 속성/스타일 패널 즉시 재구성

---

## 8) StyleGraph 연동 (Base + Delta)

- **저장**: Inspector → normalizeStylePatch → `_updateNodeStyles(id, patch, viewport?)`
- **혼용 방지**: border/마진/패딩/배경/아웃라인 등 shorthand ↔ longhand 혼용 제거
- **렌더**: selectors `getEffectiveDecl`에서 Base + Delta 병합, `toReactStyle`로 캐멀/숫자 캐스팅
- **토큰**: 실제값 저장 + 바인딩 메타 보존(권장) → 테마/토큰 변경 시 동기화

---

## 9) 병합 규칙

- **배열**: 기본 **교집합**. `PropsSchema` 명시가 있으면 그 키만 노출(우선).
- **객체**: 얕은 병합 + **명시 키 우선**(오버라이드).
- **visible:false**: 강한 금지(Expert OFF). Expert ON일 때는 “표시하되 편집 불가” 선택 가능(제품 정책).
- **버전 관리**: `version: '1.1'` + `migratePolicy(fromVersion)` 제공.

---

## 10) 예시 스니펫

### 10.1 `<a>` 태그 정책
```ts
const globalTagPolicy.a: TagPolicy = {
  tag: 'a',
  attributes: {
    specs: {
      href:     { key:'href', type:'url', label:'Href', control:{control:'input'}, validate:{required:true} },
      target:   { key:'target', type:'enum', label:'Target', control:{control:'select'}, enum: ['_self','_blank','_parent','_top'] },
      rel:      { key:'rel', type:'string', label:'Rel', control:{control:'input'}, placeholder:'noopener nofollow' },
      download: { key:'download', type:'boolean', label:'Download', control:{control:'toggle'} },
    },
    groups: { Link: ['href','target','rel','download'] }
  },
  styles: {
    groups: { Layout: ['display','position', 'top','right','bottom','left','z-index'], /* ... */ }
  }
};
```

### 10.2 Button 컴포넌트 정의
```ts
const ButtonDef: ComponentDefinition = {
  id: 'button',
  name: 'Button',
  capabilities: {
    defaultTag: 'button',
    allowedTags: ['button','a','div'],
    canHaveChildren: true,
    containerRole: 'none'
  },
  propsSchema: {
    fields: [
      { key:'__tag', type:'enum', enum:['button','a','div'], label:'Tag', control:{control:'select'} },
      { key:'type',  type:'enum', enum:['button','submit','reset'], label:'Type', when:{ __tag:'button' } },
      { key:'href',  type:'url',  label:'Href', when:{ __tag:'a' }, validate:{ required:true } },
    ]
  },
  defaults: {
    styles: { element: { base: { display:'inline-flex', 'align-items':'center', 'justify-content':'center' } } }
  },
  renderer: /* ... */
};
```

---

## 11) 구현 체크리스트

1. **TagPolicy 확장**: `attributes.specs: Record<string, FieldSpec>`로 교체(현재 string[] 제거).
2. **resolveAttributeSpec**: FieldSpec 병합/필터 로직 적용(PropsSchema 오버라이드, deny/when 처리).
3. **resolveStyleSpec**: allowed 집합/그룹/의존성/토큰/컨트롤 제공.
4. **selectors**: `__parentDisplay` 주입, `getEffectiveDecl` 메모/병합.
5. **Inspector**: allowedSectionsByTag 제거, v2 CommonPolicy로 렌더/비활성/잠금/상세 버튼 유지.
6. **runtime/styleUtils**: shorthand 혼용 방지 확대(padding/margin/background/outline).
7. **ComponentPolicy**: Page/Component/Expert 모드별 visible/locked 해석 통일.

---

## 12) 보안/안전 가이드

- 위험 속성/스타일(`filter:url`, `behavior`, JavaScript URL 등)은 **GlobalStylePolicy.deny**로 차단.
- 이벤트(예: onClick)의 값 타입은 `expr`로 제한, 샌드박스/화이트리스트 기반 실행.
- URL 필드는 스키마 레벨에서 프로토콜 검증(`https:` 등) 옵션 제공.

---

## 13) 버전 및 마이그레이션

- 현재 버전: `1.1`  
- 변경 시 `migratePolicy(fromVersion)`로 TagPolicy/StylePolicy/ComponentPolicy를 안전 변환.
- Inspector는 정책 버전 불일치 시 경고 및 자동 마이그레이션 시도.

---

## 14) 요약(한 줄)

> **TagPolicy**가 범위를 정하고, **StylePolicy**가 보여주는 방법과 의존성을 정의하며, **ComponentDefinition**이 제품 맥락을 얹고, **ComponentPolicy**가 운영 제약만 더한다. 평가 결과는 **CommonPolicy**로 일원화되어 Inspector/Renderer가 그대로 사용한다.
