'use client';

import type { NodeId } from '../../core/types';
import { selectTargetNodeId } from './cross/selection';

/**
 * @deprecated
 * v1.3.1부터는 cross/selection.ts의 selectTargetNodeId()를 사용하세요.
 * 본 함수는 Inspector 전용 명명으로 재사용/확장을 저해하므로 폐기 예정입니다.
 * (호환을 위해 현재는 동일 동작으로 래핑만 제공합니다)
 */
export function computeInspectorTargetNodeId(): NodeId | null {
    return (selectTargetNodeId() as NodeId | null);
}