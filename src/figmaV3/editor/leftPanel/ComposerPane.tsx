'use client';
/**
 * ComposerPane
 * - Top: 검색·필터 + Project Components(Templates) + Common Components(Palette)
 * - Bottom: Layers
 *
 * 규칙
 *  - any 금지
 *  - 훅 최상위
 *  - 얕은 복사 업데이트
 */

import React, {JSX} from 'react';
import { TemplatesPanel } from './TemplatesPanel';
import { Palette } from './Palette';
import { Layers } from './Layers';

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[12px] font-semibold text-gray-700 px-2 py-1 border-b bg-gray-50">
            {children}
        </div>
    );
}

/** 상단: 검색/필터 + 템플릿/팔레트 */
export function ComposerTop(): JSX.Element {
    const [q, setQ] = React.useState<string>('');
    const [showTpl, setShowTpl] = React.useState<boolean>(true);
    const [showCommon, setShowCommon] = React.useState<boolean>(true);

    return (
        <div className="p-2 space-y-3">
            {/* 검색/필터 바 */}
            <div className="flex items-center gap-2">
                <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Search components or templates… (id/title/base)"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <label className="text-[12px] flex items-center gap-1">
                    <input
                        type="checkbox"
                        checked={showTpl}
                        onChange={(e) => setShowTpl(e.target.checked)}
                    />
                    Templates
                </label>
                <label className="text-[12px] flex items-center gap-1">
                    <input
                        type="checkbox"
                        checked={showCommon}
                        onChange={(e) => setShowCommon(e.target.checked)}
                    />
                    Components
                </label>
            </div>

            {/* 템플릿 목록 */}
            {showTpl && (
                <div>
                    <SectionHeader>Project Components</SectionHeader>
                    <div className="mt-2">
                        <TemplatesPanel query={q} />
                    </div>
                </div>
            )}

            {/* 팔레트(레지스트리) */}
            {showCommon && (
                <div>
                    <SectionHeader>Common Components</SectionHeader>
                    <div className="mt-2">
                        <Palette query={q} />
                    </div>
                </div>
            )}
        </div>
    );
}

/** 하단: 레이어 트리 */
export function ComposerBottom(): JSX.Element {
    return (
        <div className="p-2">
            <Layers />
        </div>
    );
}

/** 네임스페이스 재노출 (LeftSidebar 호환: <ComposerPane.Top /> / <ComposerPane.Bottom />) */
export const ComposerPane = {
    Top: ComposerTop,
    Bottom: ComposerBottom,
};