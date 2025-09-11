import { EditorCore } from '../EditorCore';
import {
    type EditorState,
    type CSSDict,
    type NodeId,
    type Fragment,
    type BottomRightPanelKind,
    type EditorUI,
    type EditorMode,
    type Project,
    type InspectorFilter,
    type Node, ComponentCapabilities,
} from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_TAG_POLICIES, CONTAINER_TAGS, INLINE_OR_SIMPLE_TAGS, isContainerTag } from '../../policy/globalTagPolicy';

/* ===================== BottomDock / 공통 파생 util (기존 유지) ===================== */
type PanelsT = NonNullable<EditorUI['panels']>;
type BottomT = NonNullable<PanelsT['bottom']>;
type AdvancedT = NonNullable<NonNullable<BottomT['advanced']>>;

type BottomAdvanced = { open: boolean; kind: BottomRightPanelKind; widthPct: number };
type BottomDockState = { heightPx: number; isCollapsed: boolean; advanced: BottomAdvanced };
type BottomRightLayout = { rightOpen: boolean; rightPct: number; leftPct: number };

function normBottomDock(ui?: EditorUI): BottomDockState {
    const panels = ui?.panels as PanelsT | undefined;
    const bottom = panels?.bottom as BottomT | undefined;

    const heightPx = typeof bottom?.heightPx === 'number' ? bottom!.heightPx : 240;
    const isCollapsed = !!bottom?.isCollapsed;

    const advRaw = bottom?.advanced ?? null;
    const open = !!advRaw?.open;
    const kind = (advRaw?.kind ?? 'None') as BottomRightPanelKind;
    const widthPct = typeof advRaw?.widthPct === 'number' ? advRaw!.widthPct : 36;

    return { heightPx, isCollapsed, advanced: { open, kind, widthPct } };
}

function computeRightLayout(ui?: EditorUI): BottomRightLayout {
    const st = normBottomDock(ui);
    const rp = Math.max(0, Math.min(100, st.advanced.widthPct));
    const rightOpen = !!st.advanced.open && st.advanced.kind === 'SchemaEditor';
    return { rightOpen, rightPct: rp, leftPct: Math.max(0, 100 - rp) };
}

function findCurrentRootIdByMode(ui?: EditorUI, project?: Project): NodeId | null {
    const mode: EditorMode = (ui?.mode ?? 'Page') as EditorMode;

    if (mode === 'Component') {
        const fragId = ui?.editingFragmentId ?? ui?.panels?.left?.lastActiveFragmentId ?? null;
        if (fragId && project?.fragments?.length) {
            const f = project.fragments.find((x) => x.id === fragId) ?? project.fragments[0];
            return f?.rootId ?? null;
        }
        return null;
    }

    const pageId = ui?.panels?.left?.lastActivePageId ?? null;
    if (project?.pages?.length) {
        const p = (pageId ? project.pages.find((x) => x.id === pageId) : null) ?? project.pages[0];
        return p?.rootId ?? null;
    }
    return null;
}

/* ===================== Tag 계산 / Policy & Inspector ===================== */
function getNodeTag(state: EditorState, node: Node<any, any> | undefined): string {
    if (!node) return 'div';
    const tagOverride = (node.props as any)?.__tag as string | undefined;
    if (tagOverride) return tagOverride;

    const def = getDefinition(node.componentId);
    const defTag = def?.capabilities?.defaultTag;
    return defTag ?? 'div';
}

function computeTagAllowedStyleKeys(tag: string): Set<string> {
    const tp = (GLOBAL_TAG_POLICIES as any)[tag] as
        | {
        styles?: {
            allow?: string[];
            deny?: string[];
            groups?: Record<string, string[]>;
        };
        attributes?: { allow?: string[]; deny?: string[] };
    }
        | undefined;

    if (!tp?.styles) return new Set<string>();

    const allow = new Set<string>(tp.styles.allow ?? []);
    const deny = new Set<string>(tp.styles.deny ?? []);
    const groups = tp.styles.groups ?? {};

    if (allow.has('*')) {
        allow.clear();
        for (const arr of Object.values(groups)) {
            for (const k of arr) allow.add(k);
        }
    }
    for (const d of deny) allow.delete(d);
    return allow;
}

function applyInspectorFilter(
    keys: Set<string>,
    filter: InspectorFilter | undefined,
    kind: 'styles' | 'props'
): { visible: string[] } {
    if (!filter) return { visible: [...keys] };

    const allowList = filter[kind]?.allow ?? undefined;
    const denyList = filter[kind]?.deny ?? undefined;

    let vis = new Set<string>(keys);
    if (Array.isArray(allowList) && allowList.length > 0) {
        vis = new Set<string>([...vis].filter((k) => allowList.includes(k)));
    }
    if (Array.isArray(denyList) && denyList.length > 0) {
        for (const d of denyList) vis.delete(d);
    }
    return { visible: [...vis] };
}

