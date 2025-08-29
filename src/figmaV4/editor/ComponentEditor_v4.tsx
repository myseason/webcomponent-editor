/**
 * figmaV4/editor/ComponentEditor_v4.tsx
 * Minimal shell to compose Canvas and Inspector for v4 preview.
 */
import React from 'react';
import { Canvas } from './center/Canvas';
import { Inspector } from './right/Inspector';

import { PageBarV4 } from './topbar/PageBar_v4';

export const ComponentEditorV4: React.FC = () => {
  return (
    <div style={{ display:'grid', gridTemplateRows:'48px 1fr', height:'100vh', width:'100vw' }}>
      <PageBarV4 />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px' }}>
        <Canvas />
        <Inspector />
      </div>
    </div>
  );
};
