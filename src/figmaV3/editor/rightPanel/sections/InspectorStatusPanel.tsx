'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { RightDomain, useRightControllerFactory } from '@/figmaV3/controllers/right/RightControllerFactory';
import { modeBorderClass } from './styles/common';

/**
 * Inspector 중앙 상태 패널
 * - PropsAutoSection과 StylesSection 사이에 위치
 * - Page 모드 && 강제 공개=OFF 이면: "정책에 의해 제한되는 속성은 표시되지 않습니다."
 * - Page 모드 && 강제 공개=ON  이면: "TagPolicy 강제 공개 중"
 * - Component 모드          이면: 기본 안내(필요 시 확장)
 */
export function InspectorStatusPanel() {
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);
    const ui = reader.getUI();
    const mode = ui?.mode ?? 'Page';
    const force = !!ui?.inspector?.forceTagPolicy;

    const border = modeBorderClass(mode);

    let message: React.ReactNode = null;
    if (mode === 'Page') {
        message = force
            ? <>TagPolicy <b>강제 공개</b> 상태입니다. 페이지 모드에서 모든 태그 스타일 항목이 일시적으로 노출됩니다.</>
            : <>정책에 의해 <b>제한되는 속성</b>은 표시되지 않습니다. (우측 상단 버튼으로 <b>강제 공개</b> 전환 가능)</>;
    } else {
        message = <>컴포넌트 개발 모드입니다. TagPolicy 기준으로 모든 속성이 표시됩니다.</>;
    }

    return (
        <div className={`mt-2 border-t-2 ${border}`}>
            <div className="px-3 py-2 text-xs text-gray-600 flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0" />
                <div className="leading-5">{message}</div>
            </div>
        </div>
    );
}