const selectEffectiveDecl = (state: EditorState, nodeId: string): CSSDict | null => {
    const node = state.project.nodes[nodeId];
    if (!node) return null;

    const el = node.styles?.element ?? {};
    const baseVp = state.ui.canvas.baseViewport;
    const activeVp = state.ui.canvas.activeViewport;
    const mode = state.ui.canvas.viewportMode?.[activeVp] ?? state.ui.canvas.viewportMode?.[activeVp];

    const baseDecl = (el as any)[baseVp] ?? {};
    if (mode === 'Independent' && activeVp !== baseVp) {
        const overrideDecl = (el as any)[activeVp] ?? {};
        return { ...baseDecl, ...overrideDecl };
    }
    return { ...baseDecl };
};

/* ===================== 새로 추가: Tag 선택 옵션 ===================== */

export type TagOption = {
    value: string;
    label: string;
    /** 현재 컴포넌트가 비컨테이너일 때 컨테이너 태그는 선택 금지 → disabled */
    disabled?: boolean;
    /** disabled이면서 컨테이너 태그인 경우: 선택 시 컨테이너로 승격 필요 */
    upgradeToContainer?: boolean;
};

function getAllowedTagsByComponent(defId: string): string[] {
    const def = getDefinition(defId);
    const caps = def?.capabilities ?? {} as ComponentCapabilities;
    // 컴포넌트에서 명시한 allowedTags만 노출 (요청사항: "기본 태그 외 모두 뜨는 문제" 방지)
    const allowed = Array.isArray(caps.allowedTags) && caps.allowedTags.length > 0
        ? caps.allowedTags
        : [(caps.defaultTag ?? 'div')];

    // (옵션) 글로벌 정책에서 완전히 제외된 태그를 걸러내고 싶다면 여기서 필터 가능
    return allowed;
}

export function selectorsDomain() {
    const R = {
        getEffectiveDecl(nodeId: string) {
            return selectEffectiveDecl(EditorCore.getState(), nodeId);
        },
        selectBottomDockState(): BottomDockState {
            const s = EditorCore.store.getState() as EditorState;
            return normBottomDock(s.ui);
        },
        selectBottomRightLayout(): BottomRightLayout {
            const s = EditorCore.store.getState() as EditorState;
            return computeRightLayout(s.ui);
        },
        selectCurrentRootId(): NodeId | null {
            const s = EditorCore.store.getState() as EditorState;
            return findCurrentRootIdByMode(s.ui, s.project);
        },
        selectInspectorStyleKeys(nodeId: NodeId): { visible: string[] } {
            const s = EditorCore.getState();
            const node = s.project.nodes?.[nodeId];
            const tag = getNodeTag(s, node);
            const tagAllowed = computeTagAllowedStyleKeys(tag);

            const mode = (s.ui?.mode ?? 'Page') as EditorMode;
            const forceAll = !!s.ui?.inspector?.forceTagPolicy;
            if (mode === 'Page' && forceAll) {
                return { visible: [...tagAllowed] };
            }

            const defId = node?.componentId ?? '';
            const filter = (s.project.inspectorFilters?.[defId] as InspectorFilter | undefined);
            return applyInspectorFilter(tagAllowed, filter, 'styles');
        },
        selectInspectorPropKeys(nodeId: NodeId): { visible: string[] } {
            const s = EditorCore.getState();
            const node = s.project.nodes?.[nodeId];
            const tag = getNodeTag(s, node);

            const tp = (GLOBAL_TAG_POLICIES as any)[tag] as
                | { attributes?: { allow?: string[]; deny?: string[] } }
                | undefined;

            const allow = new Set<string>(tp?.attributes?.allow ?? []);
            const deny = new Set<string>(tp?.attributes?.deny ?? []);
            for (const d of deny) allow.delete(d);

            const mode = (s.ui?.mode ?? 'Page') as EditorMode;
            const forceAll = !!s.ui?.inspector?.forceTagPolicy;
            if (mode === 'Page' && forceAll) {
                return { visible: [...allow] };
            }

            const defId = node?.componentId ?? '';
            const filter = (s.project.inspectorFilters?.[defId] as InspectorFilter | undefined);
            return applyInspectorFilter(allow, filter, 'props');
        },

        /** ✅ Tag 선택 옵션 계산
         * - 컴포넌트가 비컨테이너(canHaveChildren=false) → 컨테이너 태그는 disabled+upgradeToContainer
         * - 컴포넌트가 컨테이너 → allowedTags 그대로 사용
         */
        selectAllowedTagOptions(nodeId: NodeId): TagOption[] {
            const s = EditorCore.getState();
            const node = s.project.nodes[nodeId];
            if (!node) return [];

            const def = getDefinition(node.componentId);
            const canHaveChildren = !!def?.capabilities?.canHaveChildren;

            const allowed = getAllowedTagsByComponent(node.componentId); // 컴포넌트가 허용한 태그만
            // 현재 태그가 allowed에 없으면(과거 데이터 등), 맨 앞에 붙여 표시
            const curTag = getNodeTag(s, node);
            const list = allowed.includes(curTag) ? allowed : [curTag, ...allowed];

            return list.map<TagOption>((tag) => {
                const isContainer = isContainerTag(tag);
                if (!canHaveChildren && isContainer) {
                    return {
                        value: tag,
                        label: tag,
                        disabled: true,
                        upgradeToContainer: true,
                    };
                }
                return { value: tag, label: tag };
            });
        },
    };

    const W = {};
    return { reader: R, writer: W } as const;
}