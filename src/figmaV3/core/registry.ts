/**
 * 컴포넌트 정의(Definition) 레지스트리와
 * 에디터 렌더러(Renderer) 레지스트리를 관리합니다.
 *
 * - 정의(Definition): defaults/propsSchema 등 "데이터"
 * - 렌더러(Renderer): 실제 React 렌더 함수(에디터 UI 레이어 소속)
 *
 * SSOT 타입은 core/types.ts만을 사용합니다.
 */
import type { ComponentDefinition } from './types';
import {JSX} from "react";

type DefinitionMap = Record<string, ComponentDefinition>;
// 렌더러는 UI 레이어에 있으나, 타입 의존을 최소화하기 위해 함수 시그니처만 명시
// (핵심: SSOT 타입만 import)
type Renderer = (args: { node: import('./types').Node; fire?: (evt: import('./types').SupportedEvent) => void }) => JSX.Element | null;
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