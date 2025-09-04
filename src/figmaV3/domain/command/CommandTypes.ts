'use client';

/**
 * 커맨드 타입 중심 정의 (prev 스냅샷 포함)
 */

export type CommandName =
    | 'node.props.patch'
    | 'node.styles.patch'
    | 'node.tag.change'
    | 'ui.expert.toggle'
    | 'binding.apply'          // ← 신규
    | (string & {}); // 확장 허용

export type CmdNodePropsPatch = {
    nodeId: string;
    patch: Record<string, unknown>;
    prev: Record<string, unknown>;
};

export type CmdNodeStylesPatch = {
    nodeId: string;
    patch: Record<string, unknown>;
    viewport?: string;
    prev: Record<string, unknown>;
};

export type CmdNodeTagChange = {
    nodeId: string;
    tag: string;
    prevTag?: string;
};

export type CmdUiExpertToggle = {
    next: boolean;
    prev: boolean;
};

/** 신규: 바인딩 적용 커맨드 */
export type CmdBindingApply = {
    nodeId: string;
    propKey: string;
    value: unknown;      // 예: "{{user.name}}" 또는 "$data.user.name"
    prev: unknown;       // 적용 전 기존 값 (string|number|...|undefined)
};

export type CommandPayloadMap = {
    'node.props.patch': CmdNodePropsPatch;
    'node.styles.patch': CmdNodeStylesPatch;
    'node.tag.change': CmdNodeTagChange;
    'ui.expert.toggle': CmdUiExpertToggle;
    'binding.apply': CmdBindingApply;
};

export type Command<K extends CommandName = CommandName> = K extends keyof CommandPayloadMap
    ? { name: K; payload: CommandPayloadMap[K] }
    : { name: K; payload: any };