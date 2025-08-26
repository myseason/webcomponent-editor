/**
 * 컴포넌트 정의(Definition) / 에디터 렌더러(Renderer) 레지스트리
 * - Definition: defaults/propsSchema 등 "데이터"
 * - Renderer: 에디터에서 실제 React 렌더 (UI 레이어)
 *
 * ✅ SSOT: 타입은 반드시 core/types.ts 만 import
 */

import React from 'react';
import type { ComponentDefinition, Node, SupportedEvent } from './types';

/**
 * 에디터용 렌더러 시그니처
 * - fire(evt): Actions/Flows 트리거
 * - renderChildren(slotId?): 컴포넌트가 자식이 들어갈 위치(슬롯)를 스스로 결정
 *   (slotId 미사용 컴포넌트는 renderChildren?.() 호출)
 */
export type Renderer = (args: {
    node: Node<Record<string, unknown>>;
    fire?: (evt: SupportedEvent) => void;
    renderChildren?: (slotId?: string) => React.ReactNode;
}) => React.ReactNode;

type DefinitionMap = Record<string, ComponentDefinition>;
type RendererMap = Record<string, Renderer>;

const definitions: DefinitionMap = Object.create(null);
const renderers: RendererMap = Object.create(null);

/** Definition 등록 */
export function registerDefinition(def: ComponentDefinition): void {
    if (!def?.id) throw new Error('ComponentDefinition.id 가 필요합니다');
    definitions[def.id] = def;
}

/** Renderer 등록 */
export function registerRenderer(componentId: string, renderer: Renderer): void {
    if (!componentId) throw new Error('componentId 가 필요합니다');
    renderers[componentId] = renderer;
}

/** 한 번에 등록 (편의) */
export function register(def: ComponentDefinition, renderer: Renderer): void {
    registerDefinition(def);
    registerRenderer(def.id, renderer);
}

/** 조회/목록 */
export function getDefinition(id: string): ComponentDefinition | undefined {
    return definitions[id];
}
export function listDefinitions(): ComponentDefinition[] {
    return Object.values(definitions);
}
export function getRenderer(id: string): Renderer | undefined {
    return renderers[id];
}