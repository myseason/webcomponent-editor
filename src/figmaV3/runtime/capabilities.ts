// 정책 계산의 단일 출처(SSOT). 오직 "순수 함수"만 존재해야 합니다.
import type { Project, EditorUI, NodeId, TagPolicy } from '../core/types';
import { GLOBAL_TAG_POLICIES } from '../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../policy/globalStylePolicy';
import { deepMerge } from './deepMerge';

// ────────────────────────────────────────────────
// 내부 유틸(순수)
// ────────────────────────────────────────────────
function normalizeControlPath(path: string): { group: string; key: string } {
    const p = path.startsWith('styles:') ? path.slice(7) : path;
    const [group, key] = p.split('.');
    return { group, key };
}

function resolveNodeTag(project: Readonly<Project>, nodeId: NodeId): string {
    const node: any = project.nodes?.[nodeId];
    const fromProps = node?.props?.__tag;
    if (fromProps) return String(fromProps);
    // 순수성 유지 차원에서 registry 접근은 하지 않습니다.
    // props 우선, 없으면 'div'로 폴백.
    return 'div';
}

function getTagPolicy(tag: string): TagPolicy | undefined {
    return (GLOBAL_TAG_POLICIES as any)?.[tag];
}

// TagPolicy.groups → group/controls visible:true 시드
function buildTagSeed(tagPolicy: Readonly<TagPolicy> | undefined): any {
    if (!tagPolicy?.styles?.groups) return {};
    const seed: any = {};
    for (const [group, keys] of Object.entries(tagPolicy.styles.groups)) {
        seed[group] = seed[group] ?? { visible: true, controls: {} };
        for (const k of keys as string[]) {
            seed[group].controls[k] = { visible: true };
        }
    }
    return seed;
}

// 메인(1차) 속성 기본 시드 — 요구 사항: Layout의 display/size/overflow
function buildMainSeed(): any {
    return {
        layout: {
            visible: true,
            controls: {
                display: { visible: true },
                size: { visible: true },
                overflow: { visible: true },
            },
        },
    };
}

// ComponentPolicy(inspector.controls) 평탄 키 → group overlay
export function buildOverlayFromComponentPolicy(
    compPolicy: Readonly<any> | undefined
): any {
    const overlay: any = {};
    const flat = compPolicy?.inspector?.controls;
    if (!flat) return overlay;

    for (const [path, meta] of Object.entries(flat)) {
        const { group, key } = normalizeControlPath(path);
        if (!group || !key) continue;
        overlay[group] = overlay[group] ?? { controls: {} };
        overlay[group].controls[key] = { ...(overlay[group].controls[key] ?? {}) };
        if ((meta as any).visible === false) {
            overlay[group].controls[key].visible = false;
        }
    }
    return overlay;
}

// ────────────────────────────────────────────────
// 허용 키 계산 (alias 포함, 순수)
// ────────────────────────────────────────────────
export function getAllowedStyleKeysForNode(
    project: Readonly<Project>,
    nodeId: NodeId,
    opts?: {
        expertMode?: boolean;     // 현재 버전에서는 allow/deny에 직접 영향 없음(deny/allow는 전역/태그에서 적용)
        withSizeAlias?: boolean;  // width/height → size 추가
    }
): Set<string> {
    const tag = resolveNodeTag(project, nodeId);
    const tagPolicy = getTagPolicy(tag);

    // 1) 태그 그룹에서 허용 키 수집
    const allowed = new Set<string>();
    const groups = tagPolicy?.styles?.groups ?? {};
    for (const [, keys] of Object.entries(groups)) {
        for (const k of keys as string[]) {
            allowed.add(k);
        }
    }

    // 2) 전역 allow/deny 반영
    (GLOBAL_STYLE_POLICY.allow ?? []).forEach((k) => allowed.add(k));
    (GLOBAL_STYLE_POLICY.deny ?? []).forEach((k) => allowed.delete(k));
    (tagPolicy?.styles?.deny ?? []).forEach((k) => allowed.delete(k));

    // 3) alias: width/height 중 하나라도 있으면 size 허용
    if (opts?.withSizeAlias && (allowed.has('width') || allowed.has('height'))) {
        allowed.add('size');
    }

    return allowed;
}

// ────────────────────────────────────────────────
// 메인(1차) 속성 가시성 판단 (기본 true, 명시적 false만 숨김) — 순수
// ────────────────────────────────────────────────
export function isControlVisibleForNode(
    project: Readonly<Project>,
    ui: Readonly<EditorUI>,
    nodeId: NodeId,
    controlPath: `${string}.${string}`,
    opts?: {
        componentOverlay?: Readonly<any>; // 컨트롤러/도메인에서 만들어 주입
    }
): boolean {
    const tag = resolveNodeTag(project, nodeId);
    const tagPolicy = getTagPolicy(tag);

    // 1) 메인 시드 + 태그 시드
    let eff = deepMerge(buildMainSeed(), buildTagSeed(tagPolicy));

    // 2) Page & 비-Expert에서만 Component overlay 적용
    if (ui?.mode === 'Page' && !ui?.expertMode && opts?.componentOverlay) {
        eff = deepMerge(eff, opts.componentOverlay);
    }

    // 3) 평가
    const { group, key } = normalizeControlPath(controlPath);
    const g = (eff as any)[group];
    if (!g || g.visible === false) return false;
    const c = g.controls?.[key];
    return c?.visible !== false;
}