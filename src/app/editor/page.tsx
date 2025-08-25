'use client';
/**
 * /editor 라우트: ComponentEditor 마운트
 * - App Router 기준, ssr:false 로 클라이언트 전용 렌더
 */
import React from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('../../figmaV3/editor/ComponentEditor'), { ssr: false });

export default function Page() {
    return <Editor />;
}