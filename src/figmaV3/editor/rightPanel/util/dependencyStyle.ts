// rightPanel/util/dependencyStyle.ts
// 스타일 선택 상태(values)에 따라 disable / warn / hide 결정을 일괄 처리하는 공통 모듈

export type StyleValues = Record<string, string | undefined>;

export type DepDecision = {
    /** 컨트롤 자체를 disable 할지 여부 */
    disabled: boolean;
    /** 행 자체를 숨길지 여부(보여줄 의미가 전혀 없을 때) */
    hide?: boolean;
    /** 경고/안내 메시지(있으면 WarningRow 등으로 노출) */
    warn?: string;
    /** 의사결정 근거(디버깅/로깅 용) */
    reasons?: string[];
};

export type DepPredicate = (values: StyleValues) => boolean;

export type DepRule = {
    /** 이 규칙이 적용될 타깃 키(옵션). 없으면 호출하는 쪽에서 알아서 적용 */
    targetKeys?: string[]; // 예: ['width','height'] 등
    /** 조건 */
    when: DepPredicate;
    /** 적용 결과 */
    effect: {
        disable?: boolean;
        hide?: boolean;
        warn?: string | ((values: StyleValues) => string);
        reason?: string;
    };
    /** 우선순위(숫자 클수록 나중에 override). 기본 0 */
    priority?: number;
};

// -------------------------------------------------------------
// 헬퍼: 조건 빌더(가독성용)
// -------------------------------------------------------------
export const is = (k: string, ...allowed: string[]): DepPredicate => (v) => {
    const cur = (v[k] ?? '').trim();
    return allowed.some((a) => a === cur);
};

export const not = (pred: DepPredicate): DepPredicate => (v) => !pred(v);

export const all = (...preds: DepPredicate[]): DepPredicate => (v) =>
    preds.every((p) => p(v));

export const any = (...preds: DepPredicate[]): DepPredicate => (v) =>
    preds.some((p) => p(v));

export const exists = (k: string): DepPredicate => (v) => !!(v[k]?.trim());

// -------------------------------------------------------------
// 메인: dependencyStyle
// - 주어진 rules를 평가해 disabled/hide/warn을 종합 결정
// - 동일 타깃(key)에 여러 규칙이 들어오면 priority 순서로 merge
// -------------------------------------------------------------
export function dependencyStyle(
    values: StyleValues,
    rules: DepRule[] | undefined,
    opts?: { targetKey?: string } // 특정 Row에서 targetKey 지정해도 됨
): DepDecision {
    if (!rules || rules.length === 0) return { disabled: false };

    const hit = rules
        .filter((r) => {
            if (!r.when(values)) return false;
            if (!opts?.targetKey) return true;
            if (!r.targetKeys || r.targetKeys.length === 0) return true;
            return r.targetKeys.includes(opts.targetKey);
        })
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)); // 우선순위 낮은 것 → 높은 것 순으로 적용

    if (hit.length === 0) return { disabled: false };

    const decision: DepDecision = { disabled: false, reasons: [] };

    for (const r of hit) {
        const eff = r.effect;
        if (eff.disable != null) decision.disabled = eff.disable;
        if (eff.hide != null) decision.hide = eff.hide;
        if (eff.warn) {
            decision.warn = typeof eff.warn === 'function' ? eff.warn(values) : eff.warn;
        }
        if (eff.reason) decision.reasons!.push(eff.reason);
    }

    return decision;
}

// -------------------------------------------------------------
// 공용 프리셋 규칙 모음(필요 시 켜서 쓰기)
// -------------------------------------------------------------

/** inline 요소는 width/height/set sizing 불가 사례 */
export const RULE_INLINE_DISALLOW_SIZING: DepRule = {
    targetKeys: ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'],
    when: is('display', 'inline'),
    effect: {
        disable: true,
        warn: '현재 display:inline 상태에서는 크기(width/height)를 직접 지정할 수 없습니다.',
        reason: 'inline sizing disallowed',
    },
    priority: 10,
};

/** position: static 이면 inset(top/right/bottom/left) 무의미 */
export const RULE_STATIC_DISALLOW_INSET: DepRule = {
    targetKeys: ['top', 'right', 'bottom', 'left', 'inset'],
    when: is('position', 'static', ''),
    effect: {
        disable: true,
        warn: 'position이 static이면 top/right/bottom/left(inset)를 적용할 수 없습니다.',
        reason: 'static no inset',
    },
    priority: 10,
};

/** grid 컨테이너에서 gap은 유의미, flex가 아니면 order/flex 등은 무의미(아이템 전용) */
export const RULE_FLEX_ITEM_ONLY: DepRule = {
    targetKeys: ['order', 'flex', 'alignSelf'],
    when: (v) => (v['__parentDisplay'] ?? '') === 'flex',
    effect: { disable: false, reason: 'flex item allows order/flex/alignSelf' },
    priority: 1,
};

export const RULE_NOT_FLEX_ITEM_DISABLE_ITEM_PROPS: DepRule = {
    targetKeys: ['order', 'flex', 'alignSelf'],
    when: (v) => (v['__parentDisplay'] ?? '') !== 'flex',
    effect: {
        disable: true,
        warn: '부모가 flex가 아니므로 item 속성(order/flex/align-self)을 적용할 수 없습니다.',
        reason: 'not flex parent',
    },
    priority: 2,
};

/** background 관련: image 없을 때 size/repeat/position 등은 무의미 → 상세에 경고 */
export const RULE_BG_IMAGE_DEPENDENTS: DepRule = {
    targetKeys: [
        'backgroundSize',
        'backgroundRepeat',
        'backgroundPosition',
        'backgroundClip',
        'backgroundOrigin',
        'backgroundAttachment',
    ],
    when: not(exists('backgroundImage')),
    effect: {
        disable: true,
        warn: '배경 이미지가 없으므로 관련 상세 설정을 적용할 수 없습니다.',
        reason: 'no bg image',
    },
    priority: 5,
};