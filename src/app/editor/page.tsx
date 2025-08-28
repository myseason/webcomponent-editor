'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(
    // ✅ [수정] 모듈(mod)을 불러온 후, 이름으로 내보내진 'ComponentEditor'를
    // ✅ 명시적으로 반환하여 타입스크립트가 컴포넌트를 정확히 인식하도록 합니다.
    () => import('../../figmaV3/editor/ComponentEditor').then((mod) => mod.ComponentEditor),
    {
        ssr: false,
        // 로딩 중에 표시할 컴포넌트 (선택 사항)
        loading: () => <p>Loading Editor...</p>
    }
    /*
    // ComponentEditor.tsx가 default export를 사용할 경우
        const Editor = dynamic(() => import('../../figmaV3/editor/ComponentEditor'), {
            ssr: false
        });
     */
);

export default function Page() {
    return <Editor />;
}